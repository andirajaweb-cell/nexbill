/**
 * Teks tetap bot Telegram (bukan jawaban AI) dalam 6 bahasa dashboard. Bahasa = bahasa outlet
 * (outlets.preferred_lang); sebelum tertaut = bahasa aplikasi Telegram pengirim. Diuji di
 * support-rules.test.ts (setiap kunci punya 6 bahasa & placeholder yang sama).
 */
export const BOT_LANGS = ["id", "en", "ms", "th", "fil", "vi"] as const;
type Lang = (typeof BOT_LANGS)[number];
type Entry = Record<Lang, string>;

export const BOT_TEXT = {
  notLinked: {
    id: "Halo! Ini bot support 24 jam NEXBILL untuk owner & kasir outlet.\n\nTautkan dulu akunmu: buka {url} → kartu \"Support 24 jam di Telegram\" → Hubungkan Telegram.",
    en: "Hi! This is NEXBILL's 24-hour support bot for outlet owners & cashiers.\n\nLink your account first: open {url} → \"24-hour support on Telegram\" card → Connect Telegram.",
    ms: "Hai! Ini bot sokongan 24 jam NEXBILL untuk pemilik & juruwang outlet.\n\nPautkan akaun anda dahulu: buka {url} → kad \"Sokongan 24 jam di Telegram\" → Sambung Telegram.",
    th: "สวัสดี! นี่คือบอทซัพพอร์ต 24 ชม. ของ NEXBILL สำหรับเจ้าของและแคชเชียร์ร้าน\n\nเชื่อมบัญชีก่อน: เปิด {url} → การ์ด \"ซัพพอร์ต 24 ชม. ทาง Telegram\" → เชื่อม Telegram",
    fil: "Hi! Ito ang 24-oras na support bot ng NEXBILL para sa may-ari at cashier ng outlet.\n\nI-link muna ang account mo: buksan ang {url} → card na \"24-oras na support sa Telegram\" → Ikonekta ang Telegram.",
    vi: "Xin chào! Đây là bot hỗ trợ 24 giờ của NEXBILL dành cho chủ và thu ngân cửa hàng.\n\nHãy liên kết tài khoản trước: mở {url} → thẻ \"Hỗ trợ 24 giờ qua Telegram\" → Kết nối Telegram.",
  },
  linkInvalid: {
    id: "Kode tautan tidak berlaku atau sudah kedaluwarsa (berlaku 15 menit). Buat kode baru di {url}.",
    en: "This link code is invalid or expired (valid for 15 minutes). Create a new one at {url}.",
    ms: "Kod pautan tidak sah atau telah tamat tempoh (sah 15 minit). Buat kod baharu di {url}.",
    th: "รหัสเชื่อมไม่ถูกต้องหรือหมดอายุ (ใช้ได้ 15 นาที) สร้างรหัสใหม่ที่ {url}",
    fil: "Hindi valid o expired na ang link code (valid nang 15 minuto). Gumawa ng bago sa {url}.",
    vi: "Mã liên kết không hợp lệ hoặc đã hết hạn (hiệu lực 15 phút). Tạo mã mới tại {url}.",
  },
  linked: {
    id: "Terhubung ke {outlet}. Halo {name}!\n\nTulis pertanyaan atau kendala outlet kapan saja — bot menjawab 24 jam dari Panduan NEXBILL. Ketik /tim untuk langsung diteruskan ke tim, /status untuk cek akun & perangkat.",
    en: "Connected to {outlet}. Hi {name}!\n\nAsk anything about your outlet, any time — the bot answers 24/7 from the NEXBILL guides. Type /tim to go straight to the team, /status to check your account & devices.",
    ms: "Disambungkan ke {outlet}. Hai {name}!\n\nTulis soalan atau masalah outlet bila-bila masa — bot menjawab 24 jam daripada Panduan NEXBILL. Taip /tim untuk terus ke pasukan, /status untuk semak akaun & peranti.",
    th: "เชื่อมกับ {outlet} แล้ว สวัสดี {name}!\n\nพิมพ์คำถามหรือปัญหาของร้านได้ตลอดเวลา — บอทตอบ 24 ชม. จากคู่มือ NEXBILL พิมพ์ /tim เพื่อส่งถึงทีมทันที, /status เพื่อตรวจบัญชีและอุปกรณ์",
    fil: "Nakakonekta sa {outlet}. Hi {name}!\n\nItanong ang kahit ano tungkol sa outlet anumang oras — sumasagot ang bot 24/7 mula sa mga gabay ng NEXBILL. I-type ang /tim para direkta sa team, /status para tingnan ang account at device.",
    vi: "Đã kết nối với {outlet}. Chào {name}!\n\nHỏi bất cứ điều gì về cửa hàng, bất cứ lúc nào — bot trả lời 24/7 từ Hướng dẫn NEXBILL. Gõ /tim để chuyển thẳng cho đội ngũ, /status để kiểm tra tài khoản & thiết bị.",
  },
  unlinked: {
    id: "Telegram ini sudah diputus dari akun NEXBILL. Tautkan lagi kapan saja dari menu Customer Service di dashboard.",
    en: "This Telegram is now disconnected from your NEXBILL account. Reconnect any time from Customer Service in the dashboard.",
    ms: "Telegram ini telah diputuskan daripada akaun NEXBILL. Sambung semula bila-bila masa dari menu Perkhidmatan Pelanggan di dashboard.",
    th: "ยกเลิกการเชื่อม Telegram นี้กับบัญชี NEXBILL แล้ว เชื่อมใหม่ได้ทุกเมื่อจากเมนูบริการลูกค้าในแดชบอร์ด",
    fil: "Naka-disconnect na ang Telegram na ito sa NEXBILL account. Ikonekta muli anumang oras mula sa Customer Service sa dashboard.",
    vi: "Telegram này đã ngắt kết nối khỏi tài khoản NEXBILL. Kết nối lại bất cứ lúc nào từ mục Chăm sóc khách hàng trên dashboard.",
  },
  help: {
    id: "Bot support NEXBILL untuk {outlet}.\n\n• Tulis pertanyaan biasa — mis. \"cara tutup shift\" atau \"TV tidak menyala otomatis\".\n• /tim — teruskan ke tim NEXBILL (tiket).\n• /status — status langganan & perangkat.\n• /putus — putuskan Telegram ini.\n\nDarurat (outlet tidak bisa menagih): tulis saja masalahnya, bot memberi langkah darurat dan memanggil tim.",
    en: "NEXBILL support bot for {outlet}.\n\n• Just type your question — e.g. \"how to close a shift\" or \"TV doesn't turn on automatically\".\n• /tim — pass to the NEXBILL team (ticket).\n• /status — subscription & device status.\n• /putus — disconnect this Telegram.\n\nEmergency (the outlet can't charge customers): just describe it — the bot gives emergency steps and alerts the team.",
    ms: "Bot sokongan NEXBILL untuk {outlet}.\n\n• Tulis soalan biasa — cth. \"cara tutup syif\" atau \"TV tidak hidup automatik\".\n• /tim — hantar kepada pasukan NEXBILL (tiket).\n• /status — status langganan & peranti.\n• /putus — putuskan Telegram ini.\n\nKecemasan (outlet tidak dapat mengenakan bayaran): tulis sahaja masalahnya, bot memberi langkah kecemasan dan memanggil pasukan.",
    th: "บอทซัพพอร์ต NEXBILL สำหรับ {outlet}\n\n• พิมพ์คำถามได้เลย — เช่น \"ปิดกะอย่างไร\" หรือ \"ทีวีไม่เปิดอัตโนมัติ\"\n• /tim — ส่งถึงทีม NEXBILL (ทิกเก็ต)\n• /status — สถานะการสมัครและอุปกรณ์\n• /putus — ยกเลิกการเชื่อม Telegram นี้\n\nฉุกเฉิน (ร้านเก็บเงินลูกค้าไม่ได้): พิมพ์ปัญหาได้เลย บอทจะให้ขั้นตอนฉุกเฉินและแจ้งทีม",
    fil: "NEXBILL support bot para sa {outlet}.\n\n• I-type lang ang tanong — hal. \"paano isara ang shift\" o \"hindi kusang bumubukas ang TV\".\n• /tim — ipasa sa NEXBILL team (ticket).\n• /status — status ng subscription at device.\n• /putus — i-disconnect ang Telegram na ito.\n\nEmergency (hindi makasingil ang outlet): ilarawan lang — magbibigay ang bot ng emergency steps at aalertuhin ang team.",
    vi: "Bot hỗ trợ NEXBILL cho {outlet}.\n\n• Cứ gõ câu hỏi — vd. \"cách đóng ca\" hoặc \"TV không tự bật\".\n• /tim — chuyển cho đội NEXBILL (phiếu hỗ trợ).\n• /status — trạng thái gói & thiết bị.\n• /putus — ngắt kết nối Telegram này.\n\nKhẩn cấp (cửa hàng không thu tiền được): cứ mô tả vấn đề, bot sẽ đưa bước khẩn cấp và báo đội ngũ.",
  },
  status: {
    id: "Status akun: {line}",
    en: "Account status: {line}",
    ms: "Status akaun: {line}",
    th: "สถานะบัญชี: {line}",
    fil: "Status ng account: {line}",
    vi: "Trạng thái tài khoản: {line}",
  },
  textOnly: {
    id: "Bot hanya bisa membaca teks. Untuk mengirim foto/video kendala, buka tiket di {url}.",
    en: "The bot can only read text. To send photos/videos of the issue, open a ticket at {url}.",
    ms: "Bot hanya boleh membaca teks. Untuk menghantar foto/video masalah, buka tiket di {url}.",
    th: "บอทอ่านได้เฉพาะข้อความ หากต้องการส่งรูป/วิดีโอปัญหา เปิดทิกเก็ตที่ {url}",
    fil: "Teksto lang ang nababasa ng bot. Para magpadala ng larawan/video ng problema, magbukas ng ticket sa {url}.",
    vi: "Bot chỉ đọc được văn bản. Để gửi ảnh/video sự cố, hãy mở phiếu tại {url}.",
  },
  appended: {
    id: "Ditambahkan ke tiket #{ticket}. Tim akan membalas di sini.",
    en: "Added to ticket #{ticket}. The team will reply here.",
    ms: "Ditambah ke tiket #{ticket}. Pasukan akan membalas di sini.",
    th: "เพิ่มในทิกเก็ต #{ticket} แล้ว ทีมจะตอบกลับที่นี่",
    fil: "Idinagdag sa ticket #{ticket}. Sasagot ang team dito.",
    vi: "Đã thêm vào phiếu #{ticket}. Đội ngũ sẽ trả lời tại đây.",
  },
  ticketInHours: {
    id: "Sudah diteruskan ke tim NEXBILL (tiket #{ticket}). Balasan tim muncul di chat ini.",
    en: "Passed to the NEXBILL team (ticket #{ticket}). Their reply will appear in this chat.",
    ms: "Telah dihantar kepada pasukan NEXBILL (tiket #{ticket}). Balasan pasukan akan muncul di chat ini.",
    th: "ส่งถึงทีม NEXBILL แล้ว (ทิกเก็ต #{ticket}) คำตอบของทีมจะแสดงในแชทนี้",
    fil: "Naipasa na sa NEXBILL team (ticket #{ticket}). Lalabas dito ang sagot nila.",
    vi: "Đã chuyển cho đội NEXBILL (phiếu #{ticket}). Phản hồi sẽ hiện trong cuộc trò chuyện này.",
  },
  ticketAfterHours: {
    id: "Sudah diteruskan ke tim NEXBILL (tiket #{ticket}). Sekarang di luar jam kerja — tim membalas Senin–Sabtu mulai 09.00 WIB, langsung di chat ini.",
    en: "Passed to the NEXBILL team (ticket #{ticket}). It's outside working hours — the team replies Mon–Sat from 09:00 WIB (UTC+7), right in this chat.",
    ms: "Telah dihantar kepada pasukan NEXBILL (tiket #{ticket}). Kini di luar waktu kerja — pasukan membalas Isnin–Sabtu mulai 09.00 WIB (UTC+7), terus di chat ini.",
    th: "ส่งถึงทีม NEXBILL แล้ว (ทิกเก็ต #{ticket}) ขณะนี้อยู่นอกเวลาทำการ — ทีมตอบ จันทร์–เสาร์ ตั้งแต่ 09.00 WIB (UTC+7) ในแชทนี้",
    fil: "Naipasa na sa NEXBILL team (ticket #{ticket}). Labas na sa oras ng trabaho — sumasagot ang team Lunes–Sabado mula 09:00 WIB (UTC+7), dito mismo.",
    vi: "Đã chuyển cho đội NEXBILL (phiếu #{ticket}). Hiện ngoài giờ làm việc — đội ngũ trả lời Thứ 2–Thứ 7 từ 09:00 WIB (UTC+7), ngay trong cuộc trò chuyện này.",
  },
  ticketUrgentAfterHours: {
    id: "Ditandai DARURAT (tiket #{ticket}) dan petugas jaga NEXBILL sudah diberi tahu. Sambil menunggu: pakai Mode Offline di dashboard atau panel kasir NEXBILL TV (tombol OK → PIN) supaya sesi tetap bisa dimulai.",
    en: "Marked URGENT (ticket #{ticket}) and the NEXBILL on-call staff has been alerted. Meanwhile: use Offline Mode in the dashboard or the NEXBILL TV cashier panel (OK button → PIN) so sessions can still start.",
    ms: "Ditanda KECEMASAN (tiket #{ticket}) dan petugas bertugas NEXBILL telah dimaklumkan. Sementara menunggu: guna Mod Luar Talian di dashboard atau panel juruwang NEXBILL TV (butang OK → PIN) supaya sesi masih boleh dimulakan.",
    th: "ทำเครื่องหมายฉุกเฉินแล้ว (ทิกเก็ต #{ticket}) และแจ้งเจ้าหน้าที่เวรของ NEXBILL แล้ว ระหว่างรอ: ใช้โหมดออฟไลน์ในแดชบอร์ด หรือแผงแคชเชียร์ NEXBILL TV (ปุ่ม OK → PIN) เพื่อให้เริ่มเซสชันได้",
    fil: "Minarkahang URGENT (ticket #{ticket}) at naabisuhan na ang on-call ng NEXBILL. Habang naghihintay: gamitin ang Offline Mode sa dashboard o ang cashier panel ng NEXBILL TV (OK button → PIN) para makapagsimula pa rin ng session.",
    vi: "Đã đánh dấu KHẨN CẤP (phiếu #{ticket}) và nhân viên trực NEXBILL đã được báo. Trong lúc chờ: dùng Chế độ ngoại tuyến trên dashboard hoặc bảng thu ngân NEXBILL TV (nút OK → PIN) để vẫn bắt đầu phiên được.",
  },
  teamReply: {
    id: "Balasan tim NEXBILL — tiket #{ticket}:\n\n{body}\n\n(Balas pesan ini untuk menambahkan ke tiket yang sama.)",
    en: "Reply from the NEXBILL team — ticket #{ticket}:\n\n{body}\n\n(Reply to this message to add to the same ticket.)",
    ms: "Balasan pasukan NEXBILL — tiket #{ticket}:\n\n{body}\n\n(Balas mesej ini untuk menambah ke tiket yang sama.)",
    th: "คำตอบจากทีม NEXBILL — ทิกเก็ต #{ticket}:\n\n{body}\n\n(ตอบกลับข้อความนี้เพื่อเพิ่มในทิกเก็ตเดิม)",
    fil: "Sagot ng NEXBILL team — ticket #{ticket}:\n\n{body}\n\n(I-reply ang mensaheng ito para idagdag sa parehong ticket.)",
    vi: "Phản hồi từ đội NEXBILL — phiếu #{ticket}:\n\n{body}\n\n(Trả lời tin nhắn này để thêm vào cùng phiếu.)",
  },
} satisfies Record<string, Entry>;

export type BotTextKey = keyof typeof BOT_TEXT;

export function botText(lang: string, key: BotTextKey, vars: Record<string, string> = {}): string {
  const entry: Entry = BOT_TEXT[key];
  const l = (BOT_LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "id";
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), entry[l]);
}
