/**
 * Teks halaman layar bilik /tv dalam 6 bahasa (sama dengan dashboard). Bahasa dipilih di layar "Hubungkan
 * TV" atau di menu staf aplikasi NEXBILL TV (dikirim lewat ?lang=). Halaman ini publik & ringan — sengaja
 * tidak memakai registry kamus dashboard.
 */

export const TV_LANGS = ["id", "en", "ms", "th", "fil", "vi"] as const;
export type TvLang = (typeof TV_LANGS)[number];

export const TV_LANG_NAMES: Record<TvLang, string> = { id: "Indonesia", en: "English", ms: "Melayu", th: "ไทย", fil: "Filipino", vi: "Tiếng Việt" };

/** Locale tanggal/jam per bahasa. */
export const TV_LOCALE: Record<TvLang, string> = { id: "id-ID", en: "en-GB", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" };

const DICT: Record<string, Record<TvLang, string>> = {
  "pair.title": { id: "Hubungkan TV ini", en: "Connect this TV", ms: "Sambungkan TV ini", th: "เชื่อมต่อทีวีเครื่องนี้", fil: "Ikonekta ang TV na ito", vi: "Kết nối TV này" },
  "pair.lead": { id: "Ketik 6 digit kode pairing dari dashboard NEXBILL. TV ini akan terhubung ke satu outlet dan satu unit saja.", en: "Enter the 6-digit pairing code from the NEXBILL dashboard. This TV connects to one outlet and one unit only.", ms: "Masukkan kod pairing 6 digit daripada papan pemuka NEXBILL. TV ini disambungkan kepada satu outlet dan satu unit sahaja.", th: "ใส่รหัสจับคู่ 6 หลักจากแดชบอร์ด NEXBILL ทีวีเครื่องนี้จะเชื่อมกับร้านเดียวและเครื่องเดียวเท่านั้น", fil: "I-type ang 6-digit na pairing code mula sa NEXBILL dashboard. Kokonekta ang TV na ito sa iisang outlet at iisang unit lang.", vi: "Nhập mã ghép nối 6 chữ số từ bảng điều khiển NEXBILL. TV này chỉ kết nối với một cửa hàng và một máy." },
  "pair.codeLabel": { id: "Kode pairing", en: "Pairing code", ms: "Kod pairing", th: "รหัสจับคู่", fil: "Pairing code", vi: "Mã ghép nối" },
  "pair.keypadHint": { id: "Pakai tombol angka di remote, atau pilih angka di sini dengan tombol arah lalu OK.", en: "Use the number keys on the remote, or pick numbers here with the arrow keys and OK.", ms: "Guna butang nombor pada alat kawalan, atau pilih nombor di sini dengan butang anak panah dan OK.", th: "ใช้ปุ่มตัวเลขบนรีโมท หรือเลือกตัวเลขตรงนี้ด้วยปุ่มลูกศรแล้วกด OK", fil: "Gamitin ang number keys sa remote, o pumili ng numero dito gamit ang arrow keys at OK.", vi: "Dùng phím số trên điều khiển, hoặc chọn số ở đây bằng phím mũi tên rồi OK." },
  "pair.badCode": { id: "Kode harus 6 digit angka.", en: "The code must be 6 digits.", ms: "Kod mesti 6 digit nombor.", th: "รหัสต้องเป็นตัวเลข 6 หลัก", fil: "Dapat 6 na digit ang code.", vi: "Mã phải gồm 6 chữ số." },
  "pair.failed": { id: "Gagal memasangkan layar.", en: "Couldn't pair this screen.", ms: "Gagal memasangkan skrin.", th: "จับคู่หน้าจอไม่สำเร็จ", fil: "Hindi na-pair ang screen.", vi: "Không ghép nối được màn hình." },
  "pair.network": { id: "Tidak bisa menghubungi server. Periksa koneksi internet TV ini.", en: "Can't reach the server. Check this TV's internet connection.", ms: "Tidak dapat menghubungi pelayan. Semak sambungan internet TV ini.", th: "ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจการเชื่อมต่ออินเทอร์เน็ตของทีวี", fil: "Hindi maabot ang server. Tingnan ang internet ng TV na ito.", vi: "Không kết nối được máy chủ. Kiểm tra internet của TV này." },
  "pair.connecting": { id: "Menghubungkan ke outlet…", en: "Connecting to the outlet…", ms: "Menyambung ke outlet…", th: "กำลังเชื่อมต่อกับร้าน…", fil: "Kumokonekta sa outlet…", vi: "Đang kết nối với cửa hàng…" },
  "pair.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Burahin", vi: "Xóa" },
  "pair.s1t": { id: "Owner / Manager", en: "Owner / Manager", ms: "Pemilik / Pengurus", th: "เจ้าของ / ผู้จัดการ", fil: "Owner / Manager", vi: "Chủ / Quản lý" },
  "pair.s1": { id: "Buka Pengaturan › TV Screensaver di dashboard NEXBILL, lalu tambah layar untuk unit ini.", en: "Open Settings › TV Screensaver in the NEXBILL dashboard, then add a screen for this unit.", ms: "Buka Tetapan › TV Screensaver di papan pemuka NEXBILL, kemudian tambah skrin untuk unit ini.", th: "เปิด การตั้งค่า › TV Screensaver ในแดชบอร์ด NEXBILL แล้วเพิ่มหน้าจอสำหรับเครื่องนี้", fil: "Buksan ang Settings › TV Screensaver sa NEXBILL dashboard, saka magdagdag ng screen para sa unit na ito.", vi: "Mở Cài đặt › TV Screensaver trên bảng điều khiển NEXBILL rồi thêm màn hình cho máy này." },
  "pair.s2t": { id: "Kode 6 digit", en: "6-digit code", ms: "Kod 6 digit", th: "รหัส 6 หลัก", fil: "6-digit na code", vi: "Mã 6 chữ số" },
  "pair.s2": { id: "Kode muncul di dashboard dan berlaku 30 menit. Ketik di kolom kiri.", en: "The code appears in the dashboard and is valid for 30 minutes. Enter it on the left.", ms: "Kod dipaparkan di papan pemuka dan sah 30 minit. Taip di sebelah kiri.", th: "รหัสแสดงในแดชบอร์ดและใช้ได้ 30 นาที ใส่ที่ช่องด้านซ้าย", fil: "Lalabas ang code sa dashboard at valid nang 30 minuto. I-type sa kaliwa.", vi: "Mã hiện trên bảng điều khiển, có hiệu lực 30 phút. Nhập ở cột bên trái." },
  "pair.s3t": { id: "Selesai", en: "Done", ms: "Selesai", th: "เสร็จสิ้น", fil: "Tapos", vi: "Xong" },
  "pair.s3": { id: "TV langsung mengikuti sesi dari kasir. Tekan OK di remote untuk panel kasir & menu staf.", en: "The TV follows sessions from the cashier right away. Press OK on the remote for the cashier panel & staff menu.", ms: "TV terus mengikut sesi daripada juruwang. Tekan OK pada alat kawalan untuk panel juruwang & menu staf.", th: "ทีวีจะทำงานตามเซสชันจากแคชเชียร์ทันที กด OK ที่รีโมทเพื่อเปิดแผงแคชเชียร์และเมนูพนักงาน", fil: "Agad susundan ng TV ang mga session mula sa cashier. Pindutin ang OK sa remote para sa cashier panel at staff menu.", vi: "TV làm theo phiên từ quầy thu ngân ngay. Nhấn OK trên điều khiển để mở bảng thu ngân & menu nhân viên." },
  "pair.language": { id: "Bahasa", en: "Language", ms: "Bahasa", th: "ภาษา", fil: "Wika", vi: "Ngôn ngữ" },
  "loading": { id: "Memuat…", en: "Loading…", ms: "Memuatkan…", th: "กำลังโหลด…", fil: "Naglo-load…", vi: "Đang tải…" },
  "reconnecting": { id: "Menyambungkan ulang…", en: "Reconnecting…", ms: "Menyambung semula…", th: "กำลังเชื่อมต่อใหม่…", fil: "Kumokonekta muli…", vi: "Đang kết nối lại…" },
  "disabled.title": { id: "Screensaver tidak aktif", en: "Screensaver is off", ms: "Penyelamat skrin tidak aktif", th: "สกรีนเซฟเวอร์ปิดอยู่", fil: "Naka-off ang screensaver", vi: "Màn hình chờ đang tắt" },
  "disabled.body": { id: "Layar {screen} tetap terhubung dan menyala sendiri begitu masalah di atas dibereskan di dashboard.", en: "Screen {screen} stays connected and turns on by itself once the issue above is fixed in the dashboard.", ms: "Skrin {screen} kekal disambungkan dan hidup sendiri sebaik sahaja masalah di atas dibetulkan di papan pemuka.", th: "หน้าจอ {screen} ยังเชื่อมต่ออยู่และจะเปิดเองเมื่อแก้ปัญหาข้างต้นในแดชบอร์ดแล้ว", fil: "Mananatiling konektado ang screen na {screen} at kusang bubukas kapag naayos na sa dashboard ang problema sa itaas.", vi: "Màn hình {screen} vẫn kết nối và tự bật khi sự cố trên được xử lý trên bảng điều khiển." },
  "connected": { id: "✓ TERHUBUNG", en: "✓ CONNECTED", ms: "✓ DISAMBUNGKAN", th: "✓ เชื่อมต่อแล้ว", fil: "✓ NAKAKONEKTA", vi: "✓ ĐÃ KẾT NỐI" },
  "unit": { id: "Unit", en: "Unit", ms: "Unit", th: "เครื่อง", fil: "Unit", vi: "Máy" },
  "offline": { id: "Offline", en: "Offline", ms: "Luar talian", th: "ออฟไลน์", fil: "Offline", vi: "Mất kết nối" },
  "offlineSince": { id: "terakhir terhubung {ago}", en: "last connected {ago}", ms: "kali terakhir disambungkan {ago}", th: "เชื่อมต่อล่าสุด {ago}", fil: "huling konektado {ago}", vi: "kết nối lần cuối {ago}" },
  "justNow": { id: "baru saja", en: "just now", ms: "baru sahaja", th: "เมื่อสักครู่", fil: "ngayon lang", vi: "vừa xong" },
  "minAgo": { id: "{n} mnt lalu", en: "{n} min ago", ms: "{n} min lalu", th: "{n} นาทีที่แล้ว", fil: "{n} min ang nakalipas", vi: "{n} phút trước" },
  "offlineNote": { id: "waktu sesi tetap dihitung di TV", en: "session time is still counted on the TV", ms: "masa sesi tetap dikira di TV", th: "TV ยังนับเวลาเซสชันอยู่", fil: "binibilang pa rin ng TV ang oras ng session", vi: "TV vẫn tính giờ phiên" },
  "online": { id: "Terhubung ke dashboard", en: "Connected to the dashboard", ms: "Disambungkan ke papan pemuka", th: "เชื่อมต่อกับแดชบอร์ดแล้ว", fil: "Nakakonekta sa dashboard", vi: "Đã kết nối bảng điều khiển" },
  "timeLeft": { id: "SISA WAKTU", en: "TIME LEFT", ms: "BAKI MASA", th: "เวลาที่เหลือ", fil: "NATITIRANG ORAS", vi: "THỜI GIAN CÒN LẠI" },
  "timeUp1": { id: "WAKTU", en: "TIME'S", ms: "MASA", th: "หมด", fil: "TAPOS NA", vi: "HẾT" },
  "timeUp2": { id: "HABIS", en: "UP", ms: "TAMAT", th: "เวลา", fil: "ANG ORAS", vi: "GIỜ" },
  "ended1": { id: "SESI", en: "SESSION", ms: "SESI", th: "จบ", fil: "TAPOS NA", vi: "PHIÊN" },
  "ended2": { id: "SELESAI", en: "ENDED", ms: "TAMAT", th: "เซสชัน", fil: "ANG SESSION", vi: "KẾT THÚC" },
  "scanBill": { id: "Scan untuk lihat tagihan & panggil kasir", en: "Scan to see the bill & call the cashier", ms: "Imbas untuk lihat bil & panggil juruwang", th: "สแกนเพื่อดูบิลและเรียกแคชเชียร์", fil: "I-scan para makita ang bill at tawagin ang cashier", vi: "Quét để xem hóa đơn & gọi thu ngân" },
  "scanExtend": { id: "Scan untuk tambah waktu, pesan makanan, atau panggil kasir", en: "Scan to add time, order food, or call the cashier", ms: "Imbas untuk tambah masa, pesan makanan, atau panggil juruwang", th: "สแกนเพื่อเพิ่มเวลา สั่งอาหาร หรือเรียกแคชเชียร์", fil: "I-scan para magdagdag ng oras, umorder ng pagkain, o tawagin ang cashier", vi: "Quét để thêm giờ, gọi món hoặc gọi thu ngân" },
  "noApp": { id: "Tanpa aplikasi — cukup kamera HP", en: "No app needed — just a phone camera", ms: "Tanpa aplikasi — cukup kamera telefon", th: "ไม่ต้องใช้แอป — ใช้กล้องมือถือก็พอ", fil: "Walang app — camera ng phone lang", vi: "Không cần ứng dụng — chỉ cần camera điện thoại" },
  "thanks": { id: "Terima kasih sudah bermain! Silakan selesaikan pembayaran di kasir.", en: "Thanks for playing! Please complete payment at the cashier.", ms: "Terima kasih kerana bermain! Sila selesaikan pembayaran di juruwang.", th: "ขอบคุณที่มาเล่น! กรุณาชำระเงินที่แคชเชียร์", fil: "Salamat sa paglalaro! Pakibayaran sa cashier.", vi: "Cảm ơn bạn đã chơi! Vui lòng thanh toán tại quầy." },
  "extendAsk": { id: "Mau lanjut main? Tambah waktu sekarang sebelum habis.", en: "Want to keep playing? Add time now before it runs out.", ms: "Mahu terus bermain? Tambah masa sekarang sebelum tamat.", th: "อยากเล่นต่อ? เพิ่มเวลาตอนนี้ก่อนหมด", fil: "Gusto pang maglaro? Magdagdag ng oras bago maubos.", vi: "Muốn chơi tiếp? Thêm giờ ngay trước khi hết." },
  "callPay": { id: "Hubungi kasir untuk pembayaran.", en: "Contact the cashier to pay.", ms: "Hubungi juruwang untuk pembayaran.", th: "ติดต่อแคชเชียร์เพื่อชำระเงิน", fil: "Kontakin ang cashier para magbayad.", vi: "Liên hệ thu ngân để thanh toán." },
  "callExtend": { id: "Hubungi kasir untuk tambah waktu.", en: "Contact the cashier to add time.", ms: "Hubungi juruwang untuk tambah masa.", th: "ติดต่อแคชเชียร์เพื่อเพิ่มเวลา", fil: "Kontakin ang cashier para magdagdag ng oras.", vi: "Liên hệ thu ngân để thêm giờ." },
  "syncPending": { id: "Mengirim ke kasir…", en: "Sending to the cashier…", ms: "Menghantar ke juruwang…", th: "กำลังส่งไปยังแคชเชียร์…", fil: "Ipinapadala sa cashier…", vi: "Đang gửi tới thu ngân…" },
  "syncFailed": { id: "Belum tercatat di kasir — kasir: buka Status sinkron di panel TV.", en: "Not recorded at the cashier yet — cashier: open Sync status in the TV panel.", ms: "Belum direkod di juruwang — juruwang: buka Status segerak di panel TV.", th: "ยังไม่ถูกบันทึกที่แคชเชียร์ — แคชเชียร์: เปิดสถานะซิงค์ในแผงทีวี", fil: "Hindi pa naitala sa cashier — cashier: buksan ang Sync status sa TV panel.", vi: "Chưa được ghi ở quầy — thu ngân: mở Trạng thái đồng bộ trong bảng TV." },
  "ready": { id: "Siap Main?", en: "Ready to play?", ms: "Sedia bermain?", th: "พร้อมเล่นไหม?", fil: "Handa nang maglaro?", vi: "Sẵn sàng chơi?" },
  "bookingOnline": { id: "BOOKING ONLINE", en: "ONLINE BOOKING", ms: "TEMPAHAN ONLINE", th: "จองออนไลน์", fil: "ONLINE BOOKING", vi: "ĐẶT CHỖ ONLINE" },
  "scanBook": { id: "Scan & pesan unit", en: "Scan & book a unit", ms: "Imbas & tempah unit", th: "สแกนและจองเครื่อง", fil: "I-scan at mag-book ng unit", vi: "Quét & đặt máy" },
  "pressAny": { id: "Tekan OK di remote untuk panel kasir", en: "Press OK on the remote for the cashier panel", ms: "Tekan OK pada alat kawalan untuk panel juruwang", th: "กด OK ที่รีโมทเพื่อเปิดแผงแคชเชียร์", fil: "Pindutin ang OK sa remote para sa cashier panel", vi: "Nhấn OK trên điều khiển để mở bảng thu ngân" },
  "pressAnyWeb": { id: "Tekan tombol apa saja di remote", en: "Press any button on the remote", ms: "Tekan mana-mana butang pada alat kawalan", th: "กดปุ่มใดก็ได้บนรีโมท", fil: "Pindutin ang kahit anong button sa remote", vi: "Nhấn nút bất kỳ trên điều khiển" },
  "maintenance": { id: "SEDANG PERBAIKAN", en: "UNDER REPAIR", ms: "DALAM PEMBAIKAN", th: "กำลังซ่อม", fil: "INAAYOS", vi: "ĐANG SỬA" },
  "available": { id: "TERSEDIA", en: "AVAILABLE", ms: "TERSEDIA", th: "ว่าง", fil: "BAKANTE", vi: "CÒN TRỐNG" },
  "callStart": { id: "Hubungi kasir untuk mulai bermain", en: "Ask the cashier to start playing", ms: "Hubungi juruwang untuk mula bermain", th: "ติดต่อแคชเชียร์เพื่อเริ่มเล่น", fil: "Kontakin ang cashier para magsimulang maglaro", vi: "Liên hệ thu ngân để bắt đầu chơi" },
  "paused": { id: "DIJEDA", en: "PAUSED", ms: "DIJEDA", th: "หยุดชั่วคราว", fil: "NAKA-PAUSE", vi: "TẠM DỪNG" },
  "overtime": { id: "LEWAT WAKTU", en: "OVERTIME", ms: "LEBIH MASA", th: "เกินเวลา", fil: "LAMPAS NA", vi: "QUÁ GIỜ" },
  "left": { id: "SISA", en: "LEFT", ms: "BAKI", th: "เหลือ", fil: "NATITIRA", vi: "CÒN" },
  "running": { id: "BERJALAN", en: "RUNNING", ms: "BERJALAN", th: "กำลังเล่น", fil: "TUMATAKBO", vi: "ĐANG CHẠY" },
  "sessionPaused": { id: "SESI DIJEDA", en: "SESSION PAUSED", ms: "SESI DIJEDA", th: "เซสชันหยุดชั่วคราว", fil: "NAKA-PAUSE ANG SESSION", vi: "PHIÊN TẠM DỪNG" },
  "inUse": { id: "SEDANG DIGUNAKAN", en: "IN USE", ms: "SEDANG DIGUNAKAN", th: "กำลังใช้งาน", fil: "GINAGAMIT", vi: "ĐANG SỬ DỤNG" },
  "pinTitle": { id: "PIN Staf", en: "Staff PIN", ms: "PIN Staf", th: "PIN พนักงาน", fil: "PIN ng staff", vi: "PIN nhân viên" },
  "pinWrong": { id: "PIN salah.", en: "Wrong PIN.", ms: "PIN salah.", th: "PIN ไม่ถูกต้อง", fil: "Mali ang PIN.", vi: "PIN sai." },
  "serverDown": { id: "Tidak bisa menghubungi server.", en: "Can't reach the server.", ms: "Tidak dapat menghubungi pelayan.", th: "ติดต่อเซิร์ฟเวอร์ไม่ได้", fil: "Hindi maabot ang server.", vi: "Không kết nối được máy chủ." },
  "backToSaver": { id: "Kembali ke screensaver", en: "Back to screensaver", ms: "Kembali ke penyelamat skrin", th: "กลับไปที่สกรีนเซฟเวอร์", fil: "Bumalik sa screensaver", vi: "Quay lại màn hình chờ" },
  "screen": { id: "LAYAR", en: "SCREEN", ms: "SKRIN", th: "หน้าจอ", fil: "SCREEN", vi: "MÀN HÌNH" },
  "console": { id: "KONSOL", en: "CONSOLE", ms: "KONSOL", th: "เครื่องเกม", fil: "CONSOLE", vi: "MÁY CHƠI GAME" },
  "rate": { id: "TARIF", en: "RATE", ms: "KADAR", th: "ราคา", fil: "RATE", vi: "GIÁ" },
  "perHour": { id: "/jam", en: "/hour", ms: "/jam", th: "/ชม.", fil: "/oras", vi: "/giờ" },
  "panelInfo": { id: "Halaman ini hanya informasi. Mulai, jeda, dan hentikan sesi dari kasir NEXBILL — atau di aplikasi NEXBILL TV: tekan OK → PIN.", en: "This page is information only. Start, pause, and stop sessions from the NEXBILL cashier — or in the NEXBILL TV app: press OK → PIN.", ms: "Halaman ini maklumat sahaja. Mula, jeda dan hentikan sesi daripada juruwang NEXBILL — atau dalam aplikasi NEXBILL TV: tekan OK → PIN.", th: "หน้านี้แสดงข้อมูลเท่านั้น เริ่ม หยุดชั่วคราว และจบเซสชันจากแคชเชียร์ NEXBILL — หรือในแอป NEXBILL TV: กด OK → PIN", fil: "Impormasyon lang ang pahinang ito. Simulan, i-pause, at ihinto ang session mula sa NEXBILL cashier — o sa NEXBILL TV app: pindutin ang OK → PIN.", vi: "Trang này chỉ để xem. Bắt đầu, tạm dừng và kết thúc phiên tại quầy NEXBILL — hoặc trong ứng dụng NEXBILL TV: nhấn OK → PIN." },
};

export function isTvLang(v: unknown): v is TvLang {
  return typeof v === "string" && (TV_LANGS as readonly string[]).includes(v);
}

/** Teks untuk kunci; {nama} diisi dari vars. Kunci tak dikenal → kunci itu sendiri (kelihatan saat dites). */
export function tvText(lang: TvLang, key: string, vars?: Record<string, string | number>): string {
  const row = DICT[key];
  let s = row ? row[lang] || row.id : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export type TvT = (key: string, vars?: Record<string, string | number>) => string;
