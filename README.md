# HappyHome Đồng Bèn - Ads Manager & Customer Messaging CRM 🌿

Hệ thống quản lý, phân tích chỉ số quảng cáo Facebook Ads (theo ngày & theo tháng) và quản trị dữ liệu khách hàng nhắn tin (CRM) cho Fanpage **HappyHome Đồng Bèn**.

---

## 🚀 Tính năng nổi bật

- **Chỉ số quảng cáo theo ngày (Daily Breakdown):**
  - Trực quan hóa tương quan giữa Chi tiêu (Spend) và Số tin nhắn thu về.
  - Phân tích chi phí trên mỗi tin nhắn (CPA), CTR, CPC, CPM, Tần suất hiển thị.
- **Lịch sử ngân sách qua các tháng (Monthly History):**
  - Tổng hợp dữ liệu quảng cáo xuyên suốt từ năm 2024 đến năm 2026.
- **CRM Khách hàng nhắn tin thông minh:**
  - Tích hợp dữ liệu hội thoại thực tế từ Fanpage.
  - Tự động gắn tag nhu cầu khách hàng: *Combo 500k*, *Đi lễ Đền Ứng Thiên*, *Khách đoàn/Các bà*, *Xe đưa đón Hà Nội*, *Đã có SĐT*.
  - Tìm kiếm và lọc khách hàng theo tag hoặc từ khóa.
  - Xem chi tiết toàn bộ lịch sử tin nhắn dạng chat bong bóng trực quan.
- **Kiến trúc Zero-dependency:**
  - Chạy trực tiếp trên trình duyệt chỉ bằng file `index.html` (sử dụng Tailwind CSS & Chart.js qua CDN), không cần cài đặt backend phức tạp.

---

## 📂 Cấu trúc thư mục

```text
├── index.html            # Trình quản lý chính (Dashboard & CRM giao diện web)
├── processed_data.json   # Bộ dữ liệu đã được xử lý và phân loại
├── build.js              # Script tự động đồng bộ và biên dịch giao diện
└── README.md             # Tài liệu dự án
```

---

## 🛠️ Hướng dẫn sử dụng

1. Tải repository về máy.
2. Mở trực tiếp file `index.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Safari).
3. Khám phá các tab phân tích chỉ số, lọc tệp khách hàng hoặc xuất dữ liệu dạng JSON.
