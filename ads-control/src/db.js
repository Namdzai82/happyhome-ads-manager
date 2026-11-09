// SQLite tích hợp sẵn trong Node (node:sqlite), không cần cài thêm gói
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

fs.mkdirSync(config.dataDir, { recursive: true });
const db = new DatabaseSync(process.env.DB_PATH || path.join(config.dataDir, 'happyhome.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY, name TEXT, currency TEXT, timezone_name TEXT, account_status INTEGER, disable_reason INTEGER,
  amount_spent REAL, balance REAL, spend_cap REAL, updated_at TEXT, raw TEXT);
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY, name TEXT, status TEXT, effective_status TEXT, objective TEXT, daily_budget REAL, lifetime_budget REAL,
  bid_strategy TEXT, created_time TEXT, updated_at TEXT, raw TEXT);
CREATE TABLE IF NOT EXISTS adsets (
  id TEXT PRIMARY KEY, campaign_id TEXT, name TEXT, status TEXT, effective_status TEXT, daily_budget REAL, lifetime_budget REAL,
  optimization_goal TEXT, learning_status TEXT, targeting TEXT, created_time TEXT, updated_at TEXT, raw TEXT);
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY, adset_id TEXT, campaign_id TEXT, name TEXT, status TEXT, effective_status TEXT, creative_id TEXT,
  title TEXT, body TEXT, thumbnail_url TEXT, creative TEXT, created_time TEXT, updated_at TEXT, raw TEXT);
CREATE TABLE IF NOT EXISTS insights_daily (
  level TEXT, entity_id TEXT, date TEXT, spend REAL, impressions INTEGER, reach INTEGER, clicks INTEGER, link_clicks INTEGER,
  results INTEGER, updated_at TEXT, PRIMARY KEY (level, entity_id, date));
CREATE TABLE IF NOT EXISTS insights_window (
  level TEXT, entity_id TEXT, win TEXT, spend REAL, impressions INTEGER, reach INTEGER, frequency REAL, clicks INTEGER,
  link_clicks INTEGER, results INTEGER, quality_ranking TEXT, engagement_rate_ranking TEXT, conversion_rate_ranking TEXT,
  updated_at TEXT, PRIMARY KEY (level, entity_id, win));
CREATE TABLE IF NOT EXISTS breakdowns (kind TEXT, win TEXT, data TEXT, updated_at TEXT, PRIMARY KEY (kind, win));
CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, rule TEXT, entity_type TEXT, entity_id TEXT, entity_name TEXT,
  action TEXT, params TEXT, reason TEXT, evidence TEXT, severity TEXT, status TEXT, dedupe_key TEXT,
  decided_at TEXT, decided_by TEXT, executed_at TEXT, result TEXT);
CREATE INDEX IF NOT EXISTS idx_prop_status ON proposals(status);
CREATE TABLE IF NOT EXISTS change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, entity_type TEXT, entity_id TEXT, entity_name TEXT, field TEXT,
  old_value TEXT, new_value TEXT, source TEXT, proposal_id INTEGER, ok INTEGER, error TEXT);
CREATE TABLE IF NOT EXISTS contacts (
  psid TEXT PRIMARY KEY, name TEXT, conversation_id TEXT, first_seen TEXT, last_customer_msg_at TEXT, last_page_msg_at TEXT,
  phone TEXT, stage TEXT, stage_manual TEXT, score INTEGER, intents TEXT, problems TEXT, pax INTEGER, travel_date TEXT,
  source_type TEXT, ad_id TEXT, adset_id TEXT, campaign_id TEXT, ad_title TEXT,
  booked_pax INTEGER, booked_revenue REAL, booked_at TEXT, note TEXT,
  payment_status TEXT, paid_amount REAL, payment_evidence TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS messages (
  mid TEXT PRIMARY KEY, psid TEXT, conversation_id TEXT, from_page INTEGER, text TEXT, created_at TEXT, referral TEXT);
CREATE INDEX IF NOT EXISTS idx_msg_psid ON messages(psid, created_at);
CREATE TABLE IF NOT EXISTS sync_state (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS settings (section TEXT PRIMARY KEY, data TEXT);
`);

// nâng cấp CSDL cũ: thêm cột chỉ số video (JSON) cho cấp mẫu quảng cáo
for (const t of ['insights_daily', 'insights_window']) {
  if (!db.prepare(`PRAGMA table_info(${t})`).all().some(c => c.name === 'video')) db.exec(`ALTER TABLE ${t} ADD COLUMN video TEXT`);
}

// nâng cấp CSDL cũ: thêm các cột theo dõi tiến độ thanh toán cho contacts
for (const col of ['payment_status', 'paid_amount', 'payment_evidence']) {
  if (!db.prepare(`PRAGMA table_info(contacts)`).all().some(c => c.name === col)) {
    db.exec(`ALTER TABLE contacts ADD COLUMN ${col} ${col === 'paid_amount' ? 'REAL' : 'TEXT'}`);
  }
}

const q = {
  run: (sql, ...p) => db.prepare(sql).run(...p),
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  tx(fn) {
    db.exec('BEGIN');
    try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
  },
  // upsert theo khóa chính; obj là {cột: giá trị}
  upsert(table, obj, keys) {
    const cols = Object.keys(obj);
    const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})
      ON CONFLICT(${keys.join(',')}) DO UPDATE SET ${cols.filter(c => !keys.includes(c)).map(c => `${c}=excluded.${c}`).join(',')}`;
    return db.prepare(sql).run(...cols.map(c => obj[c] === undefined ? null : obj[c]));
  },
  state(key, value) {
    if (value === undefined) return (db.prepare('SELECT value FROM sync_state WHERE key=?').get(key) || {}).value ?? null;
    db.prepare('INSERT INTO sync_state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
  },
  raw: db
};

// nạp cài đặt đã sửa trên dashboard
const ov = {};
for (const r of q.all('SELECT section, data FROM settings')) ov[r.section] = JSON.parse(r.data);
config.setOverrides(ov);

module.exports = q;
