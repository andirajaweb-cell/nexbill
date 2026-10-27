import { registerDict } from "./registry";

/** Status sambungan NEXBILL TV di Rental PS (app/dashboard/rental/tv-connection.tsx) + mitigasi offline. */
registerDict({
  "tvConn.online": { id: "TV terhubung", en: "TV connected", ms: "TV disambungkan", th: "ทีวีเชื่อมต่อแล้ว", fil: "Nakakonekta ang TV", vi: "TV đã kết nối" },
  "tvConn.offline": { id: "TV offline {n} mnt", en: "TV offline {n} min", ms: "TV luar talian {n} min", th: "ทีวีออฟไลน์ {n} นาที", fil: "Offline ang TV {n} min", vi: "TV mất kết nối {n} phút" },
  "tvConn.never": { id: "TV belum dipasangkan", en: "TV not paired yet", ms: "TV belum dipasangkan", th: "ทีวียังไม่จับคู่", fil: "Hindi pa naka-pair ang TV", vi: "TV chưa ghép nối" },
  "tvConn.startOfflineConfirm": {
    id: "TV unit {unit} sedang OFFLINE (terakhir terhubung {n} menit lalu). Sesi tetap tercatat dan tertagih, tapi layar game TIDAK akan terbuka otomatis. Pakai panel kasir di TV (OK → PIN) atau periksa WiFi/daya TV. Tetap mulai?",
    en: "The TV for {unit} is OFFLINE (last connected {n} minutes ago). The session is still recorded and billed, but the game screen will NOT open automatically. Use the cashier panel on the TV (OK → PIN) or check the TV's WiFi/power. Start anyway?",
    ms: "TV unit {unit} sedang LUAR TALIAN (kali terakhir disambungkan {n} minit lalu). Sesi tetap direkod dan dicaj, tetapi skrin permainan TIDAK akan dibuka secara automatik. Guna panel juruwang di TV (OK → PIN) atau semak WiFi/kuasa TV. Teruskan?",
    th: "ทีวีของ {unit} ออฟไลน์อยู่ (เชื่อมต่อล่าสุด {n} นาทีที่แล้ว) เซสชันยังถูกบันทึกและคิดเงิน แต่หน้าจอเกมจะไม่เปิดเอง ใช้แผงแคชเชียร์บนทีวี (OK → PIN) หรือตรวจ WiFi/ไฟของทีวี เริ่มต่อหรือไม่?",
    fil: "OFFLINE ang TV ng {unit} (huling nakakonekta {n} minuto ang nakalipas). Naitatala at sinisingil pa rin ang session, pero HINDI kusang bubukas ang game screen. Gamitin ang cashier panel sa TV (OK → PIN) o tingnan ang WiFi/kuryente ng TV. Ituloy pa rin?",
    vi: "TV của {unit} đang MẤT KẾT NỐI (kết nối lần cuối {n} phút trước). Phiên vẫn được ghi và tính tiền nhưng màn hình game sẽ KHÔNG tự mở. Dùng bảng thu ngân trên TV (OK → PIN) hoặc kiểm tra WiFi/nguồn TV. Vẫn bắt đầu?",
  },
  "tvConn.offlineBoardNote": {
    id: "NEXBILL TV saat internet putus: TV tetap menghitung waktu sesi yang sedang berjalan dan mengunci layar saat habis, tapi TIDAK menerima perintah dari halaman ini. Untuk mulai, tambah waktu, atau mengakhiri sesi, pakai panel kasir di TV (tekan OK → PIN). Semua data TV dan halaman ini tersinkron otomatis begitu internet kembali.",
    en: "NEXBILL TV while the internet is down: the TV keeps counting running sessions and locks the screen when time is up, but does NOT receive commands from this page. To start, extend, or end a session, use the cashier panel on the TV (press OK → PIN). TV data and this page sync automatically once the internet is back.",
    ms: "NEXBILL TV ketika internet terputus: TV tetap mengira sesi yang sedang berjalan dan mengunci skrin apabila tamat, tetapi TIDAK menerima arahan dari halaman ini. Untuk mula, lanjut atau tamatkan sesi, guna panel juruwang di TV (tekan OK → PIN). Data TV dan halaman ini disegerakkan secara automatik apabila internet kembali.",
    th: "NEXBILL TV เมื่ออินเทอร์เน็ตล่ม: ทีวียังนับเวลาเซสชันที่กำลังเล่นและล็อกหน้าจอเมื่อหมดเวลา แต่จะไม่รับคำสั่งจากหน้านี้ หากต้องการเริ่ม ต่อเวลา หรือจบเซสชัน ใช้แผงแคชเชียร์บนทีวี (กด OK → PIN) ข้อมูลทีวีและหน้านี้จะซิงค์อัตโนมัติเมื่ออินเทอร์เน็ตกลับมา",
    fil: "NEXBILL TV kapag walang internet: patuloy na binibilang ng TV ang mga tumatakbong session at nila-lock ang screen kapag tapos na ang oras, pero HINDI ito tumatanggap ng utos mula sa pahinang ito. Para mag-start, mag-extend, o tapusin ang session, gamitin ang cashier panel sa TV (pindutin ang OK → PIN). Awtomatikong nagsi-sync ang data ng TV at ng pahinang ito pagbalik ng internet.",
    vi: "NEXBILL TV khi mất internet: TV vẫn đếm thời gian các phiên đang chạy và khóa màn hình khi hết giờ, nhưng KHÔNG nhận lệnh từ trang này. Để bắt đầu, gia hạn hoặc kết thúc phiên, dùng bảng thu ngân trên TV (nhấn OK → PIN). Dữ liệu TV và trang này tự đồng bộ khi có internet trở lại.",
  },
});
