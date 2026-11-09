// Kiểm thử end-to-end với Meta API giả lập. Chạy: npm test
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const fake = require('./fake-meta');

(async () => {
  const meta = await fake.start(0);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hh-test-'));
  const cfg = {
    meta: { access_token: 'TEST_TOKEN', ad_account_id: '2200185813869842', page_id: 'PAGE123', page_access_token: '', app_secret: 'APPSECRET', webhook_verify_token: 'verifyme' },
    server: { host: '127.0.0.1', port: 0, dashboard_password: 'matkhau-test-123' },
    guardrails: { max_changes_per_day: 10 }
  };
  fs.writeFileSync(path.join(tmp, 'config.json'), JSON.stringify(cfg));
  process.env.CONFIG_PATH = path.join(tmp, 'config.json');
  process.env.DATA_DIR = tmp;
  process.env.META_BASE_URL = `http://127.0.0.1:${meta.address().port}`;
  const { server } = require('../src/server');
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const req = async (p, opts = {}) => {
    const r = await fetch(base + p, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'hh', cookie, ...(opts.headers || {}) } });
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
    return { status: r.status, body: j, headers: r.headers };
  };
  const post = (p, b) => req(p, { method: 'POST', body: JSON.stringify(b || {}) });
  let passed = 0;
  const ok = (cond, msg) => { assert.ok(cond, msg); passed++; console.log('  ✓ ' + msg); };

  console.log('Đăng nhập');
  ok((await req('/api/status')).status === 401, 'API chặn khi chưa đăng nhập');
  ok((await post('/login', { password: 'sai' })).status === 401, 'Sai mật khẩu bị từ chối');
  const lg = await post('/login', { password: 'matkhau-test-123' });
  cookie = lg.headers.get('set-cookie').split(';')[0];
  ok(lg.status === 200 && cookie.startsWith('hh='), 'Đăng nhập đúng nhận cookie');
  ok((await fetch(base + '/api/sync', { method: 'POST', headers: { cookie } })).status === 403, 'Yêu cầu ghi thiếu header chống CSRF bị chặn');

  console.log('Đồng bộ quảng cáo & tin nhắn');
  const s = await post('/api/sync', { what: 'all' });
  ok(s.status === 200 && s.body.ads.campaigns === 2 && s.body.ads.ads === 2, 'Đồng bộ 2 chiến dịch, 2 mẫu');
  ok(s.body.crm.conversations === 100, 'Đồng bộ 100 hội thoại');
  const ov = (await req('/api/overview?win=last_7d')).body;
  ok(ov.account.last_7d.results > 0 && ov.daily.length >= 7, 'Tổng quan có số liệu 7 ngày và chuỗi theo ngày');
  const totalSpend = ov.daily.reduce((a, d) => a + d.spend, 0);
  ok(Math.round(totalSpend) === 2485538, 'Tổng chi tiêu theo ngày khớp số thật 2.485.538 đ');
  const tree = (await req('/api/tree?win=last_7d')).body;
  ok(tree.length === 2 && tree[0].children[0].children.length === 1, 'Cây chiến dịch > nhóm > mẫu đúng cấu trúc');
  const st = (await req('/api/status')).body;
  ok(st.account.currency === 'VND' && st.ads_synced_at, 'Trạng thái có tài khoản và thời điểm đồng bộ');
  const bd = (await req('/api/breakdowns')).body;
  ok(bd.length === 4, 'Có 4 bảng chia nhỏ (tuổi, giới, vị trí, giờ)');

  console.log('Quy tắc & đề xuất');
  const props = (await req('/api/proposals')).body;
  console.log('    ' + props.map(p => `${p.rule}:${p.action}:${p.entity_name}`).join(' | '));
  ok(props.some(p => p.rule === 'quality_ranking'), 'Phát hiện mẫu chất lượng thấp (BELOW_AVERAGE_20)');
  ok(props.some(p => p.rule === 'overlap'), 'Phát hiện 2 nhóm trùng khu vực');
  ok(props.every(p => p.reason && p.evidence), 'Mọi đề xuất có lý do và số liệu căn cứ');

  console.log('Thực thi có duyệt, rào chắn, hoàn tác');
  const adsetId = tree.find(c => c.name.startsWith('1510')).children[0].id;
  const tooBig = await post('/api/action', { type: 'adset', id: adsetId, action: 'set_budget', value: 9000000 });
  ok(tooBig.status === 400 && /rào chắn/.test(tooBig.body.error), 'Chặn ngân sách vượt trần');
  const r1 = await post('/api/action', { type: 'adset', id: adsetId, action: 'set_budget', value: 180000 });
  ok(r1.status === 200 && meta.state.adsets.find(a => a.id === adsetId).daily_budget === '180000', 'Đổi ngân sách 150k → 180k gửi đúng lên Meta (VND không nhân 100)');
  const r2 = await post('/api/action', { type: 'adset', id: adsetId, action: 'set_budget', value: 200000 });
  ok(r2.status === 400 && /giờ qua/.test(r2.body.error), 'Chặn đổi ngân sách lần 2 trong 72 giờ');
  const log = (await req('/api/changes')).body;
  const ch = log.find(c => c.field === 'daily_budget' && c.ok);
  ok(ch && ch.old_value === '150000' && ch.new_value === '180000', 'Nhật ký ghi giá trị cũ/mới');
  const un = await post(`/api/changes/${ch.id}/undo`);
  ok(un.status === 200 && meta.state.adsets.find(a => a.id === adsetId).daily_budget === '150000', 'Hoàn tác đưa ngân sách về 150k');
  const adId = tree[0].children[0].children[0].id;
  const pz = await post('/api/action', { type: 'ad', id: adId, action: 'pause' });
  ok(pz.status === 200 && meta.state.ads.find(a => a.id === adId).status === 'PAUSED', 'Tạm dừng mẫu quảng cáo trên Meta');
  await post('/api/action', { type: 'ad', id: adId, action: 'activate' });
  ok(meta.state.ads.find(a => a.id === adId).status === 'ACTIVE', 'Bật lại mẫu quảng cáo');
  // thay đổi bên ngoài được phát hiện
  meta.state.campaigns[0].status = 'PAUSED';
  await post('/api/sync', { what: 'ads' });
  ok((await req('/api/changes')).body.some(c => c.source === 'external'), 'Phát hiện thay đổi làm ngoài hệ thống (Ads Manager)');
  meta.state.campaigns[0].status = 'ACTIVE';
  const adv = (await req('/api/proposals')).body.find(p => p.action === 'advice');
  ok((await post(`/api/proposals/${adv.id}/approve`)).status === 200, 'Duyệt đề xuất tư vấn (đánh dấu đã xử lý)');

  console.log('Webhook Messenger & nguồn quảng cáo');
  ok((await req('/webhook?hub.mode=subscribe&hub.verify_token=verifyme&hub.challenge=123')).body === 123, 'Xác minh webhook trả challenge');
  const payload = JSON.stringify({ object: 'page', entry: [{ id: 'PAGE123', time: Date.now(), messaging: [
    { sender: { id: 'PSID_NEW' }, recipient: { id: 'PAGE123' }, timestamp: Date.now(), referral: { source: 'ADS', type: 'OPEN_THREAD', ad_id: adId, ads_context_data: { ad_title: 'Lễ Đền Ứng Thiên' } } },
    { sender: { id: 'PSID_NEW' }, recipient: { id: 'PAGE123' }, timestamp: Date.now() + 1, message: { mid: 'm_new_1', text: 'Cho hỏi đoàn hội người cao tuổi 30 người đi thứ 7 tuần sau giá bao nhiêu, sđt 0912 345 678' } }] }] });
  const sig = 'sha256=' + crypto.createHmac('sha256', 'APPSECRET').update(payload).digest('hex');
  ok((await req('/webhook', { method: 'POST', body: payload, headers: { 'x-hub-signature-256': 'sha256=bad' } })).status === 401, 'Webhook sai chữ ký bị từ chối');
  ok((await req('/webhook', { method: 'POST', body: payload, headers: { 'x-hub-signature-256': sig } })).status === 200, 'Webhook đúng chữ ký được nhận');
  const c = (await req('/api/crm/contact/PSID_NEW')).body;
  ok(c.ad_id === adId && c.source_type === 'ADS', 'Khách mới được gắn nguồn đúng mẫu quảng cáo');
  ok(c.phone === '0912345678' && c.pax === 30 && c.stage === 'qualified', 'Nhận diện SĐT, 30 người, giai đoạn Tiềm năng');
  ok(c.intents.includes('gia') && c.intents.includes('doan_rieng') && c.intents.includes('ngay_di'), 'Phân loại nhu cầu: giá, đoàn riêng, ngày đi');
  ok(c.suggest && c.suggest.text.length > 20, 'Có câu trả lời gợi ý');

  console.log('CRM & kế hoạch sale');
  const all = (await req('/api/crm/contacts')).body;
  ok(all.length === 101, '101 khách trong CRM');
  const phones = all.filter(x => x.phone).map(x => x.phone).sort();
  ok(JSON.stringify(phones) === JSON.stringify(['0902275762', '0912345678', '0932286060', '0936123582']), 'SĐT chỉ lấy số khách tự gửi, loại hotline của page (' + phones.length + ' số)');
  const so = (await req('/api/sales/overview?days=3650')).body;
  ok(so.total === 101 && so.intents[0].key === 'gia', 'Câu hỏi nhiều nhất là hỏi giá (từ tin của khách)');
  ok(so.feedback.length > 0, 'Có đề xuất vòng phản hồi về quảng cáo');
  ok(Array.isArray((await req('/api/sales/tasks')).body), 'Danh sách việc cần làm');
  const upd = await post('/api/crm/contact/PSID_NEW', { stage_manual: 'booked', booked_pax: 30, booked_revenue: 15000000 });
  ok(upd.body.stage_manual === 'booked' && upd.body.booked_pax === 30, 'Ghi nhận khách đã đặt 30 người');
  const fa = (await req('/api/sales/overview?days=3650')).body.funnel_by_ad.find(r => r.ad_id === adId);
  ok(fa && fa.pax === 30 && fa.revenue === 15000000, 'Phễu theo mẫu tính được số người đặt và doanh thu');
  const payPayload = JSON.stringify({ object: 'page', entry: [{ id: 'PAGE123', time: Date.now(), messaging: [
    { sender: { id: 'PSID_PAY' }, recipient: { id: 'PAGE123' }, timestamp: Date.now(), message: { mid: 'm_pay_1', text: 'Chị vừa ck 50% cọc 1tr5 rồi em check nhé' } },
    { sender: { id: 'PAGE123' }, recipient: { id: 'PSID_PAY' }, timestamp: Date.now() + 10, message: { mid: 'm_pay_2', text: 'Dạ bên em đã nhận được 1.500.000 đ cọc của chị rồi ạ' } }
  ] }] });
  const paySig = 'sha256=' + crypto.createHmac('sha256', 'APPSECRET').update(payPayload).digest('hex');
  await req('/webhook', { method: 'POST', body: payPayload, headers: { 'x-hub-signature-256': paySig } });
  const cPay = (await req('/api/crm/contact/PSID_PAY')).body;
  ok(cPay.payment_status === 'Cọc 50%' && cPay.paid_amount === 1500000 && cPay.stage === 'qualified', 'Tự động nhận diện tiến độ thanh toán (Cọc 50%, 1.500.000 đ) từ tin nhắn');

  console.log('Cài đặt');
  const se = await post('/api/settings', { business: { target_cost_per_result: 9000, hacker: 1 }, guardrails: { max_changes_per_day: 'x' } });
  ok(se.body.business.target_cost_per_result === 9000 && se.body.business.hacker === undefined && se.body.guardrails.max_changes_per_day === 10, 'Lưu cài đặt hợp lệ, bỏ trường lạ/sai kiểu');
  const se2 = await post('/api/settings', { business: { target_cost_per_result: 12000 } });
  ok(se2.status === 200, 'Nâng mục tiêu chi phí/tin để kiểm tra đề xuất tăng ngân sách');
  const sp = (await req('/api/proposals')).body.find(p => p.rule === 'scale_up' && p.entity_type === 'campaign');
  ok(sp && sp.params.from === 150000 && sp.params.to === 180000, 'Đề xuất tăng ngân sách chiến dịch CBO 150k → 180k (+20%)');
  meta.state.campaigns.find(c => c.id === sp.entity_id).daily_budget = '170000'; // ai đó sửa trong Ads Manager
  const ap = await post(`/api/proposals/${sp.id}/approve`);
  ok(ap.status === 400 && /đã khác/.test(ap.body.error) && meta.state.campaigns.find(c => c.id === sp.entity_id).daily_budget === '170000', 'Không ghi đè khi ngân sách trên Meta đã bị sửa sau lúc lập đề xuất');
  await post('/api/sync', { what: 'rules' });
  ok(!(await req('/api/proposals')).body.some(p => p.dedupe_key === sp.dedupe_key), 'Đề xuất lỗi không bị tạo lại ngay');
  ok((await post('/api/action', { type: 'adset', id: adsetId, action: 'set_budget', value: 'abc' })).status === 400, 'Từ chối ngân sách không phải số');
  const cr = (await req('/api/creatives')).body;
  ok(cr.length === 2 && cr[0].daily.length > 0, 'Trang mẫu quảng cáo có số liệu theo ngày');
  const crv = cr.find(x => x.last_7d.video);
  ok(crv && crv.last_7d.video.hook > 0.3 && crv.last_7d.video.hook < 0.7 && crv.last_7d.video.avg_watch > 10 && crv.daily.some(d => d.video && d.video.hold > 0), 'Mẫu quảng cáo có chỉ số video: dừng xem, giữ 15 giây, thời gian xem TB');

  console.log(`\nĐạt ${passed} kiểm tra.`);
  server.close(); meta.close();
  process.exit(0);
})().catch(e => { console.error('\n✗ ' + e.message); console.error(e.stack); process.exit(1); });
