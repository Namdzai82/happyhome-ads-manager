# HappyHome Đồng Bèn - Ads Manager & CRM Tin Nhắn

Bảng điều khiển toàn diện trực quan hóa dữ liệu chiến dịch Meta Ads và hệ thống CRM chăm sóc khách hàng Messenger của HappyHome Đồng Bèn (`Page ID: 518267108710194`, Tài khoản Ads: `act_2200185813869842`).

---

## 🔐 Bảo Mật & Truy Cập
- **Mã PIN bảo mật:** `2707` (Chỉ lưu hành nội bộ, tự động ghi nhớ sau lần đăng nhập đầu tiên).
- **Mở khóa nhanh:** Hỗ trợ nút `[ 🔑 2707 ]` mở tức thì hoặc truy cập trực tiếp qua đường link gắn mã xác thực: `?pin=2707`.
- **Trang trực tuyến (GitHub Pages):** [https://namdzai82.github.io/happyhome-ads-manager/?pin=2707](https://namdzai82.github.io/happyhome-ads-manager/?pin=2707)
- **Tệp xem Offline tại máy tính:** `index.html` (Mở trực tiếp trên Chrome, Edge không cần cài đặt backend).

---

## 🚀 Các Phần Mới Được Cập Nhật Trong Tệp

### 1. Phân Tích Mẫu Quảng Cáo (Tab "Mẫu quảng cáo")
- **Creative Intelligence:** Phân tích chi tiết 2 mẫu video Reels/Feed 9:16 chủ lực (`Goi nguoi gia` và `di den 1`).
- **Chỉ số Hook 3s đầu:** Đo lường tỷ lệ dừng ngón tay lướt (đạt ~50%).
- **Biểu đồ phễu giữ chân Video (Retention Drop-off):** Trực quan tỷ lệ người xem qua từng mốc: Hook 3s → 25% → 50% → 75% → Xem hết 100%.
- **Đánh giá thuật toán Meta:** Xếp hạng chất lượng nội dung, mức độ tương tác, và tỷ lệ chuyển đổi kèm khuyến nghị cắt ngắn video (15-20s) và tối ưu thumbnail.

### 2. Trực Quan Từng Ngày (Tab "Theo ngày")
- **Menu chọn ngày tương tác (`<select>`):** Cho phép chọn từng ngày bất kỳ (từ ngày 15/10 đến 26/10) để xem sâu số liệu.
- **Thẻ KPI chi tiết theo ngày:** Chi tiêu thực tế, số tin nhắn mới, chi phí/tin (CPR), CPM, lượt click, CTR.
- **Huy hiệu so sánh hiệu suất:** Tự động tính toán ngày được chọn rẻ hơn hoặc đắt hơn bao nhiêu % so với bình quân kỳ (ví dụ: ngày 24/10 rẻ hơn 61%, ngày 25/10 rẻ hơn 49%).
- **Phân bổ chiến dịch trong ngày:** Liệt kê cụ thể từng mẫu quảng cáo chi tiêu và sinh tin nhắn trong ngày đã chọn.

### 3. CRM & Phân Tích Lý Do Khách Chưa Chốt (Tab "Khách nhắn tin")
- **Bộ lọc SĐT chính xác 100%:** Loại bỏ hoàn toàn số hotline của Page, chỉ ghi nhận 3 số điện thoại thực tế do khách hàng tự gửi:
  - Khách **Đặng Bình**: `0932286060`
  - Khách **Nguyễn Minh**: `0936123582` (Đoàn 22 người)
  - Khách **Quý Sự**: `0902275762` (Hỏi đi Chủ Nhật)
- **Phân loại 5 lý do khách chưa chốt:**
  - 🕒 **Phản hồi chậm (>30 phút):** **38%** (Khách nhắn nhưng trả lời trễ làm nguội nhu cầu).
  - 📅 **Hỏi ngày / Vướng lịch:** **23%** (Hỏi phòng cuối tuần hoặc ngày cận kề nhưng vướng lịch nhóm).
  - 💬 **Dừng sau tin chào tự động:** **22%** (Bấm nút Bắt đầu từ Ads nhưng không nhắn tiếp).
  - 🏷️ **Tham khảo giá:** **14%** (Hỏi bảng giá/combo 500k rồi im lặng so sánh).
  - 📞 **Đã để lại SĐT (Hot Lead):** **3%** (Cần sale gọi chốt ngay).
- **Chỉ số FRT (First Response Time):** Đo lường và hiển thị tốc độ trả lời tin nhắn đầu tiên của Page (Tức thì, vài phút, hoặc chậm >30p).

### 4. Hệ Thống Tự Động Hóa 24/7 (Sync Automation)
- **GitHub Actions Workflow:** Tự động fetch số liệu từ Meta Marketing API và tin nhắn Messenger định kỳ mỗi 6 tiếng.
- **Đồng hồ đếm ngược Live:** Đếm ngược 5 phút tự động làm mới giao diện kèm nút "Làm mới" tức thì.

### 5. Ứng Dụng Điều Khiển Meta (Thư mục `ads-control/`)
- Cấu hình mật khẩu dashboard đăng nhập chuẩn **`2707`** trong `ads-control/config.json`.
- Hệ thống đề xuất tăng/giảm ngân sách an toàn, rào chắn bảo vệ ngân sách tối đa 1.000.000đ/ngày.
- Đã vượt qua toàn bộ **45/45 bài kiểm tra tự động (Unit Tests)**.
