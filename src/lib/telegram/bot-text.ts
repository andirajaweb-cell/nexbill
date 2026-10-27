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
    id: "Halo! Dengan Tim Support NEXBILL 👋 Kami siap bantu owner & kasir outlet 24 jam di sini.\n\nSupaya kami bisa melihat kondisi outletmu, tautkan akun dulu ya: buka {url} → kartu \"Support 24 jam di Telegram\" → Hubungkan Telegram.",
    en: "Hi! This is the NEXBILL Support Team 👋 We help outlet owners & cashiers here, 24/7.\n\nSo we can see how your outlet is doing, please link your account first: open {url} → \"24-hour support on Telegram\" card → Connect Telegram.",
    ms: "Hai! Ini Pasukan Sokongan NEXBILL 👋 Kami sedia membantu pemilik & juruwang outlet 24 jam di sini.\n\nSupaya kami boleh melihat keadaan outlet anda, pautkan akaun dahulu: buka {url} → kad \"Sokongan 24 jam di Telegram\" → Sambung Telegram.",
    th: "สวัสดีค่ะ ทีมซัพพอร์ต NEXBILL ยินดีช่วยเจ้าของและแคชเชียร์ร้าน 24 ชม. ที่นี่ 👋\n\nเพื่อให้เราดูสถานะร้านของคุณได้ กรุณาเชื่อมบัญชีก่อน: เปิด {url} → การ์ด \"ซัพพอร์ต 24 ชม. ทาง Telegram\" → เชื่อม Telegram",
    fil: "Hi! Ito ang NEXBILL Support Team 👋 Tumutulong kami sa mga may-ari at cashier ng outlet dito, 24/7.\n\nPara makita namin ang lagay ng outlet mo, i-link muna ang account: buksan ang {url} → card na \"24-oras na support sa Telegram\" → Ikonekta ang Telegram.",
    vi: "Xin chào! Đây là Đội hỗ trợ NEXBILL 👋 Chúng tôi hỗ trợ chủ và thu ngân cửa hàng 24/7 tại đây.\n\nĐể chúng tôi xem được tình trạng cửa hàng, hãy liên kết tài khoản trước: mở {url} → thẻ \"Hỗ trợ 24 giờ qua Telegram\" → Kết nối Telegram.",
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
    id: "Terhubung ke {outlet}. Halo {name}, salam kenal dari Tim Support NEXBILL! 🙌\n\nCeritakan kendala atau pertanyaan outlet kapan saja — kami membalas 24 jam. Setiap jawaban ada tombol \"Sudah terbantu\" / \"Belum terselesaikan\" / \"Bicara dengan tim\", jadi Kakak tidak akan dibiarkan menggantung. /status untuk cek akun & perangkat.",
    en: "Connected to {outlet}. Hi {name}, nice to meet you from the NEXBILL Support Team! 🙌\n\nTell us about any issue or question, any time — we reply 24/7. Every answer has \"Solved\" / \"Not solved yet\" / \"Talk to the team\" buttons, so you're never left hanging. /status checks your account & devices.",
    ms: "Disambungkan ke {outlet}. Hai {name}, salam kenal daripada Pasukan Sokongan NEXBILL! 🙌\n\nCeritakan masalah atau soalan outlet bila-bila masa — kami membalas 24 jam. Setiap jawapan ada butang \"Sudah dibantu\" / \"Belum selesai\" / \"Bercakap dengan pasukan\". /status untuk semak akaun & peranti.",
    th: "เชื่อมกับ {outlet} แล้ว สวัสดี {name} ยินดีที่ได้รู้จักจากทีมซัพพอร์ต NEXBILL! 🙌\n\nเล่าปัญหาหรือคำถามของร้านได้ตลอดเวลา — เราตอบ 24 ชม. ทุกคำตอบมีปุ่ม \"ช่วยได้แล้ว\" / \"ยังไม่หาย\" / \"คุยกับทีม\" /status เพื่อตรวจบัญชีและอุปกรณ์",
    fil: "Nakakonekta sa {outlet}. Hi {name}, ikinagagalak ka naming makilala mula sa NEXBILL Support Team! 🙌\n\nIkuwento ang anumang problema o tanong, anumang oras — sumasagot kami 24/7. May mga button na \"Natulungan na\" / \"Hindi pa ayos\" / \"Makipag-usap sa team\" ang bawat sagot. /status para sa account at device.",
    vi: "Đã kết nối với {outlet}. Chào {name}, rất vui được làm quen — Đội hỗ trợ NEXBILL đây! 🙌\n\nCứ kể vấn đề hoặc câu hỏi bất cứ lúc nào — chúng tôi trả lời 24/7. Mỗi câu trả lời có nút \"Đã được giúp\" / \"Chưa giải quyết\" / \"Nói chuyện với đội\". /status để kiểm tra tài khoản & thiết bị.",
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
    id: "Tim Support NEXBILL untuk {outlet} 🙌\n\n• Tulis saja kendalanya seperti chat biasa — mis. \"cara tutup shift\" atau \"TV unit 3 tidak mau pairing\".\n• Di bawah setiap jawaban: ✅ Sudah terbantu · ❌ Belum terselesaikan (kami cek lebih dalam) · 👤 Bicara dengan tim.\n• /menu — menu bantuan lengkap per topik.\n• /tim — langsung ke staf kami.\n• /status — status langganan & perangkat.\n• /grup — gabung grup Telegram NEXBILL.\n• /putus — putuskan Telegram ini.\n\nDarurat (outlet tidak bisa menagih): tulis saja, kami beri langkah darurat dan memanggil petugas jaga.",
    en: "NEXBILL Support Team for {outlet} 🙌\n\n• Just describe the issue like a normal chat — e.g. \"how to close a shift\" or \"TV unit 3 won't pair\".\n• Under every answer: ✅ Solved · ❌ Not solved yet (we dig deeper) · 👤 Talk to the team.\n• /menu — full help menu by topic.\n• /tim — straight to our staff.\n• /status — subscription & device status.\n• /grup — join the NEXBILL Telegram group.\n• /putus — disconnect this Telegram.\n\nEmergency (the outlet can't charge customers): just tell us — we give emergency steps and alert on-call staff.",
    ms: "Pasukan Sokongan NEXBILL untuk {outlet} 🙌\n\n• Tulis sahaja masalahnya seperti chat biasa — cth. \"cara tutup syif\" atau \"TV unit 3 tidak boleh dipasangkan\".\n• Di bawah setiap jawapan: ✅ Sudah dibantu · ❌ Belum selesai (kami semak lebih lanjut) · 👤 Bercakap dengan pasukan.\n• /menu — menu bantuan lengkap mengikut topik.\n• /tim — terus kepada staf kami.\n• /status — status langganan & peranti.\n• /grup — sertai kumpulan Telegram NEXBILL.\n• /putus — putuskan Telegram ini.\n\nKecemasan (outlet tidak dapat mengenakan bayaran): beritahu sahaja, kami beri langkah kecemasan dan memanggil petugas bertugas.",
    th: "ทีมซัพพอร์ต NEXBILL สำหรับ {outlet} 🙌\n\n• พิมพ์ปัญหาได้เลยเหมือนแชทปกติ — เช่น \"ปิดกะอย่างไร\" หรือ \"ทีวีเครื่อง 3 จับคู่ไม่ได้\"\n• ใต้ทุกคำตอบ: ✅ ช่วยได้แล้ว · ❌ ยังไม่หาย (เราตรวจละเอียดขึ้น) · 👤 คุยกับทีม\n• /menu — เมนูช่วยเหลือครบตามหัวข้อ\n• /tim — ส่งถึงเจ้าหน้าที่ทันที\n• /status — สถานะการสมัครและอุปกรณ์\n• /grup — เข้ากลุ่ม Telegram ของ NEXBILL\n• /putus — ยกเลิกการเชื่อม Telegram นี้\n\nฉุกเฉิน (ร้านเก็บเงินไม่ได้): บอกเราได้เลย เราจะให้ขั้นตอนฉุกเฉินและแจ้งเจ้าหน้าที่เวร",
    fil: "NEXBILL Support Team para sa {outlet} 🙌\n\n• Ikuwento lang ang problema na parang normal na chat — hal. \"paano isara ang shift\" o \"ayaw mag-pair ng TV unit 3\".\n• Sa ilalim ng bawat sagot: ✅ Natulungan na · ❌ Hindi pa ayos (mas susuriin namin) · 👤 Makipag-usap sa team.\n• /menu — kumpletong help menu ayon sa paksa.\n• /tim — direkta sa staff namin.\n• /status — status ng subscription at device.\n• /grup — sumali sa NEXBILL Telegram group.\n• /putus — i-disconnect ang Telegram na ito.\n\nEmergency (hindi makasingil ang outlet): sabihin lang — magbibigay kami ng emergency steps at aalertuhin ang on-call.",
    vi: "Đội hỗ trợ NEXBILL cho {outlet} 🙌\n\n• Cứ mô tả vấn đề như chat bình thường — vd. \"cách đóng ca\" hoặc \"TV máy 3 không ghép nối được\".\n• Dưới mỗi câu trả lời: ✅ Đã được giúp · ❌ Chưa giải quyết (chúng tôi kiểm tra kỹ hơn) · 👤 Nói chuyện với đội.\n• /menu — menu trợ giúp đầy đủ theo chủ đề.\n• /tim — chuyển thẳng cho nhân viên.\n• /status — trạng thái gói & thiết bị.\n• /grup — tham gia nhóm Telegram NEXBILL.\n• /putus — ngắt kết nối Telegram này.\n\nKhẩn cấp (cửa hàng không thu tiền được): cứ báo — chúng tôi đưa bước khẩn cấp và gọi nhân viên trực.",
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
    id: "Maaf Kak, di Telegram kami baru bisa membaca teks 🙏 Tulis kendalanya di sini, atau kirim foto/video lewat menu Customer Service di {url} supaya tim bisa melihatnya.",
    en: "Sorry, on Telegram we can only read text for now 🙏 Describe the issue here, or send photos/videos via Customer Service at {url} so the team can see them.",
    ms: "Maaf, di Telegram kami hanya boleh membaca teks buat masa ini 🙏 Tulis masalahnya di sini, atau hantar foto/video melalui Perkhidmatan Pelanggan di {url}.",
    th: "ขออภัย ใน Telegram เราอ่านได้เฉพาะข้อความตอนนี้ 🙏 พิมพ์ปัญหาที่นี่ หรือส่งรูป/วิดีโอผ่านบริการลูกค้าที่ {url}",
    fil: "Pasensya na, teksto lang muna ang nababasa namin sa Telegram 🙏 Ilarawan ang problema dito, o magpadala ng larawan/video sa Customer Service sa {url}.",
    vi: "Xin lỗi, trên Telegram hiện chúng tôi chỉ đọc được văn bản 🙏 Hãy mô tả vấn đề tại đây, hoặc gửi ảnh/video qua Chăm sóc khách hàng tại {url}.",
  },
  appended: {
    id: "Siap, sudah kami tambahkan ke tiket #{ticket}. Staf kami membalas di sini ya 🙏",
    en: "Got it — added to ticket #{ticket}. Our staff will reply here 🙏",
    ms: "Baik, sudah ditambah ke tiket #{ticket}. Staf kami akan membalas di sini 🙏",
    th: "รับทราบ เพิ่มในทิกเก็ต #{ticket} แล้ว เจ้าหน้าที่จะตอบที่นี่ 🙏",
    fil: "Sige, idinagdag na sa ticket #{ticket}. Sasagot dito ang staff namin 🙏",
    vi: "Đã nhận — đã thêm vào phiếu #{ticket}. Nhân viên sẽ trả lời tại đây 🙏",
  },
  ticketInHours: {
    id: "Baik Kak, sudah kami teruskan ke staf Tim Support NEXBILL (tiket #{ticket}) lengkap dengan ringkasan kendala dan kondisi akun outlet, jadi Kakak tidak perlu menjelaskan ulang. Balasannya muncul di chat ini ya 🙏",
    en: "Done — we've passed this to the NEXBILL Support staff (ticket #{ticket}) with a summary and your outlet's account status, so you won't need to explain again. Their reply will appear in this chat 🙏",
    ms: "Baik, kami telah serahkan kepada staf Pasukan Sokongan NEXBILL (tiket #{ticket}) bersama ringkasan dan status akaun outlet, jadi anda tidak perlu menerangkan semula. Balasan akan muncul di chat ini 🙏",
    th: "เรียบร้อย ส่งต่อให้เจ้าหน้าที่ทีมซัพพอร์ต NEXBILL แล้ว (ทิกเก็ต #{ticket}) พร้อมสรุปปัญหาและสถานะบัญชีร้าน ไม่ต้องอธิบายซ้ำ คำตอบจะแสดงในแชทนี้ 🙏",
    fil: "Sige, naipasa na namin sa staff ng NEXBILL Support (ticket #{ticket}) kasama ang buod at status ng account ng outlet, kaya hindi mo na kailangang ipaliwanag ulit. Lalabas dito ang sagot nila 🙏",
    vi: "Đã xong — chúng tôi đã chuyển cho nhân viên Đội hỗ trợ NEXBILL (phiếu #{ticket}) kèm tóm tắt và trạng thái tài khoản cửa hàng, nên bạn không cần giải thích lại. Phản hồi sẽ hiện trong cuộc trò chuyện này 🙏",
  },
  ticketAfterHours: {
    id: "Baik Kak, sudah kami teruskan ke staf Tim Support NEXBILL (tiket #{ticket}) lengkap dengan ringkasan dan kondisi akun outlet. Saat ini di luar jam kerja staf — balasannya Senin–Sabtu mulai 09.00 WIB, langsung di chat ini. Terima kasih sudah sabar ya 🙏",
    en: "Done — passed to the NEXBILL Support staff (ticket #{ticket}) with a summary and your outlet's account status. It's outside staff hours right now — they reply Mon–Sat from 09:00 WIB (UTC+7), right in this chat. Thanks for your patience 🙏",
    ms: "Baik, telah diserahkan kepada staf Pasukan Sokongan NEXBILL (tiket #{ticket}) bersama ringkasan dan status akaun outlet. Kini di luar waktu kerja staf — balasan Isnin–Sabtu mulai 09.00 WIB (UTC+7), terus di chat ini. Terima kasih atas kesabaran anda 🙏",
    th: "เรียบร้อย ส่งต่อให้เจ้าหน้าที่ทีมซัพพอร์ต NEXBILL แล้ว (ทิกเก็ต #{ticket}) พร้อมสรุปและสถานะบัญชีร้าน ตอนนี้อยู่นอกเวลาทำการ — เจ้าหน้าที่ตอบ จันทร์–เสาร์ ตั้งแต่ 09.00 WIB (UTC+7) ในแชทนี้ ขอบคุณที่รอค่ะ 🙏",
    fil: "Sige, naipasa na sa staff ng NEXBILL Support (ticket #{ticket}) kasama ang buod at status ng account. Labas na sa oras ng staff ngayon — sumasagot sila Lunes–Sabado mula 09:00 WIB (UTC+7), dito mismo. Salamat sa pasensya 🙏",
    vi: "Đã xong — đã chuyển cho nhân viên Đội hỗ trợ NEXBILL (phiếu #{ticket}) kèm tóm tắt và trạng thái tài khoản. Hiện ngoài giờ làm việc — nhân viên trả lời Thứ 2–Thứ 7 từ 09:00 WIB (UTC+7), ngay trong cuộc trò chuyện này. Cảm ơn bạn đã kiên nhẫn 🙏",
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
    id: "{body}\n\n— Tim Support NEXBILL · tiket #{ticket}\n(Balas pesan ini untuk menambahkan ke tiket yang sama.)",
    en: "{body}\n\n— NEXBILL Support Team · ticket #{ticket}\n(Reply to this message to add to the same ticket.)",
    ms: "{body}\n\n— Pasukan Sokongan NEXBILL · tiket #{ticket}\n(Balas mesej ini untuk menambah ke tiket yang sama.)",
    th: "{body}\n\n— ทีมซัพพอร์ต NEXBILL · ทิกเก็ต #{ticket}\n(ตอบกลับข้อความนี้เพื่อเพิ่มในทิกเก็ตเดิม)",
    fil: "{body}\n\n— NEXBILL Support Team · ticket #{ticket}\n(I-reply ang mensaheng ito para idagdag sa parehong ticket.)",
    vi: "{body}\n\n— Đội hỗ trợ NEXBILL · phiếu #{ticket}\n(Trả lời tin nhắn này để thêm vào cùng phiếu.)",
  },
  btnOk: { id: "✅ Sudah terbantu", en: "✅ Solved", ms: "✅ Sudah dibantu", th: "✅ ช่วยได้แล้ว", fil: "✅ Natulungan na", vi: "✅ Đã được giúp" },
  btnNo: { id: "❌ Belum terselesaikan", en: "❌ Not solved yet", ms: "❌ Belum selesai", th: "❌ ยังไม่หาย", fil: "❌ Hindi pa ayos", vi: "❌ Chưa giải quyết" },
  btnTeam: { id: "👤 Bicara dengan tim", en: "👤 Talk to the team", ms: "👤 Bercakap dengan pasukan", th: "👤 คุยกับทีม", fil: "👤 Makipag-usap sa team", vi: "👤 Nói chuyện với đội" },
  fbThanks: {
    id: "Alhamdulillah, ikut senang sudah beres{name}! 🙌 Kalau ada kendala lain, tulis saja di sini kapan pun ya.",
    en: "Great, glad it's sorted{name}! 🙌 If anything else comes up, just write here any time.",
    ms: "Baguslah, gembira ia sudah selesai{name}! 🙌 Jika ada masalah lain, tulis sahaja di sini bila-bila masa.",
    th: "ดีใจที่แก้ได้แล้ว{name}! 🙌 ถ้ามีอะไรอีก พิมพ์มาที่นี่ได้ตลอดเลย",
    fil: "Ayos, masaya kaming naayos na{name}! 🙌 Kung may iba pa, isulat lang dito anumang oras.",
    vi: "Tuyệt, vui vì đã xong{name}! 🙌 Nếu có gì khác, cứ nhắn tại đây bất cứ lúc nào.",
  },
  fbDeeper: {
    id: "Siap{name}, kami cek lebih dalam ya — termasuk kondisi akun dan perangkat outletmu. Sebentar…",
    en: "On it{name} — we'll dig deeper, including your outlet's account and devices. One moment…",
    ms: "Baik{name}, kami semak lebih lanjut — termasuk akaun dan peranti outlet anda. Sebentar…",
    th: "รับทราบ{name} เราจะตรวจละเอียดขึ้น รวมถึงบัญชีและอุปกรณ์ของร้าน สักครู่…",
    fil: "Sige{name}, mas susuriin namin — kasama ang account at device ng outlet mo. Sandali…",
    vi: "Đã rõ{name}, chúng tôi sẽ kiểm tra kỹ hơn — gồm tài khoản và thiết bị cửa hàng. Chờ một chút…",
  },
  fbDone: {
    id: "Terima kasih, masukannya sudah kami catat 🙏",
    en: "Thanks, your feedback is noted 🙏",
    ms: "Terima kasih, maklum balas anda telah dicatat 🙏",
    th: "ขอบคุณ เราบันทึกความคิดเห็นแล้ว 🙏",
    fil: "Salamat, naitala na ang feedback mo 🙏",
    vi: "Cảm ơn, chúng tôi đã ghi nhận phản hồi 🙏",
  },
  greeting: {
    id: "Halo{name}! 👋 Dengan Tim Support NEXBILL. Ada yang bisa kami bantu untuk {outlet}? Ceritakan saja kendalanya — makin detail (menu apa, pesan apa yang muncul), makin cepat kami bantu.",
    en: "Hi{name}! 👋 NEXBILL Support Team here. How can we help {outlet} today? Just describe the issue — the more detail (which menu, what message appears), the faster we can help.",
    ms: "Hai{name}! 👋 Pasukan Sokongan NEXBILL di sini. Apa yang boleh kami bantu untuk {outlet}? Ceritakan masalahnya — lebih terperinci (menu apa, mesej apa yang muncul), lebih cepat kami bantu.",
    th: "สวัสดี{name}! 👋 ทีมซัพพอร์ต NEXBILL ค่ะ มีอะไรให้ช่วย {outlet} ไหม เล่าปัญหาได้เลย — ยิ่งละเอียด (เมนูไหน ขึ้นข้อความอะไร) ยิ่งช่วยได้เร็ว",
    fil: "Hi{name}! 👋 NEXBILL Support Team ito. Paano kami makakatulong sa {outlet}? Ikuwento lang ang problema — mas detalyado (anong menu, anong mensahe), mas mabilis kaming makakatulong.",
    vi: "Chào{name}! 👋 Đội hỗ trợ NEXBILL đây. Chúng tôi giúp gì được cho {outlet}? Cứ mô tả vấn đề — càng chi tiết (menu nào, thông báo gì), càng giúp nhanh.",
  },
  thanks: {
    id: "Sama-sama{name}! Senang bisa bantu 🙏 Kalau ada yang lain, kabari kami ya.",
    en: "You're welcome{name}! Happy to help 🙏 Let us know if anything else comes up.",
    ms: "Sama-sama{name}! Gembira dapat membantu 🙏 Beritahu kami jika ada yang lain.",
    th: "ยินดีค่ะ{name}! 🙏 ถ้ามีอะไรอีก บอกเราได้เลย",
    fil: "Walang anuman{name}! Masaya kaming nakatulong 🙏 Sabihan lang kami kung may iba pa.",
    vi: "Không có gì{name}! Rất vui được giúp 🙏 Có gì khác cứ báo chúng tôi nhé.",
  },
  clarify: {
    id: "Siap{name}, kami bantu 🙌 Boleh diceritakan sedikit lebih detail?\n• Bagian apa: kasir, sesi rental, NEXBILL TV, printer, laporan, atau langganan\n• Apa yang ingin dilakukan, atau pesan apa yang muncul\n\nContoh: \"cara tutup shift\" atau \"TV unit 3 tidak mau pairing\".",
    en: "Sure{name}, we're here to help 🙌 Could you tell us a bit more?\n• Which part: cashier, rental session, NEXBILL TV, printer, reports, or subscription\n• What you're trying to do, or what message appears\n\nE.g. \"how to close a shift\" or \"TV unit 3 won't pair\".",
    ms: "Baik{name}, kami bantu 🙌 Boleh ceritakan sedikit lagi?\n• Bahagian apa: juruwang, sesi sewa, NEXBILL TV, pencetak, laporan, atau langganan\n• Apa yang ingin dilakukan, atau mesej apa yang muncul\n\nCth. \"cara tutup syif\" atau \"TV unit 3 tidak boleh dipasangkan\".",
    th: "ได้เลย{name} เรายินดีช่วย 🙌 ขอรายละเอียดเพิ่มอีกนิดได้ไหม\n• ส่วนไหน: แคชเชียร์ เซสชันเช่า NEXBILL TV เครื่องพิมพ์ รายงาน หรือการสมัคร\n• ต้องการทำอะไร หรือขึ้นข้อความอะไร\n\nเช่น \"ปิดกะอย่างไร\" หรือ \"ทีวีเครื่อง 3 จับคู่ไม่ได้\"",
    fil: "Sige{name}, tutulong kami 🙌 Puwede bang mas detalyado?\n• Anong bahagi: cashier, rental session, NEXBILL TV, printer, report, o subscription\n• Ano ang gusto mong gawin, o anong mensahe ang lumalabas\n\nHal. \"paano isara ang shift\" o \"ayaw mag-pair ng TV unit 3\".",
    vi: "Vâng{name}, chúng tôi sẵn sàng giúp 🙌 Bạn mô tả thêm một chút nhé?\n• Phần nào: thu ngân, phiên thuê, NEXBILL TV, máy in, báo cáo hay gói dịch vụ\n• Bạn muốn làm gì, hoặc hiện thông báo gì\n\nVd. \"cách đóng ca\" hoặc \"TV máy 3 không ghép nối được\".",
  },
  isBot: {
    id: "Pertanyaan bagus{name} 🙂 Yang membalas cepat di sini adalah asisten otomatis Tim Support NEXBILL — siap 24 jam supaya Kakak tidak perlu menunggu. Staf kami siap mengambil alih kapan saja: tekan \"Bicara dengan tim\".",
    en: "Good question{name} 🙂 The quick replies here come from the NEXBILL Support Team's automated assistant — available 24/7 so you don't have to wait. Our staff can take over any time: tap \"Talk to the team\".",
    ms: "Soalan yang baik{name} 🙂 Balasan pantas di sini daripada pembantu automatik Pasukan Sokongan NEXBILL — sedia 24 jam supaya anda tidak perlu menunggu. Staf kami boleh mengambil alih bila-bila masa: tekan \"Bercakap dengan pasukan\".",
    th: "คำถามดีค่ะ{name} 🙂 คำตอบด่วนที่นี่มาจากผู้ช่วยอัตโนมัติของทีมซัพพอร์ต NEXBILL — พร้อม 24 ชม. เพื่อให้คุณไม่ต้องรอ เจ้าหน้าที่ของเราพร้อมรับช่วงต่อได้ตลอด: กด \"คุยกับทีม\"",
    fil: "Magandang tanong{name} 🙂 Ang mabilis na sagot dito ay mula sa automated assistant ng NEXBILL Support Team — 24/7 para hindi ka na maghintay. Puwedeng pumalit ang staff namin anumang oras: pindutin ang \"Makipag-usap sa team\".",
    vi: "Câu hỏi hay{name} 🙂 Các phản hồi nhanh ở đây đến từ trợ lý tự động của Đội hỗ trợ NEXBILL — sẵn sàng 24/7 để bạn không phải chờ. Nhân viên của chúng tôi có thể tiếp quản bất cứ lúc nào: bấm \"Nói chuyện với đội\".",
  },
  slowDown: {
    id: "Pesannya banyak sekali dalam waktu singkat, Kak 🙏 Kami jeda sebentar ya — coba lagi beberapa menit lagi, atau ketik /tim supaya staf kami yang menangani.",
    en: "That's a lot of messages in a short time 🙏 Let's pause for a moment — try again in a few minutes, or type /tim for our staff.",
    ms: "Banyak sangat mesej dalam masa singkat 🙏 Kita berhenti sebentar — cuba lagi beberapa minit lagi, atau taip /tim untuk staf kami.",
    th: "ข้อความเยอะมากในเวลาสั้น ๆ 🙏 ขอพักสักครู่ ลองใหม่ในอีกไม่กี่นาที หรือพิมพ์ /tim เพื่อคุยกับเจ้าหน้าที่",
    fil: "Ang dami ng mensahe sa maikling oras 🙏 Pahinga muna sandali — subukan ulit pagkalipas ng ilang minuto, o i-type ang /tim para sa staff namin.",
    vi: "Nhiều tin nhắn quá trong thời gian ngắn 🙏 Tạm dừng một chút nhé — thử lại sau vài phút, hoặc gõ /tim để gặp nhân viên.",
  },
  menuIntro: {
    id: "📚 Menu Bantuan NEXBILL\n\nPilih topik — jawabannya langsung muncul. Tidak ketemu? Tulis saja pertanyaannya seperti chat biasa, atau tekan \"Bicara dengan tim\".",
    en: "📚 NEXBILL Help Menu\n\nPick a topic and the answer appears right away (answers are in Indonesian). Can't find it? Just type your question, or tap \"Talk to the team\".",
    ms: "📚 Menu Bantuan NEXBILL\n\nPilih topik — jawapan terus muncul (dalam Bahasa Indonesia). Tidak jumpa? Tulis sahaja soalan anda, atau tekan \"Bercakap dengan pasukan\".",
    th: "📚 เมนูช่วยเหลือ NEXBILL\n\nเลือกหัวข้อ แล้วคำตอบจะแสดงทันที (เป็นภาษาอินโดนีเซีย) หาไม่เจอ? พิมพ์คำถามได้เลย หรือกด \"คุยกับทีม\"",
    fil: "📚 NEXBILL Help Menu\n\nPumili ng paksa at lalabas agad ang sagot (nasa Indonesian). Wala dito? I-type lang ang tanong, o pindutin ang \"Makipag-usap sa team\".",
    vi: "📚 Menu trợ giúp NEXBILL\n\nChọn chủ đề, câu trả lời hiện ngay (bằng tiếng Indonesia). Không thấy? Cứ gõ câu hỏi, hoặc bấm \"Nói chuyện với đội\".",
  },
  menuTopic: {
    id: "{topic}\n\nPilih pertanyaan:",
    en: "{topic}\n\nPick a question:",
    ms: "{topic}\n\nPilih soalan:",
    th: "{topic}\n\nเลือกคำถาม:",
    fil: "{topic}\n\nPumili ng tanong:",
    vi: "{topic}\n\nChọn câu hỏi:",
  },
  btnBack: { id: "⬅️ Kembali ke menu", en: "⬅️ Back to menu", ms: "⬅️ Kembali ke menu", th: "⬅️ กลับไปเมนู", fil: "⬅️ Bumalik sa menu", vi: "⬅️ Quay lại menu" },
  btnStatus: { id: "📊 Status akun", en: "📊 Account status", ms: "📊 Status akaun", th: "📊 สถานะบัญชี", fil: "📊 Status ng account", vi: "📊 Trạng thái tài khoản" },
  btnGroup: { id: "👥 Gabung grup Telegram NEXBILL", en: "👥 Join the NEXBILL Telegram group", ms: "👥 Sertai kumpulan Telegram NEXBILL", th: "👥 เข้ากลุ่ม Telegram ของ NEXBILL", fil: "👥 Sumali sa NEXBILL Telegram group", vi: "👥 Tham gia nhóm Telegram NEXBILL" },
  kbMenu: { id: "📚 Menu bantuan", en: "📚 Help menu", ms: "📚 Menu bantuan", th: "📚 เมนูช่วยเหลือ", fil: "📚 Help menu", vi: "📚 Menu trợ giúp" },
  kbGroup: { id: "👥 Grup NEXBILL", en: "👥 NEXBILL group", ms: "👥 Kumpulan NEXBILL", th: "👥 กลุ่ม NEXBILL", fil: "👥 NEXBILL group", vi: "👥 Nhóm NEXBILL" },
  groupInvite: {
    id: "👥 Grup Telegram NEXBILL\n\nTempat info fitur terbaru, tips meramaikan rental, dan ngobrol bareng sesama pemilik outlet & Tim NEXBILL. Yuk gabung, Kak!\n\nUntuk kendala akun/outlet tetap tanya di chat ini ya — di sini datamu aman dan langsung kami cek.",
    en: "👥 NEXBILL Telegram Group\n\nFeature news, tips to grow your rental, and chats with fellow outlet owners & the NEXBILL Team. Come join!\n\nFor account/outlet issues keep asking in this chat — your data stays private here and we can check it directly.",
    ms: "👥 Kumpulan Telegram NEXBILL\n\nBerita ciri terkini, tip melariskan sewaan, dan berbual dengan pemilik outlet lain & Pasukan NEXBILL. Jom sertai!\n\nUntuk masalah akaun/outlet, teruskan bertanya di chat ini — data anda kekal peribadi dan kami boleh menyemaknya terus.",
    th: "👥 กลุ่ม Telegram ของ NEXBILL\n\nข่าวฟีเจอร์ เคล็ดลับเพิ่มลูกค้า และคุยกับเจ้าของร้านคนอื่น ๆ และทีม NEXBILL มาร่วมกันนะ!\n\nปัญหาบัญชี/ร้าน ถามในแชทนี้ต่อได้เลย ข้อมูลของคุณเป็นส่วนตัวและเราตรวจได้ทันที",
    fil: "👥 NEXBILL Telegram Group\n\nBalita sa feature, tips para dumami ang rental, at kuwentuhan kasama ang ibang may-ari ng outlet at ang NEXBILL Team. Sali na!\n\nPara sa problema sa account/outlet, dito pa rin magtanong — pribado ang data mo rito at direkta naming masusuri.",
    vi: "👥 Nhóm Telegram NEXBILL\n\nTin tính năng, mẹo tăng khách thuê, và trò chuyện cùng các chủ cửa hàng khác & Đội NEXBILL. Tham gia nhé!\n\nVấn đề tài khoản/cửa hàng hãy tiếp tục hỏi tại đây — dữ liệu của bạn được giữ riêng tư và chúng tôi kiểm tra trực tiếp được.",
  },
} satisfies Record<string, Entry>;

export type BotTextKey = keyof typeof BOT_TEXT;

export function botText(lang: string, key: BotTextKey, vars: Record<string, string> = {}): string {
  const entry: Entry = BOT_TEXT[key];
  const l = (BOT_LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "id";
  return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(v), entry[l]);
}
