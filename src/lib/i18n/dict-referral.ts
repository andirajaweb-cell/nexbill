import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/referral page — the outlet's own referral/affiliate program
 * dashboard (personal code/link, referred outlets, commission ledger, payout history). Registered
 * as a side effect on import; see dict-shell.ts for the pattern this follows.
 */
registerDict({
  "referral.loading": { id: "Memuat data referral...", en: "Loading referral data...", ms: "Memuatkan data rujukan...", th: "กำลังโหลดข้อมูลการแนะนำ...", fil: "Nilo-load ang referral data...", vi: "Đang tải dữ liệu giới thiệu..." },
  "referral.loadError": { id: "Gagal memuat data referral.", en: "Failed to load referral data.", ms: "Gagal memuatkan data rujukan.", th: "โหลดข้อมูลการแนะนำไม่สำเร็จ", fil: "Nabigong i-load ang referral data.", vi: "Không tải được dữ liệu giới thiệu." },

  "referral.title": { id: "Program Referral", en: "Referral Program", ms: "Program Rujukan", th: "โปรแกรมแนะนำเพื่อน", fil: "Programa sa Referral", vi: "Chương trình giới thiệu" },
  "referral.subtitle": {
    id: "Ajak outlet lain berlangganan NEXBILL lewat link referral kamu — mereka dapat diskon 20% di tagihan pertama, kamu dapat komisi berulang setiap bulan selama outlet itu terus berlangganan.",
    en: "Invite other outlets to subscribe to NEXBILL through your referral link — they get a 20% discount on their first invoice, and you earn a recurring commission every month for as long as that outlet stays subscribed.",
    ms: "Jemput outlet lain melanggan NEXBILL melalui pautan rujukan anda — mereka dapat diskaun 20% pada invois pertama, anda dapat komisen berulang setiap bulan selagi outlet itu terus melanggan.",
    th: "ชวนร้านอื่นสมัครสมาชิก NEXBILL ผ่านลิงก์แนะนำของคุณ — พวกเขาจะได้ส่วนลด 20% ในใบแจ้งหนี้แรก คุณจะได้ค่าคอมมิชชันต่อเนื่องทุกเดือนตราบใดที่ร้านนั้นยังสมัครสมาชิกอยู่",
    fil: "Anyayahan ang ibang outlet na mag-subscribe sa NEXBILL gamit ang referral link mo — makakakuha sila ng 20% diskwento sa unang invoice, at makakakuha ka ng recurring commission bawat buwan habang aktibo pa ang subscription nila.",
    vi: "Mời các cửa hàng khác đăng ký NEXBILL qua link giới thiệu của bạn — họ được giảm 20% hóa đơn đầu tiên, bạn nhận hoa hồng định kỳ mỗi tháng miễn là cửa hàng đó vẫn còn đăng ký.",
  },

  "referral.yourCode": { id: "Kode Referral Kamu", en: "Your Referral Code", ms: "Kod Rujukan Anda", th: "รหัสแนะนำของคุณ", fil: "Ang Referral Code Mo", vi: "Mã giới thiệu của bạn" },
  "referral.copyLink": { id: "Salin Link", en: "Copy Link", ms: "Salin Pautan", th: "คัดลอกลิงก์", fil: "Kopyahin ang Link", vi: "Sao chép link" },
  "referral.copied": { id: "Tersalin!", en: "Copied!", ms: "Disalin!", th: "คัดลอกแล้ว!", fil: "Nakopya!", vi: "Đã sao chép!" },
  "referral.commissionNote": { id: "Komisi kamu saat ini", en: "Your current commission", ms: "Komisen anda sekarang", th: "ค่าคอมมิชชันปัจจุบันของคุณ", fil: "Ang kasalukuyang komisyon mo", vi: "Hoa hồng hiện tại của bạn" },
  "referral.commissionNoteSuffix": {
    id: "dari setiap tagihan langganan yang dibayar outlet yang kamu referensikan.",
    en: "of every subscription invoice paid by outlets you referred.",
    ms: "daripada setiap invois langganan yang dibayar oleh outlet yang anda rujuk.",
    th: "จากทุกใบแจ้งหนี้การสมัครสมาชิกที่ร้านที่คุณแนะนำชำระ",
    fil: "sa bawat subscription invoice na binayaran ng mga outlet na na-refer mo.",
    vi: "trên mỗi hóa đơn thuê bao mà các cửa hàng bạn giới thiệu đã thanh toán.",
  },

  "referral.totalReferrals": { id: "Total Referral", en: "Total Referrals", ms: "Jumlah Rujukan", th: "จำนวนการแนะนำ", fil: "Kabuuang Referral", vi: "Tổng lượt giới thiệu" },
  "referral.balanceAvailable": { id: "Saldo Komisi Tersedia", en: "Available Commission Balance", ms: "Baki Komisen Tersedia", th: "ยอดคอมมิชชันคงเหลือ", fil: "Available na Commission Balance", vi: "Số dư hoa hồng khả dụng" },
  "referral.totalEarned": { id: "Total Komisi Sepanjang Waktu", en: "Total Lifetime Commission", ms: "Jumlah Komisen Sepanjang Masa", th: "ค่าคอมมิชชันสะสมทั้งหมด", fil: "Kabuuang Lifetime Commission", vi: "Tổng hoa hồng trọn đời" },

  "referral.referredOutlets": { id: "Outlet yang Kamu Referensikan", en: "Outlets You've Referred", ms: "Outlet yang Anda Rujuk", th: "ร้านที่คุณแนะนำ", fil: "Mga Outlet na Na-refer Mo", vi: "Cửa hàng bạn đã giới thiệu" },
  "referral.noReferralsYet": { id: "Belum ada outlet yang mendaftar lewat link kamu.", en: "No outlets have signed up through your link yet.", ms: "Belum ada outlet yang mendaftar melalui pautan anda.", th: "ยังไม่มีร้านที่สมัครผ่านลิงก์ของคุณ", fil: "Wala pang outlet na nag-sign up gamit ang link mo.", vi: "Chưa có cửa hàng nào đăng ký qua link của bạn." },

  "referral.commissionHistory": { id: "Riwayat Komisi", en: "Commission History", ms: "Sejarah Komisen", th: "ประวัติค่าคอมมิชชัน", fil: "Kasaysayan ng Komisyon", vi: "Lịch sử hoa hồng" },
  "referral.noCommissionsYet": { id: "Belum ada komisi yang masuk.", en: "No commissions earned yet.", ms: "Belum ada komisen diterima.", th: "ยังไม่มีค่าคอมมิชชันเข้ามา", fil: "Wala pang natanggap na komisyon.", vi: "Chưa có hoa hồng nào." },
  "referral.of": { id: "dari", en: "of", ms: "daripada", th: "จาก", fil: "ng", vi: "từ" },

  "referral.payoutHistory": { id: "Riwayat Pencairan", en: "Payout History", ms: "Sejarah Pengeluaran", th: "ประวัติการเบิกจ่าย", fil: "Kasaysayan ng Payout", vi: "Lịch sử thanh toán" },

  "referral.howItWorksTitle": { id: "Cara Kerja", en: "How It Works", ms: "Cara Ia Berfungsi", th: "วิธีการทำงาน", fil: "Paano Ito Gumagana", vi: "Cách hoạt động" },
  "referral.how1": {
    id: "Bagikan link/kode referral kamu ke pemilik usaha rental PS lain.",
    en: "Share your referral link/code with other PS rental business owners.",
    ms: "Kongsi pautan/kod rujukan anda dengan pemilik perniagaan sewa PS lain.",
    th: "แชร์ลิงก์/รหัสแนะนำของคุณให้เจ้าของธุรกิจเช่า PS รายอื่น",
    fil: "Ibahagi ang referral link/code mo sa ibang may-ari ng PS rental business.",
    vi: "Chia sẻ link/mã giới thiệu của bạn cho các chủ tiệm cho thuê PS khác.",
  },
  "referral.how2": {
    id: "Outlet baru yang mendaftar lewat link kamu otomatis dapat diskon 20% di tagihan langganan pertama mereka.",
    en: "New outlets that sign up through your link automatically get a 20% discount on their first subscription invoice.",
    ms: "Outlet baharu yang mendaftar melalui pautan anda automatik mendapat diskaun 20% pada invois langganan pertama mereka.",
    th: "ร้านใหม่ที่สมัครผ่านลิงก์ของคุณจะได้รับส่วนลด 20% ในใบแจ้งหนี้การสมัครสมาชิกแรกโดยอัตโนมัติ",
    fil: "Ang bagong outlet na mag-sign up gamit ang link mo ay awtomatikong makakakuha ng 20% diskwento sa unang subscription invoice nila.",
    vi: "Cửa hàng mới đăng ký qua link của bạn sẽ tự động được giảm 20% cho hóa đơn thuê bao đầu tiên.",
  },
  "referral.how3": {
    id: "Kamu dapat komisi setiap kali outlet itu membayar tagihan langganan bulanan — selama mereka terus berlangganan, komisi terus mengalir.",
    en: "You earn a commission every time that outlet pays its monthly subscription invoice — as long as they stay subscribed, the commission keeps coming.",
    ms: "Anda mendapat komisen setiap kali outlet itu membayar invois langganan bulanan — selagi mereka terus melanggan, komisen terus mengalir.",
    th: "คุณจะได้ค่าคอมมิชชันทุกครั้งที่ร้านนั้นชำระใบแจ้งหนี้รายเดือน — ตราบใดที่ยังสมัครสมาชิกอยู่ ค่าคอมมิชชันจะยังคงเข้ามาเรื่อยๆ",
    fil: "Makakakuha ka ng komisyon tuwing babayaran ng outlet na iyon ang buwanang subscription invoice — habang aktibo pa sila, patuloy ang komisyon.",
    vi: "Bạn nhận hoa hồng mỗi khi cửa hàng đó thanh toán hóa đơn thuê bao hàng tháng — miễn là họ còn đăng ký, hoa hồng vẫn tiếp tục.",
  },
  "referral.how4": {
    id: "Saldo komisi dicairkan tim NEXBILL 1x seminggu setiap hari Senin, ke rekening bank yang kamu isi di Pengaturan.",
    en: "Commission balance is paid out by the NEXBILL team once a week, every Monday, to the bank account you set in Settings.",
    ms: "Baki komisen dikeluarkan oleh pasukan NEXBILL 1x seminggu setiap hari Isnin, ke akaun bank yang anda tetapkan di Tetapan.",
    th: "ยอดคอมมิชชันจะถูกเบิกจ่ายโดยทีม NEXBILL สัปดาห์ละ 1 ครั้งทุกวันจันทร์ ไปยังบัญชีธนาคารที่คุณตั้งค่าไว้ในการตั้งค่า",
    fil: "Ang commission balance ay binabayaran ng NEXBILL team 1x kada linggo tuwing Lunes, papunta sa bank account na naitakda mo sa Settings.",
    vi: "Số dư hoa hồng được đội ngũ NEXBILL thanh toán 1 lần/tuần vào mỗi thứ Hai, vào tài khoản ngân hàng bạn đã thiết lập trong Cài đặt.",
  },

  "referral.payoutCadenceTitle": { id: "Jadwal Pencairan Komisi", en: "Commission Payout Schedule", ms: "Jadual Pengeluaran Komisen", th: "กำหนดการเบิกจ่ายค่าคอมมิชชัน", fil: "Iskedyul ng Commission Payout", vi: "Lịch thanh toán hoa hồng" },
  "referral.payoutCadenceDesc": { id: "Komisi dicairkan 1x seminggu setiap hari Senin.", en: "Commission is paid out once a week, every Monday.", ms: "Komisen dikeluarkan 1x seminggu setiap hari Isnin.", th: "ค่าคอมมิชชันจะถูกเบิกจ่ายสัปดาห์ละ 1 ครั้งทุกวันจันทร์", fil: "Binabayaran ang komisyon 1x kada linggo tuwing Lunes.", vi: "Hoa hồng được thanh toán 1 lần/tuần vào mỗi thứ Hai." },
  "referral.nextPayoutPrefix": { id: "Estimasi pencairan berikutnya:", en: "Estimated next payout:", ms: "Anggaran pengeluaran seterusnya:", th: "ประมาณการเบิกจ่ายครั้งถัดไป:", fil: "Tinatayang susunod na payout:", vi: "Dự kiến thanh toán tiếp theo:" },

  "referral.bankMissingTitle": { id: "Rekening Bank Belum Diisi", en: "Bank Account Not Set Up Yet", ms: "Akaun Bank Belum Diisi", th: "ยังไม่ได้กรอกบัญชีธนาคาร", fil: "Wala Pang Bank Account", vi: "Chưa thiết lập tài khoản ngân hàng" },
  "referral.bankMissingDesc": { id: "Lengkapi nomor rekening dan bank di Pengaturan supaya komisi kamu bisa dicairkan.", en: "Complete your account number and bank in Settings so your commission can be paid out.", ms: "Lengkapkan nombor akaun dan bank di Tetapan supaya komisen anda boleh dikeluarkan.", th: "กรอกเลขบัญชีและธนาคารในการตั้งค่าเพื่อให้สามารถเบิกจ่ายค่าคอมมิชชันของคุณได้", fil: "Kumpletuhin ang account number at bank sa Settings para mabayaran ang komisyon mo.", vi: "Điền đầy đủ số tài khoản và ngân hàng trong Cài đặt để có thể thanh toán hoa hồng của bạn." },
  "referral.bankMissingCta": { id: "Isi Rekening Bank →", en: "Fill In Bank Account →", ms: "Isi Akaun Bank →", th: "กรอกบัญชีธนาคาร →", fil: "Punan ang Bank Account →", vi: "Điền tài khoản ngân hàng →" },
  "referral.how5": {
    id: "Referrer aktif/berprestasi bisa diupgrade ke tier Affiliate atau Master Partner dengan komisi lebih tinggi oleh tim NEXBILL.",
    en: "Active/high-performing referrers can be upgraded to the Affiliate or Master Partner tier with a higher commission rate by the NEXBILL team.",
    ms: "Perujuk aktif/berprestasi boleh dinaik taraf ke tier Affiliate atau Master Partner dengan kadar komisen lebih tinggi oleh pasukan NEXBILL.",
    th: "ผู้แนะนำที่กระตือรือร้น/มีผลงานดีสามารถได้รับการอัปเกรดเป็นระดับ Affiliate หรือ Master Partner พร้อมอัตราค่าคอมมิชชันที่สูงขึ้นโดยทีม NEXBILL",
    fil: "Ang aktibo/mahusay na referrer ay maaaring i-upgrade sa Affiliate o Master Partner tier na may mas mataas na commission rate ng NEXBILL team.",
    vi: "Người giới thiệu tích cực/hiệu quả cao có thể được đội ngũ NEXBILL nâng cấp lên bậc Affiliate hoặc Master Partner với tỷ lệ hoa hồng cao hơn.",
  },

  "referral.tier.customer": { id: "Customer", en: "Customer", ms: "Customer", th: "Customer", fil: "Customer", vi: "Customer" },
  "referral.tier.affiliate": { id: "Affiliate", en: "Affiliate", ms: "Affiliate", th: "Affiliate", fil: "Affiliate", vi: "Affiliate" },
  "referral.tier.masterPartner": { id: "Master Partner", en: "Master Partner", ms: "Master Partner", th: "Master Partner", fil: "Master Partner", vi: "Master Partner" },

  "referral.status.trial": { id: "Masa Percobaan", en: "Trial Period", ms: "Tempoh Percubaan", th: "ช่วงทดลองใช้", fil: "Trial Period", vi: "Giai đoạn dùng thử" },
  "referral.status.active": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งานอยู่", fil: "Aktibo", vi: "Đang hoạt động" },
  "referral.status.churned": { id: "Berhenti", en: "Churned", ms: "Berhenti", th: "ยกเลิกแล้ว", fil: "Tumigil", vi: "Đã ngừng" },
});
