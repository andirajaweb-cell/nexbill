'use strict';
/*
 * NEXBILL Relay Agent v1.2 — berjalan di PC outlet, satu jaringan dengan TV Android di bilik.
 *
 * Rancangan: AGENT-V1.2-DESIGN.md di root folder proyek. Kode sumber v1.1 (yang terpasang di
 * outlet sebelum ini) diarsipkan di legacy/index-v1.1.js.
 *
 * Protokolnya harus sama dengan repo NEXBILL:
 *   pos-rental-ps/src/lib/relay/config.ts        — bentuk pesan
 *   pos-rental-ps/src/lib/relay/capabilities.ts  — daftar perintah, kemampuan, dan validator
 *   pos-rental-ps/scripts/relay-hub.ts            — hub yang mengirim perintah
 * Kalau salah satu berubah, file ini WAJIB ikut. Validator di bawah sengaja disalin (bukan
 * diimpor) karena agent dibangun sebagai satu .exe mandiri di luar repo itu.
 *
 * YANG BARU DI v1.2 DAN KENAPA:
 *
 *   1. Melaporkan versi + kemampuan saat tersambung. Hub memakai itu untuk menolak perintah yang
 *      tidak didukung — agent v1.1 membalas "berhasil" untuk perintah APA PUN yang tidak ia kenal.
 *   2. Perintah baru: openScreensaver, switchHdmi, getTvInfo — dirakit dari tabel tetap dan
 *      validator ketat, tidak pernah dari teks bebas kiriman hub.
 *   3. Menolak IP di luar jaringan lokal, dan MENGABAIKAN adbPath kiriman hub. v1.1 menjalankan
 *      program apa pun yang disebut hub sebagai "adb" — hub yang dibobol bisa memilih program
 *      yang dijalankan di PC outlet.
 *   4. Mencegah dua agent berjalan bersamaan di satu PC (dua jendela dengan token yang sama
 *      membuat hub mencatat agent putus-sambung terus-menerus).
 *   5. Menyala sendiri saat PC login (HKCU\...\Run — tidak butuh hak Administrator).
 *   6. Update otomatis bertanda tangan Ed25519, hanya dipasang pukul 03.00-06.00 waktu PC, dengan
 *      pembatalan otomatis kalau versi baru gagal tersambung.
 *   7. Enam bahasa, mengikuti bahasa outlet di NEXBILL.
 *   8. Log ke agent.log di folder ini — supaya masalah di outlet bisa dilacak tanpa harus ada
 *      orang yang kebetulan melihat jendela konsolnya.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { execFile, execFileSync, spawn } = require('child_process');

const AGENT_VERSION = '1.2.0';

const IS_PKG = !!process.pkg;
// Saat dibangun jadi .exe, folder kerja = folder tempat .exe berada. Saat dijalankan lewat
// `node index.js` (pengujian), folder file ini. v1.1 selalu memakai folder process.execPath, yang
// saat dijalankan lewat node menunjuk ke folder instalasi Node — config.json tersimpan di sana.
const APP_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = path.join(APP_DIR, 'config.json');
const LOCK_PATH = path.join(APP_DIR, 'agent.lock');
const LOG_PATH = path.join(APP_DIR, 'agent.log');
const LOCAL_ADB = path.join(APP_DIR, 'adb.exe');
const OLD_EXE = path.join(APP_DIR, 'NexbillAgent.old.exe');
const NEW_EXE = path.join(APP_DIR, 'NexbillAgent.new.exe');
const BAD_EXE = path.join(APP_DIR, 'NexbillAgent.bad.exe');

// Hostname ini tertanam di SEMUA build yang pernah dibagikan — jangan diubah tanpa memindahkan
// Cloudflare Tunnel-nya juga (lihat RELAY-HUB-SETUP.md).
const DEFAULT_HUB_URL = 'wss://relay.nexbill.id';

// Sama persis dengan halaman pairing yang disebut di Pengaturan › TV Screensaver ("nexbill.id/tv").
// Token pairing TV tersimpan per domain di browser; domain lain = TV meminta kode pairing lagi.
// TIDAK PERNAH dikirim hub — hub yang dibobol tidak boleh bisa membuka halaman lain di TV bilik.
const SCREENSAVER_URL = 'https://nexbill.id/tv';

// ---- Update otomatis ----
const UPDATE_BASE_URL = 'https://nexbill.id/downloads/nexbill-agent/';
// Kunci PUBLIK Ed25519 (DER/SPKI, base64) dari `npm run keygen`. Kosong = update otomatis MATI:
// build ini tidak akan pernah mengunduh atau memasang apa pun. Aman dilihat siapa saja; yang harus
// dirahasiakan adalah pasangan privatnya, yang TIDAK BOLEH ada di folder ini.
const UPDATE_PUBLIC_KEY_B64 = 'MCowBQYDK2VwAyEAzfdEo9+M18pE4FwzUE/sE4B/zv9HGk6Eu/zMxaT0x2k=';
const UPDATE_WINDOW = { startHour: 3, endHour: 6 }; // jam PC outlet, bukan jam server
const UPDATE_FIRST_CHECK_MS = 2 * 60 * 1000;
const UPDATE_CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
const UPDATE_APPLY_POLL_MS = 5 * 60 * 1000;
const UPDATE_MAX_BYTES = 200 * 1024 * 1024;
const ROLLBACK_AFTER_STARTS = 3;
const ROLLBACK_AUTH_TIMEOUT_MS = 5 * 60 * 1000;

const HEARTBEAT_INTERVAL_MS = 20000; // sama dengan RELAY_HEARTBEAT_INTERVAL_MS di hub
const MAX_RECONNECT_DELAY_MS = 30000;

const SUPPORTED_ACTIONS = ['turnOn', 'turnOff', 'getState', 'openScreensaver', 'switchHdmi', 'getTvInfo'];
const HDMI_KEYCODES = { 1: 243, 2: 244, 3: 245, 4: 246 }; // KEYCODE_TV_INPUT_HDMI_1..4
// Keluaran `am start` yang menandakan gagal. "Warning: Activity not started, intent has been
// delivered to currently running top-most instance" SENGAJA tidak termasuk — itu artinya
// screensaver memang sudah terbuka, dan itu berhasil.
const AM_START_ERROR = /Error:|Exception|unable to resolve|Unknown option/i;

// =====================================================================================
// Bahasa
// =====================================================================================

const MESSAGES = {
  id: {
    askToken: 'Masukkan Agent Token dari halaman Kontrol Perangkat NEXBILL: ',
    tokenEmpty: 'Token tidak boleh kosong. Tutup lalu jalankan ulang aplikasi ini.',
    tokenSaved: 'Token tersimpan di config.json — tidak perlu diisi ulang lain kali.',
    tvSetupTitle: 'CATATAN SATU KALI PER TV:',
    tvSetup1: '1) Di TV: Settings > Device Preferences (System) > About > tekan baris versi build 7x untuk membuka Developer options.',
    tvSetup2: '2) Aktifkan "Network debugging" di Developer options, lalu catat IP TV (isi di halaman Tambah Perangkat NEXBILL).',
    tvSetup3: '3) Saat pertama kali tersambung, TV menampilkan "Allow debugging?" — centang "Always allow from this computer" lalu Izinkan.',
    connecting: 'Menghubungkan ke {url} ...',
    connected: 'Terhubung (versi {version}). Menunggu perintah dari NEXBILL...',
    tokenRejected: 'Token ditolak: {message}. Hapus config.json di folder ini lalu jalankan ulang untuk mengisi token baru.',
    disconnected: 'Terputus dari server. Coba lagi dalam {seconds} detik...',
    command: 'Perintah "{action}" untuk TV {target}',
    commandRejected: 'Perintah ditolak: {reason}',
    alreadyRunning: 'NexbillAgent sudah berjalan di komputer ini (PID {pid}). Jendela ini akan ditutup dalam 10 detik.',
    autostartOn: 'NexbillAgent akan menyala otomatis setiap kali komputer ini login.',
    updateDisabled: 'Update otomatis belum aktif di build ini.',
    updateFound: 'Versi baru {version} ditemukan. Mengunduh...',
    updateReady: 'Versi {version} siap, akan dipasang antara pukul {start}.00-{end}.00.',
    updateInstalling: 'Memasang versi {version}. Agent akan menyala ulang...',
    updateRejected: 'Update {version} ditolak: {reason}',
    updateInstalled: 'Update ke versi {version} berhasil.',
    rollback: 'Versi {version} gagal berjalan — kembali ke versi sebelumnya.',
    languageSaved: 'Bahasa: {language}. Untuk menggantinya nanti, jalankan: NexbillAgent.exe --lang',
  },
  en: {
    askToken: 'Enter the Agent Token from the NEXBILL Device Control page: ',
    tokenEmpty: 'The token cannot be empty. Close and restart this application.',
    tokenSaved: 'Token saved in config.json — no need to enter it again.',
    tvSetupTitle: 'ONE-TIME SETUP PER TV:',
    tvSetup1: '1) On the TV: Settings > Device Preferences (System) > About > press the build number row 7 times to unlock Developer options.',
    tvSetup2: '2) Turn on "Network debugging" in Developer options, then note the TV\'s IP (enter it on the NEXBILL Add Device page).',
    tvSetup3: '3) On the first connection the TV shows "Allow debugging?" — tick "Always allow from this computer" and choose Allow.',
    connecting: 'Connecting to {url} ...',
    connected: 'Connected (version {version}). Waiting for commands from NEXBILL...',
    tokenRejected: 'Token rejected: {message}. Delete config.json in this folder and restart to enter a new token.',
    disconnected: 'Disconnected from the server. Retrying in {seconds} seconds...',
    command: 'Command "{action}" for TV {target}',
    commandRejected: 'Command rejected: {reason}',
    alreadyRunning: 'NexbillAgent is already running on this computer (PID {pid}). This window will close in 10 seconds.',
    autostartOn: 'NexbillAgent will start automatically every time this computer logs in.',
    updateDisabled: 'Automatic updates are not enabled in this build.',
    updateFound: 'New version {version} found. Downloading...',
    updateReady: 'Version {version} is ready and will be installed between {start}:00 and {end}:00.',
    updateInstalling: 'Installing version {version}. The agent will restart...',
    updateRejected: 'Update {version} rejected: {reason}',
    updateInstalled: 'Updated to version {version} successfully.',
    rollback: 'Version {version} failed to run — reverting to the previous version.',
    languageSaved: 'Language: {language}. To change it later, run: NexbillAgent.exe --lang',
  },
  ms: {
    askToken: 'Masukkan Token Ejen dari halaman Kawalan Peranti NEXBILL: ',
    tokenEmpty: 'Token tidak boleh kosong. Tutup dan jalankan semula aplikasi ini.',
    tokenSaved: 'Token disimpan dalam config.json — tidak perlu diisi semula.',
    tvSetupTitle: 'NOTA SEKALI UNTUK SETIAP TV:',
    tvSetup1: '1) Di TV: Settings > Device Preferences (System) > About > tekan baris nombor binaan 7 kali untuk membuka Developer options.',
    tvSetup2: '2) Hidupkan "Network debugging" di Developer options, kemudian catat IP TV (isi di halaman Tambah Peranti NEXBILL).',
    tvSetup3: '3) Semasa sambungan pertama, TV memaparkan "Allow debugging?" — tandakan "Always allow from this computer" dan pilih Benarkan.',
    connecting: 'Menyambung ke {url} ...',
    connected: 'Bersambung (versi {version}). Menunggu arahan daripada NEXBILL...',
    tokenRejected: 'Token ditolak: {message}. Padam config.json dalam folder ini dan jalankan semula untuk mengisi token baharu.',
    disconnected: 'Terputus daripada pelayan. Cuba lagi dalam {seconds} saat...',
    command: 'Arahan "{action}" untuk TV {target}',
    commandRejected: 'Arahan ditolak: {reason}',
    alreadyRunning: 'NexbillAgent sudah berjalan di komputer ini (PID {pid}). Tetingkap ini akan ditutup dalam 10 saat.',
    autostartOn: 'NexbillAgent akan bermula secara automatik setiap kali komputer ini log masuk.',
    updateDisabled: 'Kemas kini automatik belum aktif dalam binaan ini.',
    updateFound: 'Versi baharu {version} ditemui. Memuat turun...',
    updateReady: 'Versi {version} sedia dan akan dipasang antara jam {start}.00-{end}.00.',
    updateInstalling: 'Memasang versi {version}. Ejen akan dimulakan semula...',
    updateRejected: 'Kemas kini {version} ditolak: {reason}',
    updateInstalled: 'Kemas kini ke versi {version} berjaya.',
    rollback: 'Versi {version} gagal berjalan — kembali ke versi sebelumnya.',
    languageSaved: 'Bahasa: {language}. Untuk menukarnya kemudian, jalankan: NexbillAgent.exe --lang',
  },
  th: {
    askToken: 'ใส่ Agent Token จากหน้าควบคุมอุปกรณ์ของ NEXBILL: ',
    tokenEmpty: 'Token ต้องไม่ว่าง ปิดแล้วเปิดโปรแกรมนี้ใหม่',
    tokenSaved: 'บันทึก Token ไว้ใน config.json แล้ว ไม่ต้องกรอกใหม่อีก',
    tvSetupTitle: 'ขั้นตอนครั้งเดียวสำหรับทีวีแต่ละเครื่อง:',
    tvSetup1: '1) บนทีวี: Settings > Device Preferences (System) > About > กดที่หมายเลขบิลด์ 7 ครั้งเพื่อเปิด Developer options',
    tvSetup2: '2) เปิด "Network debugging" ใน Developer options แล้วจด IP ของทีวี (กรอกในหน้าเพิ่มอุปกรณ์ของ NEXBILL)',
    tvSetup3: '3) เมื่อเชื่อมต่อครั้งแรก ทีวีจะแสดง "Allow debugging?" ให้ติ๊ก "Always allow from this computer" แล้วกดอนุญาต',
    connecting: 'กำลังเชื่อมต่อกับ {url} ...',
    connected: 'เชื่อมต่อแล้ว (เวอร์ชัน {version}) กำลังรอคำสั่งจาก NEXBILL...',
    tokenRejected: 'Token ถูกปฏิเสธ: {message} ลบ config.json ในโฟลเดอร์นี้แล้วเปิดใหม่เพื่อกรอก Token ใหม่',
    disconnected: 'การเชื่อมต่อกับเซิร์ฟเวอร์หลุด จะลองใหม่ใน {seconds} วินาที...',
    command: 'คำสั่ง "{action}" สำหรับทีวี {target}',
    commandRejected: 'ปฏิเสธคำสั่ง: {reason}',
    alreadyRunning: 'NexbillAgent ทำงานอยู่บนคอมพิวเตอร์นี้แล้ว (PID {pid}) หน้าต่างนี้จะปิดใน 10 วินาที',
    autostartOn: 'NexbillAgent จะเริ่มทำงานอัตโนมัติทุกครั้งที่เข้าสู่ระบบคอมพิวเตอร์นี้',
    updateDisabled: 'การอัปเดตอัตโนมัติยังไม่เปิดใช้ในบิลด์นี้',
    updateFound: 'พบเวอร์ชันใหม่ {version} กำลังดาวน์โหลด...',
    updateReady: 'เวอร์ชัน {version} พร้อมแล้ว จะติดตั้งระหว่าง {start}.00-{end}.00 น.',
    updateInstalling: 'กำลังติดตั้งเวอร์ชัน {version} เอเจนต์จะเริ่มใหม่...',
    updateRejected: 'ปฏิเสธการอัปเดต {version}: {reason}',
    updateInstalled: 'อัปเดตเป็นเวอร์ชัน {version} สำเร็จ',
    rollback: 'เวอร์ชัน {version} ทำงานไม่สำเร็จ กำลังกลับไปใช้เวอร์ชันก่อนหน้า',
    languageSaved: 'ภาษา: {language} หากต้องการเปลี่ยนภายหลัง ให้รัน: NexbillAgent.exe --lang',
  },
  fil: {
    askToken: 'Ilagay ang Agent Token mula sa pahina ng Device Control ng NEXBILL: ',
    tokenEmpty: 'Hindi puwedeng walang laman ang token. Isara at buksan muli ang application na ito.',
    tokenSaved: 'Naka-save ang token sa config.json — hindi na kailangang ilagay ulit.',
    tvSetupTitle: 'ISANG BESES LANG KADA TV:',
    tvSetup1: '1) Sa TV: Settings > Device Preferences (System) > About > pindutin nang 7 beses ang build number para buksan ang Developer options.',
    tvSetup2: '2) I-on ang "Network debugging" sa Developer options, at itala ang IP ng TV (ilagay ito sa pahina ng Magdagdag ng Device sa NEXBILL).',
    tvSetup3: '3) Sa unang koneksyon, ipapakita ng TV ang "Allow debugging?" — lagyan ng tsek ang "Always allow from this computer" at piliin ang Allow.',
    connecting: 'Kumokonekta sa {url} ...',
    connected: 'Nakakonekta (bersyon {version}). Naghihintay ng utos mula sa NEXBILL...',
    tokenRejected: 'Tinanggihan ang token: {message}. Burahin ang config.json sa folder na ito at buksan ulit para maglagay ng bagong token.',
    disconnected: 'Naputol ang koneksyon sa server. Susubukan ulit sa loob ng {seconds} segundo...',
    command: 'Utos na "{action}" para sa TV {target}',
    commandRejected: 'Tinanggihan ang utos: {reason}',
    alreadyRunning: 'Tumatakbo na ang NexbillAgent sa computer na ito (PID {pid}). Magsasara ang window na ito sa loob ng 10 segundo.',
    autostartOn: 'Awtomatikong bubukas ang NexbillAgent tuwing magla-log in sa computer na ito.',
    updateDisabled: 'Hindi pa aktibo ang awtomatikong update sa build na ito.',
    updateFound: 'May bagong bersyon {version}. Dina-download...',
    updateReady: 'Handa na ang bersyon {version} at ii-install sa pagitan ng {start}:00-{end}:00.',
    updateInstalling: 'Ini-install ang bersyon {version}. Magre-restart ang agent...',
    updateRejected: 'Tinanggihan ang update {version}: {reason}',
    updateInstalled: 'Matagumpay ang update sa bersyon {version}.',
    rollback: 'Pumalya ang bersyon {version} — bumabalik sa naunang bersyon.',
    languageSaved: 'Wika: {language}. Para palitan ito sa ibang pagkakataon, patakbuhin: NexbillAgent.exe --lang',
  },
  vi: {
    askToken: 'Nhập Agent Token từ trang Điều khiển thiết bị của NEXBILL: ',
    tokenEmpty: 'Token không được để trống. Hãy đóng và mở lại ứng dụng này.',
    tokenSaved: 'Token đã được lưu trong config.json — không cần nhập lại.',
    tvSetupTitle: 'THIẾT LẬP MỘT LẦN CHO MỖI TV:',
    tvSetup1: '1) Trên TV: Settings > Device Preferences (System) > About > nhấn 7 lần vào dòng số bản dựng để mở Developer options.',
    tvSetup2: '2) Bật "Network debugging" trong Developer options, rồi ghi lại IP của TV (nhập ở trang Thêm thiết bị của NEXBILL).',
    tvSetup3: '3) Ở lần kết nối đầu tiên, TV sẽ hiện "Allow debugging?" — đánh dấu "Always allow from this computer" rồi chọn Cho phép.',
    connecting: 'Đang kết nối tới {url} ...',
    connected: 'Đã kết nối (phiên bản {version}). Đang chờ lệnh từ NEXBILL...',
    tokenRejected: 'Token bị từ chối: {message}. Xóa config.json trong thư mục này rồi mở lại để nhập token mới.',
    disconnected: 'Mất kết nối với máy chủ. Thử lại sau {seconds} giây...',
    command: 'Lệnh "{action}" cho TV {target}',
    commandRejected: 'Lệnh bị từ chối: {reason}',
    alreadyRunning: 'NexbillAgent đang chạy trên máy tính này (PID {pid}). Cửa sổ này sẽ đóng sau 10 giây.',
    autostartOn: 'NexbillAgent sẽ tự khởi động mỗi khi đăng nhập vào máy tính này.',
    updateDisabled: 'Cập nhật tự động chưa được bật trong bản dựng này.',
    updateFound: 'Tìm thấy phiên bản mới {version}. Đang tải xuống...',
    updateReady: 'Phiên bản {version} đã sẵn sàng và sẽ được cài trong khoảng {start}:00-{end}:00.',
    updateInstalling: 'Đang cài phiên bản {version}. Agent sẽ khởi động lại...',
    updateRejected: 'Bản cập nhật {version} bị từ chối: {reason}',
    updateInstalled: 'Đã cập nhật lên phiên bản {version} thành công.',
    rollback: 'Phiên bản {version} chạy không thành công — quay lại phiên bản trước.',
    languageSaved: 'Ngôn ngữ: {language}. Để đổi sau này, hãy chạy: NexbillAgent.exe --lang',
  },
};

let currentLang = 'id';

/**
 * Menu bahasa saat pertama kali dijalankan. Nama tiap bahasa ditulis DALAM BAHASANYA SENDIRI —
 * merchant Thailand harus bisa menemukan pilihannya tanpa bisa membaca bahasa Indonesia.
 */
const LANGUAGE_CHOICES = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'th', label: 'ภาษาไทย (Thai)' },
  { code: 'fil', label: 'Filipino' },
  { code: 'vi', label: 'Tiếng Việt' },
];

/** "" (langsung Enter) = Bahasa Indonesia. Nomor di luar daftar = null (tanya lagi). */
function parseLanguageChoice(input) {
  const v = String(input === undefined || input === null ? '' : input).trim();
  if (v === '') return 'id';
  if (!/^\d+$/.test(v)) return null;
  const choice = LANGUAGE_CHOICES[Number(v) - 1];
  return choice ? choice.code : null;
}

/** "vn" diterima sebagai alias "vi" — nama zip unduhan lama memakai "vn". Bahasa tak dikenal = tetap. */
function normalizeLang(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase() === 'vn' ? 'vi' : value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(MESSAGES, v) ? v : null;
}

function t(key, vars) {
  const table = MESSAGES[currentLang] || MESSAGES.id;
  const template = table[key] || MESSAGES.id[key] || key;
  const text = template.replace(/\{(\w+)\}/g, (m, name) => (vars && vars[name] !== undefined ? String(vars[name]) : m));
  // Di HP Android (Termux) agent dijalankan lewat perintah `nexbill`, dan adb-nya `adb` biasa —
  // sesuaikan nama program di pesan supaya petunjuknya benar (lihat downloads/nexbill-agent/android).
  return process.platform === 'win32' ? text : text.replace(/NexbillAgent\.exe/g, 'nexbill').replace(/adb\.exe/g, 'adb');
}

// =====================================================================================
// Validator & perakit perintah — MURNI, diuji oleh tools/selftest.js
// Salinan dari pos-rental-ps/src/lib/relay/capabilities.ts; jaga tetap sama.
// =====================================================================================

/** IPv4 jaringan lokal (RFC 1918). TV bilik selalu ada di jaringan lokal outlet. */
function isPrivateLanIPv4(ip) {
  if (typeof ip !== 'string') return false;
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/** Port ADB. Tidak diisi = 5555 (bawaan "Network debugging"). */
function validateAdbPort(value) {
  if (value === undefined || value === null) return 5555;
  return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : null;
}

function validateHdmiPort(value) {
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : null;
}

/** Nama paket Android. Nilainya masuk ke perintah `am start`, jadi apa pun selain huruf/angka/_/. ditolak. */
function validateAndroidPackage(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length > 150) return null;
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(v) ? v : null;
}

/**
 * Menerjemahkan satu perintah menjadi langkah-langkah `adb shell`. Setiap teks perintah berasal dari
 * tabel tetap, konstanta, atau nilai yang sudah lolos validator — tidak pernah teks bebas.
 *
 * Langkah { sleepMs } memberi TV waktu bangun: menekan tombol HDMI sepersekian detik setelah
 * WAKEUP sering diabaikan TV yang layarnya baru menyala.
 *
 * optionalFrom: langkah dengan indeks >= nilai ini boleh gagal tanpa menggagalkan perintah (daftar
 * browser di getTvInfo memakai perintah yang tidak ada di Android lama).
 */
function buildCommandPlan(action, params) {
  const p = params || {};
  switch (action) {
    case 'turnOn':
      return { ok: true, steps: ['input keyevent 224'] }; // KEYCODE_WAKEUP
    case 'turnOff':
      return { ok: true, steps: ['input keyevent 223'] }; // KEYCODE_SLEEP
    case 'getState':
      return { ok: true, steps: ['dumpsys power'] };
    case 'openScreensaver': {
      let packageArg = '';
      if (p.browserPackage !== undefined && p.browserPackage !== null && p.browserPackage !== '') {
        const pkg = validateAndroidPackage(p.browserPackage);
        if (!pkg) return { ok: false, error: 'Nama paket browser tidak valid.' };
        packageArg = ` -p ${pkg}`;
      }
      return {
        ok: true,
        steps: ['input keyevent 224', { sleepMs: 800 }, `am start -a android.intent.action.VIEW -d ${SCREENSAVER_URL}${packageArg}`],
      };
    }
    case 'switchHdmi': {
      const port = validateHdmiPort(p.hdmiPort);
      if (port === null) return { ok: false, error: 'Port HDMI harus angka 1 sampai 4.' };
      return { ok: true, steps: ['input keyevent 224', { sleepMs: 1200 }, `input keyevent ${HDMI_KEYCODES[port]}`] };
    }
    case 'getTvInfo':
      return {
        ok: true,
        steps: [
          'getprop ro.product.brand; getprop ro.product.model; getprop ro.build.version.release',
          `cmd package query-activities --brief -a android.intent.action.VIEW -d ${SCREENSAVER_URL} -c android.intent.category.BROWSABLE`,
        ],
        optionalFrom: 1,
      };
    default:
      return { ok: false, error: `Perintah "${String(action)}" tidak didukung NexbillAgent ${AGENT_VERSION}.` };
  }
}

function parsePowerState(out) {
  const text = String(out || '');
  const m = text.match(/mWakefulness=(\w+)/i);
  if (m) {
    const w = m[1].toLowerCase();
    if (w === 'awake') return 'on';
    if (w === 'asleep' || w === 'dozing') return 'off';
  }
  if (/Display Power:\s*state=ON/i.test(text)) return 'on';
  if (/Display Power:\s*state=OFF/i.test(text)) return 'off';
  return 'unknown';
}

function parseTvInfo(out) {
  const [brand, model, android] = String(out || '')
    .split(/\r?\n/)
    .map((s) => s.trim().slice(0, 60));
  const info = {};
  if (brand) info.brand = brand;
  if (model) info.model = model;
  if (android) info.android = android;
  return info;
}

/** Nama paket dari keluaran `cmd package query-activities --brief` (baris "paket/aktivitas"). */
function parseBrowsers(out) {
  const found = [];
  const re = /([a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+)\/[\w.$]+/g;
  let m;
  while ((m = re.exec(String(out || ''))) !== null) {
    const pkg = validateAndroidPackage(m[1]);
    if (pkg && !found.includes(pkg)) found.push(pkg);
    if (found.length >= 10) break;
  }
  return found;
}

// =====================================================================================
// Update: versi, manifest, tanda tangan — MURNI, diuji oleh tools/selftest.js
// =====================================================================================

const VERSION_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Teks yang ditandatangani. HARUS sama persis dengan tools/sign-release.js. */
function manifestMessage(m) {
  return ['nexbill-agent-manifest-v1', m.version, m.url, m.sha256, String(m.size), m.releasedAt].join('\n');
}

/**
 * Memeriksa manifest update. Tanda tangan diperiksa PALING DULU — sebelum isi manifest dipercaya
 * untuk hal apa pun. Versi yang sama atau lebih lama ditolak meski tanda tangannya sah: tanpa itu,
 * versi lama yang punya celah keamanan bisa "diputar ulang" dan dipasang lagi.
 */
function verifyManifest(m, publicKeyB64, currentVersion, badVersions) {
  if (!m || typeof m !== 'object') return { ok: false, reason: 'format manifest tidak dikenal' };
  if (typeof m.version !== 'string' || !VERSION_PATTERN.test(m.version)) return { ok: false, reason: 'nomor versi tidak valid' };
  if (typeof m.url !== 'string' || !m.url.startsWith(UPDATE_BASE_URL) || !m.url.endsWith('.exe') || m.url.includes('..')) {
    return { ok: false, reason: 'alamat unduhan tidak diizinkan' };
  }
  if (typeof m.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(m.sha256)) return { ok: false, reason: 'hash tidak valid' };
  if (!Number.isInteger(m.size) || m.size < 1 || m.size > UPDATE_MAX_BYTES) return { ok: false, reason: 'ukuran file tidak valid' };
  if (typeof m.releasedAt !== 'string' || !m.releasedAt) return { ok: false, reason: 'tanggal rilis tidak ada' };
  if (typeof m.signature !== 'string' || !m.signature) return { ok: false, reason: 'tanda tangan tidak ada' };

  try {
    const key = crypto.createPublicKey({ key: Buffer.from(publicKeyB64, 'base64'), format: 'der', type: 'spki' });
    const valid = crypto.verify(null, Buffer.from(manifestMessage(m), 'utf8'), key, Buffer.from(m.signature, 'base64'));
    if (!valid) return { ok: false, reason: 'tanda tangan tidak sah' };
  } catch (err) {
    return { ok: false, reason: `tanda tangan tidak bisa diperiksa (${err && err.message ? err.message : err})` };
  }

  if (compareVersions(m.version, currentVersion) <= 0) return { ok: false, reason: 'bukan versi yang lebih baru', notNewer: true };
  if (Array.isArray(badVersions) && badVersions.includes(m.version)) return { ok: false, reason: 'versi ini pernah gagal berjalan di komputer ini' };
  return { ok: true };
}

function isInUpdateWindow(date) {
  const h = date.getHours();
  return h >= UPDATE_WINDOW.startHour && h < UPDATE_WINDOW.endHour;
}

// =====================================================================================
// Utilitas: log, config, proses
// =====================================================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function safeUnlink(file) {
  try {
    fs.unlinkSync(file);
  } catch (err) {
    /* file tidak ada / masih dipakai — tidak masalah */
  }
}

function log(level, message) {
  const text = `[${level}] ${message}`;
  if (level === 'ERROR') console.error(text);
  else console.log(text);
  try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > 1024 * 1024) fs.renameSync(LOG_PATH, `${LOG_PATH}.1`);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${text}\n`);
  } catch (err) {
    /* log ke file bersifat tambahan — jangan sampai menghentikan agent */
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) || {};
  } catch (err) {
    log('WARN', `config.json tidak bisa dibaca (${err.message}) — memakai pengaturan kosong.`);
  }
  return {};
}

/** Ditulis ke file sementara lalu diganti nama — listrik padam di tengah penulisan tidak meninggalkan config.json setengah jadi (dan token yang hilang). */
function saveConfig(cfg) {
  const tmp = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2));
  fs.renameSync(tmp, CONFIG_PATH);
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

/**
 * Apakah proses dengan PID ini masih NexbillAgent (atau node, saat pengujian)?
 * Memeriksa nama programnya lewat `tasklist`, bukan sekadar "PID-nya ada": Windows memakai ulang
 * nomor PID, dan agent yang menolak menyala karena PID lamanya kebetulan dipakai program lain
 * adalah kegagalan yang membingungkan.
 */
function isAgentProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], { windowsHide: true, encoding: 'utf8', timeout: 5000 });
      return out.toLowerCase().includes(`"${path.basename(process.execPath).toLowerCase()}"`);
    } catch (err) {
      /* tasklist gagal — jatuh ke pemeriksaan umum di bawah */
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return !!(err && err.code === 'EPERM');
  }
}

async function waitForExit(pid, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until && isAgentProcess(pid)) await sleep(500);
}

/** null = kunci didapat. Angka = PID agent lain yang sudah berjalan. */
function acquireLock() {
  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    if (existing && isAgentProcess(existing.pid)) return existing.pid;
  } catch (err) {
    /* belum ada kunci, atau file rusak — ambil alih */
  }
  fs.writeFileSync(LOCK_PATH, JSON.stringify({ pid: process.pid, version: AGENT_VERSION, startedAt: new Date().toISOString() }));
  return null;
}

function releaseLock() {
  try {
    const existing = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    if (existing && existing.pid === process.pid) fs.unlinkSync(LOCK_PATH);
  } catch (err) {
    /* sudah tidak ada */
  }
}

/**
 * Menjalankan ulang .exe di jendela konsol BARU (lewat `start`), lalu proses ini keluar. Jendela
 * baru penting: staf di outlet memastikan agent hidup dengan melihat jendelanya.
 * windowsVerbatimArguments: baris perintah dirakit sendiri supaya tanda kutip judul jendela ("")
 * tidak di-escape Node menjadi sesuatu yang tidak dipahami cmd.exe. Isinya hanya path .exe (tanpa
 * tanda kutip) dan argumen angka/flag milik agent sendiri.
 */
function relaunch(args) {
  const commandLine = `start "" "${process.execPath}" ${args.join(' ')}`;
  const child = spawn('cmd.exe', ['/c', commandLine], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
  child.unref();
}

/**
 * Menyala otomatis saat login, lewat HKCU\...\Run — per pengguna, TIDAK butuh hak Administrator
 * (Task Scheduler dengan pemicu login butuh). Hanya untuk build .exe di Windows. `"autostart": false`
 * di config.json mematikannya dan menghapus entrinya.
 */
function configureAutostart(config) {
  if (!IS_PKG || process.platform !== 'win32') return;
  const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
  if (config.autostart === false) {
    execFile('reg', ['delete', key, '/v', 'NexbillAgent', '/f'], { windowsHide: true }, () => {});
    return;
  }
  execFile('reg', ['add', key, '/v', 'NexbillAgent', '/t', 'REG_SZ', '/d', `"${process.execPath}"`, '/f'], { windowsHide: true }, (err) => {
    if (err) log('WARN', `Autostart gagal didaftarkan: ${err.message}`);
    else log('INFO', t('autostartOn'));
  });
}

// =====================================================================================
// ADB
// =====================================================================================

/**
 * Program adb yang dipakai: adb.exe di folder ini, atau `adbPath` di config.json LOKAL, atau `adb`
 * di PATH. adbPath kiriman HUB sengaja diabaikan (lihat catatan nomor 3 di atas file).
 */
function adbExecutable(config) {
  if (config && typeof config.adbPath === 'string' && config.adbPath.trim()) return config.adbPath.trim();
  return fs.existsSync(LOCAL_ADB) ? LOCAL_ADB : 'adb';
}

function runAdb(adb, args) {
  return new Promise((resolve, reject) => {
    execFile(adb, args, { timeout: 10000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 'ENOENT') {
          reject(new Error(process.platform === 'win32' ? `Perintah "${adb}" tidak ditemukan. Pastikan adb.exe ada satu folder dengan NexbillAgent.exe.` : `Perintah "${adb}" tidak ditemukan. Di Termux jalankan: pkg install android-tools`));
          return;
        }
        reject(new Error(`${stdout || ''} ${stderr || ''}`.trim() || error.message));
        return;
      }
      resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

async function ensureConnected(adb, serial) {
  const { stdout, stderr } = await runAdb(adb, ['connect', serial]);
  const low = `${stdout} ${stderr}`.toLowerCase();
  if (low.includes('unable to connect') || low.includes('cannot connect') || low.includes('connection refused') || low.includes('no route to host') || low.includes('timed out')) {
    throw new Error(`Tidak bisa terhubung ke TV di ${serial}. Pastikan TV menyala, satu jaringan dengan PC ini, dan "Network debugging" aktif di Developer options TV.`);
  }
}

async function adbShell(adb, serial, command) {
  await ensureConnected(adb, serial);
  const { stdout, stderr } = await runAdb(adb, ['-s', serial, 'shell', command]);
  const combined = `${stdout}\n${stderr}`;
  if (/device unauthorized/i.test(combined)) {
    throw new Error(`TV di ${serial} belum mengizinkan PC ini. Lihat layar TV — muncul "Allow debugging?", centang "Always allow from this computer" lalu Izinkan, coba lagi.`);
  }
  if (/device offline/i.test(combined)) throw new Error(`TV di ${serial} berstatus offline. Tunggu beberapa detik lalu coba lagi.`);
  if (/device .* not found|no devices\/emulators found/i.test(combined)) throw new Error(`TV di ${serial} tidak terdeteksi. Periksa IP-nya dan pastikan TV menyala.`);
  return { stdout, combined };
}

// =====================================================================================
// Perintah dari hub
// =====================================================================================

let activeCommands = 0;

async function handleCommand(msg, config) {
  const id = msg && typeof msg.id === 'string' ? msg.id : '';
  const fail = (error) => ({ type: 'result', id, ok: false, error });
  const action = msg && msg.action;

  if (!SUPPORTED_ACTIONS.includes(action)) {
    log('WARN', t('commandRejected', { reason: `perintah "${String(action)}" tidak dikenal` }));
    return fail(`Perintah "${String(action)}" tidak didukung NexbillAgent ${AGENT_VERSION}.`);
  }
  if (!isPrivateLanIPv4(msg.ip)) {
    log('WARN', t('commandRejected', { reason: `IP ${String(msg.ip)} bukan jaringan lokal` }));
    return fail(`Alamat TV "${String(msg.ip)}" ditolak: NexbillAgent hanya menghubungi TV di jaringan lokal (192.168.x.x, 10.x.x.x, atau 172.16-31.x.x). Periksa IP TV di Kontrol Perangkat.`);
  }
  const port = validateAdbPort(msg.port);
  if (port === null) return fail('Port ADB TV tidak valid.');

  const plan = buildCommandPlan(action, { hdmiPort: msg.hdmiPort, browserPackage: msg.browserPackage });
  if (!plan.ok) return fail(plan.error);

  const serial = `${msg.ip.trim()}:${port}`;
  const adb = adbExecutable(config);
  log('INFO', t('command', { action, target: serial }));

  activeCommands++;
  try {
    const outputs = [];
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      if (typeof step === 'object') {
        await sleep(step.sleepMs);
        continue;
      }
      if (plan.optionalFrom !== undefined && i >= plan.optionalFrom) {
        try {
          outputs.push(await adbShell(adb, serial, step));
        } catch (err) {
          outputs.push(null);
        }
      } else {
        outputs.push(await adbShell(adb, serial, step));
      }
    }

    if (action === 'getState') return { type: 'result', id, ok: true, state: parsePowerState(outputs[0].stdout) };

    if (action === 'openScreensaver') {
      const last = outputs[outputs.length - 1];
      if (AM_START_ERROR.test(last.combined)) {
        return fail(`TV tidak bisa membuka halaman screensaver: ${last.combined.trim().slice(0, 200)}. Pastikan ada browser terpasang di TV, dan nama paket browser di pengaturan layar benar.`);
      }
    }

    if (action === 'getTvInfo') {
      const info = parseTvInfo(outputs[0].stdout);
      const browsers = outputs[1] ? parseBrowsers(outputs[1].stdout) : [];
      if (browsers.length) info.browsers = browsers;
      return { type: 'result', id, ok: true, info };
    }

    return { type: 'result', id, ok: true };
  } catch (err) {
    const message = (err && err.message) || 'Perintah gagal dijalankan.';
    log('ERROR', message);
    return fail(message);
  } finally {
    activeCommands--;
  }
}

// =====================================================================================
// Koneksi ke Relay Hub
// =====================================================================================

let reconnectDelayMs = 2000;
let authenticatedOnce = false;
let wsOpenedOnce = false;
let tokenRejected = false;
let updateChannel = 'stable';

function updatesEnabled() {
  return IS_PKG && process.platform === 'win32' && !!UPDATE_PUBLIC_KEY_B64;
}

function capabilities() {
  const caps = ['power', 'open_screensaver', 'switch_hdmi', 'tv_info'];
  if (updatesEnabled()) caps.push('self_update');
  return caps;
}

function connect(config) {
  // Dimuat di sini, bukan di atas file, supaya tools/selftest.js bisa memuat file ini untuk menguji
  // fungsi-fungsi murninya tanpa membutuhkan modul jaringan.
  const WebSocket = require('ws');
  const hubUrl = typeof config.hubUrl === 'string' && config.hubUrl.startsWith('wss://') ? config.hubUrl : DEFAULT_HUB_URL;
  log('INFO', t('connecting', { url: hubUrl }));

  const ws = new WebSocket(hubUrl);
  let heartbeat = null;
  const send = (msg) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  ws.on('open', () => {
    wsOpenedOnce = true;
    send({ type: 'auth', token: config.token, agentVersion: AGENT_VERSION, capabilities: capabilities(), os: `${process.platform}-${process.arch}` });
  });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      return;
    }

    if (msg.type === 'auth_ok') {
      // Bahasa outlet dari NEXBILL hanya dipakai kalau pengguna PC ini belum pernah memilih sendiri
      // lewat menu bahasa. Pilihan eksplisit menang: kasir yang memilih English tidak boleh tiba-tiba
      // mendapati agent-nya berbahasa Indonesia hanya karena bahasa outlet di dashboard berbeda.
      const lang = normalizeLang(msg.lang);
      if (lang && !config.langChosen && lang !== config.lang) {
        currentLang = lang;
        config.lang = lang;
        saveConfig(config);
      }
      if (msg.updateChannel === 'beta' || msg.updateChannel === 'stable') updateChannel = msg.updateChannel;
      log('INFO', t('connected', { version: AGENT_VERSION }));
      reconnectDelayMs = 2000;
      if (!authenticatedOnce) {
        authenticatedOnce = true;
        onFirstAuthentication(config);
      }
      heartbeat = setInterval(() => send({ type: 'ping' }), HEARTBEAT_INTERVAL_MS);
      return;
    }
    if (msg.type === 'auth_error') {
      // Tidak mencoba lagi: token yang ditolak tidak akan diterima pada percobaan ke-100 juga, dan
      // mengulang terus hanya membanjiri log hub. Jendela dibiarkan terbuka supaya pesannya terbaca.
      tokenRejected = true;
      log('ERROR', t('tokenRejected', { message: msg.message || 'tidak dikenali' }));
      ws.close();
      setInterval(() => {}, 1 << 30);
      return;
    }
    if (msg.type === 'pong') return;
    if (msg.type === 'command') send(await handleCommand(msg, config));
  });

  ws.on('close', () => {
    if (heartbeat) clearInterval(heartbeat);
    if (tokenRejected) return;
    log('INFO', t('disconnected', { seconds: Math.round(reconnectDelayMs / 1000) }));
    setTimeout(() => connect(config), reconnectDelayMs);
    reconnectDelayMs = Math.min(reconnectDelayMs * 1.5, MAX_RECONNECT_DELAY_MS);
  });
  ws.on('error', (err) => {
    log('WARN', `Galat koneksi: ${err.message}`);
    ws.close();
  });
}

// =====================================================================================
// Update otomatis
// =====================================================================================

let pendingDownload = null; // { version, file }
let updateBusy = false;

function httpsGet(url, redirectsLeft) {
  const left = redirectsLeft === undefined ? 3 : redirectsLeft;
  return new Promise((resolve, reject) => {
    if (!String(url).startsWith('https://')) {
      reject(new Error('hanya alamat https yang diizinkan'));
      return;
    }
    const req = https.get(url, { timeout: 20000, headers: { 'User-Agent': `NexbillAgent/${AGENT_VERSION}` } }, (res) => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location && left > 0) {
        res.resume();
        resolve(httpsGet(new URL(res.headers.location, url).toString(), left - 1));
        return;
      }
      if (status !== 200) {
        res.resume();
        const e = new Error(`HTTP ${status}`);
        e.statusCode = status;
        reject(e);
        return;
      }
      resolve(res);
    });
    req.on('timeout', () => req.destroy(new Error('waktu habis')));
    req.on('error', reject);
  });
}

async function httpsGetBuffer(url, maxBytes) {
  const res = await httpsGet(url);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    res.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        res.destroy(new Error('respons terlalu besar'));
        return;
      }
      chunks.push(chunk);
    });
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
}

/** Mengunduh ke `dest` sambil menghitung SHA-256. Ukuran dan hash harus sama persis dengan manifest. */
async function downloadVerified(url, dest, expectedSize, expectedSha256) {
  const res = await httpsGet(url);
  try {
    await new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const out = fs.createWriteStream(dest);
      let total = 0;
      let failed = false;
      const fail = (err) => {
        if (failed) return;
        failed = true;
        res.destroy();
        out.destroy();
        reject(err);
      };
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > expectedSize) {
          fail(new Error('ukuran file melebihi yang tercatat di manifest'));
          return;
        }
        hash.update(chunk);
      });
      res.on('error', fail);
      out.on('error', fail);
      out.on('finish', () => {
        if (failed) return;
        if (total !== expectedSize) {
          fail(new Error(`ukuran file ${total} tidak sama dengan manifest (${expectedSize})`));
          return;
        }
        if (hash.digest('hex') !== expectedSha256) {
          fail(new Error('hash SHA-256 tidak cocok dengan manifest'));
          return;
        }
        resolve();
      });
      res.pipe(out);
    });
  } catch (err) {
    safeUnlink(dest);
    throw err;
  }
}

async function checkForUpdate(config) {
  if (!updatesEnabled() || updateBusy || pendingDownload) return;
  updateBusy = true;
  let manifest = null;
  try {
    const manifestUrl = `${UPDATE_BASE_URL}${updateChannel === 'beta' ? 'latest-beta.json' : 'latest.json'}`;
    const raw = await httpsGetBuffer(manifestUrl, 64 * 1024);
    manifest = JSON.parse(raw.toString('utf8'));
    const check = verifyManifest(manifest, UPDATE_PUBLIC_KEY_B64, AGENT_VERSION, config.badVersions);
    if (!check.ok) {
      if (!check.notNewer) log('WARN', t('updateRejected', { version: manifest && manifest.version ? manifest.version : '?', reason: check.reason }));
      return;
    }
    log('INFO', t('updateFound', { version: manifest.version }));
    await downloadVerified(manifest.url, NEW_EXE, manifest.size, manifest.sha256);
    pendingDownload = { version: manifest.version, file: NEW_EXE };
    log('INFO', t('updateReady', { version: manifest.version, start: UPDATE_WINDOW.startHour, end: UPDATE_WINDOW.endHour }));
    tryApplyUpdate(config);
  } catch (err) {
    // 404 = belum ada rilis untuk jalur ini. Itu keadaan normal, bukan galat yang perlu dicatat.
    if (err && err.statusCode === 404) return;
    log('WARN', `Pemeriksaan update gagal: ${err && err.message ? err.message : err}`);
  } finally {
    updateBusy = false;
  }
}

/**
 * Memasang update yang sudah terunduh — HANYA di jendela jam sepi, dan hanya saat tidak ada
 * perintah TV yang sedang berjalan. Agent mati beberapa detik saat berganti versi; kalau itu terjadi
 * saat kasir memulai sesi, TV tidak menyala.
 */
function tryApplyUpdate(config) {
  if (!pendingDownload) return;
  if (!isInUpdateWindow(new Date()) || activeCommands > 0) return;

  const { version, file } = pendingDownload;
  const exe = process.execPath;
  log('INFO', t('updateInstalling', { version }));
  try {
    safeUnlink(OLD_EXE);
    // Windows tidak mengizinkan menimpa .exe yang sedang berjalan, tapi mengizinkan MENGGANTI NAMANYA.
    fs.renameSync(exe, OLD_EXE);
    try {
      fs.renameSync(file, exe);
    } catch (err) {
      fs.renameSync(OLD_EXE, exe);
      throw err;
    }
  } catch (err) {
    log('ERROR', `Pemasangan update gagal: ${err.message}`);
    pendingDownload = null;
    safeUnlink(file);
    return;
  }

  config.pendingUpdate = { version, previousVersion: AGENT_VERSION, starts: 0, installedAt: new Date().toISOString() };
  saveConfig(config);
  relaunch(['--after-update', String(process.pid)]);
  setTimeout(() => process.exit(0), 500);
}

/**
 * Kembali ke versi sebelumnya. Versi yang gagal dicatat di badVersions supaya tidak diunduh lagi
 * — tanpa itu, agent akan memasang versi rusak yang sama setiap malam.
 */
function rollback(config, reason) {
  const exe = process.execPath;
  if (!fs.existsSync(OLD_EXE)) {
    log('ERROR', `Tidak bisa kembali ke versi sebelumnya: ${OLD_EXE} tidak ada.`);
    delete config.pendingUpdate;
    saveConfig(config);
    return false;
  }
  log('WARN', `${t('rollback', { version: AGENT_VERSION })} (${reason})`);
  try {
    safeUnlink(BAD_EXE);
    fs.renameSync(exe, BAD_EXE);
    fs.renameSync(OLD_EXE, exe);
  } catch (err) {
    log('ERROR', `Gagal kembali ke versi sebelumnya: ${err.message}`);
    return false;
  }
  const bad = Array.isArray(config.badVersions) ? config.badVersions : [];
  if (!bad.includes(AGENT_VERSION)) bad.push(AGENT_VERSION);
  config.badVersions = bad;
  delete config.pendingUpdate;
  saveConfig(config);
  relaunch(['--after-update', String(process.pid)]);
  setTimeout(() => process.exit(0), 500);
  return true;
}

/**
 * Dipanggil saat agent mulai. Kalau ini versi yang baru saja dipasang update:
 *   - hitung berapa kali ia sudah dijalankan tanpa pernah berhasil tersambung, dan kembali ke versi
 *     lama bila sudah ROLLBACK_AFTER_STARTS kali;
 *   - pasang pengawas: kalau koneksi ke server BISA dibuka tapi masuk (auth) tidak berhasil dalam
 *     5 menit, kembali ke versi lama.
 * Internet yang mati TIDAK memicu pembatalan — versi baru tidak bersalah atas itu, dan kembali ke
 * versi lama tidak akan menolong.
 *
 * Mengembalikan true bila pembatalan sedang berjalan (main() harus berhenti).
 */
function handlePendingUpdateOnStartup(config) {
  const pending = config.pendingUpdate;
  if (!pending) {
    safeUnlink(BAD_EXE);
    return false;
  }
  if (pending.version !== AGENT_VERSION) {
    delete config.pendingUpdate;
    saveConfig(config);
    return false;
  }
  pending.starts = (pending.starts || 0) + 1;
  saveConfig(config);
  if (pending.starts > ROLLBACK_AFTER_STARTS) return rollback(config, `gagal tersambung setelah ${ROLLBACK_AFTER_STARTS} kali dijalankan`);

  setTimeout(() => {
    if (config.pendingUpdate && !authenticatedOnce && wsOpenedOnce) rollback(config, 'tidak berhasil masuk ke server dalam 5 menit');
  }, ROLLBACK_AUTH_TIMEOUT_MS);
  return false;
}

/**
 * Menu bahasa. Muncul otomatis saat pemasangan baru (belum ada token dan belum ada bahasa), atau
 * kapan saja dengan `NexbillAgent.exe --lang`. Agent v1.1 yang di-upgrade sudah punya token, jadi
 * tidak ditanya — bahasanya mengikuti bahasa outlet di NEXBILL begitu tersambung.
 */
async function chooseLanguage(config) {
  console.log('Pilih bahasa / Choose language:');
  LANGUAGE_CHOICES.forEach((choice, i) => console.log(`  ${i + 1}) ${choice.label}`));
  let code = null;
  while (!code) code = parseLanguageChoice(await ask('Nomor / Number [1]: '));
  currentLang = code;
  config.lang = code;
  config.langChosen = true;
  saveConfig(config);
  const chosen = LANGUAGE_CHOICES.find((choice) => choice.code === code);
  log('INFO', t('languageSaved', { language: chosen ? chosen.label : code }));
  console.log('');
}

function onFirstAuthentication(config) {
  if (config.pendingUpdate && config.pendingUpdate.version === AGENT_VERSION) {
    delete config.pendingUpdate;
    saveConfig(config);
    safeUnlink(OLD_EXE);
    log('INFO', t('updateInstalled', { version: AGENT_VERSION }));
  }
}

// =====================================================================================
// Main
// =====================================================================================

async function main() {
  const args = process.argv.slice(2);

  // Dipakai tools/sign-release.js untuk memastikan .exe yang akan ditandatangani benar-benar versi
  // yang tertulis di manifest. Kalau keliru (mis. .exe 1.2.0 diberi label 1.2.1), agent akan
  // memasang "1.2.1" tiap malam, melihat dirinya masih 1.2.0, lalu mengunduhnya lagi — selamanya.
  if (args.includes('--version')) {
    process.stdout.write(`${AGENT_VERSION}\n`);
    return;
  }

  const afterIdx = args.indexOf('--after-update');
  if (afterIdx >= 0) await waitForExit(Number(args[afterIdx + 1]), 20000);

  const config = loadConfig();
  currentLang = normalizeLang(config.lang) || 'id';

  console.log('========================================');
  console.log(`        NEXBILL RELAY AGENT v${AGENT_VERSION}        `);
  console.log('========================================\n');

  const otherPid = acquireLock();
  if (otherPid) {
    log('WARN', t('alreadyRunning', { pid: otherPid }));
    setTimeout(() => process.exit(0), 10000);
    return;
  }
  process.on('exit', releaseLock);
  process.on('SIGINT', () => process.exit(0));
  // Galat tak terduga dicatat lalu agent TETAP berjalan. Tidak ada yang menyalakan ulang agent yang
  // mati selain login berikutnya — agent yang mati diam-diam jam 10 pagi berarti TV tidak bisa
  // dikontrol sampai besok.
  process.on('uncaughtException', (err) => log('ERROR', `Galat tak terduga: ${err && err.stack ? err.stack : err}`));
  process.on('unhandledRejection', (err) => log('ERROR', `Galat tak terduga: ${err && err.message ? err.message : err}`));

  if (handlePendingUpdateOnStartup(config)) return;

  if (args.includes('--lang') || (!config.lang && !config.token)) await chooseLanguage(config);

  if (!config.token) {
    config.token = await ask(t('askToken'));
    if (!config.token) {
      log('ERROR', t('tokenEmpty'));
      setTimeout(() => process.exit(1), 10000);
      return;
    }
  }
  if (!config.hubUrl) config.hubUrl = DEFAULT_HUB_URL;
  saveConfig(config);
  log('INFO', t('tokenSaved'));

  console.log('');
  console.log(t('tvSetupTitle'));
  console.log(t('tvSetup1'));
  console.log(t('tvSetup2'));
  console.log(t('tvSetup3'));
  console.log('');

  configureAutostart(config);
  if (IS_PKG && !updatesEnabled()) log('INFO', t('updateDisabled'));

  connect(config);

  if (updatesEnabled()) {
    setTimeout(() => checkForUpdate(config), UPDATE_FIRST_CHECK_MS);
    setInterval(() => checkForUpdate(config), UPDATE_CHECK_EVERY_MS);
    setInterval(() => tryApplyUpdate(config), UPDATE_APPLY_POLL_MS);
  }
}

if (require.main === module) {
  main().catch((err) => {
    log('ERROR', `Agent berhenti karena galat: ${err && err.stack ? err.stack : err}`);
    setTimeout(() => process.exit(1), 10000);
  });
}

module.exports = {
  AGENT_VERSION,
  SCREENSAVER_URL,
  UPDATE_BASE_URL,
  SUPPORTED_ACTIONS,
  isPrivateLanIPv4,
  validateAdbPort,
  validateHdmiPort,
  validateAndroidPackage,
  buildCommandPlan,
  parsePowerState,
  parseTvInfo,
  parseBrowsers,
  compareVersions,
  manifestMessage,
  verifyManifest,
  isInUpdateWindow,
  normalizeLang,
  parseLanguageChoice,
  LANGUAGE_CHOICES,
  MESSAGES,
};
