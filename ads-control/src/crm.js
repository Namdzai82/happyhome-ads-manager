// CRM Messenger: lưu tin nhắn, gắn nguồn quảng cáo (ad_id từ referral), phân loại nhu cầu/vấn đề theo TIN CỦA KHÁCH, giai đoạn và điểm lead
const db = require('./db');
const meta = require('./meta');
const config = require('./config');

const nowIso = () => new Date().toISOString();
const norm = s => String(s || '').toLowerCase().normalize('NFC');

// Nhu cầu: khách hỏi gì
const INTENTS = [
  { key: 'gia', label: 'Hỏi giá', re: /giá|bao nhiêu|bn\b|bnhieu|mấy tiền|tiền|chi phí|báo giá/ },
  { key: 'ghep_doan', label: 'Khách lẻ ghép đoàn', re: /ghép|đi lẻ|1 mình|một mình|vài người|2 người|3 người|mấy người đi được/ },
  { key: 'doan_rieng', label: 'Đoàn riêng / hội', re: /đoàn (riêng|mình|hội|của)|cả hội|hội (người cao tuổi|phụ nữ|cựu|bạn)|cơ quan|công ty|lớp|xóm/ },
  { key: 'lich_trinh', label: 'Lịch trình', re: /lịch trình|du ngoạn|đi chơi|đi những|tham quan|đền|chùa|lễ/ },
  { key: 'ngay_di', label: 'Ngày đi', re: /ngày nào|hôm nào|bao giờ|khi nào|thứ \d|chủ nhật|cuối tuần|tuần (này|sau)|mùng|rằm|\d{1,2}\s*[/-]\s*\d{1,2}|tháng \d/ },
  { key: 'xe_don', label: 'Xe / điểm đón', re: /\bxe\b|đón|điểm hẹn|big ?c|xuất phát|đưa đón/ },
  { key: 'phong_an', label: 'Phòng / ăn uống', re: /phòng|ăn|bữa|lẩu|ngủ|nghỉ trưa/ },
  { key: 'tre_em', label: 'Trẻ em / người già', re: /trẻ em|trẻ nhỏ|em bé|người già|người cao tuổi|ông bà|tuổi cao|bố mẹ già/ },
  { key: 'dat_coc', label: 'Muốn đặt / cọc', re: /đặt|cọc|chốt|đăng ký|giữ chỗ|book|chuyển khoản|stk|số tài khoản/ }
];
// Vấn đề / rào cản
const PROBLEMS = [
  { key: 'dat', label: 'Chê đắt / hỏi giảm giá', re: /đắt|cao quá|giảm giá|bớt|rẻ hơn|khuyến mãi|ưu đãi/ },
  { key: 'xa', label: 'Ngại xa / đường đi', re: /\bxa\b|đường đi|bao lâu|mấy tiếng|bao xa/ },
  { key: 'suc_khoe', label: 'Sức khỏe / đi lại khó', re: /sức khỏe|đi lại khó|đau chân|xe lăn|say xe|leo|bậc thang|mệt/ },
  { key: 'chua_du_nguoi', label: 'Chưa đủ người', re: /chưa đủ|ít người|gom|rủ thêm/ },
  { key: 'can_ban_bac', label: 'Cần bàn bạc / hẹn lại', re: /bàn|hỏi lại|hỏi ý|để (xem|tính)|báo sau|gọi sau|suy nghĩ|hẹn/ },
  { key: 'thoi_tiet', label: 'Lo thời tiết', re: /mưa|nắng|rét|lạnh|thời tiết|bão/ },
  { key: 'tin_cay', label: 'Cần tin tưởng / xem thực tế', re: /lừa|uy tín|thật không|ảnh thật|review|đánh giá|địa chỉ/ }
];

// SĐT Việt Nam (di động 03/05/07/08/09, cố định 02), không dính vào dãy số dài hơn (ví dụ ID bình luận)
const PHONE_RE_G = /(?<!\d)(?:\+?84|0)[235789](?:[\s.\-]?\d){8}(?!\d)/g;
const normPhone = p => p.replace(/\D/g, '').replace(/^84/, '0');

// Số do page gửi trước khi khách nhắc tới (hotline, số nhân viên) => không phải SĐT khách
function pagePhones() {
  const out = new Set(), said = {};
  for (const m of db.all('SELECT psid, from_page, text FROM messages WHERE text IS NOT NULL ORDER BY psid, created_at')) {
    const s = said[m.psid] || (said[m.psid] = new Set());
    for (const p of (m.text.match(PHONE_RE_G) || [])) { const n = normPhone(p); if (m.from_page) { if (!s.has(n)) out.add(n); } else s.add(n); }
  }
  return out;
}
function customerPhone(custMsgs, pp) {
  for (const m of custMsgs) for (const p of (m.text.match(PHONE_RE_G) || [])) { const n = normPhone(p); if (!pp.has(n)) return n; }
  return null;
}
const DATE_RE = /thứ [2-7]|thứ (hai|ba|tư|năm|sáu|bảy)|chủ nhật|cuối tuần|tuần (này|sau|tới)|mùng \d{1,2}|rằm|\d{1,2}\s*[/-]\s*\d{1,2}|ngày \d{1,2}|tháng \d{1,2}|ngày mai|hôm nay/;
const PAX_RE = /(\d{1,3})\s*(người|khách|bà|cụ|suất|vé|thành viên|ng\b)/;

// Mẫu trả lời gợi ý dựa trên thông tin gói trong tài liệu kinh doanh. Hãy kiểm tra và chỉnh cho đúng thực tế trong config.json mục crm.templates
const DEFAULT_TEMPLATES = {
  gia: 'Dạ gói đi lễ Đền Ứng Thiên + nghỉ dưỡng HappyHome là 500.000đ/người trọn gói: xe đón tại Hà Nội, 3 bữa (sáng, trưa lẩu Thái, xế), phòng nghỉ, ngâm chân thảo mộc, chụp ảnh. Cô/chú đi bao nhiêu người và dự định ngày nào để em giữ chỗ ạ?',
  ghep_doan: 'Dạ cô/chú đi ít người vẫn có thể ghép cùng đoàn khác ạ. Cô/chú cho em xin ngày muốn đi và số điện thoại để em xếp vào đoàn gần nhất nhé.',
  doan_rieng: 'Dạ đoàn riêng bên em bố trí xe và lịch riêng, giá 500.000đ/người trọn gói. Cô/chú cho em xin số người dự kiến, ngày đi và số điện thoại để em gửi lịch trình chi tiết ạ.',
  lich_trinh: 'Dạ lịch trình 1 ngày: 7h đón tại Hà Nội, 8h30 đến HappyHome, 9h-11h30 lễ Đền Ứng Thiên có người dẫn, 12h ăn trưa lẩu Thái, chiều nghỉ ngơi ngâm chân, bơi, câu cá, 16h30 lên xe về. Cô/chú định đi ngày nào ạ?',
  ngay_di: 'Dạ ngày đó bên em còn chỗ ạ. Cô/chú đi bao nhiêu người và cho em xin số điện thoại để em giữ chỗ nhé.',
  xe_don: 'Dạ xe đón tại điểm hẹn ở Hà Nội và trả về tận nơi ạ. Cô/chú ở khu vực nào để em báo điểm đón gần nhất?',
  phong_an: 'Dạ đoàn có phòng nghỉ trưa riêng, bữa trưa lẩu Thái, buổi sáng bánh mì trên xe và bữa xế cháo ạ.',
  tre_em: 'Dạ lịch trình nhẹ nhàng, phù hợp người lớn tuổi, có phòng nghỉ trưa và người dẫn đoàn hỗ trợ suốt chuyến ạ.',
  dat_coc: 'Dạ em cảm ơn cô/chú. Cô/chú cho em xin họ tên, số điện thoại, số người và ngày đi, em giữ chỗ và gửi thông tin đặt cọc ngay ạ.',
  dat: 'Dạ giá 500.000đ đã gồm xe đưa đón, 3 bữa ăn, phòng nghỉ, dẫn đoàn và ảnh, không phát sinh thêm ạ. Cô/chú đi bao nhiêu người để em báo lịch phù hợp ạ?',
  xa: 'Dạ từ Hà Nội đi khoảng 1 tiếng, xe đón tận nơi nên cô/chú không phải tự đi ạ.',
  suc_khoe: 'Dạ lịch trình nhẹ nhàng, có nghỉ trưa và người dẫn đoàn hỗ trợ ông bà suốt chuyến ạ.',
  chua_du_nguoi: 'Dạ chưa đủ người cô/chú vẫn có thể ghép đoàn với bên em ạ. Cô/chú cho em xin số điện thoại để em báo lịch ghép gần nhất nhé.',
  can_ban_bac: 'Dạ vâng, em gửi cô/chú lịch trình để tiện gửi vào nhóm. Em xin số điện thoại để báo khi ngày đó sắp kín chỗ nhé.',
  thoi_tiet: 'Dạ bên em có phòng nghỉ và bể bơi có mái che, trời mưa đoàn vẫn nghỉ ngơi thoải mái ạ.',
  tin_cay: 'Dạ HappyHome Đồng Bèn cách Đền Ứng Thiên chưa tới 1km, cô/chú xem ảnh và video thực tế trên trang ạ. Em gửi địa chỉ để cô/chú tiện kiểm tra nhé.',
  _hoi_them: 'Dạ cô/chú quan tâm đi lễ hay nghỉ dưỡng ạ? Cho em xin số người và ngày dự định để em tư vấn gói phù hợp nhé.'
};
const templates = () => ({ ...DEFAULT_TEMPLATES, ...(config.get().crm.templates || {}) });

function templateTexts() {
  // câu hỏi gợi ý (ice-breaker) = tin khách xuất hiện từ 5 lần trở lên
  return new Set(db.all(`SELECT text FROM messages WHERE from_page=0 AND text IS NOT NULL AND text!='' GROUP BY text HAVING COUNT(*)>=5`).map(r => r.text.trim()));
}

function parsePaymentAmount(text) {
  const compoundMatch = text.match(/(\d+)\s*(?:tr|triệu)\s*(\d+)(?:\s*(?:k|nghìn|ngàn))?/i);
  if (compoundMatch) {
    const main = Number(compoundMatch[1]) * 1000000;
    let sub = Number(compoundMatch[2]);
    if (sub < 10) sub *= 100000;
    else if (sub < 100) sub *= 10000;
    else if (sub < 1000) sub *= 1000;
    return main + sub;
  }
  const stdMatch = text.match(/(?<!%|\d)(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(k|tr|triệu|trieu|nghìn|ngan|đ|đồng|dong|vnd)(?![a-zA-Z0-9])/i);
  if (stdMatch) {
    let numStr = stdMatch[1];
    const unit = stdMatch[2].toLowerCase();
    if (unit === 'k' || unit === 'nghìn' || unit === 'ngan') return Number(numStr.replace(/[.,]/g, '')) * 1000;
    if (unit === 'tr' || unit === 'triệu' || unit === 'trieu') return Math.round(Number(numStr.replace(',', '.')) * 1000000);
    if (unit === 'đ' || unit === 'đồng' || unit === 'dong' || unit === 'vnd') return Number(numStr.replace(/[.,]/g, ''));
  }
  return null;
}

function detectPayment(messages) {
  const norm = s => String(s || '').toLowerCase().normalize('NFC');
  const PAID_ACTION_RE = /(?:(?:đã|vừa|mới)\s*(?:chuyển|ck|cọc|đặt cọc|thanh toán|bắn tiền|gửi tiền|gửi cọc|tt)\b)|(?:\b(?:chuyển|cọc|ck|bắn tiền|thanh toán|tt)\s*(?:rồi|xong|nha|nhé|nhe|ạ|luôn)\b)|(?:\bđã\s*(?:nhận|nhận được)\s*(?:tiền|cọc|ck|thanh toán|khoản cọc|chuyển khoản)\b)|(?:\bxác nhận\s*(?:đã\s*)?(?:nhận|cọc|chuyển khoản|thanh toán|tiền cọc)\b)|(?:\b(?:bên em|khách sạn|resort|em)\s*(?:đã\s*)?nhận\s+(?:được\s+)?(?:\d|tiền|cọc|ck))/i;
  const BILL_RE = /\b(?:biên lai|hóa đơn|bill|giao dịch thành công|ủy nhiệm chi|chụp màn hình ck|ảnh ck|bill ck)\b|(?:(?:gửi|xem|đây là)\s*(?:bill|biên lai|ảnh chuyển khoản|ảnh ck))/i;
  const PCT_100_RE = /(?:cọc|thanh toán|tt|chuyển)\s*(?:hết|100%|toàn bộ|đủ)|(?:đã|vừa)\s*(?:thanh toán|chuyển|ck)\s*(?:hết|100%|toàn bộ|đủ)/i;
  const PCT_50_RE = /(?:cọc|thanh toán|tt|chuyển)\s*(?:50%|nửa|một nửa|nửa tiền)|(?:đã|vừa)\s*(?:thanh toán|chuyển|ck)\s*(?:50%|nửa)/i;

  let hasPayment = false;
  let paymentStatus = null;
  let amount = null;
  let evidence = [];

  for (const m of (messages || [])) {
    const text = norm(m.text || '');
    if (!text) continue;

    const isPaid = PAID_ACTION_RE.test(text);
    const isBill = BILL_RE.test(text);
    const is100 = PCT_100_RE.test(text);
    const is50 = PCT_50_RE.test(text);

    if (isPaid || isBill || is100 || is50) {
      hasPayment = true;
      evidence.push({ from: m.from || (m.from_page || m.is_page ? 'Page' : 'Khách'), is_page: !!(m.from_page || m.is_page), text: m.text, time: m.created_at || m.time });

      if (is100) paymentStatus = 'Cọc 100%';
      else if (is50 && (!paymentStatus || paymentStatus === 'Đã cọc' || paymentStatus === 'Gửi bill CK')) paymentStatus = 'Cọc 50%';
      else if (!paymentStatus) paymentStatus = isPaid ? 'Đã cọc' : 'Gửi bill CK';

      const parsedAmt = parsePaymentAmount(text);
      if (parsedAmt && parsedAmt >= 10000) amount = parsedAmt;
    }
  }

  return { hasPayment, paymentStatus, amount, evidence };
}

function classify(psid, tpl = templateTexts(), pp = pagePhones()) {
  const msgs = db.all('SELECT * FROM messages WHERE psid=? ORDER BY created_at', psid);
  const cust = msgs.filter(m => !m.from_page && m.text && m.text.trim());
  const free = cust.filter(m => !tpl.has(m.text.trim()));
  const text = norm(cust.map(m => m.text).join(' \n '));
  const intents = INTENTS.filter(i => i.re.test(text)).map(i => i.key);
  const problems = PROBLEMS.filter(p => p.re.test(text)).map(p => p.key);
  const paxM = text.match(PAX_RE);
  const dateM = text.match(DATE_RE);
  const c = db.get('SELECT * FROM contacts WHERE psid=?', psid) || {};
  // Chỉ số khách tự gửi; số đã lưu (kể cả nhập tay) được giữ trừ khi đó là số của page
  const phone = customerPhone(cust, pp) || (c.phone && !pp.has(normPhone(c.phone)) ? c.phone : null);
  const pax = c.pax || (paxM ? Number(paxM[1]) : null);
  const travel = c.travel_date || (dateM ? dateM[0] : null);

  // Tự động nhận diện tiến độ thanh toán từ tin nhắn chat
  const payInfo = detectPayment(msgs);
  const paymentStatus = c.payment_status || payInfo.paymentStatus || null;
  const paidAmount = c.paid_amount != null ? c.paid_amount : (payInfo.amount || null);
  const paymentEvidence = payInfo.evidence && payInfo.evidence.length ? JSON.stringify(payInfo.evidence) : (c.payment_evidence || null);

  const C = config.get().crm;
  const lastAct = Math.max(Date.parse(c.last_customer_msg_at || 0), Date.parse(c.last_page_msg_at || 0));
  let stage = 'new';
  if (free.length) stage = 'engaged';
  if (phone || (pax && travel) || intents.includes('dat_coc') || payInfo.hasPayment) stage = 'qualified';
  if (payInfo.paymentStatus === 'Cọc 100%') stage = 'booked';
  if (stage !== 'qualified' && stage !== 'booked' && lastAct && Date.now() - lastAct > C.stale_after_days * 86400000) stage = 'stale';
  let score = 0;
  if (phone) score += 40;
  if (travel) score += 15;
  if (pax) score += pax >= 10 ? 20 : 10;
  if (intents.includes('dat_coc')) score += 20;
  if (intents.includes('doan_rieng')) score += 10;
  if (payInfo.hasPayment) score += 30;
  if (payInfo.paymentStatus === 'Cọc 100%') score += 50;
  score += Math.min(free.length * 5, 15);
  if (problems.includes('can_ban_bac')) score -= 5;
  const ageDays = lastAct ? (Date.now() - lastAct) / 86400000 : 0;
  score = Math.max(0, Math.round(score * Math.max(0.3, 1 - ageDays / 14)));
  db.run(`UPDATE contacts SET phone=?, pax=?, travel_date=?, intents=?, problems=?, stage=?, score=?, payment_status=?, paid_amount=?, payment_evidence=?, updated_at=? WHERE psid=?`,
    phone, pax, travel, JSON.stringify(intents), JSON.stringify(problems), stage, score, paymentStatus, paidAmount, paymentEvidence, nowIso(), psid);
  return { stage, score, intents, problems, paymentStatus, paidAmount };
}

function attribute(psid, referral) {
  if (!referral) return;
  const c = db.get('SELECT ad_id FROM contacts WHERE psid=?', psid);
  if (c && c.ad_id) return; // giữ nguồn đầu tiên
  const adId = referral.ad_id || null;
  const ad = adId ? db.get('SELECT * FROM ads WHERE id=?', adId) : null;
  db.run(`UPDATE contacts SET source_type=?, ad_id=?, adset_id=?, campaign_id=?, ad_title=? WHERE psid=?`,
    referral.source || (adId ? 'ADS' : 'OTHER'), adId, ad ? ad.adset_id : null, ad ? ad.campaign_id : null,
    (referral.ads_context_data && referral.ads_context_data.ad_title) || (ad && ad.name) || referral.ref || null, psid);
}

function ingest({ psid, name, conversation_id, mid, from_page, text, created_at, referral }) {
  if (!psid) return;
  const ex = db.get('SELECT psid FROM contacts WHERE psid=?', psid);
  if (!ex) db.run(`INSERT INTO contacts(psid,name,conversation_id,first_seen,stage,score,updated_at,source_type) VALUES(?,?,?,?, 'new', 0, ?, 'organic')`,
    psid, name || null, conversation_id || null, created_at, nowIso());
  else {
    if (name) db.run('UPDATE contacts SET name=COALESCE(name, ?) WHERE psid=?', name, psid);
    if (conversation_id) db.run('UPDATE contacts SET conversation_id=COALESCE(conversation_id, ?) WHERE psid=?', conversation_id, psid);
    db.run('UPDATE contacts SET first_seen=MIN(first_seen, ?) WHERE psid=?', created_at, psid);
  }
  if (mid) {
    const r = db.run(`INSERT OR IGNORE INTO messages(mid,psid,conversation_id,from_page,text,created_at,referral) VALUES(?,?,?,?,?,?,?)`,
      mid, psid, conversation_id || null, from_page ? 1 : 0, text || '', created_at, referral ? JSON.stringify(referral) : null);
    if (r.changes) {
      const col = from_page ? 'last_page_msg_at' : 'last_customer_msg_at';
      db.run(`UPDATE contacts SET ${col}=MAX(COALESCE(${col}, ''), ?) WHERE psid=?`, created_at, psid);
    }
  }
  attribute(psid, referral);
}

async function syncConversations() {
  const m = config.get().meta;
  if (!meta.ready() || config.isPlaceholder(m.page_id)) throw new Error('Chưa cấu hình page_id / token trong config.json');
  const convs = await meta.conversations(db.state('crm_synced_at'));
  const touched = new Set();
  db.tx(() => {
    for (const cv of convs) {
      const cust = ((cv.participants || {}).data || []).find(p => p.id !== m.page_id);
      if (!cust) continue;
      for (const msg of ((cv.messages || {}).data || [])) {
        const fromPage = msg.from && msg.from.id === m.page_id;
        ingest({ psid: cust.id, name: cust.name, conversation_id: cv.id, mid: msg.id, from_page: fromPage, text: msg.message, created_at: new Date(msg.created_time).toISOString() });
      }
      touched.add(cust.id);
    }
  });
  const tpl = templateTexts(), pp = pagePhones();
  for (const psid of touched) classify(psid, tpl, pp);
  db.state('crm_synced_at', nowIso());
  return { conversations: convs.length };
}

function reclassifyAll() {
  const tpl = templateTexts(), pp = pagePhones();
  for (const r of db.all('SELECT psid FROM contacts')) classify(r.psid, tpl, pp);
}

function suggestReply(contact) {
  const T = templates();
  const probs = JSON.parse(contact.problems || '[]'), ints = JSON.parse(contact.intents || '[]');
  const order = [...probs, ...['dat_coc', 'gia', 'ghep_doan', 'doan_rieng', 'ngay_di', 'lich_trinh', 'xe_don', 'tre_em', 'phong_an'].filter(k => ints.includes(k))];
  const key = order.find(k => T[k]) || '_hoi_them';
  return { key, text: T[key] };
}

const LABELS = Object.fromEntries([...INTENTS, ...PROBLEMS].map(x => [x.key, x.label]));
module.exports = { ingest, classify, syncConversations, reclassifyAll, suggestReply, LABELS, INTENTS, PROBLEMS, templates, templateTexts, pagePhones, customerPhone, detectPayment, parsePaymentAmount };
