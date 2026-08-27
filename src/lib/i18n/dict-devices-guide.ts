import { registerDict } from "./registry";

/**
 * Translations for the outlet-facing "Panduan Setup Perangkat" (Device Setup Guide) on
 * /dashboard/devices — see src/app/dashboard/devices/setup-guide.tsx. Kept in its own dict file
 * (separate from dict-devices.ts) purely because of size: four full step-by-step walkthroughs
 * across 6 languages. Registered as a side effect on import, same pattern as every other dict.
 */
registerDict({
  "devices.guide.heading": {
    id: "Panduan Setup Perangkat",
    en: "Device Setup Guide",
    ms: "Panduan Persediaan Peranti",
    th: "คู่มือตั้งค่าอุปกรณ์",
    fil: "Gabay sa Setup ng Device",
    vi: "Hướng dẫn thiết lập thiết bị",
  },
  "devices.guide.subheading": {
    id: "Klik salah satu jenis perangkat di bawah untuk lihat cara settingnya, langkah demi langkah.",
    en: "Click a device type below to see step-by-step setup instructions.",
    ms: "Klik salah satu jenis peranti di bawah untuk lihat cara setting, langkah demi langkah.",
    th: "คลิกประเภทอุปกรณ์ด้านล่างเพื่อดูวิธีตั้งค่าทีละขั้นตอน",
    fil: "I-click ang isang uri ng device sa ibaba para makita ang step-by-step na paraan ng pag-setup.",
    vi: "Nhấp vào một loại thiết bị bên dưới để xem hướng dẫn thiết lập từng bước.",
  },

  // --- HTTP Generik ---
  "devices.guide.http.title": {
    id: "HTTP Generik (mis. Shelly)",
    en: "Generic HTTP (e.g. Shelly)",
    ms: "HTTP Generik (cth. Shelly)",
    th: "HTTP ทั่วไป (เช่น Shelly)",
    fil: "Generic HTTP (hal. Shelly)",
    vi: "HTTP thông thường (vd. Shelly)",
  },
  "devices.guide.http.body": {
    id: 'Untuk smart plug/relay yang punya URL HTTP sendiri untuk ON/OFF (mis. Shelly, Sonoff dengan firmware custom). Langkah: 1) Buka aplikasi/dashboard bawaan perangkat, cari URL untuk menyalakan dan mematikan (biasanya seperti http://192.168.1.xx/relay/0?turn=on dan .../turn=off). 2) Di sini, pilih protokol "HTTP Generik", isi kedua URL itu di kolom "URL untuk ON" dan "URL untuk OFF". 3) Simpan — coba tombol Nyalakan/Matikan di kartu perangkat untuk pastikan berhasil.',
    en: 'For smart plugs/relays that have their own HTTP URL for ON/OFF (e.g. Shelly, Sonoff with custom firmware). Steps: 1) Open the device\'s own app/dashboard and find the URLs for turning it on and off (usually something like http://192.168.1.xx/relay/0?turn=on and .../turn=off). 2) Here, choose the "Generic HTTP" protocol and enter both URLs in the "URL for ON" and "URL for OFF" fields. 3) Save — try the Turn On/Turn Off buttons on the device card to confirm it works.',
    ms: 'Untuk smart plug/relay yang mempunyai URL HTTP sendiri untuk ON/OFF (cth. Shelly, Sonoff dengan firmware custom). Langkah: 1) Buka aplikasi/papan pemuka bawaan peranti, cari URL untuk menghidupkan dan mematikan (biasanya seperti http://192.168.1.xx/relay/0?turn=on dan .../turn=off). 2) Di sini, pilih protokol "HTTP Generik", isi kedua-dua URL itu di kolum "URL untuk ON" dan "URL untuk OFF". 3) Simpan — cuba butang Hidupkan/Matikan pada kad peranti untuk pastikan berjaya.',
    th: 'สำหรับปลั๊กอัจฉริยะ/รีเลย์ที่มี URL HTTP ของตัวเองสำหรับเปิด/ปิด (เช่น Shelly, Sonoff ที่ลงเฟิร์มแวร์เอง) ขั้นตอน: 1) เปิดแอป/แดชบอร์ดของอุปกรณ์ ค้นหา URL สำหรับเปิดและปิด (ปกติจะคล้าย http://192.168.1.xx/relay/0?turn=on และ .../turn=off) 2) ที่นี่ เลือกโปรโตคอล "HTTP ทั่วไป" กรอก URL ทั้งสองในช่อง "URL สำหรับเปิด" และ "URL สำหรับปิด" 3) บันทึก — ลองปุ่มเปิด/ปิดบนการ์ดอุปกรณ์เพื่อยืนยันว่าใช้งานได้',
    fil: 'Para sa mga smart plug/relay na may sariling HTTP URL para sa ON/OFF (hal. Shelly, Sonoff na may custom firmware). Mga hakbang: 1) Buksan ang sariling app/dashboard ng device, hanapin ang URL para sa pag-on at pag-off (karaniwang parang http://192.168.1.xx/relay/0?turn=on at .../turn=off). 2) Dito, piliin ang protocol na "Generic HTTP", ilagay ang parehong URL sa fields na "URL para sa ON" at "URL para sa OFF". 3) I-save — subukan ang mga button na I-on/I-off sa card ng device para makumpirma na gumagana.',
    vi: 'Dành cho ổ cắm thông minh/relay có URL HTTP riêng để bật/tắt (vd. Shelly, Sonoff với firmware tùy chỉnh). Các bước: 1) Mở app/dashboard riêng của thiết bị, tìm URL để bật và tắt (thường giống http://192.168.1.xx/relay/0?turn=on và .../turn=off). 2) Ở đây, chọn giao thức "HTTP thông thường", nhập cả hai URL vào ô "URL để bật" và "URL để tắt". 3) Lưu lại — thử nút Bật/Tắt trên thẻ thiết bị để xác nhận hoạt động.',
  },

  // --- Tuya Smart Life ---
  "devices.guide.tuya.title": {
    id: "Tuya Smart Life",
    en: "Tuya Smart Life",
    ms: "Tuya Smart Life",
    th: "Tuya Smart Life",
    fil: "Tuya Smart Life",
    vi: "Tuya Smart Life",
  },
  "devices.guide.tuya.body": {
    id: 'Untuk smart plug yang pakai aplikasi Tuya Smart / Smart Life. Koneksi ke Tuya Cloud API sudah disiapkan oleh tim NEXBILL — kamu tidak perlu setting apa pun di sisi cloud. Langkah: 1) Pasang perangkat & hubungkan ke WiFi lewat aplikasi Tuya Smart / Smart Life seperti biasa. 2) Buka aplikasi itu, masuk ke detail perangkat > ikon pensil/Device Information, salin "Device ID"-nya. 3) Di sini, pilih protokol "Tuya Smart Life", tempel Device ID itu — kolom "Kode DP Switch" boleh dikosongkan (default switch_1). 4) Simpan dan coba tombol Nyalakan/Matikan.',
    en: 'For smart plugs that use the Tuya Smart / Smart Life app. The Tuya Cloud API connection is already set up by the NEXBILL team — you don\'t need to configure anything on the cloud side. Steps: 1) Set up the device and connect it to WiFi via the Tuya Smart / Smart Life app as usual. 2) Open that app, go to the device\'s details > pencil icon/Device Information, copy its "Device ID". 3) Here, choose the "Tuya Smart Life" protocol and paste that Device ID — the "Switch DP Code" field can stay blank (defaults to switch_1). 4) Save and try the Turn On/Turn Off buttons.',
    ms: 'Untuk smart plug yang menggunakan aplikasi Tuya Smart / Smart Life. Sambungan ke Tuya Cloud API sudah disediakan oleh pasukan NEXBILL — anda tidak perlu setting apa-apa di sisi cloud. Langkah: 1) Pasang peranti & hubungkan ke WiFi melalui aplikasi Tuya Smart / Smart Life seperti biasa. 2) Buka aplikasi itu, masuk ke butiran peranti > ikon pensel/Device Information, salin "Device ID"-nya. 3) Di sini, pilih protokol "Tuya Smart Life", tampal Device ID itu — kolum "Kod DP Switch" boleh dibiarkan kosong (lalai switch_1). 4) Simpan dan cuba butang Hidupkan/Matikan.',
    th: 'สำหรับปลั๊กอัจฉริยะที่ใช้แอป Tuya Smart / Smart Life การเชื่อมต่อ Tuya Cloud API ถูกตั้งค่าโดยทีม NEXBILL แล้ว — คุณไม่ต้องตั้งค่าใดๆ ฝั่งคลาวด์ ขั้นตอน: 1) ติดตั้งอุปกรณ์และเชื่อมต่อ WiFi ผ่านแอป Tuya Smart / Smart Life ตามปกติ 2) เปิดแอปนั้น ไปที่รายละเอียดอุปกรณ์ > ไอคอนดินสอ/Device Information คัดลอก "Device ID" 3) ที่นี่ เลือกโปรโตคอล "Tuya Smart Life" วาง Device ID นั้น — ช่อง "รหัส DP Switch" เว้นว่างได้ (ค่าเริ่มต้น switch_1) 4) บันทึกแล้วลองปุ่มเปิด/ปิด',
    fil: 'Para sa mga smart plug na gumagamit ng Tuya Smart / Smart Life app. Naka-setup na ang koneksyon sa Tuya Cloud API ng team ng NEXBILL — hindi mo na kailangang mag-configure ng kahit ano sa cloud side. Mga hakbang: 1) I-setup ang device at ikonekta sa WiFi gamit ang Tuya Smart / Smart Life app gaya ng dati. 2) Buksan ang app na iyon, pumunta sa detalye ng device > pencil icon/Device Information, kopyahin ang "Device ID" nito. 3) Dito, piliin ang protocol na "Tuya Smart Life", i-paste ang Device ID na iyon — puwedeng iwanang blangko ang field na "Switch DP Code" (default switch_1). 4) I-save at subukan ang mga button na I-on/I-off.',
    vi: 'Dành cho ổ cắm thông minh dùng app Tuya Smart / Smart Life. Kết nối Tuya Cloud API đã được đội ngũ NEXBILL thiết lập sẵn — bạn không cần cấu hình gì ở phía cloud. Các bước: 1) Thiết lập thiết bị và kết nối WiFi qua app Tuya Smart / Smart Life như bình thường. 2) Mở app đó, vào chi tiết thiết bị > biểu tượng bút chì/Device Information, sao chép "Device ID". 3) Ở đây, chọn giao thức "Tuya Smart Life", dán Device ID đó — ô "Mã DP Switch" có thể để trống (mặc định switch_1). 4) Lưu lại và thử nút Bật/Tắt.',
  },

  // --- Sonoff eWeLink ---
  "devices.guide.ewelink.title": {
    id: "Sonoff eWeLink",
    en: "Sonoff eWeLink",
    ms: "Sonoff eWeLink",
    th: "Sonoff eWeLink",
    fil: "Sonoff eWeLink",
    vi: "Sonoff eWeLink",
  },
  "devices.guide.ewelink.body": {
    id: 'Untuk perangkat Sonoff yang pakai aplikasi eWeLink bawaan. Langkah: 1) Pasang & hubungkan perangkat ke WiFi lewat aplikasi eWeLink. 2) Di sini, pilih protokol "Sonoff eWeLink", isi nama perangkat lalu simpan — tidak ada kolom tambahan yang wajib diisi. 3) Kalau tombol Nyalakan/Matikan belum berfungsi, hubungi tim NEXBILL lewat menu Chat/Bantuan.',
    en: 'For Sonoff devices that use the built-in eWeLink app. Steps: 1) Set up the device and connect it to WiFi via the eWeLink app. 2) Here, choose the "Sonoff eWeLink" protocol, enter a device name, and save — no extra fields are required. 3) If the Turn On/Turn Off buttons don\'t work yet, contact the NEXBILL team via the Chat/Support menu.',
    ms: 'Untuk peranti Sonoff yang menggunakan aplikasi eWeLink bawaan. Langkah: 1) Pasang & hubungkan peranti ke WiFi melalui aplikasi eWeLink. 2) Di sini, pilih protokol "Sonoff eWeLink", isi nama peranti kemudian simpan — tiada kolum tambahan yang wajib diisi. 3) Jika butang Hidupkan/Matikan belum berfungsi, hubungi pasukan NEXBILL melalui menu Chat/Bantuan.',
    th: 'สำหรับอุปกรณ์ Sonoff ที่ใช้แอป eWeLink ในตัว ขั้นตอน: 1) ติดตั้งและเชื่อมต่ออุปกรณ์กับ WiFi ผ่านแอป eWeLink 2) ที่นี่ เลือกโปรโตคอล "Sonoff eWeLink" กรอกชื่ออุปกรณ์แล้วบันทึก — ไม่มีช่องเพิ่มเติมที่ต้องกรอก 3) หากปุ่มเปิด/ปิดยังไม่ทำงาน ติดต่อทีม NEXBILL ผ่านเมนู Chat/ความช่วยเหลือ',
    fil: 'Para sa mga Sonoff device na gumagamit ng built-in na eWeLink app. Mga hakbang: 1) I-setup at ikonekta ang device sa WiFi gamit ang eWeLink app. 2) Dito, piliin ang protocol na "Sonoff eWeLink", ilagay ang pangalan ng device pagkatapos i-save — walang karagdagang field na kailangan. 3) Kung hindi pa gumagana ang mga button na I-on/I-off, makipag-ugnayan sa team ng NEXBILL sa pamamagitan ng menu na Chat/Suporta.',
    vi: 'Dành cho thiết bị Sonoff dùng app eWeLink có sẵn. Các bước: 1) Thiết lập và kết nối thiết bị với WiFi qua app eWeLink. 2) Ở đây, chọn giao thức "Sonoff eWeLink", nhập tên thiết bị rồi lưu — không cần ô nào khác. 3) Nếu nút Bật/Tắt chưa hoạt động, liên hệ đội ngũ NEXBILL qua menu Chat/Hỗ trợ.',
  },

  // --- TV via NexbillAgent ---
  "devices.guide.tv.title": {
    id: "TV (Android/Google TV) via NexbillAgent",
    en: "TV (Android/Google TV) via NexbillAgent",
    ms: "TV (Android/Google TV) melalui NexbillAgent",
    th: "ทีวี (Android/Google TV) ผ่าน NexbillAgent",
    fil: "TV (Android/Google TV) sa pamamagitan ng NexbillAgent",
    vi: "TV (Android/Google TV) qua NexbillAgent",
  },
  "devices.guide.tv.intro": {
    id: "Untuk mengontrol Android TV / Google TV (nyalakan-matikan dari jauh) lewat aplikasi kecil bernama NexbillAgent yang jalan di PC outlet. Ikuti 5 langkah ini secara berurutan — cukup sekali saja per outlet.",
    en: "To control an Android TV / Google TV (turn it on/off remotely) using a small app called NexbillAgent that runs on the outlet's PC. Follow these 5 steps in order — only needed once per outlet.",
    ms: "Untuk mengawal Android TV / Google TV (hidup-matikan dari jauh) melalui aplikasi kecil bernama NexbillAgent yang berjalan di PC outlet. Ikuti 5 langkah ini secara berurutan — cukup sekali sahaja untuk setiap outlet.",
    th: "สำหรับควบคุม Android TV / Google TV (เปิด-ปิดจากระยะไกล) ผ่านแอปเล็กๆ ชื่อ NexbillAgent ที่รันบน PC ของสาขา ทำตาม 5 ขั้นตอนนี้ตามลำดับ — ทำแค่ครั้งเดียวต่อสาขา",
    fil: "Para makontrol ang Android TV / Google TV (i-on/i-off mula sa malayo) gamit ang maliit na app na tinatawag na NexbillAgent na tumatakbo sa PC ng outlet. Sundin ang 5 hakbang na ito nang sunud-sunod — isang beses lang kailangan bawat outlet.",
    vi: "Để điều khiển Android TV / Google TV (bật-tắt từ xa) bằng ứng dụng nhỏ tên NexbillAgent chạy trên PC của chi nhánh. Làm theo 5 bước này theo thứ tự — chỉ cần một lần cho mỗi chi nhánh.",
  },

  "devices.guide.tv.step1Heading": {
    id: "Langkah 1 — Minta Token",
    en: "Step 1 — Request a Token",
    ms: "Langkah 1 — Minta Token",
    th: "ขั้นตอนที่ 1 — ขอโทเค็น",
    fil: "Hakbang 1 — Humiling ng Token",
    vi: "Bước 1 — Yêu cầu Token",
  },
  "devices.guide.tv.step1Body": {
    id: "Klik tombol di bawah untuk kirim permintaan token ke tim NEXBILL. Token ini rahasia dan hanya dipakai satu kali di aplikasi NexbillAgent nanti — tunggu balasannya di menu Chat/Bantuan (biasanya tidak lama).",
    en: "Click the button below to send a token request to the NEXBILL team. This token is confidential and only ever entered once in the NexbillAgent app — wait for the reply in the Chat/Support menu (usually not long).",
    ms: "Klik butang di bawah untuk hantar permintaan token kepada pasukan NEXBILL. Token ini sulit dan hanya digunakan sekali dalam aplikasi NexbillAgent nanti — tunggu balasannya di menu Chat/Bantuan (biasanya tidak lama).",
    th: "คลิกปุ่มด้านล่างเพื่อส่งคำขอโทเค็นไปยังทีม NEXBILL โทเค็นนี้เป็นความลับและใช้เพียงครั้งเดียวในแอป NexbillAgent — รอการตอบกลับที่เมนู Chat/ความช่วยเหลือ (ปกติไม่นาน)",
    fil: "I-click ang button sa ibaba para magpadala ng hiling ng token sa team ng NEXBILL. Kumpidensyal ang token na ito at ilalagay lang minsan sa NexbillAgent app mamaya — hintayin ang sagot sa menu na Chat/Suporta (karaniwang hindi matagal).",
    vi: "Nhấp nút bên dưới để gửi yêu cầu token đến đội ngũ NEXBILL. Token này bí mật và chỉ nhập một lần trong app NexbillAgent — chờ phản hồi ở menu Chat/Hỗ trợ (thường không lâu).",
  },
  "devices.guide.tv.requestTokenButton": {
    id: "Minta Token Relay Agent",
    en: "Request Relay Agent Token",
    ms: "Minta Token Relay Agent",
    th: "ขอโทเค็น Relay Agent",
    fil: "Humiling ng Relay Agent Token",
    vi: "Yêu cầu Token Relay Agent",
  },
  "devices.guide.tv.requesting": {
    id: "Mengirim...",
    en: "Sending...",
    ms: "Menghantar...",
    th: "กำลังส่ง...",
    fil: "Ipinapadala...",
    vi: "Đang gửi...",
  },
  "devices.guide.tv.ticketSubject": {
    id: "Minta Token Relay Agent (TV)",
    en: "Relay Agent Token Request (TV)",
    ms: "Minta Token Relay Agent (TV)",
    th: "ขอโทเค็น Relay Agent (ทีวี)",
    fil: "Hiling ng Relay Agent Token (TV)",
    vi: "Yêu cầu Token Relay Agent (TV)",
  },
  "devices.guide.tv.ticketMessage": {
    id: "Halo tim NEXBILL, saya ingin mengaktifkan kontrol TV (Android/Google TV) untuk outlet ini. Mohon dibuatkan token Relay Agent-nya. Terima kasih.",
    en: "Hi NEXBILL team, I'd like to activate TV (Android/Google TV) control for this outlet. Please generate a Relay Agent token for us. Thank you.",
    ms: "Salam pasukan NEXBILL, saya ingin mengaktifkan kawalan TV (Android/Google TV) untuk outlet ini. Mohon jana token Relay Agent. Terima kasih.",
    th: "สวัสดีทีม NEXBILL ผมต้องการเปิดใช้งานควบคุมทีวี (Android/Google TV) สำหรับสาขานี้ กรุณาสร้างโทเค็น Relay Agent ให้ด้วยครับ/ค่ะ ขอบคุณครับ/ค่ะ",
    fil: "Kumusta team ng NEXBILL, gusto ko sanang i-activate ang TV (Android/Google TV) control para sa outlet na ito. Paki-generate po ng Relay Agent token. Salamat po.",
    vi: "Chào đội ngũ NEXBILL, tôi muốn kích hoạt điều khiển TV (Android/Google TV) cho chi nhánh này. Vui lòng tạo token Relay Agent giúp tôi. Cảm ơn.",
  },
  "devices.guide.tv.ticketSent": {
    id: "Permintaan terkirim! Cek balasannya di menu Chat/Bantuan (biasanya tidak lama).",
    en: "Request sent! Check the reply in the Chat/Support menu (usually not long).",
    ms: "Permintaan dihantar! Semak balasannya di menu Chat/Bantuan (biasanya tidak lama).",
    th: "ส่งคำขอแล้ว! ตรวจสอบการตอบกลับที่เมนู Chat/ความช่วยเหลือ (ปกติไม่นาน)",
    fil: "Naipadala na ang hiling! Tingnan ang sagot sa menu na Chat/Suporta (karaniwang hindi matagal).",
    vi: "Đã gửi yêu cầu! Kiểm tra phản hồi ở menu Chat/Hỗ trợ (thường không lâu).",
  },
  "devices.guide.tv.ticketFailed": {
    id: "Gagal mengirim permintaan. Coba lagi, atau hubungi tim NEXBILL lewat menu Chat/Bantuan.",
    en: "Failed to send the request. Try again, or contact the NEXBILL team via the Chat/Support menu.",
    ms: "Gagal menghantar permintaan. Cuba lagi, atau hubungi pasukan NEXBILL melalui menu Chat/Bantuan.",
    th: "ส่งคำขอไม่สำเร็จ ลองอีกครั้ง หรือติดต่อทีม NEXBILL ผ่านเมนู Chat/ความช่วยเหลือ",
    fil: "Hindi naipadala ang hiling. Subukan ulit, o makipag-ugnayan sa team ng NEXBILL sa pamamagitan ng menu na Chat/Suporta.",
    vi: "Gửi yêu cầu thất bại. Thử lại, hoặc liên hệ đội ngũ NEXBILL qua menu Chat/Hỗ trợ.",
  },

  "devices.guide.tv.step2Heading": {
    id: "Langkah 2 — Unduh Aplikasi NexbillAgent",
    en: "Step 2 — Download the NexbillAgent App",
    ms: "Langkah 2 — Muat Turun Aplikasi NexbillAgent",
    th: "ขั้นตอนที่ 2 — ดาวน์โหลดแอป NexbillAgent",
    fil: "Hakbang 2 — I-download ang NexbillAgent App",
    vi: "Bước 2 — Tải ứng dụng NexbillAgent",
  },
  "devices.guide.tv.step2Body": {
    id: "Unduh sesuai bahasa yang kamu pakai di dashboard ini (sudah otomatis dipilihkan), lalu extract file zip-nya ke folder mana saja di PC outlet.",
    en: "Download the version matching the language you're using on this dashboard (already auto-selected), then extract the zip file to any folder on the outlet's PC.",
    ms: "Muat turun mengikut bahasa yang anda guna di papan pemuka ini (sudah dipilih secara automatik), kemudian extract fail zip itu ke mana-mana folder di PC outlet.",
    th: "ดาวน์โหลดตามภาษาที่คุณใช้ในแดชบอร์ดนี้ (เลือกให้อัตโนมัติแล้ว) จากนั้นแตกไฟล์ zip ไปยังโฟลเดอร์ใดก็ได้บน PC ของสาขา",
    fil: "I-download ang bersyon na tugma sa wikang ginagamit mo sa dashboard na ito (na-auto-select na), pagkatapos i-extract ang zip file sa kahit anong folder sa PC ng outlet.",
    vi: "Tải phiên bản khớp với ngôn ngữ bạn đang dùng trên dashboard này (đã tự động chọn sẵn), sau đó giải nén file zip vào bất kỳ thư mục nào trên PC của chi nhánh.",
  },
  "devices.guide.tv.downloadButton": {
    id: "Unduh NexbillAgent",
    en: "Download NexbillAgent",
    ms: "Muat Turun NexbillAgent",
    th: "ดาวน์โหลด NexbillAgent",
    fil: "I-download ang NexbillAgent",
    vi: "Tải NexbillAgent",
  },

  "devices.guide.tv.step3Heading": {
    id: "Langkah 3 — Jalankan & Tempel Token",
    en: "Step 3 — Run It & Paste the Token",
    ms: "Langkah 3 — Jalankan & Tampal Token",
    th: "ขั้นตอนที่ 3 — เปิดใช้งานและวางโทเค็น",
    fil: "Hakbang 3 — Patakbuhin at I-paste ang Token",
    vi: "Bước 3 — Chạy ứng dụng & Dán Token",
  },
  "devices.guide.tv.step3Body": {
    id: 'Buka folder hasil extract, jalankan NexbillAgent.exe. Saat pertama kali dijalankan, aplikasi akan minta "Masukkan Agent Token" — tempel token dari Langkah 1. Setelah itu token tersimpan otomatis, tidak perlu diketik ulang tiap buka aplikasinya.',
    en: 'Open the extracted folder and run NexbillAgent.exe. The first time it runs, it will ask you to "Enter the Agent Token" — paste the token from Step 1. After that it is saved automatically, so you won\'t need to type it again each time you open the app.',
    ms: 'Buka folder hasil extract, jalankan NexbillAgent.exe. Kali pertama dijalankan, aplikasi akan minta "Masukkan Agent Token" — tampal token dari Langkah 1. Selepas itu token disimpan secara automatik, tidak perlu ditaip semula setiap kali buka aplikasi.',
    th: 'เปิดโฟลเดอร์ที่แตกไฟล์แล้วรัน NexbillAgent.exe ครั้งแรกที่รัน แอปจะขอให้ "ใส่ Agent Token" — วางโทเค็นจากขั้นตอนที่ 1 หลังจากนั้นโทเค็นจะถูกบันทึกอัตโนมัติ ไม่ต้องพิมพ์ใหม่ทุกครั้งที่เปิดแอป',
    fil: 'Buksan ang na-extract na folder, patakbuhin ang NexbillAgent.exe. Sa unang beses na patakbuhin, hihilingin ng app na "Ilagay ang Agent Token" — i-paste ang token mula sa Hakbang 1. Pagkatapos noon, awtomatikong nase-save ang token, hindi na kailangang i-type ulit tuwing bubuksan ang app.',
    vi: 'Mở thư mục đã giải nén, chạy NexbillAgent.exe. Lần đầu chạy, ứng dụng sẽ yêu cầu "Nhập Agent Token" — dán token từ Bước 1. Sau đó token được lưu tự động, không cần nhập lại mỗi lần mở ứng dụng.',
  },

  "devices.guide.tv.step4Heading": {
    id: "Langkah 4 — Setup TV (sekali per TV)",
    en: "Step 4 — TV Setup (once per TV)",
    ms: "Langkah 4 — Persediaan TV (sekali untuk setiap TV)",
    th: "ขั้นตอนที่ 4 — ตั้งค่าทีวี (ครั้งเดียวต่อทีวี)",
    fil: "Hakbang 4 — Setup ng TV (isang beses bawat TV)",
    vi: "Bước 4 — Thiết lập TV (một lần cho mỗi TV)",
  },
  "devices.guide.tv.step4Body": {
    id: 'Di TV: buka Settings > Device Preferences (System) > About > tekan baris versi build 7x sampai muncul "Developer options". Masuk ke Developer options, aktifkan "Network debugging", catat alamat IP yang muncul di layar. Saat NexbillAgent pertama kali konek ke TV ini, layar TV akan menampilkan popup "Allow debugging?" — centang "Always allow from this computer" lalu pilih Izinkan. Setelah itu tidak perlu approve lagi.',
    en: 'On the TV: open Settings > Device Preferences (System) > About > tap the build number line 7 times until "Developer options" appears. Go into Developer options, enable "Network debugging", and note the IP address shown on screen. The first time NexbillAgent connects to this TV, the screen will show an "Allow debugging?" popup — check "Always allow from this computer" and tap Allow. After that, you won\'t need to approve it again.',
    ms: 'Pada TV: buka Settings > Device Preferences (System) > About > ketik baris nombor build 7x sehingga "Developer options" muncul. Masuk ke Developer options, aktifkan "Network debugging", catat alamat IP yang dipaparkan pada skrin. Apabila NexbillAgent buat kali pertama menyambung ke TV ini, skrin TV akan memaparkan popup "Allow debugging?" — tandakan "Always allow from this computer" kemudian pilih Benarkan. Selepas itu tidak perlu lulus semula.',
    th: 'บนทีวี: เปิด Settings > Device Preferences (System) > About > แตะที่บรรทัดหมายเลขบิลด์ 7 ครั้งจนกว่า "Developer options" จะปรากฏ เข้าไปที่ Developer options เปิดใช้งาน "Network debugging" จดบันทึก IP ที่แสดงบนหน้าจอ เมื่อ NexbillAgent เชื่อมต่อกับทีวีนี้ครั้งแรก หน้าจอทีวีจะแสดงป็อปอัพ "Allow debugging?" — ทำเครื่องหมายที่ "Always allow from this computer" แล้วกด Allow หลังจากนั้นไม่ต้องอนุมัติอีก',
    fil: 'Sa TV: buksan ang Settings > Device Preferences (System) > About > i-tap ang build number line nang 7x hanggang lumabas ang "Developer options". Pumunta sa Developer options, i-enable ang "Network debugging", isulat ang IP address na lalabas sa screen. Sa unang pagkonekta ng NexbillAgent sa TV na ito, magpapakita ang screen ng popup na "Allow debugging?" — markahan ang "Always allow from this computer" pagkatapos pindutin ang Allow. Pagkatapos noon, hindi na kailangang aprubahan ulit.',
    vi: 'Trên TV: mở Settings > Device Preferences (System) > About > chạm vào dòng số bản dựng 7 lần cho đến khi xuất hiện "Developer options". Vào Developer options, bật "Network debugging", ghi lại địa chỉ IP hiện trên màn hình. Lần đầu NexbillAgent kết nối với TV này, màn hình TV sẽ hiện popup "Allow debugging?" — đánh dấu "Always allow from this computer" rồi nhấn Allow. Sau đó không cần cho phép lại.',
  },

  "devices.guide.tv.step5Heading": {
    id: "Langkah 5 — Tambahkan di NEXBILL",
    en: "Step 5 — Add It in NEXBILL",
    ms: "Langkah 5 — Tambah di NEXBILL",
    th: "ขั้นตอนที่ 5 — เพิ่มใน NEXBILL",
    fil: "Hakbang 5 — Idagdag sa NEXBILL",
    vi: "Bước 5 — Thêm vào NEXBILL",
  },
  "devices.guide.tv.step5Body": {
    id: 'Kembali ke halaman ini, klik "Tambah Perangkat", pilih protokol "TV (Android/Google TV)", isi nama dan IP TV dari Langkah 4, lalu Simpan. Selesai — TV bisa dinyalakan/dimatikan dari dashboard ini.',
    en: 'Come back to this page, click "Add Device", choose the "TV (Android/Google TV)" protocol, enter a name and the TV\'s IP from Step 4, then Save. Done — the TV can now be turned on/off from this dashboard.',
    ms: 'Kembali ke halaman ini, klik "Tambah Peranti", pilih protokol "TV (Android/Google TV)", isi nama dan IP TV daripada Langkah 4, kemudian Simpan. Selesai — TV boleh dihidupkan/dimatikan dari papan pemuka ini.',
    th: 'กลับมาที่หน้านี้ คลิก "เพิ่มอุปกรณ์" เลือกโปรโตคอล "ทีวี (Android/Google TV)" กรอกชื่อและ IP ทีวีจากขั้นตอนที่ 4 แล้วบันทึก เสร็จแล้ว — ทีวีสามารถเปิด/ปิดได้จากแดชบอร์ดนี้',
    fil: 'Bumalik sa page na ito, i-click ang "Magdagdag ng Device", piliin ang protocol na "TV (Android/Google TV)", ilagay ang pangalan at IP ng TV mula sa Hakbang 4, pagkatapos I-save. Tapos na — puwede nang i-on/off ang TV mula sa dashboard na ito.',
    vi: 'Quay lại trang này, nhấp "Thêm thiết bị", chọn giao thức "TV (Android/Google TV)", nhập tên và IP của TV từ Bước 4, rồi Lưu. Xong — TV có thể được bật/tắt từ dashboard này.',
  },
});
