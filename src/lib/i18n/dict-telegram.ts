import { registerDict } from "./registry";

/** Kartu "Support 24 jam di Telegram" di Customer Service (app/dashboard/chat/telegram-support-card.tsx). */
registerDict({
  "tgSupport.title": { id: "Support 24 jam di Telegram", en: "24-hour support on Telegram", ms: "Sokongan 24 jam di Telegram", th: "ซัพพอร์ต 24 ชม. ทาง Telegram", fil: "24-oras na support sa Telegram", vi: "Hỗ trợ 24 giờ qua Telegram" },
  "tgSupport.desc": {
    id: "Tanya kapan saja lewat Telegram. Bot menjawab dari Panduan NEXBILL dan status akunmu; yang perlu tim langsung jadi tiket di halaman ini, dan balasan tim ikut masuk ke Telegram.",
    en: "Ask any time on Telegram. The bot answers from the NEXBILL guides and your account status; anything that needs the team becomes a ticket on this page, and the team's reply also arrives in Telegram.",
    ms: "Tanya bila-bila masa di Telegram. Bot menjawab daripada Panduan NEXBILL dan status akaun anda; yang memerlukan pasukan terus menjadi tiket di halaman ini, dan balasan pasukan turut masuk ke Telegram.",
    th: "ถามได้ตลอดเวลาทาง Telegram บอทตอบจากคู่มือ NEXBILL และสถานะบัญชีของคุณ เรื่องที่ต้องใช้ทีมจะกลายเป็นทิกเก็ตในหน้านี้ และคำตอบของทีมจะส่งไปที่ Telegram ด้วย",
    fil: "Magtanong anumang oras sa Telegram. Sumasagot ang bot mula sa mga gabay ng NEXBILL at sa status ng account mo; ang kailangan ng team ay nagiging ticket sa pahinang ito, at darating din sa Telegram ang sagot ng team.",
    vi: "Hỏi bất cứ lúc nào qua Telegram. Bot trả lời từ Hướng dẫn NEXBILL và trạng thái tài khoản của bạn; việc cần đội ngũ sẽ thành phiếu trên trang này, và phản hồi của đội cũng gửi về Telegram.",
  },
  "tgSupport.connect": { id: "Hubungkan Telegram", en: "Connect Telegram", ms: "Sambung Telegram", th: "เชื่อม Telegram", fil: "Ikonekta ang Telegram", vi: "Kết nối Telegram" },
  "tgSupport.connecting": { id: "Menyiapkan…", en: "Preparing…", ms: "Menyediakan…", th: "กำลังเตรียม…", fil: "Inihahanda…", vi: "Đang chuẩn bị…" },
  "tgSupport.waiting": {
    id: "Telegram sudah dibuka — tekan Start di chat bot. Halaman ini memperbarui otomatis. Link berlaku 15 menit.",
    en: "Telegram is open — press Start in the bot chat. This page updates automatically. The link is valid for 15 minutes.",
    ms: "Telegram telah dibuka — tekan Start dalam chat bot. Halaman ini dikemas kini secara automatik. Pautan sah selama 15 minit.",
    th: "เปิด Telegram แล้ว — กด Start ในแชทบอท หน้านี้จะอัปเดตอัตโนมัติ ลิงก์ใช้ได้ 15 นาที",
    fil: "Bukas na ang Telegram — pindutin ang Start sa chat ng bot. Kusang mag-a-update ang pahinang ito. Valid ang link nang 15 minuto.",
    vi: "Telegram đã mở — bấm Start trong cuộc trò chuyện với bot. Trang này tự cập nhật. Liên kết có hiệu lực 15 phút.",
  },
  "tgSupport.openLinkAgain": { id: "Telegram tidak terbuka? Buka link ini", en: "Telegram didn't open? Open this link", ms: "Telegram tidak terbuka? Buka pautan ini", th: "Telegram ไม่เปิด? เปิดลิงก์นี้", fil: "Hindi bumukas ang Telegram? Buksan ang link na ito", vi: "Telegram không mở? Mở liên kết này" },
  "tgSupport.linkedAs": { id: "Terhubung sebagai {user}", en: "Connected as {user}", ms: "Disambungkan sebagai {user}", th: "เชื่อมเป็น {user}", fil: "Nakakonekta bilang {user}", vi: "Đã kết nối với {user}" },
  "tgSupport.linkedNoUser": { id: "Telegram terhubung", en: "Telegram connected", ms: "Telegram disambungkan", th: "เชื่อม Telegram แล้ว", fil: "Nakakonekta ang Telegram", vi: "Đã kết nối Telegram" },
  "tgSupport.openChat": { id: "Buka chat bot", en: "Open bot chat", ms: "Buka chat bot", th: "เปิดแชทบอท", fil: "Buksan ang chat ng bot", vi: "Mở chat với bot" },
  "tgSupport.disconnect": { id: "Putuskan", en: "Disconnect", ms: "Putuskan", th: "ยกเลิกการเชื่อม", fil: "I-disconnect", vi: "Ngắt kết nối" },
  "tgSupport.disconnectConfirm": {
    id: "Putuskan Telegram dari akunmu? Bot tidak akan menjawab dari Telegram itu sampai ditautkan lagi.",
    en: "Disconnect Telegram from your account? The bot won't answer from that Telegram until it's linked again.",
    ms: "Putuskan Telegram daripada akaun anda? Bot tidak akan menjawab dari Telegram itu sehingga dipautkan semula.",
    th: "ยกเลิกการเชื่อม Telegram กับบัญชีของคุณ? บอทจะไม่ตอบจาก Telegram นั้นจนกว่าจะเชื่อมใหม่",
    fil: "I-disconnect ang Telegram sa account mo? Hindi sasagot ang bot mula sa Telegram na iyon hangga't hindi ito muling naka-link.",
    vi: "Ngắt kết nối Telegram khỏi tài khoản của bạn? Bot sẽ không trả lời từ Telegram đó cho đến khi liên kết lại.",
  },
  "tgSupport.failed": { id: "Gagal menyiapkan tautan Telegram.", en: "Couldn't prepare the Telegram link.", ms: "Gagal menyediakan pautan Telegram.", th: "เตรียมลิงก์ Telegram ไม่สำเร็จ", fil: "Hindi naihanda ang link ng Telegram.", vi: "Không thể tạo liên kết Telegram." },
  "tgSupport.perUser": {
    id: "Tautan berlaku untuk akunmu sendiri di outlet ini. Setiap staf menautkan Telegram masing-masing.",
    en: "The link is for your own account at this outlet. Each staff member links their own Telegram.",
    ms: "Pautan ini untuk akaun anda sendiri di outlet ini. Setiap staf memautkan Telegram masing-masing.",
    th: "การเชื่อมนี้ใช้กับบัญชีของคุณเองที่ร้านนี้ พนักงานแต่ละคนเชื่อม Telegram ของตนเอง",
    fil: "Para sa sarili mong account sa outlet na ito ang link. Bawat staff ay nagli-link ng sarili niyang Telegram.",
    vi: "Liên kết dành cho tài khoản của chính bạn tại cửa hàng này. Mỗi nhân viên liên kết Telegram riêng.",
  },
});
