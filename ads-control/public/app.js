// Giao diện dashboard (JS thuần). Mọi số liệu lấy từ API của máy chủ, không có số viết cứng.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '-' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: d, minimumFractionDigits: d });
const vnd = v => (v == null || !isFinite(v)) ? '-' : fmt(v) + ' đ';
const pct = (v, d = 1) => (v == null || !isFinite(v)) ? '-' : fmt(v * 100, d) + '%';
const ago = iso => { if (!iso) return 'chưa'; const m = (Date.now() - Date.parse(iso)) / 60000; return m < 1 ? 'vừa xong' : m < 60 ? Math.round(m) + ' phút trước' : m < 1440 ? Math.round(m / 60) + ' giờ trước' : Math.round(m / 1440) + ' ngày trước'; };
const dt = iso => iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const dayLbl = d => `${WD[new Date(d + 'T00:00:00').getDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`;

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'hh', ...(opts.headers || {}) } });
  if (r.status === 401) { location.reload(); throw new Error('Hết phiên đăng nhập'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Lỗi ' + r.status);
  return j;
}
const post = (p, b = {}) => api(p, { method: 'POST', body: JSON.stringify(b) });
function toast(msg, ok = true) { const t = $('#toast'); t.textContent = msg; t.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl text-sm text-white shadow-lg ${ok ? 'bg-emerald-700' : 'bg-rose-600'}`; clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hidden'), 5000); }
function openModal(title, html) { $('#mTitle').textContent = title; $('#mBody').innerHTML = html; const m = $('#modal'); m.classList.remove('hidden'); m.classList.add('flex'); }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.classList.remove('flex'); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

const STATUS_PILL = s => s === 'ACTIVE' ? '<span class="pill bg-emerald-100 text-emerald-800">Đang chạy</span>' : s === 'PAUSED' || s === 'CAMPAIGN_PAUSED' || s === 'ADSET_PAUSED' ? '<span class="pill bg-slate-100 text-slate-600">Tạm dừng</span>' : `<span class="pill bg-amber-100 text-amber-800">${esc(s || '-')}</span>`;
const SEV = { high: 'bg-rose-100 text-rose-700', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-600' };
const SEV_LBL = { high: 'Cao', medium: 'Vừa', low: 'Thấp' };
const STAGE = { new: ['Mới (bấm câu mẫu)', 'bg-slate-100 text-slate-600'], engaged: ['Đang hỏi', 'bg-blue-100 text-blue-800'], qualified: ['Tiềm năng', 'bg-amber-100 text-amber-800'], booked: ['Đã đặt', 'bg-emerald-100 text-emerald-800'], lost: ['Mất', 'bg-rose-100 text-rose-700'], stale: ['Nguội', 'bg-slate-100 text-slate-400'] };
const stagePill = s => `<span class="pill ${(STAGE[s] || ['', 'bg-slate-100'])[1]}">${esc((STAGE[s] || [s])[0])}</span>`;
const ACTION_LBL = { pause: 'Tạm dừng', activate: 'Bật lại', set_budget: 'Đổi ngân sách', advice: 'Tư vấn' };
const RANK = v => !v || v === 'UNKNOWN' ? 'chưa đủ dữ liệu' : v === 'ABOVE_AVERAGE' ? 'trên TB' : v === 'AVERAGE' ? 'trung bình' : v.replace(/BELOW_AVERAGE_(\d+)/, 'dưới TB ($1% cuối)');
const TYPE_LBL = { campaign: 'Chiến dịch', adset: 'Nhóm QC', ad: 'Mẫu QC', account: 'Tài khoản' };

const TABS = [['overview', 'Tổng quan'], ['ads', 'Quảng cáo'], ['proposals', 'Đề xuất'], ['creatives', 'Mẫu quảng cáo'], ['crm', 'Khách hàng'], ['sales', 'Kế hoạch sale'], ['segments', 'Phân khúc'], ['log', 'Nhật ký'], ['settings', 'Cài đặt']];
let tab = location.hash.slice(1) || 'overview';
const charts = [];
if (window.Chart) { Chart.defaults.animation = false; Chart.defaults.font.size = 11; }
function renderTabs(pending) {
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button data-t="${k}" class="tab px-3 py-2.5 border-b-2 border-transparent text-slate-500 ${tab === k ? 'active' : ''}">${l}${k === 'proposals' && pending ? ` <span class="pill bg-rose-600 text-white">${pending}</span>` : ''}</button>`).join('');
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; location.hash = tab; render(); });
}
$('#win').onchange = () => render();

async function refreshStatus() {
  const s = await api('/api/status');
  const parts = [];
  if (s.account) parts.push(`${esc(s.account.name)} (${esc(s.account.currency)})`);
  parts.push(`QC: ${ago(s.ads_synced_at)}`, `Tin nhắn: ${ago(s.crm_synced_at)}`, `Webhook: ${ago(s.webhook_last_at)}`);
  $('#statusLine').innerHTML = parts.join(' · ');
  const al = [];
  if (!s.configured.ads) al.push('Chưa cấu hình token Meta và ID tài khoản quảng cáo trong config.json. Xem docs/HUONG-DAN-CAI-DAT.md.');
  if (s.configured.ads && !s.configured.page) al.push('Chưa cấu hình page_id: phần khách hàng chưa đồng bộ được.');
  if (s.account && s.account.account_status !== 1) al.push(`Tài khoản quảng cáo không hoạt động (account_status=${s.account.account_status}). Kiểm tra thanh toán trong Ads Manager.`);
  for (const [k, v] of Object.entries(s.errors)) if (v) al.push(`Lỗi đồng bộ ${k}: ${v}`);
  const a = $('#alert');
  a.innerHTML = al.map(t => `<div class="mb-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">${esc(t)}</div>`).join('');
  a.classList.toggle('hidden', !al.length);
  return s;
}

async function syncNow(what) {
  toast('Đang đồng bộ...');
  try { await post('/api/sync', { what }); toast('Đã đồng bộ'); render(); } catch (e) { toast(e.message, false); refreshStatus(); }
}

function kpiCard(label, v, prev, fmtFn, goodUp) {
  let delta = '';
  if (prev != null && v != null && prev !== 0) {
    const d = (v - prev) / prev; const good = goodUp ? d >= 0 : d <= 0;
    delta = `<div class="text-[11px] mt-1 ${good ? 'text-emerald-700' : 'text-rose-600'}">${d >= 0 ? '▲' : '▼'} ${pct(Math.abs(d), 0)} so với 7 ngày trước</div>`;
  }
  return `<div class="card p-4"><div class="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">${label}</div><div class="text-lg font-extrabold num mt-1">${fmtFn(v)}</div>${delta}</div>`;
}

// ---------------- TỔNG QUAN ----------------
async function viewOverview() {
  const w = $('#win').value;
  const o = await api('/api/overview?win=' + w);
  const k = o.account[w], pv = w === 'last_7d' ? o.account.prev_7d : null;
  const props = await api('/api/proposals');
  const c = o.crm;
  $('#view').innerHTML = `
  <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
    ${kpiCard('Chi tiêu', k.spend, pv && pv.spend, vnd, true)}${kpiCard('Tin nhắn', k.results, pv && pv.results, fmt, true)}
    ${kpiCard('Chi phí / tin', k.cpr, pv && pv.cpr, vnd, false)}${kpiCard('CPM', k.cpm, pv && pv.cpm, vnd, false)}
    ${kpiCard('CTR liên kết', k.ctr, pv && pv.ctr, v => pct(v, 2), true)}${kpiCard('Click → tin', k.cvr, pv && pv.cvr, pct, true)}
    ${kpiCard('Tiếp cận', k.reach, pv && pv.reach, fmt, true)}${kpiCard('Tần suất', k.frequency, null, v => fmt(v, 2), false)}
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
    <div class="card p-5 lg:col-span-2"><div class="font-bold">Tin nhắn theo ngày và chi phí mỗi tin</div><div class="text-xs text-slate-500 mb-3">Cột: tin nhắn theo chiến dịch · Đường: chi phí/tin</div><div class="h-72"><canvas id="cDaily"></canvas></div></div>
    <div class="card p-5"><div class="flex justify-between items-center"><div class="font-bold">Đề xuất chờ duyệt</div><button class="btn" onclick="tab='proposals';location.hash=tab;render()">Xem tất cả</button></div>
      <div class="mt-3 space-y-2">${props.slice(0, 6).map(p => `<div class="p-3 rounded-xl border border-slate-200"><div class="flex gap-2 items-center"><span class="pill ${SEV[p.severity]}">${SEV_LBL[p.severity]}</span><span class="text-xs font-semibold">${ACTION_LBL[p.action] || p.action}</span><span class="text-xs text-slate-500 truncate">${esc(p.entity_name)}</span></div><div class="text-xs text-slate-600 mt-1">${esc(p.reason)}</div></div>`).join('') || '<div class="text-sm text-slate-400">Không có đề xuất nào.</div>'}</div></div>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
    <div class="card p-5"><div class="font-bold">Khách nhắn tin 7 ngày</div><div class="text-xs text-slate-500 mb-3">Từ CRM Messenger · trả lời trung vị ${c.median_reply_min != null ? fmt(c.median_reply_min) + ' phút' : '-'}</div>
      ${funnelBars([['Hội thoại mới', c.total], ['Có hỏi thật', c.stages.engaged + c.stages.qualified + c.stages.booked], ['Tiềm năng (SĐT / ngày + số người)', c.stages.qualified + c.stages.booked], ['Đã đặt', c.stages.booked]])}
      <div class="text-xs text-slate-500 mt-2">Khách đã đặt: ${fmt(c.pax)} người · doanh thu ${vnd(c.revenue)}</div></div>
    <div class="card p-5"><div class="font-bold">Khách hỏi gì nhiều nhất</div><div class="mt-3 space-y-2">${bars(c.intents.slice(0, 6), c.total)}</div><div class="font-bold mt-4">Vấn đề / rào cản</div><div class="mt-2 space-y-2">${bars(c.problems.slice(0, 5), c.total, 'bg-rose-400') || '<div class="text-xs text-slate-400">Chưa phát hiện</div>'}</div></div>
    <div class="card p-5"><div class="font-bold">Vòng phản hồi: khách → quảng cáo</div><div class="mt-3 space-y-2 text-sm">${c.feedback.map(f => `<div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100"><span class="pill bg-emerald-600 text-white">${esc(f.to)}</span><div class="mt-1 text-slate-700">${esc(f.text)}</div></div>`).join('') || '<div class="text-xs text-slate-400">Chưa đủ dữ liệu hội thoại.</div>'}</div></div>
  </div>`;
  const dates = o.daily.map(d => d.date);
  const camps = [...new Set(o.daily_by_campaign.map(r => r.entity_id))];
  const palette = ['#065f46', '#34d399', '#1d4ed8', '#93c5fd', '#b45309', '#fcd34d'];
  charts.push(new Chart($('#cDaily'), { data: { labels: dates.map(dayLbl), datasets: [
    { type: 'line', label: 'Chi phí / tin', data: o.daily.map(d => d.cpr && Math.round(d.cpr)), borderColor: '#2563eb', backgroundColor: '#2563eb', yAxisID: 'y1', tension: .3 },
    ...camps.map((id, i) => ({ type: 'bar', label: (o.daily_by_campaign.find(r => r.entity_id === id) || {}).name || id, stack: 's', backgroundColor: palette[i % palette.length],
      data: dates.map(d => (o.daily_by_campaign.find(r => r.entity_id === id && r.date === d) || {}).results || 0) }))] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { stacked: true, grace: '10%', title: { display: true, text: 'Tin nhắn' } }, y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { callback: v => fmt(v / 1000) + 'k' } } } } }));
}
const funnelBars = steps => steps.map(([l, v], i) => `<div class="mb-2"><div class="flex justify-between text-xs"><span>${l}</span><b class="num">${fmt(v)}${steps[0][1] ? ` <span class="text-slate-400 font-normal">(${pct(v / steps[0][1], 0)})</span>` : ''}</b></div><div class="h-2.5 bg-slate-100 rounded"><div class="h-full rounded ${i === steps.length - 1 ? 'bg-emerald-600' : 'bg-slate-400'}" style="width:${steps[0][1] ? Math.max(v / steps[0][1] * 100, 1) : 0}%"></div></div></div>`).join('');
const bars = (list, total, color = 'bg-emerald-500') => list.map(x => `<div><div class="flex justify-between text-xs"><span>${esc(x.label)}</span><span class="num font-semibold">${x.n} (${pct(x.n / (total || 1), 0)})</span></div><div class="h-1.5 bg-slate-100 rounded"><div class="h-full ${color} rounded" style="width:${x.n / (total || 1) * 100}%"></div></div></div>`).join('');

// ---------------- QUẢNG CÁO (cây) ----------------
let expanded = new Set(JSON.parse(localStorage.getItem('hh_exp') || '[]'));
async function viewAds() {
  const w = $('#win').value;
  const t = await api('/api/tree?win=' + w);
  const H = ['Tên', 'Trạng thái', 'Ngân sách/ngày', 'Chi tiêu', 'Tin', 'Chi phí/tin', 'CPM', 'CTR LK', 'CVR', 'Tần suất', 'Khách tiềm năng', 'Điều khiển'];
  const row = (n, depth) => {
    const k = n.kpi || {}; const hasKids = n.children && n.children.length; const open = expanded.has(n.id);
    const badges = [n.learning_status === 'LEARNING' ? '<span class="pill bg-blue-100 text-blue-800">Đang học</span>' : '', k.quality_ranking && /BELOW/.test(k.quality_ranking) ? '<span class="pill bg-rose-100 text-rose-700">Chất lượng thấp</span>' : ''].join(' ');
    const da = `data-type="${esc(n.type)}" data-id="${esc(n.id)}" data-name="${esc(n.name)}" data-budget="${esc(n.daily_budget || '')}"`;
    const budget = n.daily_budget ? `${vnd(n.daily_budget)} <button class="text-xs text-emerald-700 underline" data-act="budget" ${da}>sửa</button>` : (n.lifetime_budget ? 'Trọn đời ' + vnd(n.lifetime_budget) : '-');
    const on = n.status === 'ACTIVE';
    return `<tr class="${depth === 0 ? 'bg-slate-50 font-semibold' : ''} hover:bg-slate-50">
      <td class="py-2 px-3" style="padding-left:${12 + depth * 22}px">${hasKids ? `<button class="w-5 text-slate-500" data-act="node" ${da}>${open ? '▾' : '▸'}</button>` : '<span class="inline-block w-5"></span>'}<span class="text-[10px] text-slate-400 mr-1">${TYPE_LBL[n.type]}</span>${esc(n.name)} ${badges}</td>
      <td class="py-2 px-3">${STATUS_PILL(n.effective_status || n.status)}</td><td class="py-2 px-3 text-right num">${budget}</td>
      <td class="py-2 px-3 text-right num">${vnd(k.spend)}</td><td class="py-2 px-3 text-right num font-semibold">${fmt(k.results)}</td><td class="py-2 px-3 text-right num">${vnd(k.cpr)}</td>
      <td class="py-2 px-3 text-right num">${vnd(k.cpm)}</td><td class="py-2 px-3 text-right num">${pct(k.ctr, 2)}</td><td class="py-2 px-3 text-right num">${pct(k.cvr, 0)}</td><td class="py-2 px-3 text-right num">${fmt(k.frequency, 2)}</td>
      <td class="py-2 px-3 text-right num">${n.crm ? `${n.crm.qualified}/${n.crm.leads}` : ''}</td>
      <td class="py-2 px-3 text-right"><button class="btn ${on ? 'btn-r' : ''}" data-act="${on ? 'pause' : 'activate'}" ${da}>${on ? 'Tạm dừng' : 'Bật'}</button></td></tr>
      ${open && hasKids ? n.children.map(ch => row(ch, depth + 1)).join('') : ''}`;
  };
  $('#view').innerHTML = `<div class="card overflow-hidden"><div class="p-4 border-b text-xs text-slate-500">Mọi thao tác tắt/bật/ngân sách gửi thẳng lên Meta sau khi bạn xác nhận, có rào chắn (trần ngân sách, số thay đổi/ngày) và ghi vào Nhật ký để hoàn tác. "Khách tiềm năng" = khách đủ điều kiện / tổng khách nhắn từ mẫu (7 ngày, theo CRM).</div>
    <div class="overflow-x-auto scroll"><table class="w-full text-[13px]"><thead class="bg-slate-50 text-slate-500 text-xs"><tr>${H.map((h, i) => `<th class="py-2 px-3 ${i > 1 ? 'text-right' : 'text-left'}">${h}</th>`).join('')}</tr></thead><tbody class="divide-y divide-slate-100">${t.map(c => row(c, 0)).join('') || '<tr><td colspan="12" class="p-6 text-center text-slate-400">Chưa có dữ liệu. Bấm Đồng bộ ngay.</td></tr>'}</tbody></table></div></div>`;
}
function toggleNode(id) { expanded.has(id) ? expanded.delete(id) : expanded.add(id); try { localStorage.setItem('hh_exp', JSON.stringify([...expanded])); } catch {} viewAds(); }
// mọi nút thao tác dùng data-* (không nhúng tên vào onclick) để tên mẫu có ký tự lạ không thể chèn mã
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const d = el.dataset;
  if (d.act === 'node') toggleNode(d.id);
  else if (d.act === 'budget') editBudget(d.type, d.id, Number(d.budget), d.name);
  else if (d.act === 'pause' || d.act === 'activate') toggleStatus(d.type, d.id, d.act, d.name);
  else if (d.act === 'contact') openContact(d.psid);
});
async function toggleStatus(type, id, action, name) {
  if (!confirm(`${action === 'pause' ? 'TẠM DỪNG' : 'BẬT'} ${TYPE_LBL[type]} "${name}" trên Meta?`)) return;
  try { await post('/api/action', { type, id, action }); toast('Đã cập nhật trên Meta'); render(); } catch (e) { toast(e.message, false); }
}
async function editBudget(type, id, cur, name) {
  const v = prompt(`Ngân sách/ngày mới cho "${name}" (hiện ${fmt(cur)} đ). Nên đổi không quá 20% mỗi lần. Ví dụ: 180000, 180.000 hoặc 180k`, Math.round(cur * 1.2));
  if (!v) return;
  const t = String(v).trim().toLowerCase().replace(/\s|đ|vnd/g, '');
  const m = t.match(/^(\d{1,3}(?:[.,]\d{3})+|\d+)(k)?$/);
  if (!m) return toast('Số tiền không hợp lệ. Nhập dạng 180000, 180.000 hoặc 180k', false);
  const n = Number(m[1].replace(/[.,]/g, '')) * (m[2] ? 1000 : 1);
  if (!confirm(`Đổi ngân sách "${name}" từ ${fmt(cur)} đ thành ${fmt(n)} đ/ngày (${pct((n - cur) / cur, 0)})?`)) return;
  try { await post('/api/action', { type, id, action: 'set_budget', value: n }); toast('Đã đổi ngân sách trên Meta'); render(); } catch (e) { toast(e.message, false); }
}

// ---------------- ĐỀ XUẤT ----------------
let propFilter = 'pending';
async function viewProposals() {
  const list = await api('/api/proposals?status=' + propFilter);
  const ST = { pending: 'Chờ duyệt', executed: 'Đã thực hiện', rejected: 'Đã từ chối', failed: 'Lỗi', expired: 'Hết hiệu lực', approved: 'Đang thực hiện' };
  $('#view').innerHTML = `<div class="flex gap-2 mb-4">${['pending', 'all'].map(f => `<button class="btn ${propFilter === f ? 'btn-g' : ''}" onclick="propFilter='${f}';render()">${f === 'pending' ? 'Chờ duyệt' : 'Tất cả'}</button>`).join('')}<button class="btn" onclick="post('/api/sync',{what:'rules'}).then(render)">Chạy lại quy tắc</button></div>
  <div class="space-y-3">${list.map(p => `<div class="card p-4">
    <div class="flex flex-wrap items-center gap-2"><span class="pill ${SEV[p.severity]}">${SEV_LBL[p.severity]}</span><span class="font-semibold text-sm">${ACTION_LBL[p.action] || p.action}${p.action === 'set_budget' ? `: ${vnd(p.params.from)} → ${vnd(p.params.to)}` : ''}</span>
      <span class="text-xs text-slate-500">${TYPE_LBL[p.entity_type] || ''} · ${esc(p.entity_name)}</span><span class="text-xs text-slate-400 ml-auto">${esc(p.rule)} · ${dt(p.created_at)} · ${ST[p.status] || p.status}</span></div>
    <div class="text-sm text-slate-700 mt-2">${esc(p.reason)}</div>
    <details class="mt-2"><summary class="text-xs text-slate-500 cursor-pointer">Số liệu làm căn cứ</summary><div class="text-xs text-slate-600 mt-1 num">${Object.entries(p.evidence).map(([k, v]) => `<span class="inline-block mr-3">${esc(k)}: <b>${typeof v === 'number' ? fmt(v, v < 10 ? 3 : 0) : esc(Array.isArray(v) ? v.join(', ') : v)}</b></span>`).join('')}</div></details>
    ${p.result ? `<div class="text-xs mt-2 ${p.result.error ? 'text-rose-600' : 'text-emerald-700'}">${esc(p.result.error || p.result.note || ('Đã đổi ' + (p.result.old ?? '') + ' → ' + (p.result.new ?? '')))}</div>` : ''}
    ${p.status === 'pending' ? `<div class="mt-3 flex gap-2"><button class="btn btn-g" onclick="decide(${p.id},'approve','${p.action}')">${p.action === 'advice' ? 'Đã xử lý' : 'Duyệt & thực hiện'}</button><button class="btn" onclick="decide(${p.id},'reject')">Bỏ qua</button></div>` : ''}
  </div>`).join('') || '<div class="card p-6 text-center text-slate-400">Không có đề xuất.</div>'}</div>`;
}
async function decide(id, what, action) {
  if (what === 'approve' && action !== 'advice' && !confirm('Thực hiện thay đổi này trên Meta?')) return;
  try { await post(`/api/proposals/${id}/${what}`); toast(what === 'approve' ? 'Đã thực hiện' : 'Đã bỏ qua'); render(); } catch (e) { toast(e.message, false); render(); }
}

// ---------------- MẪU QUẢNG CÁO ----------------
async function viewCreatives() {
  const list = await api('/api/creatives');
  $('#view').innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${list.map((a, i) => {
    const k = a.last_7d, p = a.prev_7d, cr = a.crm;
    const cmp = (l, v, pv, f, up) => `<div class="p-2 rounded-lg bg-slate-50"><div class="text-[10px] text-slate-500">${l}</div><div class="font-bold num text-sm">${f(v)}</div>${pv != null && v != null && pv ? `<div class="text-[10px] ${(up ? v >= pv : v <= pv) ? 'text-emerald-700' : 'text-rose-600'}">trước: ${f(pv)}</div>` : ''}</div>`;
    return `<div class="card p-4"><div class="flex gap-3">
      ${a.thumbnail_url ? `<img src="${esc(a.thumbnail_url)}" class="w-24 h-24 object-cover rounded-lg border" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
      <div class="min-w-0"><div class="font-semibold">${esc(a.name)} ${STATUS_PILL(a.effective_status || a.status)}</div>
      ${a.title ? `<div class="text-sm mt-1">${esc(a.title)}</div>` : ''}<div class="text-xs text-slate-500 mt-1 line-clamp-3 whitespace-pre-line">${esc(a.body || '')}</div>
      <div class="text-[11px] text-slate-400 mt-1">CTA: ${esc(a.cta || '-')} · Chất lượng: ${esc(RANK(k.quality_ranking))} · Tương tác: ${esc(RANK(k.engagement_rate_ranking))} · Chuyển đổi: ${esc(RANK(k.conversion_rate_ranking))}</div></div></div>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">${cmp('Chi tiêu 7n', k.spend, p.spend, vnd, true)}${cmp('Tin', k.results, p.results, fmt, true)}${cmp('Chi phí/tin', k.cpr, p.cpr, vnd, false)}${cmp('CTR LK', k.ctr, p.ctr, v => pct(v, 2), true)}${cmp('CVR', k.cvr, p.cvr, pct, true)}${cmp('Tần suất', k.frequency, null, v => fmt(v, 2), false)}</div>
      ${k.video ? `<div class="text-[11px] font-semibold text-slate-500 mt-3">Video 7 ngày (so với 7 ngày trước)</div><div class="grid grid-cols-3 md:grid-cols-6 gap-2 mt-1">${cmp('Xem 3 giây', k.video.v3, p.video?.v3, fmt, true)}${cmp('Dừng xem', k.video.hook, p.video?.hook, v => pct(v, 1), true)}${cmp('Giữ tới 15s', k.video.hold, p.video?.hold, v => pct(v, 1), true)}${cmp('Xem 50%', k.video.r50, p.video?.r50, v => pct(v, 1), true)}${cmp('Xem hết', k.video.comp, p.video?.comp, v => pct(v, 1), true)}${cmp('Xem TB', k.video.avg_watch, p.video?.avg_watch, v => fmt(v, 1) + 's', true)}</div>` : ''}
      ${cr ? `<div class="text-xs text-slate-600 mt-2">CRM 7 ngày: ${cr.leads} khách nhắn · ${cr.engaged} có hỏi thật · <b>${cr.qualified} tiềm năng</b> · ${cr.booked} đặt (${cr.pax} người) · chi phí/khách tiềm năng ${vnd(cr.cost_per_qualified)}</div>` : '<div class="text-xs text-slate-400 mt-2">Chưa có khách gắn nguồn mẫu này (cần webhook để nhận ad_id).</div>'}
      <div class="h-28 mt-2"><canvas id="cr${i}"></canvas></div>
      ${a.advice.map(x => `<div class="mt-2 p-2 rounded-lg text-xs ${SEV[x.severity]}">${esc(x.reason)}</div>`).join('')}</div>`;
  }).join('') || '<div class="card p-6 text-slate-400">Chưa có mẫu quảng cáo.</div>'}</div>`;
  list.forEach((a, i) => charts.push(new Chart($('#cr' + i), { data: { labels: a.daily.map(d => dayLbl(d.date)), datasets: [
    { type: 'bar', label: 'Tin', data: a.daily.map(d => d.results), backgroundColor: '#a7f3d0', yAxisID: 'y' },
    { type: 'line', label: 'Chi phí/tin', data: a.daily.map(d => d.cpr && Math.round(d.cpr)), borderColor: '#2563eb', yAxisID: 'y1', tension: .3, pointRadius: 2 },
    ...(a.daily.some(d => d.video) ? [{ type: 'line', label: 'Dừng xem (%)', data: a.daily.map(d => d.video && d.video.hook != null ? +(d.video.hook * 100).toFixed(1) : null), borderColor: '#f59e0b', borderDash: [4, 3], yAxisID: 'y2', tension: .3, pointRadius: 1 }] : [])] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { font: { size: 9 } } }, y: { display: false }, y2: { display: false, min: 0, max: 100 }, y1: { position: 'right', beginAtZero: true, ticks: { font: { size: 9 }, callback: v => fmt(v / 1000) + 'k' } } } } })));
}

// ---------------- KHÁCH HÀNG ----------------
let crmStage = '', crmQ = '';
async function viewCrm() {
  const list = await api(`/api/crm/contacts?stage=${crmStage}&q=${encodeURIComponent(crmQ)}`);
  $('#view').innerHTML = `<div class="card overflow-hidden"><div class="p-4 border-b flex flex-wrap gap-2 items-center">
    <input id="crmQ" value="${esc(crmQ)}" placeholder="Tìm tên, SĐT, nội dung..." class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-64">
    ${[['', 'Tất cả'], ...Object.entries(STAGE).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button class="btn ${crmStage === k ? 'btn-g' : ''}" onclick="crmStage='${k}';render()">${l}</button>`).join('')}</div>
    <div class="overflow-x-auto scroll"><table class="w-full text-sm"><thead class="bg-slate-50 text-xs text-slate-500"><tr><th class="py-2 px-3 text-left">Khách</th><th class="py-2 px-3 text-left">Giai đoạn</th><th class="py-2 px-3 text-right">Điểm</th><th class="py-2 px-3 text-left">Nguồn</th><th class="py-2 px-3 text-left">Nhu cầu / vấn đề</th><th class="py-2 px-3 text-left">Tin gần nhất của khách</th><th class="py-2 px-3 text-right">Lúc</th></tr></thead>
    <tbody class="divide-y divide-slate-100">${list.map(c => `<tr class="hover:bg-slate-50 cursor-pointer" data-act="contact" data-psid="${esc(c.psid)}">
      <td class="py-2 px-3"><div class="font-semibold">${esc(c.name || c.psid)}</div><div class="text-[11px] text-slate-500 num">${esc(c.phone || '')}${c.pax ? ' · ' + esc(c.pax) + ' người' : ''}${c.travel_date ? ' · ' + esc(c.travel_date) : ''}</div></td>
      <td class="py-2 px-3">${stagePill(c.stage_manual || c.stage)}${c.payment_status ? `<span class="pill bg-purple-100 text-purple-800 font-semibold ml-1.5">${esc(c.payment_status)}${c.paid_amount ? ' (' + fmt(c.paid_amount) + 'đ)' : ''}</span>` : ''}</td><td class="py-2 px-3 text-right num font-bold">${c.score}</td>
      <td class="py-2 px-3 text-xs">${c.ad_id ? 'QC: ' + esc(c.ad_title || c.ad_id) : esc(c.source_type || 'Không rõ')}</td>
      <td class="py-2 px-3 whitespace-normal max-w-xs">${c.intents.map(k => `<span class="pill bg-emerald-50 text-emerald-800 mr-1">${esc(k)}</span>`).join('')}${c.problems.map(k => `<span class="pill bg-rose-50 text-rose-700 mr-1">${esc(k)}</span>`).join('')}</td>
      <td class="py-2 px-3 text-xs text-slate-600 max-w-sm truncate">${esc(c.last_text)}</td><td class="py-2 px-3 text-right text-xs text-slate-500">${dt(c.last_customer_msg_at || c.first_seen)}</td></tr>`).join('') || '<tr><td colspan="7" class="p-6 text-center text-slate-400">Chưa có khách.</td></tr>'}</tbody></table></div></div>`;
  const q = $('#crmQ'); q.onchange = () => { crmQ = q.value; render(); };
}
async function openContact(psid) {
  const c = await api('/api/crm/contact/' + encodeURIComponent(psid));
  const L = c.labels;
  openModal(c.name || c.psid, `
    <div class="flex flex-wrap gap-2 items-center text-sm">${stagePill(c.stage_manual || c.stage)} ${c.payment_status ? `<span class="pill bg-purple-100 text-purple-800 font-semibold">${esc(c.payment_status)}${c.paid_amount ? ' (' + fmt(c.paid_amount) + 'đ)' : ''}</span>` : ''} <span>Điểm <b>${esc(c.score)}</b></span> <span class="text-slate-500">Nguồn: ${c.ad_id ? 'Quảng cáo ' + esc(c.ad_title || c.ad_id) : esc(c.source_type || 'không rõ')}</span></div>
    <div class="mt-2 text-xs">${c.intents.map(k => `<span class="pill bg-emerald-50 text-emerald-800 mr-1">${esc(L[k] || k)}</span>`).join('')}${c.problems.map(k => `<span class="pill bg-rose-50 text-rose-700 mr-1">${esc(L[k] || k)}</span>`).join('')}</div>
    <div class="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm"><div class="text-xs text-emerald-800 font-semibold mb-1">Gợi ý trả lời (${esc(L[c.suggest.key] || 'hỏi thêm')})</div><div id="sugg">${esc(c.suggest.text)}</div>
      <button class="btn mt-2" onclick="navigator.clipboard.writeText(document.getElementById('sugg').textContent).then(()=>toast('Đã chép'))">Chép câu trả lời</button>
      <a class="btn mt-2 inline-block" target="_blank" rel="noopener" href="https://business.facebook.com/latest/inbox/all">Mở hộp thư Meta</a></div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
      <label>Giai đoạn<select id="fStage" class="w-full border rounded px-2 py-1"><option value="">Tự động (${esc((STAGE[c.stage] || [c.stage])[0])})</option><option value="booked" ${c.stage_manual === 'booked' ? 'selected' : ''}>Đã đặt</option><option value="lost" ${c.stage_manual === 'lost' ? 'selected' : ''}>Mất</option></select></label>
      <label>Tiến độ thanh toán<select id="fPayStatus" class="w-full border rounded px-2 py-1"><option value="">Chưa cọc</option><option value="Đã cọc" ${c.payment_status === 'Đã cọc' ? 'selected' : ''}>Đã cọc</option><option value="Cọc 50%" ${c.payment_status === 'Cọc 50%' ? 'selected' : ''}>Cọc 50%</option><option value="Cọc 100%" ${c.payment_status === 'Cọc 100%' ? 'selected' : ''}>Cọc 100% / Hoàn thành</option><option value="Gửi bill CK" ${c.payment_status === 'Gửi bill CK' ? 'selected' : ''}>Gửi bill CK</option></select></label>
      <label>SĐT<input id="fPhone" value="${esc(c.phone || '')}" class="w-full border rounded px-2 py-1"></label>
      <label>Số người<input id="fPax" type="number" value="${c.pax ?? ''}" class="w-full border rounded px-2 py-1"></label>
      <label>Ngày đi<input id="fDate" value="${esc(c.travel_date || '')}" class="w-full border rounded px-2 py-1"></label>
      <label>Số tiền đã cọc/CK (đ)<input id="fPaidAmt" type="number" value="${c.paid_amount ?? ''}" class="w-full border rounded px-2 py-1"></label>
      <label>Số khách đã đặt<input id="fBPax" type="number" value="${c.booked_pax ?? ''}" class="w-full border rounded px-2 py-1"></label>
      <label>Doanh thu (đ)<input id="fRev" type="number" value="${c.booked_revenue ?? ''}" class="w-full border rounded px-2 py-1"></label>
      <label class="col-span-2 md:col-span-3">Ghi chú<input id="fNote" value="${esc(c.note || '')}" class="w-full border rounded px-2 py-1"></label></div>
    <button class="btn btn-g mt-2" id="saveBtn">Lưu</button>
    <div class="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl max-h-80 overflow-y-auto scroll" id="chatBox">${c.messages.map(m => `<div class="flex ${m.from_page ? 'justify-end' : ''}"><div class="max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${m.from_page ? 'bg-emerald-600 text-white' : 'bg-white border'}">${esc(m.text)}<div class="text-[10px] opacity-60 mt-1">${dt(m.created_at)}</div></div></div>`).join('') || '<div class="text-xs text-slate-400">Chưa có tin.</div>'}</div>`);
  $('#saveBtn').onclick = () => saveContact(c.psid);
}
async function saveContact(psid) {
  const num = id => { const v = document.getElementById(id).value; return v === '' ? '' : Number(v); };
  try {
    await post('/api/crm/contact/' + encodeURIComponent(psid), { stage_manual: $('#fStage').value, payment_status: $('#fPayStatus').value, paid_amount: num('fPaidAmt'), phone: $('#fPhone').value, pax: num('fPax'), travel_date: $('#fDate').value, booked_pax: num('fBPax'), booked_revenue: num('fRev'), note: $('#fNote').value });
    toast('Đã lưu'); closeModal(); render();
  } catch (e) { toast(e.message, false); }
}

// ---------------- KẾ HOẠCH SALE ----------------
async function viewSales() {
  const [tasks, o] = await Promise.all([api('/api/sales/tasks'), api('/api/sales/overview?days=7')]);
  const PR = { 1: 'bg-rose-600', 2: 'bg-amber-500', 3: 'bg-blue-600', 4: 'bg-slate-400' };
  $('#view').innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
    <div class="card p-5 lg:col-span-2"><div class="font-bold">Việc cần làm hôm nay (${tasks.length})</div><div class="text-xs text-slate-500 mb-3">Xếp theo mức gấp rồi điểm lead. Bấm để mở hội thoại và câu trả lời gợi ý.</div>
      <div class="space-y-2 max-h-[560px] overflow-y-auto scroll">${tasks.map(t => `<div class="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer" data-act="contact" data-psid="${esc(t.psid)}">
        <div class="flex items-center gap-2"><span class="pill ${PR[t.priority]} text-white">${esc(t.action)}</span><b class="text-sm">${esc(t.name || t.psid)}</b>${stagePill(t.stage)}<span class="text-xs text-slate-500 ml-auto">Điểm ${t.score} · ${dt(t.last_at)}</span></div>
        <div class="text-xs text-slate-600 mt-1">${esc(t.why)}${t.phone ? ' · ' + esc(t.phone) : ''}${t.ad_title ? ' · từ QC ' + esc(t.ad_title) : ''}</div>
        <div class="text-xs text-emerald-800 mt-1 truncate">Gợi ý: ${esc(t.reply.text)}</div></div>`).join('') || '<div class="text-sm text-slate-400">Không có việc tồn đọng.</div>'}</div></div>
    <div class="space-y-5">
      <div class="card p-5"><div class="font-bold">Nguồn khách 7 ngày</div><div class="mt-2 space-y-2">${bars(Object.entries(o.sources).map(([k, n]) => ({ label: k, n })), o.total, 'bg-blue-500')}</div></div>
      <div class="card p-5"><div class="font-bold">Đề xuất cho sale & quảng cáo</div><div class="mt-2 space-y-2 text-sm">${o.feedback.map(f => `<div class="p-2 rounded-lg bg-emerald-50"><b>${esc(f.to)}:</b> ${esc(f.text)}</div>`).join('') || '<div class="text-xs text-slate-400">Chưa đủ dữ liệu.</div>'}</div></div>
    </div></div>
  <div class="card mt-5 overflow-hidden"><div class="p-4 border-b"><div class="font-bold">Phễu theo mẫu quảng cáo (7 ngày): từ tin nhắn đến khách đặt</div><div class="text-xs text-slate-500">Kết hợp số liệu Meta (chi tiêu) với CRM (khách thật). Đây là căn cứ để giữ, tăng hoặc tắt mẫu.</div></div>
    <div class="overflow-x-auto scroll"><table class="w-full text-sm num"><thead class="bg-slate-50 text-xs text-slate-500"><tr>${['Mẫu quảng cáo', 'Chi tiêu 7n', 'Tin (Meta)', 'Khách (CRM)', 'Có hỏi thật', 'Tiềm năng', 'Đã đặt', 'Số người', 'Doanh thu', 'Chi phí/khách', 'Chi phí/tiềm năng', 'Chi phí/người đặt'].map((h, i) => `<th class="py-2 px-3 ${i ? 'text-right' : 'text-left'}">${h}</th>`).join('')}</tr></thead>
    <tbody class="divide-y divide-slate-100">${o.funnel_by_ad.map(r => `<tr><td class="py-2 px-3">${esc(r.ad_name || r.ad_id)}</td><td class="py-2 px-3 text-right">${vnd(r.spend)}</td><td class="py-2 px-3 text-right">${fmt(r.meta_results)}</td><td class="py-2 px-3 text-right">${r.leads}</td><td class="py-2 px-3 text-right">${r.engaged}</td><td class="py-2 px-3 text-right font-bold">${r.qualified}</td><td class="py-2 px-3 text-right">${r.booked}</td><td class="py-2 px-3 text-right">${r.pax}</td><td class="py-2 px-3 text-right">${vnd(r.revenue)}</td><td class="py-2 px-3 text-right">${vnd(r.cost_per_lead)}</td><td class="py-2 px-3 text-right">${vnd(r.cost_per_qualified)}</td><td class="py-2 px-3 text-right">${vnd(r.cost_per_pax)}</td></tr>`).join('') || '<tr><td colspan="12" class="p-6 text-center text-slate-400">Chưa có dữ liệu.</td></tr>'}</tbody></table></div></div>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
    <div class="card p-5"><div class="font-bold">Câu hỏi của khách</div><div class="mt-2 space-y-2">${bars(o.intents, o.total)}</div></div>
    <div class="card p-5"><div class="font-bold">Giờ khách nhắn tin</div><div class="h-56 mt-2"><canvas id="cHours"></canvas></div></div></div>`;
  charts.push(new Chart($('#cHours'), { type: 'bar', data: { labels: o.hours.map((_, h) => h + 'h'), datasets: [{ data: o.hours, backgroundColor: '#10b981' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }));
}

// ---------------- PHÂN KHÚC ----------------
async function viewSegments() {
  const b = await api('/api/breakdowns');
  const NAMES = { age: 'Độ tuổi', gender: 'Giới tính', placement: 'Vị trí hiển thị', hour: 'Khung giờ (giờ tài khoản)' };
  const order = ['age', 'gender', 'placement', 'hour'];
  $('#view').innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${order.map(kind => {
    const r = b.find(x => x.kind === kind); if (!r) return '';
    const rows = r.data.filter(x => x.spend > 0); const tS = rows.reduce((s, x) => s + x.spend, 0), tR = rows.reduce((s, x) => s + x.results, 0);
    return `<div class="card overflow-hidden"><div class="p-4 border-b"><div class="font-bold">${NAMES[kind]}</div><div class="text-xs text-slate-500">7 ngày · cập nhật ${ago(r.updated_at)} · Chỉ số HQ = % tin / % chi tiêu</div></div>
      <div class="overflow-x-auto scroll max-h-96"><table class="w-full text-sm num"><thead class="bg-slate-50 text-xs text-slate-500 sticky top-0"><tr><th class="py-2 px-3 text-left">Nhóm</th><th class="py-2 px-3 text-right">Chi tiêu</th><th class="py-2 px-3 text-right">Tin</th><th class="py-2 px-3 text-right">Chi phí/tin</th><th class="py-2 px-3 text-right">CTR LK</th><th class="py-2 px-3 text-right">Chỉ số HQ</th></tr></thead>
      <tbody class="divide-y divide-slate-100">${rows.map(x => { const idx = tR && tS ? (x.results / tR) / (x.spend / tS) : null; return `<tr><td class="py-2 px-3">${esc(x.key)}</td><td class="py-2 px-3 text-right">${vnd(x.spend)}</td><td class="py-2 px-3 text-right">${x.results}</td><td class="py-2 px-3 text-right">${x.results ? vnd(x.spend / x.results) : '-'}</td><td class="py-2 px-3 text-right">${pct(x.impressions ? x.link_clicks / x.impressions : null, 2)}</td><td class="py-2 px-3 text-right font-semibold ${idx >= 1 ? 'text-emerald-700' : 'text-rose-600'}">${fmt(idx, 2)}</td></tr>`; }).join('')}</tbody></table></div></div>`;
  }).join('') || '<div class="card p-6 text-slate-400">Chưa có dữ liệu.</div>'}</div>`;
}

// ---------------- NHẬT KÝ ----------------
async function viewLog() {
  const list = await api('/api/changes');
  const SRC = { proposal: 'Đề xuất đã duyệt', manual: 'Thủ công', external: 'Ngoài hệ thống' };
  $('#view').innerHTML = `<div class="card overflow-hidden"><div class="p-4 border-b text-xs text-slate-500">Mọi thay đổi trạng thái/ngân sách, gồm cả thay đổi làm trực tiếp trong Ads Manager (phát hiện khi đồng bộ).</div><div class="overflow-x-auto scroll"><table class="w-full text-sm"><thead class="bg-slate-50 text-xs text-slate-500"><tr><th class="py-2 px-3 text-left">Lúc</th><th class="py-2 px-3 text-left">Đối tượng</th><th class="py-2 px-3 text-left">Thay đổi</th><th class="py-2 px-3 text-left">Nguồn</th><th class="py-2 px-3 text-left">Kết quả</th><th></th></tr></thead>
  <tbody class="divide-y divide-slate-100">${list.map(c => `<tr><td class="py-2 px-3 text-xs">${dt(c.ts)}</td><td class="py-2 px-3">${TYPE_LBL[c.entity_type] || ''} ${esc(c.entity_name || c.entity_id)}</td>
    <td class="py-2 px-3 num">${c.field === 'daily_budget' ? 'Ngân sách' : 'Trạng thái'}: ${esc(c.field === 'daily_budget' ? vnd(Number(c.old_value)) : c.old_value)} → <b>${esc(c.field === 'daily_budget' ? vnd(Number(c.new_value)) : c.new_value)}</b></td>
    <td class="py-2 px-3 text-xs">${SRC[c.source] || c.source}</td><td class="py-2 px-3 text-xs ${c.ok ? 'text-emerald-700' : 'text-rose-600'}">${c.ok ? 'Thành công' : esc(c.error)}</td>
    <td class="py-2 px-3">${c.ok && c.source !== 'external' ? `<button class="btn" onclick="undoChange(${c.id})">Hoàn tác</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="p-6 text-center text-slate-400">Chưa có thay đổi.</td></tr>'}</tbody></table></div></div>`;
}
async function undoChange(id) { if (!confirm('Đặt lại giá trị cũ trên Meta?')) return; try { await post(`/api/changes/${id}/undo`); toast('Đã hoàn tác'); render(); } catch (e) { toast(e.message, false); } }

// ---------------- CÀI ĐẶT ----------------
const SET_LBL = {
  business: ['Kinh doanh', { price_per_pax: 'Giá gói / người (đ)', margin_per_extra_pax: 'Lãi thêm mỗi khách (đ)', margin_avg_pax: 'Lãi bình quân / khách (đ)', target_cost_per_result: 'Mục tiêu chi phí / tin (đ)', max_cost_per_result: 'Chi phí / tin tối đa (đ)', target_cost_per_qualified_lead: 'Mục tiêu chi phí / khách tiềm năng (đ)', max_cost_per_booking_pax: 'Trần chi phí / người đặt (đ)' }],
  guardrails: ['Rào chắn', { max_daily_budget_per_adset: 'Trần ngân sách/ngày mỗi nhóm (đ)', max_total_daily_budget: 'Trần tổng ngân sách/ngày (đ)', budget_step_pct: 'Bước tăng/giảm ngân sách (%)', min_hours_between_changes: 'Giờ tối thiểu giữa 2 lần đổi ngân sách', max_changes_per_day: 'Số thay đổi tối đa/ngày', protect_learning: 'Không đụng nhóm đang học', min_results_to_judge: 'Số tin tối thiểu để đánh giá', stop_loss_multiplier: 'Cắt lỗ khi tiêu ≥ N lần mục tiêu mà 0 tin', fatigue_frequency_7d: 'Ngưỡng tần suất mỏi (7 ngày)', fatigue_ctr_drop_pct: 'Ngưỡng CTR giảm báo mỏi (%)' }],
  crm: ['Khách hàng', { reply_sla_minutes: 'Thời hạn trả lời (phút)', follow_up_after_days: 'Follow-up sau (ngày)', stale_after_days: 'Coi là nguội sau (ngày)' }],
  sync: ['Đồng bộ', { ads_every_minutes: 'Đồng bộ quảng cáo mỗi (phút)', crm_every_minutes: 'Đồng bộ tin nhắn mỗi (phút)', rules_every_minutes: 'Chạy quy tắc mỗi (phút)', insights_days: 'Số ngày lấy số liệu' }]
};
async function viewSettings() {
  const [s, st] = await Promise.all([api('/api/settings'), api('/api/status')]);
  $('#view').innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-2 gap-5">${Object.entries(SET_LBL).map(([sec, [title, fields]]) => `<div class="card p-5"><div class="font-bold mb-3">${title}</div><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${Object.entries(fields).map(([k, l]) => typeof s[sec][k] === 'boolean'
    ? `<label class="text-xs flex items-center gap-2"><input type="checkbox" data-s="${sec}" data-k="${k}" ${s[sec][k] ? 'checked' : ''}>${l}</label>`
    : `<label class="text-xs text-slate-600">${l}<input type="number" step="any" data-s="${sec}" data-k="${k}" value="${s[sec][k]}" class="mt-1 w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm num"></label>`).join('')}</div></div>`).join('')}
    <div class="card p-5"><div class="font-bold mb-2">Kết nối</div><div class="text-sm space-y-1">
      <div>Quảng cáo: ${st.configured.ads ? '✅ đã cấu hình' : '❌ chưa có token / ID tài khoản'}</div><div>Page (tin nhắn): ${st.configured.page ? '✅' : '❌ chưa có page_id'}</div>
      <div>Webhook: ${st.configured.webhook ? '✅ có app_secret' : '❌ chưa có app_secret'} · lần nhận cuối ${ago(st.webhook_last_at)}</div>
      <div class="text-xs text-slate-500">Thay đổi hôm nay: ${st.changes_today}/${st.guardrails.max_changes_per_day}</div></div>
      <div class="flex flex-wrap gap-2 mt-3"><button class="btn" onclick="syncNow('ads')">Đồng bộ quảng cáo</button><button class="btn" onclick="syncNow('crm')">Đồng bộ tin nhắn</button><button class="btn" onclick="post('/api/webhook/subscribe').then(()=>toast('Đã đăng ký webhook cho Page')).catch(e=>toast(e.message,false))">Đăng ký webhook cho Page</button></div></div></div>
  <button class="btn btn-g mt-5" onclick="saveSettings()">Lưu cài đặt</button>`;
}
async function saveSettings() {
  const body = {};
  document.querySelectorAll('[data-s]').forEach(i => { (body[i.dataset.s] = body[i.dataset.s] || {})[i.dataset.k] = i.type === 'checkbox' ? i.checked : Number(i.value); });
  try { await post('/api/settings', body); toast('Đã lưu, quy tắc đã chạy lại'); } catch (e) { toast(e.message, false); }
}

// ---------------- điều hướng ----------------
const VIEWS = { overview: viewOverview, ads: viewAds, proposals: viewProposals, creatives: viewCreatives, crm: viewCrm, sales: viewSales, segments: viewSegments, log: viewLog, settings: viewSettings };
// chạy tuần tự để hai lần vẽ không phá biểu đồ của nhau
let renderChain = Promise.resolve();
function render() { renderChain = renderChain.then(doRender, doRender); return renderChain; }
async function doRender() {
  charts.splice(0).forEach(c => c.destroy());
  try {
    const st = await refreshStatus();
    const pend = (await api('/api/proposals')).length;
    renderTabs(pend);
    await (VIEWS[tab] || viewOverview)();
  } catch (e) { $('#view').innerHTML = `<div class="card p-6 text-rose-600">${esc(e.message)}</div>`; }
}
render();
setInterval(() => { if ($('#modal').classList.contains('hidden') && document.visibilityState === 'visible' && ['overview', 'proposals', 'sales'].includes(tab)) render(); }, 60000);
