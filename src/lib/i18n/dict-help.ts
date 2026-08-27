import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/help page's own UI chrome — page heading, search box,
 * sidebar nav, and per-article section labels. Does NOT cover the help article content itself
 * (src/lib/help/content.ts) — that's a large separate content file, intentionally out of scope.
 * Registered as a side effect on import.
 */
registerDict({
  "help.pageTitle": {
    id: "Bantuan & Panduan",
    en: "Help & Guide",
    ms: "Bantuan & Panduan",
    th: "ช่วยเหลือและคู่มือ",
    fil: "Tulong at Gabay",
    vi: "Trợ giúp & Hướng dẫn",
  },
  "help.pageSubtitle": {
    id: "Petunjuk penggunaan lengkap untuk setiap fitur NEXBILL — cara pakai langkah demi langkah, hal-hal penting yang perlu diperhatikan, dan siapa yang bisa mengakses apa.",
    en: "Complete usage guide for every NEXBILL feature — step-by-step instructions, important things to watch out for, and who can access what.",
    ms: "Panduan penggunaan lengkap untuk setiap ciri NEXBILL — cara guna langkah demi langkah, perkara penting yang perlu diberi perhatian, dan siapa yang boleh mengakses apa.",
    th: "คู่มือการใช้งานฉบับสมบูรณ์สำหรับทุกฟีเจอร์ของ NEXBILL — ขั้นตอนการใช้งานทีละขั้นตอน สิ่งสำคัญที่ต้องระวัง และใครสามารถเข้าถึงอะไรได้บ้าง",
    fil: "Kumpletong gabay sa paggamit ng bawat feature ng NEXBILL — hakbang-hakbang na paggamit, mahahalagang bagay na dapat pansinin, at kung sino ang maaaring mag-access ng ano.",
    vi: "Hướng dẫn sử dụng đầy đủ cho mọi tính năng của NEXBILL — các bước sử dụng chi tiết, những lưu ý quan trọng cần chú ý, và ai có thể truy cập gì.",
  },
  "help.searchPlaceholder": {
    id: 'Cari fitur atau kata kunci... (mis. "deposit", "void", "printer")',
    en: 'Search features or keywords... (e.g. "deposit", "void", "printer")',
    ms: 'Cari ciri atau kata kunci... (cth. "deposit", "void", "printer")',
    th: 'ค้นหาฟีเจอร์หรือคำสำคัญ... (เช่น "deposit", "void", "printer")',
    fil: 'Maghanap ng feature o keyword... (hal. "deposit", "void", "printer")',
    vi: 'Tìm tính năng hoặc từ khóa... (vd. "deposit", "void", "printer")',
  },
  "help.noResults": {
    id: "Tidak ada topik yang cocok dengan pencarianmu.",
    en: "No topics match your search.",
    ms: "Tiada topik yang sepadan dengan carian anda.",
    th: "ไม่พบหัวข้อที่ตรงกับการค้นหาของคุณ",
    fil: "Walang topic na tumutugma sa iyong paghahanap.",
    vi: "Không có chủ đề nào khớp với tìm kiếm của bạn.",
  },
  "help.rolesLabel": {
    id: "Siapa yang bisa akses: ",
    en: "Who can access: ",
    ms: "Siapa yang boleh mengakses: ",
    th: "ใครสามารถเข้าถึงได้: ",
    fil: "Sino ang maaaring mag-access: ",
    vi: "Ai có thể truy cập: ",
  },
  "help.howToUse": {
    id: "Cara Pakai",
    en: "How to Use",
    ms: "Cara Guna",
    th: "วิธีใช้งาน",
    fil: "Paano Gamitin",
    vi: "Cách sử dụng",
  },
  "help.notesHeading": {
    id: "Hal Penting & Catatan",
    en: "Important Notes",
    ms: "Perkara Penting & Nota",
    th: "ข้อสำคัญและหมายเหตุ",
    fil: "Mahahalagang Bagay at Tala",
    vi: "Lưu ý quan trọng",
  },
});
