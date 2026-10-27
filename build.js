// Build index.html from template.html + processed_data.json + analytics_data.json
// Usage: node build.js   (chạy trong thư mục repo, không cần cài thêm gói)
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const processed = JSON.parse(read('processed_data.json'));
const analytics = JSON.parse(read('analytics_data.json'));
const data = { ...processed, analytics };

// Chặn chuỗi "</script>" và ký tự xuống dòng đặc biệt trong dữ liệu tin nhắn làm vỡ trang
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const json = JSON.stringify(data)
  .replace(/</g, '\\u003c')
  .split(LS).join('\\u2028')
  .split(PS).join('\\u2029');

const template = read('template.html');
if (!template.includes('/*__DATA__*/null')) throw new Error('template.html thiếu chỗ chèn dữ liệu /*__DATA__*/null');
const html = template.replace('/*__DATA__*/null', () => json);

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Đã tạo index.html (${(html.length / 1024).toFixed(0)} KB, ${processed.conversations.length} hội thoại)`);
