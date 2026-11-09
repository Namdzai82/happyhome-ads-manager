// Máy chủ: dashboard + API + webhook + lịch đồng bộ. Chạy: node src/server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const db = require('./db');
const meta = require('./meta');
const sync = require('./sync');
const rules = require('./rules');
const actions = require('./actions');
const crm = require('./crm');
const sales = require('./sales');
const webhook = require('./webhook');
const { kpis, sumRows, videoKpis } = require('./metrics');

const PUBLIC = path.join(config.root, 'public');
const secretPath = path.join(config.dataDir, 'secret.key');
if (!fs.existsSync(secretPath)) fs.writeFileSync(secretPath, crypto.randomBytes(32).toString('hex'));
db.run('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, created_at TEXT, expires_at TEXT)');
const SESSION_DAYS = 30;
const WEAK = pw => !pw || pw.length < 8 || pw === 'doi-mat-khau-nay';
function newSession() {
  const token = crypto.randomBytes(32).toString('hex');
  db.run('INSERT INTO sessions(token, created_at, expires_at) VALUES(?,?,?)', crypto.createHash('sha256').update(token).digest('hex'), new Date().toISOString(), new Date(Date.now() + SESSION_DAYS * 86400000).toISOString());
  db.run('DELETE FROM sessions WHERE expires_at < ?', new Date().toISOString());
  return token;
}
const hashTok = t => crypto.createHash('sha256').update(t).digest('hex');

// ---------- tác vụ nền ----------
const jobs = { ads: false, crm: false, rules: false };
async function runJob(name, fn) {
  if (jobs[name]) return { skipped: true };
  jobs[name] = true;
  try {
    const r = await fn();
    db.state(`job_${name}_error`, '');
    return r;
  } catch (e) {
    db.state(`job_${name}_error`, `${new Date().toISOString()} ${e.message}`);
    console.error(`[${name}]`, e.message);
    throw e;
  } finally { jobs[name] = false; }
}
const doAds = () => runJob('ads', async () => { const r = await sync.syncAds(); rules.run(); return r; });
const doCrm = () => runJob('crm', () => crm.syncConversations());
const doRules = () => runJob('rules', async () => rules.run());

const timers = [];
function schedule() {
  timers.splice(0).forEach(clearInterval);
  const S = config.get().sync;
  const every = (min, fn) => timers.push(setInterval(() => fn().catch(() => {}), Math.max(1, min) * 60000));
  every(S.ads_every_minutes, doAds);
  every(S.crm_every_minutes, doCrm);
  every(S.rules_every_minutes, doRules);
}
function scheduleFirstRun() { setTimeout(() => { doAds().catch(() => {}); doCrm().catch(() => {}); }, 2000); }

// ---------- dữ liệu cho API ----------
const W = w => (['today', 'last_3d', 'last_7d', 'prev_7d'].includes(w) ? w : 'last_7d');
const winRow = (level, id, w) => { const r = db.get('SELECT * FROM insights_window WHERE level=? AND entity_id=? AND win=?', level, id, w); return r ? { ...kpis(r), quality_ranking: r.quality_ranking, engagement_rate_ranking: r.engagement_rate_ranking, conversion_rate_ranking: r.conversion_rate_ranking, video: videoKpis(r.video, r.impressions) } : { ...kpis({}), video: null }; };

function status() {
  const m = config.get().meta;
  return {
    configured: { ads: meta.ready(), page: meta.ready() && !config.isPlaceholder(m.page_id), webhook: !config.isPlaceholder(m.app_secret) },
    account: db.get('SELECT id,name,currency,timezone_name,account_status,disable_reason,amount_spent,balance,spend_cap,updated_at FROM account LIMIT 1') || null,
    ads_synced_at: db.state('ads_synced_at'), crm_synced_at: db.state('crm_synced_at'), rules_ran_at: db.state('rules_ran_at'),
    webhook_last_at: db.state('webhook_last_at'),
    errors: { ads: db.state('job_ads_error'), crm: db.state('job_crm_error'), rules: db.state('job_rules_error') },
    running: jobs, changes_today: actions.changesToday(), guardrails: config.get().guardrails
  };
}

function overview(w) {
  const acc = {};
  for (const win of ['today', 'last_3d', 'last_7d', 'prev_7d']) acc[win] = winRow('account', 'account', win);
  const dates = db.all(`SELECT date, SUM(spend) spend, SUM(impressions) impressions, SUM(clicks) clicks, SUM(link_clicks) link_clicks, SUM(results) results
    FROM insights_daily WHERE level='campaign' GROUP BY date ORDER BY date`).map(r => ({ date: r.date, ...kpis(r) }));
  const byCamp = db.all(`SELECT d.date, d.entity_id, c.name, d.results, d.spend FROM insights_daily d LEFT JOIN campaigns c ON c.id=d.entity_id WHERE d.level='campaign' ORDER BY d.date`);
  return { window: w, account: acc, daily: dates, daily_by_campaign: byCamp,
    pending: db.get(`SELECT COUNT(*) n FROM proposals WHERE status='pending'`).n,
    pending_high: db.get(`SELECT COUNT(*) n FROM proposals WHERE status='pending' AND severity='high'`).n,
    crm: sales.overview(7) };
}

function tree(w) {
  const camps = db.all('SELECT id,name,status,effective_status,objective,daily_budget,lifetime_budget FROM campaigns ORDER BY name');
  const sets = db.all('SELECT id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,learning_status FROM adsets ORDER BY name');
  const ads = db.all('SELECT id,adset_id,campaign_id,name,status,effective_status,title,thumbnail_url FROM ads ORDER BY name');
  const crmAd = Object.fromEntries(sales.funnelByAd(7).map(r => [r.ad_id, r]));
  return camps.map(c => ({ ...c, type: 'campaign', kpi: winRow('campaign', c.id, w),
    children: sets.filter(s => s.campaign_id === c.id).map(s => ({ ...s, type: 'adset', kpi: winRow('adset', s.id, w),
      children: ads.filter(a => a.adset_id === s.id).map(a => ({ ...a, type: 'ad', kpi: winRow('ad', a.id, w), crm: crmAd[a.id] || null })) })) }));
}

function creatives() {
  const ads = db.all('SELECT * FROM ads ORDER BY name');
  const crmAd = Object.fromEntries(sales.funnelByAd(7).map(r => [r.ad_id, r]));
  const props = db.all(`SELECT * FROM proposals WHERE status='pending' AND entity_type='ad'`);
  return ads.map(a => {
    const cr = JSON.parse(a.creative || '{}');
    const w7 = winRow('ad', a.id, 'last_7d'), w3 = winRow('ad', a.id, 'last_3d'), wp = winRow('ad', a.id, 'prev_7d');
    const daily = db.all(`SELECT date, spend, impressions, clicks, link_clicks, results, video FROM insights_daily WHERE level='ad' AND entity_id=? ORDER BY date`, a.id).map(r => ({ date: r.date, ...kpis(r), video: videoKpis(r.video, r.impressions) }));
    return { id: a.id, name: a.name, status: a.status, effective_status: a.effective_status, adset_id: a.adset_id, title: a.title, body: a.body,
      thumbnail_url: a.thumbnail_url, cta: cr.call_to_action_type || null, last_7d: w7, last_3d: w3, prev_7d: wp, daily, crm: crmAd[a.id] || null,
      advice: props.filter(p => p.entity_id === a.id).map(p => ({ id: p.id, rule: p.rule, action: p.action, reason: p.reason, severity: p.severity })) };
  });
}

function contactDetail(psid) {
  const c = db.get('SELECT * FROM contacts WHERE psid=?', psid);
  if (!c) return null;
  const msgs = db.all('SELECT mid, from_page, text, created_at, referral FROM messages WHERE psid=? ORDER BY created_at', psid);
  return { ...c, intents: JSON.parse(c.intents || '[]'), problems: JSON.parse(c.problems || '[]'), messages: msgs, suggest: crm.suggestReply(c), labels: crm.LABELS };
}

function contacts(qs) {
  const where = [], p = [];
  if (qs.stage) { where.push(`COALESCE(stage_manual, stage)=?`); p.push(qs.stage); }
  if (qs.payment) { where.push('payment_status=?'); p.push(qs.payment); }
  if (qs.ad) { where.push('ad_id=?'); p.push(qs.ad); }
  if (qs.q) { where.push(`(name LIKE ? OR phone LIKE ? OR psid IN (SELECT psid FROM messages WHERE text LIKE ?))`); p.push(`%${qs.q}%`, `%${qs.q}%`, `%${qs.q}%`); }
  const rows = db.all(`SELECT psid,name,phone,stage,stage_manual,score,intents,problems,pax,travel_date,ad_id,ad_title,source_type,first_seen,last_customer_msg_at,last_page_msg_at,booked_pax,booked_revenue,payment_status,paid_amount,payment_evidence
    FROM contacts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY COALESCE(last_customer_msg_at, first_seen) DESC LIMIT 500`, ...p);
  const L = crm.LABELS;
  return rows.map(r => ({ ...r, intents: JSON.parse(r.intents || '[]').map(k => L[k] || k), problems: JSON.parse(r.problems || '[]').map(k => L[k] || k),
    last_text: (db.get('SELECT text FROM messages WHERE psid=? AND from_page=0 ORDER BY created_at DESC LIMIT 1', r.psid) || {}).text || '' }));
}

function updateContact(psid, body) {
  const allowed = ['stage_manual', 'booked_pax', 'booked_revenue', 'note', 'phone', 'pax', 'travel_date', 'payment_status', 'paid_amount', 'payment_evidence'];
  const numeric = ['booked_pax', 'booked_revenue', 'pax', 'paid_amount'];
  if ('stage_manual' in body && !['', null, 'booked', 'lost'].includes(body.stage_manual)) throw new Error('Giai đoạn không hợp lệ');
  for (const k of numeric) if (k in body && body[k] !== '' && body[k] !== null && !(Number.isFinite(Number(body[k])) && Number(body[k]) >= 0)) throw new Error(`${k} phải là số không âm`);
  const sets = [], p = [];
  for (const k of allowed) if (k in body) { sets.push(`${k}=?`); p.push(body[k] === '' || body[k] === null ? null : numeric.includes(k) ? Number(body[k]) : String(body[k]).slice(0, 500)); }
  if (body.stage_manual === 'booked') { sets.push('booked_at=?'); p.push(new Date().toISOString()); }
  if (!sets.length) return;
  db.run(`UPDATE contacts SET ${sets.join(',')}, updated_at=? WHERE psid=?`, ...p, new Date().toISOString(), psid);
  crm.classify(psid);
}

function saveSettings(body) {
  for (const sec of config.editableSections) {
    if (!body[sec]) continue;
    const cur = config.get()[sec];
    const clean = {};
    for (const [k, v] of Object.entries(body[sec])) {
      if (!(k in cur) || typeof v !== typeof cur[k]) continue;
      if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) continue;
      if (sec === 'sync' && (v < 1 || (k === 'insights_days' && v > 90))) continue;
      clean[k] = v;
    }
    const prev = JSON.parse((db.get('SELECT data FROM settings WHERE section=?', sec) || { data: '{}' }).data);
    db.run('INSERT INTO settings(section,data) VALUES(?,?) ON CONFLICT(section) DO UPDATE SET data=excluded.data', sec, JSON.stringify({ ...prev, ...clean }));
  }
  const ov = {};
  for (const r of db.all('SELECT section, data FROM settings')) ov[r.section] = JSON.parse(r.data);
  config.setOverrides(ov);
  if (meta.ready()) schedule(); // áp dụng chu kỳ đồng bộ mới
}

// ---------- HTTP ----------
function send(res, code, data, headers = {}) {
  const isStr = typeof data === 'string' || Buffer.isBuffer(data);
  res.writeHead(code, { 'Content-Type': isStr ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(isStr ? data : JSON.stringify(data));
}
function readBody(req, limit = 2e6) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('Body quá lớn')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(a => a[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const authed = req => { const t = cookies(req).hh; if (!t) return false; const r = db.get('SELECT expires_at FROM sessions WHERE token=?', hashTok(t)); return !!r && r.expires_at > new Date().toISOString(); };
// qua Cloudflare Tunnel mọi yêu cầu đến từ 127.0.0.1: lấy IP thật từ header của Cloudflare
const clientIp = req => { const ra = req.socket.remoteAddress || ''; const loop = /^(::1|127\.|::ffff:127\.)/.test(ra); return (loop && req.headers['cf-connecting-ip']) || ra; };
const isHttps = req => req.headers['x-forwarded-proto'] === 'https' || /https/.test(req.headers['cf-visitor'] || '');
const failedLogins = new Map();

function serveFile(res, file, type) {
  fs.readFile(path.join(PUBLIC, file), (err, buf) => err ? send(res, 404, 'Not found') : send(res, 200, buf, { 'Content-Type': type }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const qs = Object.fromEntries(url.searchParams);
  try {
    // webhook Meta (không cần đăng nhập, xác thực bằng chữ ký)
    if (p === '/webhook' && req.method === 'GET') { const c = webhook.verify(qs); return c ? send(res, 200, c) : send(res, 403, 'Forbidden'); }
    if (p === '/webhook' && req.method === 'POST') {
      const raw = await readBody(req);
      if (!webhook.verifySignature(raw, req.headers['x-hub-signature-256'])) return send(res, 401, 'Bad signature');
      send(res, 200, 'EVENT_RECEIVED');
      try { webhook.handle(JSON.parse(raw.toString('utf8'))); db.state('webhook_last_at', new Date().toISOString()); } catch (e) { console.error('[webhook]', e.message); }
      return;
    }
    if (p === '/login' && req.method === 'POST') {
      const pw = config.get().server.dashboard_password;
      if (WEAK(pw)) return send(res, 403, { error: 'Hãy đổi dashboard_password trong config.json (ít nhất 8 ký tự, khác mật khẩu mẫu) rồi khởi động lại.' });
      const ip = clientIp(req); const f = failedLogins.get(ip) || { n: 0, t: 0 };
      if (f.n >= 5 && Date.now() - f.t < 10 * 60000) return send(res, 429, { error: 'Sai mật khẩu quá nhiều lần, thử lại sau 10 phút' });
      const body = JSON.parse((await readBody(req)).toString() || '{}');
      const a = Buffer.from(String(body.password || '')), b = Buffer.from(pw);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { failedLogins.set(ip, { n: f.n + 1, t: Date.now() }); await new Promise(r => setTimeout(r, 800)); return send(res, 401, { error: 'Sai mật khẩu' }); }
      failedLogins.delete(ip);
      return send(res, 200, { ok: true }, { 'Set-Cookie': `hh=${newSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${isHttps(req) ? '; Secure' : ''}` });
    }
    if (p === '/logout') { const t = cookies(req).hh; if (t) db.run('DELETE FROM sessions WHERE token=?', hashTok(t)); return send(res, 200, { ok: true }, { 'Set-Cookie': 'hh=; Path=/; Max-Age=0' }); }
    if (p === '/' || p === '/index.html') return serveFile(res, authed(req) ? 'index.html' : 'login.html', 'text/html; charset=utf-8');
    if (p === '/app.js') return authed(req) ? serveFile(res, 'app.js', 'application/javascript; charset=utf-8') : send(res, 401, '');

    if (!p.startsWith('/api/')) return send(res, 404, 'Not found');
    if (!authed(req)) return send(res, 401, { error: 'Chưa đăng nhập' });
    // chống CSRF: yêu cầu ghi phải kèm header tùy chỉnh
    if (req.method !== 'GET' && req.headers['x-requested-with'] !== 'hh') return send(res, 403, { error: 'Thiếu header bảo vệ' });
    const body = req.method === 'GET' ? {} : JSON.parse((await readBody(req)).toString() || '{}');
    let m;
    if (p === '/api/status') return send(res, 200, status());
    if (p === '/api/overview') return send(res, 200, overview(W(qs.win)));
    if (p === '/api/tree') return send(res, 200, tree(W(qs.win)));
    if (p === '/api/breakdowns') return send(res, 200, db.all('SELECT kind, win, data, updated_at FROM breakdowns').map(r => ({ ...r, data: JSON.parse(r.data) })));
    if (p === '/api/creatives') return send(res, 200, creatives());
    if (p === '/api/proposals') return send(res, 200, db.all(`SELECT * FROM proposals ${qs.status === 'all' ? '' : `WHERE status='pending'`} ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, id DESC LIMIT 300`)
      .map(r => ({ ...r, params: JSON.parse(r.params || '{}'), evidence: JSON.parse(r.evidence || '{}'), result: r.result ? JSON.parse(r.result) : null })));
    if ((m = p.match(/^\/api\/proposals\/(\d+)\/(approve|reject)$/)) && req.method === 'POST') {
      if (m[2] === 'reject') { actions.reject(Number(m[1])); return send(res, 200, { ok: true }); }
      return send(res, 200, { ok: true, result: await actions.approve(Number(m[1])) });
    }
    if (p === '/api/changes') return send(res, 200, db.all('SELECT * FROM change_log ORDER BY id DESC LIMIT 300'));
    if ((m = p.match(/^\/api\/changes\/(\d+)\/undo$/)) && req.method === 'POST') return send(res, 200, { ok: true, result: await actions.undo(Number(m[1])) });
    if (p === '/api/action' && req.method === 'POST') return send(res, 200, { ok: true, result: await actions.manual(body) });
    if (p === '/api/crm/contacts') return send(res, 200, contacts(qs));
    if ((m = p.match(/^\/api\/crm\/contact\/([\w-]+)$/))) {
      if (req.method === 'POST') updateContact(m[1], body);
      const d = contactDetail(m[1]); return d ? send(res, 200, d) : send(res, 404, { error: 'Không tìm thấy' });
    }
    if (p === '/api/sales/tasks') return send(res, 200, sales.tasks());
    if (p === '/api/sales/overview') return send(res, 200, sales.overview(Number(qs.days) || 7));
    if (p === '/api/sync' && req.method === 'POST') {
      const what = body.what || 'all', r = {};
      if (what === 'ads' || what === 'all') r.ads = await doAds();
      if (what === 'crm' || what === 'all') r.crm = await doCrm();
      if (what === 'rules') r.rules = await doRules();
      return send(res, 200, { ok: true, ...r });
    }
    if (p === '/api/webhook/subscribe' && req.method === 'POST') return send(res, 200, await meta.subscribePage());
    if (p === '/api/settings') {
      if (req.method === 'POST') { saveSettings(body); crm.reclassifyAll(); rules.run(); }
      const c = config.get(); return send(res, 200, Object.fromEntries(config.editableSections.map(s => [s, c[s]])));
    }
    return send(res, 404, { error: 'Không có API này' });
  } catch (e) {
    return send(res, 400, { error: e.message });
  }
});

if (require.main === module) {
  const S = config.get().server;
  server.listen(S.port, S.host, () => {
    console.log(`HappyHome Ads Control đang chạy: http://${S.host}:${S.port}`);
    if (WEAK(S.dashboard_password)) console.log('CẢNH BÁO: dashboard_password còn là mật khẩu mẫu hoặc quá ngắn, dashboard sẽ từ chối đăng nhập cho đến khi đổi.');
    if (!meta.ready()) console.log('Chưa có token Meta: mở config.json và làm theo docs/HUONG-DAN-CAI-DAT.md');
    else { schedule(); scheduleFirstRun(); }
  });
}

module.exports = { server, schedule, doAds, doCrm, doRules, sumRows };
