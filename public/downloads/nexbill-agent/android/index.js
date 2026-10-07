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
 *
 * YANG BARU DI v1.4 — KONTROL LOKAL SAAT INTERNET PUTUS (bagian "Kontrol Lokal" di bawah):
 *   Selama WiFi/router outlet masih menyala, TV Android (ADB) dan smart plug Tasmota tetap bisa
 *   dinyalakan/dimatikan walau internet putus: dari papan kasir Mode Offline NEXBILL (otomatis), dan
 *   dari halaman http://<ip-agent>:8737 (PIN 6 angka). Agent juga mematikan perangkat saat waktu
 *   sesi habis. Nonaktifkan dengan "localControl": false di config.json; ganti port dengan "localPort".
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { execFile, execFileSync, spawn } = require('child_process');
const http = require('http');
const os = require('os');

const AGENT_VERSION = '1.4.0';

// .exe Windows: dulu dibangun dengan `pkg` (process.pkg), sejak v1.4 sebagai Node Single Executable
// Application (node:sea). Keduanya diperlakukan sama: folder kerja = folder .exe, autostart & update aktif.
function isSingleExecutable() {
  try {
    return require('node:sea').isSea();
  } catch (err) {
    return false;
  }
}
const IS_PKG = !!process.pkg || isSingleExecutable();
// Saat dibangun jadi .exe, folder kerja = folder tempat .exe berada. Saat dijalankan lewat
// `node index.js` (pengujian), folder file ini. v1.1 selalu memakai folder process.execPath, yang
// saat dijalankan lewat node menunjuk ke folder instalasi Node — config.json tersimpan di sana.
const APP_DIR = IS_PKG ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = path.join(APP_DIR, 'config.json');
const LOCK_PATH = path.join(APP_DIR, 'agent.lock');
const LOG_PATH = path.join(APP_DIR, 'agent.log');
const LOCAL_ADB = path.join(APP_DIR, 'adb.exe');
// HP Android lewat Termux (lihat pos-rental-ps/public/downloads/nexbill-agent/android). Node di
// Termux melaporkan platform "android"; PREFIX dicek juga untuk build Node lain di Termux.
const IS_ANDROID = process.platform === 'android' || String(process.env.PREFIX || '').includes('com.termux');
const UPDATE_PLATFORM = IS_ANDROID ? 'android' : 'windows';
// Berkas yang diganti saat update: .exe di Windows, index.js di Android.
const SELF_FILE = IS_ANDROID ? __filename : process.execPath;
const OLD_EXE = IS_ANDROID ? path.join(APP_DIR, 'index.old.js') : path.join(APP_DIR, 'NexbillAgent.old.exe');
const NEW_EXE = IS_ANDROID ? path.join(APP_DIR, 'index.new.js') : path.join(APP_DIR, 'NexbillAgent.new.exe');
const BAD_EXE = IS_ANDROID ? path.join(APP_DIR, 'index.bad.js') : path.join(APP_DIR, 'NexbillAgent.bad.exe');
// Di Android agent dijalankan dalam putaran oleh perintah `nexbill` / Termux:Boot; keluar dengan
// kode ini = "jalankan saya lagi" (dipakai setelah update & pembatalan update).
const ANDROID_RESTART_EXIT_CODE = 75;

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
    localReady: 'Kontrol Lokal (dipakai saat internet putus): buka {url} dari HP/PC yang satu WiFi dengan outlet — PIN: {pin}',
    localOfflineNow: 'Internet ke server NEXBILL terputus — Kontrol Lokal tetap aktif di {url}. Waktu sesi dipantau agent ini dan perangkat dimatikan saat waktunya habis.',
    localAutoOff: 'Waktu sesi {unit} habis — perangkat dimatikan oleh Kontrol Lokal.',
    localCommand: 'Kontrol Lokal: {unit} → {state}',
    localFailed: 'Kontrol Lokal gagal untuk {unit}: {error}',
    localPortBusy: 'Kontrol Lokal tidak bisa dibuka: port {port} sudah dipakai program lain. Ubah "localPort" di config.json lalu jalankan ulang.',
    localNoConfig: 'Kontrol Lokal belum punya daftar unit — biarkan agent tersambung ke internet sebentar supaya daftar TV & smart plug terunduh.',
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
    localReady: 'Local Control (used when the internet is down): open {url} from a phone/PC on the outlet WiFi — PIN: {pin}',
    localOfflineNow: 'Internet connection to the NEXBILL server lost — Local Control stays available at {url}. This agent keeps tracking session time and turns devices off when time is up.',
    localAutoOff: 'Session time for {unit} is up — device turned off by Local Control.',
    localCommand: 'Local Control: {unit} → {state}',
    localFailed: 'Local Control failed for {unit}: {error}',
    localPortBusy: 'Local Control could not start: port {port} is used by another program. Change "localPort" in config.json and restart.',
    localNoConfig: 'Local Control has no unit list yet — keep the agent online for a moment so the TV & smart plug list can be downloaded.',
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
    localReady: 'Kawalan Setempat (digunakan apabila internet terputus): buka {url} dari telefon/PC pada WiFi outlet — PIN: {pin}',
    localOfflineNow: 'Sambungan internet ke pelayan NEXBILL terputus — Kawalan Setempat masih tersedia di {url}. Ejen ini terus memantau masa sesi dan mematikan peranti apabila masa tamat.',
    localAutoOff: 'Masa sesi {unit} tamat — peranti dimatikan oleh Kawalan Setempat.',
    localCommand: 'Kawalan Setempat: {unit} → {state}',
    localFailed: 'Kawalan Setempat gagal untuk {unit}: {error}',
    localPortBusy: 'Kawalan Setempat tidak dapat dibuka: port {port} digunakan oleh program lain. Tukar "localPort" dalam config.json dan mulakan semula.',
    localNoConfig: 'Kawalan Setempat belum mempunyai senarai unit — biarkan ejen dalam talian seketika supaya senarai TV & palam pintar dimuat turun.',
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
    localReady: 'การควบคุมภายใน (ใช้เมื่ออินเทอร์เน็ตหลุด): เปิด {url} จากมือถือ/PC ที่ใช้ WiFi เดียวกับร้าน — PIN: {pin}',
    localOfflineNow: 'การเชื่อมต่ออินเทอร์เน็ตไปยังเซิร์ฟเวอร์ NEXBILL ขาดหาย — การควบคุมภายในยังใช้งานได้ที่ {url} เอเจนต์นี้ยังคงจับเวลาเซสชันและปิดอุปกรณ์เมื่อหมดเวลา',
    localAutoOff: 'เวลาเซสชันของ {unit} หมดแล้ว — การควบคุมภายในปิดอุปกรณ์แล้ว',
    localCommand: 'การควบคุมภายใน: {unit} → {state}',
    localFailed: 'การควบคุมภายในล้มเหลวสำหรับ {unit}: {error}',
    localPortBusy: 'เปิดการควบคุมภายในไม่ได้: พอร์ต {port} ถูกโปรแกรมอื่นใช้อยู่ เปลี่ยน "localPort" ใน config.json แล้วเริ่มใหม่',
    localNoConfig: 'การควบคุมภายในยังไม่มีรายการยูนิต — ให้เอเจนต์ออนไลน์สักครู่เพื่อดาวน์โหลดรายการทีวีและปลั๊กอัจฉริยะ',
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
    localReady: 'Local Control (gamit kapag walang internet): buksan ang {url} mula sa phone/PC na nasa WiFi ng outlet — PIN: {pin}',
    localOfflineNow: 'Nawala ang koneksyon sa NEXBILL server — available pa rin ang Local Control sa {url}. Patuloy na binabantayan ng agent na ito ang oras ng session at pinapatay ang device kapag ubos na ang oras.',
    localAutoOff: 'Ubos na ang oras ng session sa {unit} — pinatay ng Local Control ang device.',
    localCommand: 'Local Control: {unit} → {state}',
    localFailed: 'Pumalya ang Local Control para sa {unit}: {error}',
    localPortBusy: 'Hindi mabuksan ang Local Control: ginagamit ng ibang program ang port {port}. Palitan ang "localPort" sa config.json at i-restart.',
    localNoConfig: 'Wala pang listahan ng unit ang Local Control — hayaang naka-online sandali ang agent para ma-download ang listahan ng TV at smart plug.',
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
    localReady: 'Điều khiển cục bộ (dùng khi mất internet): mở {url} từ điện thoại/PC dùng chung WiFi của cửa hàng — PIN: {pin}',
    localOfflineNow: 'Mất kết nối internet tới máy chủ NEXBILL — Điều khiển cục bộ vẫn hoạt động tại {url}. Agent này vẫn theo dõi thời gian phiên và tắt thiết bị khi hết giờ.',
    localAutoOff: 'Hết giờ phiên của {unit} — Điều khiển cục bộ đã tắt thiết bị.',
    localCommand: 'Điều khiển cục bộ: {unit} → {state}',
    localFailed: 'Điều khiển cục bộ thất bại cho {unit}: {error}',
    localPortBusy: 'Không mở được Điều khiển cục bộ: cổng {port} đang được chương trình khác dùng. Đổi "localPort" trong config.json rồi khởi động lại.',
    localNoConfig: 'Điều khiển cục bộ chưa có danh sách máy — để agent trực tuyến một lúc để tải danh sách TV và ổ cắm thông minh.',
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
/**
 * Alamat unduhan yang sah per platform. Windows: .exe langsung di folder unduhan. Android: .js di
 * subfolder android/. Alamat ikut ditandatangani, jadi manifest Windows tidak bisa dipakai di
 * Android (dan sebaliknya) walau tanda tangannya sah.
 */
function isAllowedUpdateUrl(url, platform) {
  if (typeof url !== 'string' || url.includes('..') || url.includes('?') || url.includes('#')) return false;
  if (platform === 'android') return url.startsWith(`${UPDATE_BASE_URL}android/`) && url.endsWith('.js');
  return url.startsWith(UPDATE_BASE_URL) && !url.startsWith(`${UPDATE_BASE_URL}android/`) && url.endsWith('.exe');
}

function verifyManifest(m, publicKeyB64, currentVersion, badVersions, platform) {
  if (!m || typeof m !== 'object') return { ok: false, reason: 'format manifest tidak dikenal' };
  if (typeof m.version !== 'string' || !VERSION_PATTERN.test(m.version)) return { ok: false, reason: 'nomor versi tidak valid' };
  if (!isAllowedUpdateUrl(m.url, platform || 'windows')) {
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

/** Menjalankan langkah-langkah dari buildCommandPlan. Dipakai perintah hub DAN Kontrol Lokal. */
async function runPlan(adb, serial, plan) {
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
  return outputs;
}

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
    const outputs = await runPlan(adb, serial, plan);

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
// Kontrol Lokal — TV & smart plug tetap bisa dikontrol saat INTERNET outlet putus (v1.4)
// =====================================================================================
//
// Rancangan lengkap: pos-rental-ps/src/lib/relay/local-control.ts. Ringkasnya:
//   - Selama online, hub mengirim `local_config` (unit → IP Android TV / IP lokal plug Tasmota, dan
//     sesi yang berjalan di server). Disimpan di config.json supaya tetap ada saat internet putus
//     atau setelah PC/HP dinyalakan ulang.
//   - Agent membuka server HTTP di LAN (port 8737): halaman Kontrol Lokal (login PIN 6 angka) dan
//     API untuk papan kasir Mode Offline NEXBILL (kunci panjang). PIN & kunci diturunkan dari token
//     agent dengan HMAC — rumusnya SAMA PERSIS dengan src/lib/relay/local-control-secrets.ts.
//   - Timer: sesi berdurasi tetap dimatikan agent ini saat waktunya habis. Timer sesi server hanya
//     ditegakkan selama hub TERPUTUS (saat online server sendiri yang mematikan perangkat); timer
//     sesi yang dimulai di Mode Offline ditegakkan selalu sampai server mengambil alih sesinya.
//   - Perintah ke perangkat hanya ke IP jaringan lokal yang lolos validator yang sama dengan
//     perintah hub. Plug Tasmota dikontrol lewat API HTTP bawaannya: /cm?cmnd=Power%20On.

const LOCAL_CONTROL_PORT = 8737;
const LOCAL_CONFIG_REFRESH_MS = 30 * 1000;
const LOCAL_TIMER_TICK_MS = 5 * 1000;
const LOCAL_RETRY_MS = 30 * 1000;
const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_MS = 10 * 60 * 1000;
const LOCAL_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOCAL_BODY_LIMIT = 4096;
const LOCAL_MAX_TIMER_MS = 24 * 60 * 60 * 1000;
const TASMOTA_TIMEOUT_MS = 4000;
const DEFAULT_ALLOWED_ORIGINS = ['https://nexbill.id', 'https://www.nexbill.id'];

/** Kunci API (40 heks) & PIN (6 angka) Kontrol Lokal dari token agent. Sama dengan deriveLocalSecrets di repo NEXBILL. */
function deriveLocalSecrets(token) {
  const key = crypto.createHmac('sha256', String(token)).update('nexbill-local-key-v1').digest('hex').slice(0, 40);
  const pinNum = crypto.createHmac('sha256', String(token)).update('nexbill-local-pin-v1').digest().readUInt32BE(0) % 1000000;
  return { key, pin: String(pinNum).padStart(6, '0') };
}

/** MURNI: local_config kiriman hub → bentuk yang aman disimpan, atau null. IP/port divalidasi ULANG di sini. */
function sanitizeLocalConfig(msg) {
  if (!msg || typeof msg !== 'object' || !Array.isArray(msg.units)) return null;
  const units = [];
  for (const u of msg.units.slice(0, 300)) {
    if (!u || typeof u.id !== 'string' || !u.id || u.id.length > 64 || typeof u.name !== 'string') continue;
    const d = u.device || {};
    const name = u.name.slice(0, 60);
    if (d.kind === 'android_tv' && isPrivateLanIPv4(d.ip)) {
      const port = validateAdbPort(d.port);
      if (port === null) continue;
      units.push({ id: u.id, name, device: { kind: 'android_tv', ip: d.ip.trim(), port, hdmiPort: validateHdmiPort(d.hdmiPort) } });
    } else if (d.kind === 'tasmota' && isPrivateLanIPv4(d.ip)) {
      units.push({ id: u.id, name, device: { kind: 'tasmota', ip: d.ip.trim() } });
    }
  }
  const sessions = [];
  for (const s of Array.isArray(msg.serverSessions) ? msg.serverSessions : []) {
    if (!s || typeof s.unitId !== 'string') continue;
    const end = s.endsAt === null || s.endsAt === undefined ? null : Date.parse(s.endsAt);
    if (end !== null && !Number.isFinite(end)) continue;
    sessions.push({ unitId: s.unitId, endsAt: end, paused: !!s.paused });
  }
  const allowedOrigins = (Array.isArray(msg.allowedOrigins) ? msg.allowedOrigins : [])
    .filter((o) => typeof o === 'string' && /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(o))
    .slice(0, 10);
  return { outletName: typeof msg.outletName === 'string' ? msg.outletName.slice(0, 80) : 'NEXBILL', units, sessions, allowedOrigins };
}

/**
 * MURNI: timer lokal digabung dengan sesi yang diketahui server.
 * timers: { [unitId]: { until: number|null, source: 'server'|'local' } }
 *   - unit dengan sesi server → mengikuti server (null = main bebas / dijeda);
 *   - timer 'server' yang sesinya sudah tidak ada di server → dihapus (server sudah menghentikannya);
 *   - timer 'local' (sesi Mode Offline yang belum tersinkron) → dipertahankan.
 */
function mergeServerSessions(timers, sessions, unitIds) {
  const next = {};
  const byUnit = new Map(sessions.map((s) => [s.unitId, s]));
  for (const id of unitIds) {
    const s = byUnit.get(id);
    const cur = timers && timers[id];
    if (s) next[id] = { until: s.paused ? null : s.endsAt, source: 'server' };
    else if (cur && cur.source === 'local') next[id] = cur;
  }
  return next;
}

/** MURNI: unit yang waktunya habis dan harus dimatikan sekarang. */
function dueTimers(timers, nowMs, hubConnected) {
  return Object.keys(timers || {}).filter((id) => {
    const tm = timers[id];
    if (!tm || typeof tm.until !== 'number' || nowMs < tm.until) return false;
    return tm.source === 'local' || !hubConnected;
  });
}

/** MURNI: status daya dari balasan JSON Tasmota ({"POWER":"ON"} atau {"POWER1":"OFF"}). */
function parseTasmotaPower(body) {
  try {
    const j = JSON.parse(String(body || ''));
    const v = j && (j.POWER !== undefined ? j.POWER : j.POWER1);
    if (typeof v === 'string') return v.toUpperCase() === 'ON' ? 'on' : 'off';
  } catch (err) {
    /* bukan JSON */
  }
  return 'unknown';
}

/** MURNI: perubahan yang diminta (body POST /api/units/:id), atau { error }. */
function parseUnitCommand(body, nowMs) {
  if (!body || typeof body !== 'object') return { error: 'Body tidak valid.' };
  const out = {};
  if (body.power !== undefined) {
    if (body.power !== 'on' && body.power !== 'off') return { error: 'power harus "on" atau "off".' };
    out.power = body.power;
  }
  // Sisa waktu RELATIF (ms), bukan jam absolut: jam HP kasir, jam server, dan jam PC agent bisa
  // berbeda beberapa menit — "sisa 45 menit" berarti sama di ketiganya. null = tanpa batas waktu.
  if (body.remainingMs !== undefined) {
    if (body.remainingMs === null) out.until = null;
    else if (typeof body.remainingMs === 'number' && Number.isFinite(body.remainingMs) && body.remainingMs > -60 * 60 * 1000 && body.remainingMs < LOCAL_MAX_TIMER_MS) out.until = nowMs + Math.round(body.remainingMs);
    else return { error: 'remainingMs tidak valid.' };
  }
  if (out.power === undefined && out.until === undefined) return { error: 'Tidak ada perubahan.' };
  return out;
}

function lanAddresses() {
  const found = [];
  try {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const a of ifaces[name] || []) {
        if (a && (a.family === 'IPv4' || a.family === 4) && !a.internal && isPrivateLanIPv4(a.address) && !found.includes(a.address)) found.push(a.address);
      }
    }
  } catch (err) {
    /* Android tanpa izin membaca antarmuka jaringan — alamat tidak dilaporkan, halaman tetap jalan */
  }
  return found.slice(0, 8);
}

const localRuntime = {
  enabled: false,
  port: LOCAL_CONTROL_PORT,
  secrets: null,
  hubConnected: false,
  offlineNoticeShown: false,
  sessions: new Map(), // token halaman → kedaluwarsa (ms)
  fails: new Map(), // IP → { count, lockedUntil }
  power: {}, // unitId → 'on' | 'off' | 'unknown'
  lastAttempt: {}, // unitId → ms percobaan mematikan terakhir oleh timer
  queues: {}, // unitId → Promise (perintah per unit dijalankan berurutan)
};

function localUnits(config) {
  return (config.local && Array.isArray(config.local.units) && config.local.units) || [];
}

function localTimers(config) {
  if (!config.localTimers || typeof config.localTimers !== 'object') config.localTimers = {};
  return config.localTimers;
}

function localUrl(address) {
  return `http://${address}:${localRuntime.port}`;
}

/** Menyimpan config hanya bila bagian Kontrol Lokal benar-benar berubah (local_config datang tiap 30 detik). */
function saveLocalState(config, before) {
  const after = JSON.stringify([config.local, config.localTimers]);
  if (after !== before) saveConfig(config);
}

function applyLocalConfig(config, msg) {
  const clean = sanitizeLocalConfig(msg);
  if (!clean) return;
  const before = JSON.stringify([config.local, config.localTimers]);
  config.local = { outletName: clean.outletName, units: clean.units, allowedOrigins: clean.allowedOrigins };
  config.localTimers = mergeServerSessions(localTimers(config), clean.sessions, clean.units.map((u) => u.id));
  for (const s of clean.sessions) if (localRuntime.power[s.unitId] === undefined) localRuntime.power[s.unitId] = 'on';
  saveLocalState(config, before);
}

function tasmotaCommand(config, ip, cmnd) {
  let url = `http://${ip}/cm?cmnd=${encodeURIComponent(cmnd)}`;
  // Plug yang diberi "Web Admin Password" di Tasmota: isi "tasmotaPassword" di config.json agent.
  if (typeof config.tasmotaPassword === 'string' && config.tasmotaPassword) url += `&user=admin&password=${encodeURIComponent(config.tasmotaPassword)}`;
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: TASMOTA_TIMEOUT_MS }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => {
        if (body.length < 8192) body += c;
      });
      res.on('end', () => {
        if (res.statusCode === 401) reject(new Error(`Smart plug ${ip} meminta password — isi "tasmotaPassword" di config.json agent.`));
        else if (res.statusCode !== 200) reject(new Error(`Smart plug ${ip} membalas HTTP ${res.statusCode}.`));
        else resolve(body);
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Smart plug ${ip} tidak merespon. Pastikan plug menyala dan satu WiFi dengan agent ini.`)));
    req.on('error', (err) => reject(err));
  });
}

async function setUnitPower(config, unit, on) {
  const d = unit.device;
  if (d.kind === 'tasmota') {
    const state = parseTasmotaPower(await tasmotaCommand(config, d.ip, on ? 'Power On' : 'Power Off'));
    if (state === 'unknown') throw new Error(`Smart plug ${d.ip} tidak membalas status daya.`);
    return state;
  }
  // Menyala: bangunkan TV lalu pindah ke HDMI konsol (bila otomatisasi HDMI unit ini aktif di NEXBILL).
  // Mati: TV ditidurkan — screensaver NEXBILL butuh internet, jadi tidak dibuka saat offline.
  const plan = on ? (d.hdmiPort ? buildCommandPlan('switchHdmi', { hdmiPort: d.hdmiPort }) : buildCommandPlan('turnOn')) : buildCommandPlan('turnOff');
  activeCommands++;
  try {
    await runPlan(adbExecutable(config), `${d.ip}:${d.port}`, plan);
  } finally {
    activeCommands--;
  }
  return on ? 'on' : 'off';
}

async function readUnitPower(config, unit) {
  const d = unit.device;
  if (d.kind === 'tasmota') return parseTasmotaPower(await tasmotaCommand(config, d.ip, 'Power'));
  const outputs = await runPlan(adbExecutable(config), `${d.ip}:${d.port}`, buildCommandPlan('getState'));
  return parsePowerState(outputs[0].stdout);
}

/** Perintah untuk satu unit dijalankan berurutan — "nyalakan" lalu "matikan" yang ditekan cepat tidak boleh tertukar. */
function serialized(unitId, fn) {
  const prev = localRuntime.queues[unitId] || Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  localRuntime.queues[unitId] = next.catch(() => undefined);
  return next;
}

function unitView(config, unit) {
  const tm = localTimers(config)[unit.id];
  return {
    id: unit.id,
    name: unit.name,
    kind: unit.device.kind,
    power: localRuntime.power[unit.id] || 'unknown',
    until: tm && typeof tm.until === 'number' ? tm.until : null,
    remainingMs: tm && typeof tm.until === 'number' ? tm.until - Date.now() : null,
    session: !!tm,
  };
}

async function applyUnitCommand(config, unitId, cmd) {
  const unit = localUnits(config).find((u) => u.id === unitId);
  if (!unit) {
    const err = new Error('Unit tidak dikenal agent ini.');
    err.statusCode = 404;
    throw err;
  }
  return serialized(unitId, async () => {
    const timers = localTimers(config);
    if (cmd.until !== undefined) timers[unitId] = { until: cmd.until, source: 'local' };
    if (cmd.power === 'off') delete timers[unitId];
    saveConfig(config);
    if (cmd.power) {
      try {
        localRuntime.power[unitId] = await setUnitPower(config, unit, cmd.power === 'on');
        log('INFO', t('localCommand', { unit: unit.name, state: cmd.power.toUpperCase() }));
      } catch (err) {
        log('WARN', t('localFailed', { unit: unit.name, error: (err && err.message) || err }));
        throw err;
      }
    }
    return unitView(config, unit);
  });
}

async function runLocalTimers(config) {
  const timers = localTimers(config);
  const now = Date.now();
  for (const unitId of dueTimers(timers, now, localRuntime.hubConnected)) {
    const unit = localUnits(config).find((u) => u.id === unitId);
    if (!unit) {
      delete timers[unitId];
      saveConfig(config);
      continue;
    }
    if (localRuntime.lastAttempt[unitId] && now - localRuntime.lastAttempt[unitId] < LOCAL_RETRY_MS) continue;
    localRuntime.lastAttempt[unitId] = now;
    try {
      await serialized(unitId, async () => {
        const cur = localTimers(config)[unitId];
        if (!cur || typeof cur.until !== 'number' || Date.now() < cur.until) return; // diperpanjang saat menunggu antrean
        localRuntime.power[unitId] = await setUnitPower(config, unit, false);
        delete localTimers(config)[unitId];
        saveConfig(config);
        log('INFO', t('localAutoOff', { unit: unit.name }));
      });
    } catch (err) {
      log('WARN', t('localFailed', { unit: unit.name, error: (err && err.message) || err }));
    }
  }
}

function allowedOrigins(config) {
  const fromHub = (config.local && Array.isArray(config.local.allowedOrigins) && config.local.allowedOrigins) || [];
  return DEFAULT_ALLOWED_ORIGINS.concat(fromHub);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (c) => {
      body += c;
      if (body.length > LOCAL_BODY_LIMIT) {
        reject(new Error('Body terlalu besar.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Body bukan JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  const key = req.headers['x-nexbill-key'];
  if (key && localRuntime.secrets && safeEqual(key, localRuntime.secrets.key)) return true;
  const m = String(req.headers.authorization || '').match(/^Bearer ([a-f0-9]{48})$/);
  if (!m) return false;
  const exp = localRuntime.sessions.get(m[1]);
  if (!exp) return false;
  if (Date.now() > exp) {
    localRuntime.sessions.delete(m[1]);
    return false;
  }
  return true;
}

async function handleLocalRequest(req, res, config) {
  const url = new URL(req.url || '/', 'http://local');
  const origin = req.headers.origin;
  const sameOrigin = origin && origin === `http://${req.headers.host}`;
  const corsOk = origin && allowedOrigins(config).includes(origin);
  if (corsOk) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    if (!corsOk) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-nexbill-key, authorization',
      // Chrome (Private/Local Network Access): halaman https NEXBILL memanggil agent di jaringan lokal.
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '600',
    });
    return res.end();
  }
  // Situs lain di browser kasir tidak boleh menyuruh agent menyalakan TV.
  if (origin && !sameOrigin && !corsOk) return sendJson(res, 403, { error: 'Origin tidak diizinkan.' });

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    });
    return res.end(localPageHtml(currentLang));
  }

  if (req.method === 'GET' && url.pathname === '/api/info') {
    return sendJson(res, 200, {
      agent: 'nexbill-agent',
      version: AGENT_VERSION,
      outletName: (config.local && config.local.outletName) || null,
      hubConnected: localRuntime.hubConnected,
      units: localUnits(config).length,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const ip = req.socket.remoteAddress || '?';
    const f = localRuntime.fails.get(ip) || { count: 0, lockedUntil: 0 };
    if (f.lockedUntil > Date.now()) return sendJson(res, 429, { error: 'locked', retryInMs: f.lockedUntil - Date.now() });
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
    if (!localRuntime.secrets || !safeEqual(String(body.pin || '').trim(), localRuntime.secrets.pin)) {
      f.count += 1;
      if (f.count >= LOGIN_MAX_FAILS) {
        f.count = 0;
        f.lockedUntil = Date.now() + LOGIN_LOCK_MS;
      }
      localRuntime.fails.set(ip, f);
      return sendJson(res, 401, { error: 'wrong_pin' });
    }
    localRuntime.fails.delete(ip);
    const token = crypto.randomBytes(24).toString('hex');
    localRuntime.sessions.set(token, Date.now() + LOCAL_SESSION_TTL_MS);
    return sendJson(res, 200, { token });
  }

  if (!url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Tidak ditemukan.' });
  if (!isAuthorized(req)) return sendJson(res, 401, { error: 'unauthorized' });

  if (req.method === 'GET' && url.pathname === '/api/units') {
    return sendJson(res, 200, {
      outletName: (config.local && config.local.outletName) || null,
      hubConnected: localRuntime.hubConnected,
      now: Date.now(),
      units: localUnits(config).map((u) => unitView(config, u)),
    });
  }

  const m = url.pathname.match(/^\/api\/units\/([A-Za-z0-9_-]{1,64})(\/refresh)?$/);
  if (req.method === 'POST' && m) {
    const unitId = m[1];
    try {
      if (m[2]) {
        const unit = localUnits(config).find((u) => u.id === unitId);
        if (!unit) return sendJson(res, 404, { error: 'Unit tidak dikenal agent ini.' });
        localRuntime.power[unitId] = await serialized(unitId, () => readUnitPower(config, unit));
        return sendJson(res, 200, unitView(config, unit));
      }
      let body;
      try {
        body = await readBody(req);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
      const cmd = parseUnitCommand(body, Date.now());
      if (cmd.error) return sendJson(res, 400, { error: cmd.error });
      return sendJson(res, 200, await applyUnitCommand(config, unitId, cmd));
    } catch (err) {
      return sendJson(res, err && err.statusCode ? err.statusCode : 502, { error: (err && err.message) || 'Perintah gagal.' });
    }
  }
  return sendJson(res, 404, { error: 'Tidak ditemukan.' });
}

function startLocalControl(config) {
  if (config.localControl === false || !config.token) return;
  const port = Number.isInteger(config.localPort) && config.localPort > 0 && config.localPort <= 65535 ? config.localPort : LOCAL_CONTROL_PORT;
  localRuntime.port = port;
  localRuntime.secrets = deriveLocalSecrets(config.token);
  localRuntime.enabled = true;
  const server = http.createServer((req, res) => {
    handleLocalRequest(req, res, config).catch((err) => {
      try {
        sendJson(res, 500, { error: (err && err.message) || 'Galat.' });
      } catch (e) {
        /* respons sudah terkirim */
      }
    });
  });
  server.on('error', (err) => {
    localRuntime.enabled = false;
    if (err && err.code === 'EADDRINUSE') log('ERROR', t('localPortBusy', { port }));
    else log('ERROR', `Kontrol Lokal: ${err && err.message ? err.message : err}`);
  });
  server.listen(port, '0.0.0.0', () => {
    const addrs = lanAddresses();
    log('INFO', t('localReady', { url: addrs.length ? addrs.map(localUrl).join(' / ') : localUrl('127.0.0.1'), pin: localRuntime.secrets.pin }));
    if (localUnits(config).length === 0) log('INFO', t('localNoConfig'));
  });
  setInterval(() => {
    runLocalTimers(config).catch((err) => log('WARN', `Timer Kontrol Lokal: ${err && err.message ? err.message : err}`));
  }, LOCAL_TIMER_TICK_MS);
}

const LOCAL_PAGE_TEXT = {
  id: {
    title: 'Kontrol Lokal', subtitle: 'Nyalakan/matikan TV & smart plug saat internet outlet putus.', pin: 'PIN Kontrol Lokal',
    pinHint: 'PIN 6 angka tertulis di jendela NexbillAgent dan di NEXBILL → Kontrol Perangkat.', login: 'Masuk', wrongPin: 'PIN salah.',
    locked: 'Terlalu banyak percobaan. Coba lagi dalam {min} menit.', online: 'Internet tersambung — pakai NEXBILL seperti biasa; halaman ini cadangan.',
    offline: 'Internet terputus — mode lokal aktif. Waktu sesi tetap dipantau agent.', on: 'Nyala', off: 'Mati', unknown: 'Belum diketahui',
    turnOn: 'Nyalakan', turnOff: 'Matikan', withTimer: 'Nyalakan + timer', minutes: '{n} mnt', remaining: 'Sisa {time}', check: 'Cek status',
    tv: 'Android TV', plug: 'Smart plug', empty: 'Belum ada unit. Biarkan agent tersambung ke internet sebentar supaya daftar TV & smart plug terunduh.',
    failed: 'Gagal: {error}', logout: 'Keluar', note: 'Tetap catat sesi & pembayaran di NEXBILL (Kasir Rental → Mode Offline) supaya tagihan tercatat.',
    confirmOff: 'Matikan {unit}?', agentUnreachable: 'Agent tidak terjangkau. Pastikan HP/PC ini tersambung ke WiFi outlet.',
  },
  en: {
    title: 'Local Control', subtitle: 'Turn TVs & smart plugs on/off while the outlet internet is down.', pin: 'Local Control PIN',
    pinHint: 'The 6-digit PIN is shown in the NexbillAgent window and in NEXBILL → Device Control.', login: 'Sign in', wrongPin: 'Wrong PIN.',
    locked: 'Too many attempts. Try again in {min} minutes.', online: 'Internet connected — use NEXBILL as usual; this page is a backup.',
    offline: 'Internet down — local mode is on. The agent keeps tracking session time.', on: 'On', off: 'Off', unknown: 'Unknown',
    turnOn: 'Turn on', turnOff: 'Turn off', withTimer: 'Turn on + timer', minutes: '{n} min', remaining: '{time} left', check: 'Check status',
    tv: 'Android TV', plug: 'Smart plug', empty: 'No units yet. Keep the agent online for a moment so the TV & smart plug list can be downloaded.',
    failed: 'Failed: {error}', logout: 'Sign out', note: 'Still record sessions & payments in NEXBILL (Rental Cashier → Offline Mode) so the bill is kept.',
    confirmOff: 'Turn off {unit}?', agentUnreachable: 'The agent cannot be reached. Make sure this phone/PC is on the outlet WiFi.',
  },
  ms: {
    title: 'Kawalan Setempat', subtitle: 'Hidupkan/matikan TV & palam pintar semasa internet outlet terputus.', pin: 'PIN Kawalan Setempat',
    pinHint: 'PIN 6 digit dipaparkan dalam tetingkap NexbillAgent dan dalam NEXBILL → Kawalan Peranti.', login: 'Log masuk', wrongPin: 'PIN salah.',
    locked: 'Terlalu banyak cubaan. Cuba lagi dalam {min} minit.', online: 'Internet bersambung — guna NEXBILL seperti biasa; halaman ini sandaran.',
    offline: 'Internet terputus — mod setempat aktif. Ejen terus memantau masa sesi.', on: 'Hidup', off: 'Mati', unknown: 'Tidak diketahui',
    turnOn: 'Hidupkan', turnOff: 'Matikan', withTimer: 'Hidupkan + pemasa', minutes: '{n} min', remaining: 'Baki {time}', check: 'Semak status',
    tv: 'Android TV', plug: 'Palam pintar', empty: 'Belum ada unit. Biarkan ejen dalam talian seketika supaya senarai TV & palam pintar dimuat turun.',
    failed: 'Gagal: {error}', logout: 'Log keluar', note: 'Tetap rekod sesi & bayaran dalam NEXBILL (Juruwang Sewaan → Mod Luar Talian) supaya bil direkodkan.',
    confirmOff: 'Matikan {unit}?', agentUnreachable: 'Ejen tidak dapat dicapai. Pastikan telefon/PC ini bersambung ke WiFi outlet.',
  },
  th: {
    title: 'การควบคุมภายใน', subtitle: 'เปิด/ปิดทีวีและปลั๊กอัจฉริยะขณะอินเทอร์เน็ตของร้านหลุด', pin: 'PIN การควบคุมภายใน',
    pinHint: 'PIN 6 หลักแสดงอยู่ในหน้าต่าง NexbillAgent และใน NEXBILL → ควบคุมอุปกรณ์', login: 'เข้าสู่ระบบ', wrongPin: 'PIN ไม่ถูกต้อง',
    locked: 'ลองผิดหลายครั้งเกินไป ลองใหม่ใน {min} นาที', online: 'อินเทอร์เน็ตเชื่อมต่ออยู่ — ใช้ NEXBILL ตามปกติ หน้านี้เป็นสำรอง',
    offline: 'อินเทอร์เน็ตหลุด — เปิดโหมดภายในแล้ว เอเจนต์ยังจับเวลาเซสชันอยู่', on: 'เปิด', off: 'ปิด', unknown: 'ไม่ทราบ',
    turnOn: 'เปิด', turnOff: 'ปิด', withTimer: 'เปิด + ตั้งเวลา', minutes: '{n} นาที', remaining: 'เหลือ {time}', check: 'ตรวจสถานะ',
    tv: 'Android TV', plug: 'ปลั๊กอัจฉริยะ', empty: 'ยังไม่มียูนิต ให้เอเจนต์ออนไลน์สักครู่เพื่อดาวน์โหลดรายการทีวีและปลั๊กอัจฉริยะ',
    failed: 'ล้มเหลว: {error}', logout: 'ออกจากระบบ', note: 'ยังคงบันทึกเซสชันและการชำระเงินใน NEXBILL (แคชเชียร์เช่า → โหมดออฟไลน์) เพื่อให้บิลถูกบันทึก',
    confirmOff: 'ปิด {unit}?', agentUnreachable: 'ติดต่อเอเจนต์ไม่ได้ ตรวจสอบว่ามือถือ/PC นี้เชื่อมต่อ WiFi ของร้าน',
  },
  fil: {
    title: 'Local Control', subtitle: 'I-on/i-off ang TV at smart plug habang walang internet ang outlet.', pin: 'PIN ng Local Control',
    pinHint: 'Makikita ang 6-digit na PIN sa window ng NexbillAgent at sa NEXBILL → Device Control.', login: 'Mag-sign in', wrongPin: 'Maling PIN.',
    locked: 'Masyadong maraming subok. Subukan ulit pagkalipas ng {min} minuto.', online: 'May internet — gamitin ang NEXBILL gaya ng dati; backup lang ang page na ito.',
    offline: 'Walang internet — naka-on ang local mode. Patuloy na binabantayan ng agent ang oras ng session.', on: 'On', off: 'Off', unknown: 'Hindi alam',
    turnOn: 'I-on', turnOff: 'I-off', withTimer: 'I-on + timer', minutes: '{n} min', remaining: '{time} na lang', check: 'Tingnan ang status',
    tv: 'Android TV', plug: 'Smart plug', empty: 'Wala pang unit. Hayaang naka-online sandali ang agent para ma-download ang listahan ng TV at smart plug.',
    failed: 'Pumalya: {error}', logout: 'Mag-sign out', note: 'Itala pa rin ang session at bayad sa NEXBILL (Rental Cashier → Offline Mode) para maitala ang bill.',
    confirmOff: 'I-off ang {unit}?', agentUnreachable: 'Hindi maabot ang agent. Siguraduhing nakakonekta ang phone/PC na ito sa WiFi ng outlet.',
  },
  vi: {
    title: 'Điều khiển cục bộ', subtitle: 'Bật/tắt TV và ổ cắm thông minh khi cửa hàng mất internet.', pin: 'PIN điều khiển cục bộ',
    pinHint: 'Mã PIN 6 số hiển thị trong cửa sổ NexbillAgent và trong NEXBILL → Điều khiển thiết bị.', login: 'Đăng nhập', wrongPin: 'Sai PIN.',
    locked: 'Thử quá nhiều lần. Thử lại sau {min} phút.', online: 'Đã có internet — dùng NEXBILL như bình thường; trang này là dự phòng.',
    offline: 'Mất internet — chế độ cục bộ đang bật. Agent vẫn theo dõi thời gian phiên.', on: 'Bật', off: 'Tắt', unknown: 'Chưa rõ',
    turnOn: 'Bật', turnOff: 'Tắt', withTimer: 'Bật + hẹn giờ', minutes: '{n} phút', remaining: 'Còn {time}', check: 'Kiểm tra',
    tv: 'Android TV', plug: 'Ổ cắm thông minh', empty: 'Chưa có máy nào. Để agent trực tuyến một lúc để tải danh sách TV và ổ cắm thông minh.',
    failed: 'Thất bại: {error}', logout: 'Đăng xuất', note: 'Vẫn ghi phiên và thanh toán trong NEXBILL (Thu ngân cho thuê → Chế độ ngoại tuyến) để hóa đơn được lưu.',
    confirmOff: 'Tắt {unit}?', agentUnreachable: 'Không kết nối được agent. Hãy chắc chắn điện thoại/PC này dùng WiFi của cửa hàng.',
  },
};

/** Halaman Kontrol Lokal (satu file, tanpa sumber luar — harus jalan tanpa internet). */
function localPageHtml(lang) {
  const text = LOCAL_PAGE_TEXT[lang] || LOCAL_PAGE_TEXT.id;
  const json = JSON.stringify(text).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="${lang === 'vi' ? 'vi' : lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>NEXBILL — ${text.title.replace(/[<&]/g, '')}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0f17;color:#e5e7eb}
main{max-width:960px;margin:0 auto;padding:16px}h1{font-size:20px;margin:0}p{margin:4px 0;color:#9ca3af;font-size:13px}
.bar{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:12px}
.status{border-radius:10px;padding:8px 12px;font-size:13px;margin:12px 0}.ok{background:#064e3b55;border:1px solid #10b98155;color:#a7f3d0}
.down{background:#78350f55;border:1px solid #f59e0b66;color:#fde68a}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.card{background:#111827;border:1px solid #1f2937;border-radius:12px;padding:12px}.name{font-weight:600}.kind{font-size:12px;color:#9ca3af}
.pw{display:inline-block;font-size:12px;border-radius:999px;padding:2px 8px;margin-top:6px}.pw.on{background:#065f46;color:#d1fae5}.pw.off{background:#374151;color:#d1d5db}.pw.unknown{background:#1f2937;color:#9ca3af}
.row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}button,select,input{font:inherit;border-radius:8px;border:1px solid #374151;background:#1f2937;color:#e5e7eb;padding:8px 10px}
button{cursor:pointer}button.primary{background:#059669;border-color:#059669;color:#fff}button.danger{background:#7f1d1d;border-color:#991b1b}button:disabled{opacity:.5}
.err{color:#fca5a5;font-size:12px;margin-top:6px}.timer{font-size:12px;color:#fcd34d;margin-top:4px}form{max-width:320px;margin:40px auto;display:grid;gap:8px}
input{font-size:22px;letter-spacing:6px;text-align:center}.note{font-size:12px;color:#9ca3af;margin-top:16px}
</style></head><body><main id="app"></main>
<script>
const T=${json};
const tr=(k,v)=>String(T[k]||k).replace(/\\{(\\w+)\\}/g,(m,n)=>v&&v[n]!==undefined?v[n]:m);
let token=null;try{token=localStorage.getItem('nexbill-local-token')}catch(e){}
let data=null,busy={},errors={},sel={},skew=0,loginError='';
const app=document.getElementById('app');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));if(r.status===401&&path!=='/api/login'){logout();throw new Error('unauthorized')}if(!r.ok){const e=new Error(j.error||('HTTP '+r.status));e.body=j;e.status=r.status;throw e}return j}
function logout(){token=null;try{localStorage.removeItem('nexbill-local-token')}catch(e){}data=null;render()}
function fmt(ms){const s=Math.max(0,Math.round(ms/1000));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')}
function render(){
 if(!token){app.innerHTML='<form id="f"><h1>'+esc(T.title)+'</h1><p>'+esc(T.subtitle)+'</p><label>'+esc(T.pin)+'</label><input id="pin" inputmode="numeric" maxlength="6" autocomplete="off"><button class="primary">'+esc(T.login)+'</button><div class="err">'+esc(loginError)+'</div><p>'+esc(T.pinHint)+'</p></form>';
  document.getElementById('f').onsubmit=async e=>{e.preventDefault();try{const j=await api('/api/login',{pin:document.getElementById('pin').value});token=j.token;try{localStorage.setItem('nexbill-local-token',token)}catch(e){}loginError='';load()}catch(err){loginError=err.status===429?tr('locked',{min:Math.ceil((err.body.retryInMs||600000)/60000)}):err.status===401?T.wrongPin:T.agentUnreachable;render()}};return}
 if(!data){app.innerHTML='<p>…</p>';return}
 const now=Date.now()+skew;
 let h='<div class="bar"><div><h1>'+esc(T.title)+'</h1><p>'+esc(data.outletName||'')+'</p></div><button id="lo">'+esc(T.logout)+'</button></div>';
 h+='<div class="status '+(data.hubConnected?'ok':'down')+'">'+esc(data.hubConnected?T.online:T.offline)+'</div>';
 if(!data.units.length)h+='<p>'+esc(T.empty)+'</p>';
 h+='<div class="grid">';for(const u of data.units){const b=!!busy[u.id];
  h+='<div class="card"><div class="name">'+esc(u.name)+'</div><div class="kind">'+esc(u.kind==='tasmota'?T.plug:T.tv)+'</div><span class="pw '+u.power+'">'+esc(T[u.power]||T.unknown)+'</span>';
  if(u.until)h+='<div class="timer" data-until="'+u.until+'">'+esc(tr('remaining',{time:fmt(u.until-now)}))+'</div>';
  h+='<div class="row"><button class="primary" data-a="on" data-u="'+esc(u.id)+'" '+(b?'disabled':'')+'>'+esc(T.turnOn)+'</button><button class="danger" data-a="off" data-u="'+esc(u.id)+'" '+(b?'disabled':'')+'>'+esc(T.turnOff)+'</button></div>';
  h+='<div class="row"><select data-s="'+esc(u.id)+'">'+[30,60,90,120,180].map(n=>'<option value="'+n+'"'+(Number(sel[u.id]||60)===n?' selected':'')+'>'+esc(tr('minutes',{n}))+'</option>').join('')+'</select><button data-a="timer" data-u="'+esc(u.id)+'" '+(b?'disabled':'')+'>'+esc(T.withTimer)+'</button><button data-a="check" data-u="'+esc(u.id)+'" '+(b?'disabled':'')+'>'+esc(T.check)+'</button></div>';
  if(errors[u.id])h+='<div class="err">'+esc(tr('failed',{error:errors[u.id]}))+'</div>';h+='</div>'}
 h+='</div><p class="note">'+esc(T.note)+'</p>';app.innerHTML=h;
 document.getElementById('lo').onclick=logout;
 app.querySelectorAll('button[data-a]').forEach(btn=>btn.onclick=()=>act(btn.dataset.a,btn.dataset.u));
 app.querySelectorAll('select[data-s]').forEach(s=>s.onchange=()=>{sel[s.dataset.s]=s.value});
}
async function act(a,id){const u=data.units.find(x=>x.id===id);if(!u)return;
 if(a==='off'&&!confirm(tr('confirmOff',{unit:u.name})))return;
 busy[id]=true;errors[id]='';render();
 try{let r;if(a==='check')r=await api('/api/units/'+id+'/refresh',{});
  else if(a==='timer'){const n=Number(app.querySelector('select[data-s="'+id+'"]').value);r=await api('/api/units/'+id,{power:'on',remainingMs:n*60000})}
  else r=await api('/api/units/'+id,{power:a});Object.assign(u,r)}catch(err){errors[id]=err.message}
 busy[id]=false;render()}
async function load(){if(!token)return render();try{const j=await api('/api/units');skew=j.now-Date.now();data=j}catch(e){if(e.message!=='unauthorized'&&!data)app.innerHTML='<p class="err">'+esc(T.agentUnreachable)+'</p>'}if(data&&!(document.activeElement&&document.activeElement.tagName==='SELECT'))render()}
render();load();setInterval(load,5000);setInterval(()=>{const now=Date.now()+skew;app.querySelectorAll('.timer[data-until]').forEach(el=>{el.textContent=tr('remaining',{time:fmt(Number(el.dataset.until)-now)})})},1000);
</script></body></html>`;
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
  if (!UPDATE_PUBLIC_KEY_B64) return false;
  return (IS_PKG && process.platform === 'win32') || IS_ANDROID;
}

/**
 * Menyalakan ulang agent setelah update / pembatalan. Windows: jalankan .exe baru di jendela baru.
 * Android: keluar dengan kode khusus — putaran di perintah `nexbill` / Termux:Boot menjalankannya lagi.
 */
function restartAgent(args) {
  if (IS_ANDROID) {
    setTimeout(() => process.exit(ANDROID_RESTART_EXIT_CODE), 500);
    return;
  }
  relaunch(args);
  setTimeout(() => process.exit(0), 500);
}

function capabilities() {
  const caps = ['power', 'open_screensaver', 'switch_hdmi', 'tv_info'];
  if (updatesEnabled()) caps.push('self_update');
  if (localRuntime.enabled) caps.push('local_control');
  return caps;
}

function connect(config) {
  // Dimuat di sini, bukan di atas file, supaya tools/selftest.js bisa memuat file ini untuk menguji
  // fungsi-fungsi murninya tanpa membutuhkan modul jaringan.
  const WebSocket = require('ws');
  // ws:// hanya untuk hub di komputer ini sendiri (pengujian/pengembangan); selain itu wajib wss://.
  const hubUrl =
    typeof config.hubUrl === 'string' && (config.hubUrl.startsWith('wss://') || /^ws:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(config.hubUrl))
      ? config.hubUrl
      : DEFAULT_HUB_URL;
  log('INFO', t('connecting', { url: hubUrl }));

  const ws = new WebSocket(hubUrl);
  let heartbeat = null;
  let localRefresh = null;
  const send = (msg) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  ws.on('open', () => {
    wsOpenedOnce = true;
    send({
      type: 'auth',
      token: config.token,
      agentVersion: AGENT_VERSION,
      capabilities: capabilities(),
      os: `${process.platform}-${process.arch}`,
      ...(localRuntime.enabled ? { local: { addresses: lanAddresses(), port: localRuntime.port } } : {}),
    });
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
      localRuntime.hubConnected = true;
      localRuntime.offlineNoticeShown = false;
      // Hub mengirim local_config sendiri sesaat setelah auth; setelah itu agent memintanya berkala
      // supaya daftar unit & sesi server yang tersimpan tetap segar saat internet tiba-tiba putus.
      if (localRuntime.enabled) localRefresh = setInterval(() => send({ type: 'local_config_request' }), LOCAL_CONFIG_REFRESH_MS);
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
    if (msg.type === 'local_config') {
      applyLocalConfig(config, msg);
      return;
    }
    if (msg.type === 'command') send(await handleCommand(msg, config));
  });

  ws.on('close', () => {
    if (heartbeat) clearInterval(heartbeat);
    if (localRefresh) clearInterval(localRefresh);
    localRuntime.hubConnected = false;
    if (localRuntime.enabled && authenticatedOnce && !localRuntime.offlineNoticeShown && !tokenRejected) {
      localRuntime.offlineNoticeShown = true;
      const addrs = lanAddresses();
      log('WARN', t('localOfflineNow', { url: addrs.length ? localUrl(addrs[0]) : localUrl('127.0.0.1') }));
    }
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
    const manifestUrl = `${UPDATE_BASE_URL}${IS_ANDROID ? 'android/' : ''}${updateChannel === 'beta' ? 'latest-beta.json' : 'latest.json'}`;
    const raw = await httpsGetBuffer(manifestUrl, 64 * 1024);
    manifest = JSON.parse(raw.toString('utf8'));
    const check = verifyManifest(manifest, UPDATE_PUBLIC_KEY_B64, AGENT_VERSION, config.badVersions, UPDATE_PLATFORM);
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
  const exe = SELF_FILE;
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
  restartAgent(['--after-update', String(process.pid)]);
}

/**
 * Kembali ke versi sebelumnya. Versi yang gagal dicatat di badVersions supaya tidak diunduh lagi
 * — tanpa itu, agent akan memasang versi rusak yang sama setiap malam.
 */
function rollback(config, reason) {
  const exe = SELF_FILE;
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
  restartAgent(['--after-update', String(process.pid)]);
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

  // Sebelum connect(): kemampuan "local_control" dilaporkan di pesan auth hanya bila server lokalnya aktif.
  startLocalControl(config);
  connect(config);

  if (updatesEnabled()) {
    setTimeout(() => checkForUpdate(config), UPDATE_FIRST_CHECK_MS);
    setInterval(() => checkForUpdate(config), UPDATE_CHECK_EVERY_MS);
    setInterval(() => tryApplyUpdate(config), UPDATE_APPLY_POLL_MS);
  }
}

if (require.main === module || isSingleExecutable()) {
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
  isAllowedUpdateUrl,
  isInUpdateWindow,
  normalizeLang,
  parseLanguageChoice,
  LANGUAGE_CHOICES,
  MESSAGES,
  LOCAL_CONTROL_PORT,
  deriveLocalSecrets,
  sanitizeLocalConfig,
  mergeServerSessions,
  dueTimers,
  parseTasmotaPower,
  parseUnitCommand,
  localPageHtml,
  LOCAL_PAGE_TEXT,
};
