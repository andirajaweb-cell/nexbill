import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/ai page (AI Business Intelligence — chat assistant tab and
 * insights/analytics tab). Registered as a side effect on import; import this file from
 * src/app/dashboard/ai/page.tsx before any component on that page calls useDashboardLang().t().
 */
registerDict({
  // --- Page header ---
  "ai.pageTitle": { id: "AI Business Intelligence", en: "AI Business Intelligence", ms: "AI Business Intelligence", th: "AI Business Intelligence", fil: "AI Business Intelligence", vi: "AI Business Intelligence" },
  "ai.pageSubtitle": { id: "Tanya jawab data bisnis secara natural, plus tren, forecast, deteksi anomali, dan rekomendasi otomatis.", en: "Ask business questions in plain language, plus trends, forecasts, anomaly detection, and automatic recommendations.", ms: "Tanya jawab data perniagaan secara semula jadi, tambahan tren, ramalan, pengesanan anomali, dan cadangan automatik.", th: "ถาม-ตอบข้อมูลธุรกิจแบบธรรมชาติ พร้อมแนวโน้ม พยากรณ์ ตรวจจับความผิดปกติ และคำแนะนำอัตโนมัติ", fil: "Magtanong tungkol sa data ng negosyo nang natural, kasama ang trends, forecast, pagtukoy ng anomalya, at awtomatikong rekomendasyon.", vi: "Hỏi đáp dữ liệu kinh doanh một cách tự nhiên, kèm xu hướng, dự báo, phát hiện bất thường và đề xuất tự động." },

  // --- Role-restricted notice ---
  "ai.restrictedTitle": { id: "Fitur AI hanya untuk Owner/Superuser", en: "AI features are for Owner/Superuser only", ms: "Ciri AI hanya untuk Owner/Superuser", th: "ฟีเจอร์ AI สำหรับ Owner/Superuser เท่านั้น", fil: "Ang AI feature ay para lang sa Owner/Superuser", vi: "Tính năng AI chỉ dành cho Chủ sở hữu/Superuser" },
  "ai.restrictedBody": { id: "Role kamu saat ini belum bisa mengakses AI Business Assistant maupun AI Insights. Hubungi pemilik outlet kalau butuh akses.", en: "Your current role can't access the AI Business Assistant or AI Insights yet. Contact the outlet owner if you need access.", ms: "Peranan anda sekarang belum boleh mengakses AI Business Assistant atau AI Insights. Hubungi pemilik outlet jika perlukan akses.", th: "บทบาทของคุณตอนนี้ยังไม่สามารถเข้าถึง AI Business Assistant หรือ AI Insights ได้ กรุณาติดต่อเจ้าของสาขาหากต้องการสิทธิ์เข้าถึง", fil: "Hindi pa ma-access ng kasalukuyang role mo ang AI Business Assistant o AI Insights. Makipag-ugnayan sa may-ari ng outlet kung kailangan mo ng access.", vi: "Vai trò hiện tại của bạn chưa thể truy cập AI Business Assistant hay AI Insights. Liên hệ chủ chi nhánh nếu cần quyền truy cập." },

  // --- Payment-gated notice (role allowed, but no active AI Add-on/trial/unlimited plan) ---
  "ai.paywallTitle": { id: "AI Add-on Belum Aktif", en: "AI Add-on Not Active Yet", ms: "AI Add-on Belum Aktif", th: "AI Add-on ยังไม่เปิดใช้งาน", fil: "Hindi Pa Aktibo ang AI Add-on", vi: "AI Add-on chưa được kích hoạt" },
  "ai.paywallBody": {
    id: "AI Business Intelligence adalah produk berbayar terpisah — gratis selama masa percobaan, setelah itu perlu AI Add-on aktif (atau paket unlimited) di halaman Langganan.",
    en: "AI Business Intelligence is a separate paid product — free during the trial period, after which it needs an active AI Add-on (or an unlimited plan) on the Subscription page.",
    ms: "AI Business Intelligence ialah produk berbayar berasingan — percuma semasa tempoh percubaan, selepas itu perlukan AI Add-on aktif (atau pelan tanpa had) di halaman Langganan.",
    th: "AI Business Intelligence เป็นผลิตภัณฑ์แบบชำระเงินแยกต่างหาก — ใช้ฟรีในช่วงทดลองใช้ หลังจากนั้นต้องมี AI Add-on ที่ใช้งานอยู่ (หรือแพ็กเกจไม่จำกัด) ที่หน้าการสมัครสมาชิก",
    fil: "Ang AI Business Intelligence ay hiwalay na bayad na produkto — libre habang trial period, pagkatapos noon kailangan ng aktibong AI Add-on (o unlimited plan) sa Subscription page.",
    vi: "AI Business Intelligence là sản phẩm trả phí riêng — miễn phí trong thời gian dùng thử, sau đó cần AI Add-on đang hoạt động (hoặc gói không giới hạn) tại trang Đăng ký gói.",
  },
  "ai.paywallCta": { id: "Aktifkan AI Add-on", en: "Activate AI Add-on", ms: "Aktifkan AI Add-on", th: "เปิดใช้งาน AI Add-on", fil: "I-activate ang AI Add-on", vi: "Kích hoạt AI Add-on" },

  // --- Tabs ---
  "ai.tabAssistant": { id: "Asisten Bisnis", en: "Business Assistant", ms: "Pembantu Perniagaan", th: "ผู้ช่วยธุรกิจ", fil: "Business Assistant", vi: "Trợ lý kinh doanh" },
  "ai.tabInsights": { id: "Insight & Analisa", en: "Insights & Analysis", ms: "Insight & Analisis", th: "ข้อมูลเชิงลึกและการวิเคราะห์", fil: "Insight at Analysis", vi: "Thông tin & Phân tích" },

  // --- Assistant tab ---
  "ai.assistantGreeting": { id: "Halo! Aku Business Assistant kamu. Tanya apa saja soal penjualan, rental, biaya, laba rugi, arus kas, inventori, atau aset — aku akan cek datanya langsung.", en: "Hi! I'm your Business Assistant. Ask me anything about sales, rentals, expenses, profit & loss, cash flow, inventory, or assets — I'll check the data directly.", ms: "Hai! Saya Business Assistant anda. Tanya apa-apa saja tentang jualan, sewa, perbelanjaan, untung rugi, aliran tunai, inventori, atau aset — saya akan semak data terus.", th: "สวัสดี! ฉันคือ Business Assistant ของคุณ ถามอะไรก็ได้เกี่ยวกับยอดขาย การเช่า ค่าใช้จ่าย กำไรขาดทุน กระแสเงินสด สินค้าคงคลัง หรือสินทรัพย์ — ฉันจะตรวจสอบข้อมูลให้ทันที", fil: "Hi! Ako ang Business Assistant mo. Magtanong ka lang tungkol sa benta, rental, gastos, profit and loss, cash flow, inventory, o asset — susuriin ko agad ang data.", vi: "Xin chào! Tôi là Trợ lý kinh doanh của bạn. Hãy hỏi bất cứ điều gì về doanh số, cho thuê, chi phí, lãi lỗ, dòng tiền, tồn kho, hoặc tài sản — tôi sẽ kiểm tra dữ liệu ngay." },
  "ai.errorPrefix": { id: "Maaf, ada error: {msg}", en: "Sorry, an error occurred: {msg}", ms: "Maaf, ada ralat: {msg}", th: "ขออภัย เกิดข้อผิดพลาด: {msg}", fil: "Paumanhin, may error: {msg}", vi: "Xin lỗi, đã xảy ra lỗi: {msg}" },
  "ai.checkingTool": { id: "Mengecek {tool}...", en: "Checking {tool}...", ms: "Menyemak {tool}...", th: "กำลังตรวจสอบ {tool}...", fil: "Sinusuri ang {tool}...", vi: "Đang kiểm tra {tool}..." },
  "ai.thinking": { id: "Berpikir...", en: "Thinking...", ms: "Sedang berfikir...", th: "กำลังคิด...", fil: "Nag-iisip...", vi: "Đang suy nghĩ..." },
  "ai.inputPlaceholder": { id: "Tanya tentang bisnismu...", en: "Ask about your business...", ms: "Tanya tentang perniagaan anda...", th: "ถามเกี่ยวกับธุรกิจของคุณ...", fil: "Magtanong tungkol sa negosyo mo...", vi: "Hỏi về hoạt động kinh doanh của bạn..." },
  "ai.send": { id: "Kirim", en: "Send", ms: "Hantar", th: "ส่ง", fil: "Ipadala", vi: "Gửi" },

  "ai.suggestion1": { id: "Berapa total revenue bulan ini?", en: "What's the total revenue this month?", ms: "Berapa jumlah hasil bulan ini?", th: "รายได้รวมเดือนนี้เท่าไหร่?", fil: "Magkano ang total revenue ngayong buwan?", vi: "Tổng doanh thu tháng này là bao nhiêu?" },
  "ai.suggestion2": { id: "Biaya operasional apa yang paling besar bulan ini?", en: "Which operating expense was the biggest this month?", ms: "Perbelanjaan operasi apa yang paling besar bulan ini?", th: "ค่าใช้จ่ายในการดำเนินงานอะไรมากที่สุดเดือนนี้?", fil: "Anong operating expense ang pinakamalaki ngayong buwan?", vi: "Chi phí vận hành nào lớn nhất tháng này?" },
  "ai.suggestion3": { id: "Bagaimana laba rugi 30 hari terakhir?", en: "How was the profit & loss over the last 30 days?", ms: "Bagaimana untung rugi 30 hari terakhir?", th: "กำไรขาดทุน 30 วันที่ผ่านมาเป็นอย่างไร?", fil: "Kumusta ang profit and loss sa huling 30 araw?", vi: "Lãi lỗ 30 ngày qua như thế nào?" },
  "ai.suggestion4": { id: "Unit PS mana yang paling menguntungkan?", en: "Which PS unit is the most profitable?", ms: "Unit PS mana yang paling menguntungkan?", th: "เครื่อง PS เครื่องไหนทำกำไรได้มากที่สุด?", fil: "Aling unit ng PS ang pinaka-kumikita?", vi: "Máy PS nào sinh lời nhiều nhất?" },

  // --- Insights tab ---
  "ai.loading": { id: "Memuat...", en: "Loading...", ms: "Memuatkan...", th: "กำลังโหลด...", fil: "Nilo-load...", vi: "Đang tải..." },
  "ai.recommendationsTitle": { id: "Rekomendasi AI", en: "AI Recommendations", ms: "Cadangan AI", th: "คำแนะนำจาก AI", fil: "Rekomendasyon ng AI", vi: "Đề xuất từ AI" },
  "ai.analyzing": { id: "Menganalisa...", en: "Analyzing...", ms: "Menganalisis...", th: "กำลังวิเคราะห์...", fil: "Sinusuri...", vi: "Đang phân tích..." },
  "ai.reanalyze": { id: "Analisa Ulang", en: "Re-analyze", ms: "Analisis Semula", th: "วิเคราะห์อีกครั้ง", fil: "Suriin Muli", vi: "Phân tích lại" },
  "ai.generateRecommendations": { id: "Generate Rekomendasi", en: "Generate Recommendations", ms: "Jana Cadangan", th: "สร้างคำแนะนำ", fil: "Bumuo ng Rekomendasyon", vi: "Tạo đề xuất" },
  "ai.recommendationsHint": { id: "Klik \"{btn}\" untuk analisa naratif otomatis berdasarkan tren, forecast, dan anomali di bawah.", en: "Click \"{btn}\" for an automatic narrative analysis based on the trends, forecast, and anomalies below.", ms: "Klik \"{btn}\" untuk analisis naratif automatik berdasarkan tren, ramalan, dan anomali di bawah.", th: "คลิก \"{btn}\" เพื่อวิเคราะห์เชิงบรรยายอัตโนมัติจากแนวโน้ม พยากรณ์ และความผิดปกติด้านล่าง", fil: "I-click ang \"{btn}\" para sa awtomatikong narrative analysis batay sa trends, forecast, at anomalya sa ibaba.", vi: "Nhấp \"{btn}\" để phân tích tường thuật tự động dựa trên xu hướng, dự báo và bất thường bên dưới." },

  "ai.trends30Days": { id: "Tren 30 Hari", en: "30-Day Trends", ms: "Tren 30 Hari", th: "แนวโน้ม 30 วัน", fil: "Trends sa 30 Araw", vi: "Xu hướng 30 ngày" },
  "ai.revenueLabel": { id: "Revenue", en: "Revenue", ms: "Hasil", th: "รายได้", fil: "Revenue", vi: "Doanh thu" },
  "ai.expenseLabel": { id: "Expense", en: "Expense", ms: "Perbelanjaan", th: "รายจ่าย", fil: "Expense", vi: "Chi phí" },
  "ai.perDaySuffix": { id: "/hari", en: "/day", ms: "/hari", th: "/วัน", fil: "/araw", vi: "/ngày" },
  "ai.last7DaysVsPrevious": { id: "7 Hari Terakhir vs Sebelumnya", en: "Last 7 Days vs Previous", ms: "7 Hari Terakhir vs Sebelumnya", th: "7 วันล่าสุด เทียบกับก่อนหน้า", fil: "Huling 7 Araw kumpara sa Nakaraan", vi: "7 ngày gần nhất so với trước đó" },

  "ai.forecastTitle": { id: "Forecast Revenue 7 Hari ke Depan", en: "7-Day Revenue Forecast", ms: "Ramalan Hasil 7 Hari ke Hadapan", th: "พยากรณ์รายได้ 7 วันข้างหน้า", fil: "Forecast ng Revenue sa Susunod na 7 Araw", vi: "Dự báo doanh thu 7 ngày tới" },
  "ai.forecastBasis": { id: "Berdasarkan rata-rata harian historis {avg} (tren linear {days} hari terakhir)", en: "Based on the historical daily average of {avg} (linear trend over the last {days} days)", ms: "Berdasarkan purata harian sejarah {avg} (tren linear {days} hari terakhir)", th: "อ้างอิงจากค่าเฉลี่ยรายวันในอดีต {avg} (แนวโน้มเชิงเส้นย้อนหลัง {days} วัน)", fil: "Base sa historical daily average na {avg} (linear trend sa huling {days} araw)", vi: "Dựa trên trung bình hằng ngày lịch sử {avg} (xu hướng tuyến tính trong {days} ngày qua)" },

  "ai.costAnomaliesTitle": { id: "Anomali Biaya", en: "Cost Anomalies", ms: "Anomali Perbelanjaan", th: "ความผิดปกติของค่าใช้จ่าย", fil: "Anomalya sa Gastos", vi: "Bất thường chi phí" },
  "ai.noCostAnomalies": { id: "Tidak ada biaya tidak wajar terdeteksi.", en: "No unusual costs detected.", ms: "Tiada perbelanjaan luar biasa dikesan.", th: "ไม่พบค่าใช้จ่ายที่ผิดปกติ", fil: "Walang natukoy na hindi pangkaraniwang gastos.", vi: "Không phát hiện chi phí bất thường." },
  "ai.avgLabel": { id: "avg", en: "avg", ms: "purata", th: "เฉลี่ย", fil: "avg", vi: "TB" },
  "ai.revenueAnomaliesTitle": { id: "Anomali Revenue Harian", en: "Daily Revenue Anomalies", ms: "Anomali Hasil Harian", th: "ความผิดปกติของรายได้รายวัน", fil: "Anomalya sa Araw-araw na Revenue", vi: "Bất thường doanh thu hằng ngày" },
  "ai.noRevenueAnomalies": { id: "Tidak ada hari dengan revenue tidak wajar.", en: "No days with unusual revenue found.", ms: "Tiada hari dengan hasil luar biasa.", th: "ไม่พบวันที่มีรายได้ผิดปกติ", fil: "Walang araw na may hindi pangkaraniwang revenue.", vi: "Không có ngày nào doanh thu bất thường." },
});
