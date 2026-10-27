# HappyHome Đồng Bèn - Ads Manager & CRM tin nhắn

Dashboard một file (`index.html`) để theo dõi quảng cáo Facebook và chất lượng hội thoại Messenger của HappyHome Đồng Bèn. Mở trực tiếp bằng trình duyệt, không cần backend.

> **Cảnh báo dữ liệu cá nhân:** `processed_data.json` và `index.html` chứa tên, ID Facebook, số điện thoại và toàn bộ tin nhắn của khách. Hãy để repo ở chế độ **Private** và không đăng `index.html` lên trang công khai.

## Các tab

| Tab | Nội dung |
| --- | --- |
| Tổng quan | 8 KPI tính từ dữ liệu, phễu hiển thị → click → click liên kết → tin nhắn, kết luận chính, máy tính hòa vốn |
| Theo ngày | Tin nhắn theo chiến dịch + chi phí/tin, 3 giai đoạn, bảng 13 chỉ số mỗi ngày (lọc theo chiến dịch, có thứ trong tuần) |
| Chiến dịch & phân khúc | So sánh 2 chiến dịch (cả kỳ và cùng kỳ 19-25/10), khung giờ, vị trí hiển thị, độ tuổi, giới tính |
| Khách nhắn tin | Phân loại hội thoại theo tin **của khách** (không tính tin trả lời tự động của page): chỉ bấm câu mẫu, có hỏi thêm, trao đổi thật, có SĐT; tìm kiếm; xem chat; SĐT che mặc định |
| Lịch sử tháng | Chi tiêu 2024-2026, chi phí/tin khi có số tin nhắn |
| Đề xuất | Việc cần làm theo thứ tự ưu tiên, KPI mục tiêu tự đánh giá Đạt / Chưa đạt / Cảnh báo |

## Cấu trúc

```
├── index.html            # Dashboard đã build (mở bằng trình duyệt)
├── template.html         # Giao diện + logic, chỗ chèn dữ liệu /*__DATA__*/null
├── processed_data.json   # Dữ liệu ngày, tháng, 100 hội thoại gần nhất
├── analytics_data.json   # Số liệu chiến dịch, theo ngày từng chiến dịch, vị trí, tuổi, giới tính, giờ, giả định kinh tế
├── build.js              # Gộp template + 2 file dữ liệu thành index.html
└── README.md
```

## Cập nhật dữ liệu

1. Sửa `processed_data.json` (dữ liệu tổng theo ngày, hội thoại) và/hoặc `analytics_data.json` (chiến dịch, phân khúc).
2. Chạy `node build.js` trong thư mục repo (đường dẫn tương đối, chạy được trên mọi máy).
3. Mở `index.html`.

Mọi KPI, tỷ lệ và nhãn phân loại đều tính lại từ dữ liệu khi mở trang, không còn số viết cứng.

## Thay đổi so với bản trước

- KPI trước đây viết cứng và lệch dữ liệu (tiếp cận 14.471 là tổng tiếp cận theo ngày, thực tế không trùng là 9.913; hiển thị 16.035 so với thực tế 17.392). Nay tính từ dữ liệu.
- Tag CRM cũ quét cả tin trả lời tự động của page nên gần như khách nào cũng có tag "Khách đoàn", "Xe đưa đón" (97%). Nay chỉ phân tích tin của khách: phần lớn khách chỉ bấm câu hỏi mẫu và ~6% để lại SĐT.
- Sửa nhận định sai thứ trong tuần (19/10 là thứ Hai, không phải thứ Sáu).
- Chống chèn mã: nội dung tin nhắn được escape trước khi hiển thị; dữ liệu nhúng được chặn chuỗi `</script>`.
- Ghim phiên bản thư viện CDN (Tailwind 3.4.16, Chart.js 4.4.4); `build.js` dùng đường dẫn tương đối thay cho đường dẫn cố định trên một máy Windows.
- Thêm tab Chiến dịch & phân khúc, máy tính hòa vốn, phễu chất lượng hội thoại, KPI mục tiêu.
