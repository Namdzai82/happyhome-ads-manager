const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/doanv/.gemini/antigravity/scratch/happyhome-ads-manager';
const processed = JSON.parse(fs.readFileSync(path.join(targetDir, 'processed_data.json')));

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HappyHome Đồng Bèn - Ads Manager & Customer Messaging CRM</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <!-- FontAwesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: {
              50: '#f0fdf4',
              100: '#dcfce7',
              500: '#22c55e',
              600: '#16a34a',
              700: '#15803d',
              800: '#166534',
              900: '#14532d'
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">

  <!-- HEADER -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-20">
        <!-- Left: Branding -->
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <i class="fa-solid fa-tree text-2xl"></i>
          </div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-xl font-bold text-slate-900">HappyHome Đồng Bèn</h1>
              <span class="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">Eco Resort</span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">Hệ Thống Quản Lý Chỉ Số Ads & Phân Tích Khách Hàng Nhắn Tin</p>
          </div>
        </div>

        <!-- Center: Account Alert -->
        <div class="hidden md:flex items-center bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs text-amber-900 shadow-sm">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 mr-2 text-base"></i>
          <div>
            <span class="font-semibold">TK 031026 - TKBM1:</span> Còn dư nợ <strong class="text-red-600 font-bold">391.824 đ</strong> (Cần thanh toán để ads tiếp tục cắn tiền)
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center space-x-3">
          <button onclick="exportData()" class="inline-flex items-center px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-sm">
            <i class="fa-solid fa-file-arrow-down mr-1.5 text-slate-500"></i> Xuất Dữ Liệu
          </button>
          <a href="https://adsmanager.facebook.com/" target="_blank" class="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition shadow-md shadow-emerald-600/25">
            <i class="fa-brands fa-facebook mr-1.5"></i> Trình Quản Lý Ads
          </a>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex space-x-1 border-t border-slate-100 pt-1 -mb-px overflow-x-auto text-sm font-medium">
        <button onclick="switchTab('daily')" id="tab-btn-daily" class="tab-btn active px-4 py-3 border-b-2 border-emerald-600 text-emerald-700 font-semibold flex items-center space-x-2">
          <i class="fa-solid fa-chart-line"></i>
          <span>Chỉ Số Theo Ngày</span>
        </button>
        <button onclick="switchTab('monthly')" id="tab-btn-monthly" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-2">
          <i class="fa-solid fa-calendar-days"></i>
          <span>Lịch Sử Theo Tháng</span>
        </button>
        <button onclick="switchTab('crm')" id="tab-btn-crm" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-2">
          <i class="fa-solid fa-comments"></i>
          <span>Phân Tích Khách Nhắn Tin (CRM)</span>
          <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-bold ml-1">100+</span>
        </button>
        <button onclick="switchTab('strategy')" id="tab-btn-strategy" class="tab-btn px-4 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center space-x-2">
          <i class="fa-solid fa-lightbulb"></i>
          <span>Chiến Lược & Đề Xuất Tối Ưu</span>
        </button>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">

    <!-- TOP KPI HIGHLIGHTS -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Chi Tiêu (T10/2026)</span>
          <i class="fa-solid fa-wallet text-emerald-600"></i>
        </div>
        <div class="text-xl font-extrabold text-slate-900">2.485.538 đ</div>
        <div class="text-xs text-slate-500 mt-1"><span class="text-emerald-600 font-bold">12 ngày</span> chạy thử</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Tin Nhắn Mới</span>
          <i class="fa-solid fa-comment-dots text-emerald-600"></i>
        </div>
        <div class="text-xl font-extrabold text-emerald-600">237 tin</div>
        <div class="text-xs text-slate-500 mt-1">Khách hỏi combo & đền</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Giá / Tin (CPA)</span>
          <i class="fa-solid fa-tag text-emerald-600"></i>
        </div>
        <div class="text-xl font-extrabold text-slate-900">10.487 đ</div>
        <div class="text-xs text-emerald-600 font-semibold mt-1"><i class="fa-solid fa-arrow-down"></i> Siêu tiết kiệm</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Lượt Tiếp Cận</span>
          <i class="fa-solid fa-users text-emerald-600"></i>
        </div>
        <div class="text-xl font-extrabold text-slate-900">14.471</div>
        <div class="text-xs text-slate-500 mt-1">16.035 hiển thị</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Tỷ Lệ Click (CTR)</span>
          <i class="fa-solid fa-arrow-pointer text-emerald-600"></i>
        </div>
        <div class="text-xl font-extrabold text-slate-900">9.53%</div>
        <div class="text-xs text-emerald-600 font-semibold mt-1">Cao gấp 4 lần TB ngành</div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between text-slate-400 mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider">Giá Mỗi Click (CPC)</span>
          <i class="fa-solid fa-hand-pointer text-emerald-600"></i>
        </div>
        <div class="text-xl font-extrabold text-slate-900">1.536 đ</div>
        <div class="text-xs text-slate-500 mt-1">1.624 lượt click</div>
      </div>
    </div>

    <!-- TAB 1: DAILY ADS METRICS -->
    <section id="tab-daily" class="tab-content space-y-8">
      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h2 class="text-base font-bold text-slate-900">Xu Hướng Chi Tiêu & Tin Nhắn Theo Ngày</h2>
              <p class="text-xs text-slate-500 mt-0.5">Phân tích tương quan giữa số tiền bỏ ra và số lượng tin nhắn thu về</p>
            </div>
            <span class="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">15/10 - 26/10/2026</span>
          </div>
          <div class="h-80">
            <canvas id="dailySpendChart"></canvas>
          </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h2 class="text-base font-bold text-slate-900">Chi Phí Mỗi Tin Nhắn (CPA)</h2>
              <p class="text-xs text-slate-500 mt-0.5">Đơn vị: VNĐ / Tin</p>
            </div>
          </div>
          <div class="h-80">
            <canvas id="dailyCpaChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Daily Data Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 class="text-base font-bold text-slate-900">Bảng Thống Kê Chi Tiết Từng Ngày</h3>
            <p class="text-xs text-slate-500 mt-0.5">Toàn bộ 12 chỉ số cốt lõi từ Facebook Marketing API</p>
          </div>
          <div class="text-xs text-slate-500">
            * Lưu ý: Ngày 26/10 chiến dịch dừng do tài khoản tạm ngừng nợ thẻ
          </div>
        </div>
        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th class="py-3.5 px-4">Ngày</th>
                <th class="py-3.5 px-4 text-right">Chi Tiêu (VND)</th>
                <th class="py-3.5 px-4 text-center">Số Tin Nhắn</th>
                <th class="py-3.5 px-4 text-right">Giá / Tin (CPA)</th>
                <th class="py-3.5 px-4 text-right">Lượt Tiếp Cận</th>
                <th class="py-3.5 px-4 text-right">Lượt Click</th>
                <th class="py-3.5 px-4 text-right">CTR (%)</th>
                <th class="py-3.5 px-4 text-right">CPC (VND)</th>
                <th class="py-3.5 px-4 text-center">Đánh Giá</th>
              </tr>
            </thead>
            <tbody id="dailyTableBody" class="divide-y divide-slate-100">
              <!-- Injected by JS -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 2: MONTHLY HISTORY -->
    <section id="tab-monthly" class="tab-content hidden space-y-8">
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2 class="text-base font-bold text-slate-900">Lịch Sử Chi Tiêu Quảng Cáo Qua Các Tháng (2024 - 2026)</h2>
            <p class="text-xs text-slate-500 mt-0.5">Tổng hợp ngân sách quảng cáo của HappyHome & các thương hiệu liên kết</p>
          </div>
        </div>
        <div class="h-80">
          <canvas id="monthlyHistoryChart"></canvas>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-200">
          <h3 class="text-base font-bold text-slate-900">Chi Tiết Ngân Sách Theo Tháng</h3>
        </div>
        <div class="overflow-x-auto custom-scrollbar">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th class="py-3.5 px-4">Tháng</th>
                <th class="py-3.5 px-4">Tài Khoản</th>
                <th class="py-3.5 px-4 text-right">Chi Tiêu (VND)</th>
                <th class="py-3.5 px-4 text-right">Tiếp Cận (Reach)</th>
                <th class="py-3.5 px-4 text-right">Lượt Click</th>
                <th class="py-3.5 px-4 text-right">CTR</th>
              </tr>
            </thead>
            <tbody id="monthlyTableBody" class="divide-y divide-slate-100">
              <!-- Injected by JS -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 3: CUSTOMER CRM & MESSAGING INTENT -->
    <section id="tab-crm" class="tab-content hidden space-y-8">
      <!-- Intent Analytics Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
          <div class="text-emerald-800 font-bold text-lg flex items-center justify-between">
            <span>Gói Combo 500k</span>
            <i class="fa-solid fa-tags text-emerald-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-emerald-900 mt-2">92%</div>
          <p class="text-xs text-emerald-700 mt-1">Khách hỏi chi tiết dịch vụ ăn 3 bữa, xe đưa đón, phòng nghỉ</p>
        </div>

        <div class="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
          <div class="text-blue-800 font-bold text-lg flex items-center justify-between">
            <span>Đi Đền Ứng Thiên</span>
            <i class="fa-solid fa-place-of-worship text-blue-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-blue-900 mt-2">85%</div>
          <p class="text-xs text-blue-700 mt-1">Hỏi lịch trình dâng hương kết hợp nghỉ dưỡng trong ngày</p>
        </div>

        <div class="bg-purple-50 border border-purple-200 p-5 rounded-2xl">
          <div class="text-purple-800 font-bold text-lg flex items-center justify-between">
            <span>Khách Đoàn / Các Bà</span>
            <i class="fa-solid fa-people-group text-purple-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-purple-900 mt-2">97%</div>
          <p class="text-xs text-purple-700 mt-1">Nhóm phụ nữ, người trung niên, gia đình đi theo đoàn</p>
        </div>

        <div class="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
          <div class="text-amber-800 font-bold text-lg flex items-center justify-between">
            <span>Xe Đưa Đón Hà Nội</span>
            <i class="fa-solid fa-van-shuttle text-amber-600"></i>
          </div>
          <div class="text-2xl font-extrabold text-amber-900 mt-2">97%</div>
          <p class="text-xs text-amber-700 mt-1">Điểm đón trả tại Hà Nội là yếu tố quyết định chốt đoàn</p>
        </div>
      </div>

      <!-- CRM Tool Container -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <!-- Search and Filter Bar -->
        <div class="p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div class="relative w-full md:w-96">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input type="text" id="crmSearchInput" oninput="filterCustomers()" placeholder="Tìm kiếm tên khách hoặc nội dung tin nhắn..." class="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white">
          </div>

          <div class="flex flex-wrap gap-2 w-full md:w-auto">
            <button onclick="filterTag('ALL')" class="crm-tag-btn active text-xs px-3 py-1.5 rounded-lg border border-emerald-600 bg-emerald-600 text-white font-medium">Tất Cả (100)</button>
            <button onclick="filterTag('Hỏi combo 500k')" class="crm-tag-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">Combo 500k</button>
            <button onclick="filterTag('Hỏi Đền Ứng Thiên')" class="crm-tag-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">Đền Ứng Thiên</button>
            <button onclick="filterTag('Khách đoàn / Các bà')" class="crm-tag-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">Khách Đoàn</button>
            <button onclick="filterTag('SĐT')" class="crm-tag-btn text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium">Có SĐT</button>
          </div>
        </div>

        <!-- Customer List Table -->
        <div class="overflow-x-auto custom-scrollbar max-h-[600px]">
          <table class="w-full text-left border-collapse text-xs sm:text-sm">
            <thead class="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold z-10">
              <tr>
                <th class="py-3.5 px-4">Khách Hàng</th>
                <th class="py-3.5 px-4">Nội Dung Quan Tâm / Tag Nhu Cầu</th>
                <th class="py-3.5 px-4">Tin Nhắn Gần Nhất</th>
                <th class="py-3.5 px-4 text-center">Số Tin</th>
                <th class="py-3.5 px-4 text-right">Thời Gian</th>
                <th class="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody id="customerTableBody" class="divide-y divide-slate-100">
              <!-- Injected by JS -->
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 4: STRATEGY & RECOMMENDATIONS -->
    <section id="tab-strategy" class="tab-content hidden space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Action 1: Finance -->
        <div class="bg-white p-6 rounded-2xl border border-red-200 shadow-sm relative overflow-hidden">
          <div class="w-2 h-full bg-red-500 absolute left-0 top-0"></div>
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              1
            </div>
            <h3 class="text-base font-bold text-slate-900">Thanh Toán Dư Nợ 391k Ngay</h3>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Tài khoản <code class="bg-slate-100 px-1 py-0.5 rounded font-mono">act_2200185813869842</code> đang bị dừng từ ngày 26/10 do khoản nợ <strong>391.824 đ</strong>. Chiến dịch <em>Đền Ứng Thiên</em> đang có chi phí tin nhắn cực rẻ (chỉ 5k - 10k/tin) và CTR kỷ lục 12%. Cần thanh toán ngay để tránh mất tệp khách tiềm năng.
          </p>
          <div class="mt-4">
            <a href="https://adsmanager.facebook.com/ads/manager/account_settings/account_billing" target="_blank" class="inline-flex items-center text-xs font-semibold text-red-600 hover:text-red-700">
              Vào cài đặt thanh toán Facebook <i class="fa-solid fa-arrow-right ml-1"></i>
            </a>
          </div>
        </div>

        <!-- Action 2: Sales Script -->
        <div class="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div class="w-2 h-full bg-emerald-500 absolute left-0 top-0"></div>
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
              2
            </div>
            <h3 class="text-base font-bold text-slate-900">Tối Ưu Kịch Bản Chốt Khách Đoàn</h3>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Hơn 90% khách hàng là <strong>người lớn tuổi / các bà / hội phụ nữ</strong> đi nhóm từ 10 - 30 người. Cần thiết lập sẵn kịch bản trả lời nhanh tự động gửi:
            <br>• Lịch trình mẫu 1 ngày (Sáng lễ đền, trưa ăn lẩu thái, chiều nghỉ ngơi ngâm chân thảo mộc).
            <br>• Bảng giá rõ ràng 500k/người trọn gói không phát sinh.
          </p>
        </div>

        <!-- Action 3: Budget Scaling -->
        <div class="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden">
          <div class="w-2 h-full bg-blue-500 absolute left-0 top-0"></div>
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              3
            </div>
            <h3 class="text-base font-bold text-slate-900">Tập Trung Ngân Sách Cuối Tuần</h3>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">
            Số liệu cho thấy ngày <strong>Thứ 6, Thứ 7 và Chủ Nhật</strong> (19/10, 23/10, 25/10) số lượng tin nhắn bùng nổ mạnh nhất (đạt đỉnh 45 tin nhắn/ngày). Nên tăng ngân sách vào Thứ 4 - Thứ 6 để đón sóng đặt đoàn đi nghỉ dưỡng và đi lễ cuối tuần.
          </p>
        </div>

      </div>
    </section>

  </main>

  <!-- MODAL: CONVERSATION DETAIL -->
  <div id="chatModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm" id="modalCustomerAvatar">
            KH
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-sm" id="modalCustomerName">Tên Khách Hàng</h4>
            <p class="text-xs text-slate-500" id="modalCustomerMeta">Thời gian tương tác</p>
          </div>
        </div>
        <button onclick="closeChatModal()" class="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Messages Body -->
      <div class="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 custom-scrollbar" id="modalMessageList">
        <!-- Injected by JS -->
      </div>

      <!-- Modal Footer -->
      <div class="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
        <span class="text-xs text-slate-500" id="modalCustomerPhoneText">SĐT: Chưa có</span>
        <button onclick="closeChatModal()" class="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Đóng</button>
      </div>
    </div>
  </div>

  <!-- SCRIPT DATA & LOGIC -->
  <script>
    const DATA = ` + JSON.stringify(processed) + `;

    let activeTag = 'ALL';
    let currentFilteredCustomers = [...DATA.conversations];

    // Initialize UI
    window.addEventListener('DOMContentLoaded', () => {
      renderDailyTable();
      renderMonthlyTable();
      renderCustomerTable(DATA.conversations);
      initCharts();
    });

    // Tab Switching
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-emerald-600', 'text-emerald-700', 'font-semibold');
        btn.classList.add('border-transparent', 'text-slate-500');
      });

      document.getElementById('tab-' + tabId).classList.remove('hidden');
      const activeBtn = document.getElementById('tab-btn-' + tabId);
      activeBtn.classList.remove('border-transparent', 'text-slate-500');
      activeBtn.classList.add('border-emerald-600', 'text-emerald-700', 'font-semibold');
    }

    // Render Daily Table
    function renderDailyTable() {
      const tbody = document.getElementById('dailyTableBody');
      tbody.innerHTML = DATA.daily.map(d => {
        let badge = '<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600">Bình thường</span>';
        if (d.messages >= 40) badge = '<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-bold"><i class="fa-solid fa-fire mr-1"></i> Đỉnh cao</span>';
        else if (d.cost_per_message > 0 && d.cost_per_message < 10000) badge = '<span class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 font-semibold">Giá rẻ</span>';
        else if (d.spend === 0) badge = '<span class="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800 font-bold">Tạm dừng</span>';

        return \`
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-4 font-semibold text-slate-800">\${d.date}</td>
            <td class="py-3.5 px-4 text-right font-medium">\${d.spend.toLocaleString()} đ</td>
            <td class="py-3.5 px-4 text-center font-bold text-emerald-600 text-sm">\${d.messages}</td>
            <td class="py-3.5 px-4 text-right font-semibold text-slate-700">\${d.cost_per_message ? d.cost_per_message.toLocaleString() + ' đ' : '-'}</td>
            <td class="py-3.5 px-4 text-right text-slate-600">\${d.reach.toLocaleString()}</td>
            <td class="py-3.5 px-4 text-right text-slate-600">\${d.clicks.toLocaleString()}</td>
            <td class="py-3.5 px-4 text-right font-medium text-slate-800">\${d.ctr}%</td>
            <td class="py-3.5 px-4 text-right text-slate-600">\${d.cpc ? d.cpc.toLocaleString() + ' đ' : '-'}</td>
            <td class="py-3.5 px-4 text-center">\${badge}</td>
          </tr>
        \`;
      }).join('');
    }

    // Render Monthly Table
    function renderMonthlyTable() {
      const tbody = document.getElementById('monthlyTableBody');
      const allMonthly = [...DATA.monthly_current, ...DATA.monthly_past];
      tbody.innerHTML = allMonthly.map(m => \`
        <tr class="hover:bg-slate-50/80 transition">
          <td class="py-3.5 px-4 font-semibold text-slate-900">\${m.month}</td>
          <td class="py-3.5 px-4 text-slate-600 font-mono text-xs">\${m.account}</td>
          <td class="py-3.5 px-4 text-right font-bold text-slate-800">\${m.spend.toLocaleString()} đ</td>
          <td class="py-3.5 px-4 text-right text-slate-600">\${m.reach.toLocaleString()}</td>
          <td class="py-3.5 px-4 text-right text-slate-600">\${m.clicks.toLocaleString()}</td>
          <td class="py-3.5 px-4 text-right text-slate-700 font-medium">\${m.ctr}%</td>
        </tr>
      \`).join('');
    }

    // Render Customer Table
    function renderCustomerTable(customers) {
      const tbody = document.getElementById('customerTableBody');
      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">Không tìm thấy khách hàng phù hợp</td></tr>';
        return;
      }

      tbody.innerHTML = customers.map(c => {
        const tagBadges = c.tags.map(t => {
          let color = 'bg-slate-100 text-slate-600';
          if (t.includes('500k')) color = 'bg-emerald-100 text-emerald-800 font-semibold';
          else if (t.includes('Đền')) color = 'bg-blue-100 text-blue-800 font-semibold';
          else if (t.includes('Các bà')) color = 'bg-purple-100 text-purple-800 font-semibold';
          else if (t.includes('SĐT')) color = 'bg-amber-100 text-amber-800 font-bold';
          return \`<span class="inline-block px-2 py-0.5 rounded text-[11px] \${color} mr-1 mb-1">\${t}</span>\`;
        }).join('');

        const lastMsgText = c.messages[c.messages.length - 1]?.text || 'Nội dung...';
        const formattedDate = new Date(c.updated_time).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        return \`
          <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-4">
              <div class="font-bold text-slate-900">\${c.customer_name}</div>
              <div class="text-[11px] text-slate-400 font-mono">ID: \${c.customer_id}</div>
            </td>
            <td class="py-3.5 px-4 max-w-xs">
              <div class="flex flex-wrap">\${tagBadges || '<span class="text-xs text-slate-400">Chưa phân loại</span>'}</div>
            </td>
            <td class="py-3.5 px-4 max-w-sm text-slate-600 text-xs truncate" title="\${lastMsgText.replace(/"/g, '&quot;')}">
              \${lastMsgText}
            </td>
            <td class="py-3.5 px-4 text-center font-bold text-slate-700">\${c.message_count}</td>
            <td class="py-3.5 px-4 text-right text-xs text-slate-500 whitespace-nowrap">\${formattedDate}</td>
            <td class="py-3.5 px-4 text-center">
              <button onclick="openChatModal('\${c.id}')" class="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded-lg text-xs transition border border-emerald-200">
                <i class="fa-solid fa-eye mr-1"></i> Xem Chat
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    // Filter Logic
    function filterTag(tag) {
      activeTag = tag;
      document.querySelectorAll('.crm-tag-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-600');
        btn.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      });
      event.target.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
      event.target.classList.add('bg-emerald-600', 'text-white', 'border-emerald-600');
      filterCustomers();
    }

    function filterCustomers() {
      const q = document.getElementById('crmSearchInput').value.toLowerCase().trim();
      currentFilteredCustomers = DATA.conversations.filter(c => {
        const matchTag = activeTag === 'ALL' || c.tags.some(t => t.includes(activeTag));
        const matchText = !q || c.customer_name.toLowerCase().includes(q) || c.messages.some(m => m.text.toLowerCase().includes(q));
        return matchTag && matchText;
      });
      renderCustomerTable(currentFilteredCustomers);
    }

    // Modal Chat Dialog
    function openChatModal(convId) {
      const c = DATA.conversations.find(x => x.id === convId);
      if (!c) return;

      document.getElementById('modalCustomerName').textContent = c.customer_name;
      document.getElementById('modalCustomerAvatar').textContent = c.customer_name.slice(0, 2).toUpperCase();
      document.getElementById('modalCustomerMeta').textContent = c.messages.length + ' tin nhắn • ' + new Date(c.updated_time).toLocaleString('vi-VN');
      document.getElementById('modalCustomerPhoneText').textContent = c.phone ? ('SĐT liên hệ: ' + c.phone) : 'Chưa có số điện thoại';

      const list = document.getElementById('modalMessageList');
      list.innerHTML = c.messages.map(m => {
        const isPage = m.is_page;
        return \`
          <div class="flex flex-col \${isPage ? 'items-end' : 'items-start'}">
            <span class="text-[10px] text-slate-400 mb-1 px-1">\${m.from} • \${new Date(m.time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</span>
            <div class="max-w-md p-3.5 rounded-2xl text-xs sm:text-sm whitespace-pre-line leading-relaxed shadow-sm \${isPage ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}">
              \${m.text}
            </div>
          </div>
        \`;
      }).join('');

      document.getElementById('chatModal').classList.remove('hidden');
    }

    function closeChatModal() {
      document.getElementById('chatModal').classList.add('hidden');
    }

    // Initialize Charts
    function initCharts() {
      // 1. Daily Spend & Messages Line Chart
      const dailyDates = DATA.daily.map(d => d.date.slice(5));
      const dailySpend = DATA.daily.map(d => d.spend);
      const dailyMessages = DATA.daily.map(d => d.messages);

      new Chart(document.getElementById('dailySpendChart'), {
        type: 'line',
        data: {
          labels: dailyDates,
          datasets: [
            {
              label: 'Chi Tiêu (VND)',
              data: dailySpend,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              yAxisID: 'y',
              fill: true,
              tension: 0.35
            },
            {
              label: 'Số Tin Nhắn Mới',
              data: dailyMessages,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              yAxisID: 'y1',
              fill: true,
              tension: 0.35
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              ticks: { callback: v => (v / 1000) + 'k đ' }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              grid: { drawOnChartArea: false }
            }
          }
        }
      });

      // 2. Daily CPA Bar Chart
      const dailyCpa = DATA.daily.map(d => d.cost_per_message);
      new Chart(document.getElementById('dailyCpaChart'), {
        type: 'bar',
        data: {
          labels: dailyDates,
          datasets: [{
            label: 'Giá / Tin (VNĐ)',
            data: dailyCpa,
            backgroundColor: dailyCpa.map(v => v > 15000 ? '#f59e0b' : '#10b981'),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: v => (v / 1000) + 'k' } }
          }
        }
      });

      // 3. Monthly History
      const allMonthly = [...DATA.monthly_past, ...DATA.monthly_current].sort((a,b) => a.month.localeCompare(b.month));
      new Chart(document.getElementById('monthlyHistoryChart'), {
        type: 'bar',
        data: {
          labels: allMonthly.map(m => m.month),
          datasets: [{
            label: 'Tổng Chi Tiêu (VND)',
            data: allMonthly.map(m => m.spend),
            backgroundColor: '#059669',
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { ticks: { callback: v => (v / 1000000) + ' Tr' } }
          }
        }
      });
    }

    // Export Data Helper
    function exportData() {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(DATA, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', 'happyhome_ads_analytics.json');
      dlAnchor.click();
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent);
console.log('Successfully wrote index.html to:', path.join(targetDir, 'index.html'));
