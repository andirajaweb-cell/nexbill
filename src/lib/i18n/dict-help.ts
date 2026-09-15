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
  // ---- Superuser-only content editor (HelpEditor/HelpArticle edit controls) — still translated
  // per policy: only /platform-admin is exempt from multi-language, everything under
  // dashboard.nexbill.id (including Superuser-only screens) is not.
  "help.editedBadge": { id: "diedit", en: "edited", ms: "diedit", th: "แก้ไขแล้ว", fil: "na-edit", vi: "đã sửa" },
  "help.editContent": { id: "Edit Konten", en: "Edit Content", ms: "Edit Kandungan", th: "แก้ไขเนื้อหา", fil: "I-edit ang Nilalaman", vi: "Chỉnh sửa nội dung" },
  "help.resetToDefault": { id: "Kembalikan ke default", en: "Reset to default", ms: "Kembalikan ke lalai", th: "คืนค่าเริ่มต้น", fil: "Ibalik sa default", vi: "Khôi phục mặc định" },
  "help.resetConfirm": {
    id: "Kembalikan topik ini ke versi default (menghapus semua editan)?",
    en: "Reset this topic to its default version (this deletes all edits)?",
    ms: "Kembalikan topik ini ke versi lalai (memadam semua suntingan)?",
    th: "คืนค่าหัวข้อนี้เป็นเวอร์ชันเริ่มต้น (จะลบการแก้ไขทั้งหมด)?",
    fil: "Ibalik ang topic na ito sa default na bersyon (mabubura ang lahat ng edit)?",
    vi: "Khôi phục chủ đề này về phiên bản mặc định (sẽ xóa mọi chỉnh sửa)?",
  },
  "help.editor.title": { id: "Edit Topik: {label}", en: "Edit Topic: {label}", ms: "Edit Topik: {label}", th: "แก้ไขหัวข้อ: {label}", fil: "I-edit ang Topic: {label}", vi: "Chỉnh sửa chủ đề: {label}" },
  "help.editor.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },
  "help.editor.save": { id: "Simpan Perubahan", en: "Save Changes", ms: "Simpan Perubahan", th: "บันทึกการเปลี่ยนแปลง", fil: "I-save ang mga Pagbabago", vi: "Lưu thay đổi" },
  "help.editor.saving": { id: "Menyimpan...", en: "Saving...", ms: "Menyimpan...", th: "กำลังบันทึก...", fil: "Sine-save...", vi: "Đang lưu..." },
  "help.editor.topicTitle": { id: "Judul Topik", en: "Topic Title", ms: "Tajuk Topik", th: "ชื่อหัวข้อ", fil: "Pamagat ng Topic", vi: "Tiêu đề chủ đề" },
  "help.editor.navHint": {
    id: "Petunjuk lokasi menu (opsional, tampil sebagai catatan kuning di atas ringkasan)",
    en: "Menu location hint (optional, shown as a yellow note above the summary)",
    ms: "Petunjuk lokasi menu (pilihan, dipaparkan sebagai nota kuning di atas ringkasan)",
    th: "คำแนะนำตำแหน่งเมนู (ไม่บังคับ แสดงเป็นข้อความสีเหลืองเหนือสรุป)",
    fil: "Hint ng lokasyon ng menu (opsyonal, ipinapakita bilang dilaw na tala sa itaas ng summary)",
    vi: "Gợi ý vị trí menu (tùy chọn, hiển thị dưới dạng ghi chú màu vàng phía trên tóm tắt)",
  },
  "help.editor.summary": { id: "Ringkasan", en: "Summary", ms: "Ringkasan", th: "สรุป", fil: "Buod", vi: "Tóm tắt" },
  "help.editor.roles": { id: "Siapa yang bisa akses (opsional)", en: "Who can access (optional)", ms: "Siapa yang boleh mengakses (pilihan)", th: "ใครสามารถเข้าถึงได้ (ไม่บังคับ)", fil: "Sino ang maaaring mag-access (opsyonal)", vi: "Ai có thể truy cập (tùy chọn)" },
  "help.editor.stepsLabel": { id: "Cara Pakai — satu langkah per baris", en: "How to Use — one step per line", ms: "Cara Guna — satu langkah setiap baris", th: "วิธีใช้งาน — หนึ่งขั้นตอนต่อบรรทัด", fil: "Paano Gamitin — isang hakbang bawat linya", vi: "Cách sử dụng — mỗi dòng một bước" },
  "help.editor.stepsPlaceholder": { id: "Langkah 1...\nLangkah 2...\nLangkah 3...", en: "Step 1...\nStep 2...\nStep 3...", ms: "Langkah 1...\nLangkah 2...\nLangkah 3...", th: "ขั้นตอนที่ 1...\nขั้นตอนที่ 2...\nขั้นตอนที่ 3...", fil: "Hakbang 1...\nHakbang 2...\nHakbang 3...", vi: "Bước 1...\nBước 2...\nBước 3..." },
  "help.editor.notesLabel": { id: "Hal Penting & Catatan — satu catatan per baris", en: "Important Notes — one note per line", ms: "Perkara Penting & Nota — satu nota setiap baris", th: "ข้อสำคัญและหมายเหตุ — หนึ่งรายการต่อบรรทัด", fil: "Mahahalagang Bagay at Tala — isang tala bawat linya", vi: "Lưu ý quan trọng — mỗi dòng một ghi chú" },
  "help.editor.notesPlaceholder": { id: "Catatan 1...\nCatatan 2...", en: "Note 1...\nNote 2...", ms: "Nota 1...\nNota 2...", th: "หมายเหตุ 1...\nหมายเหตุ 2...", fil: "Tala 1...\nTala 2...", vi: "Ghi chú 1...\nGhi chú 2..." },
  "help.editor.subsectionsLabel": { id: "Sub-bagian", en: "Subsections", ms: "Sub-bahagian", th: "หัวข้อย่อย", fil: "Mga Subsection", vi: "Mục con" },
  "help.editor.addSubsection": { id: "+ Tambah Sub-bagian", en: "+ Add Subsection", ms: "+ Tambah Sub-bahagian", th: "+ เพิ่มหัวข้อย่อย", fil: "+ Magdagdag ng Subsection", vi: "+ Thêm mục con" },
  "help.editor.noSubsections": { id: "Belum ada sub-bagian.", en: "No subsections yet.", ms: "Belum ada sub-bahagian.", th: "ยังไม่มีหัวข้อย่อย", fil: "Wala pang subsection.", vi: "Chưa có mục con nào." },
  "help.editor.removeSubsection": { id: "Hapus", en: "Remove", ms: "Padam", th: "ลบ", fil: "Alisin", vi: "Xóa" },
  "help.editor.subsectionTitlePlaceholder": { id: "Judul sub-bagian", en: "Subsection title", ms: "Tajuk sub-bahagian", th: "ชื่อหัวข้อย่อย", fil: "Pamagat ng subsection", vi: "Tiêu đề mục con" },
  "help.editor.subsectionNavHintPlaceholder": { id: "Petunjuk lokasi menu (opsional)", en: "Menu location hint (optional)", ms: "Petunjuk lokasi menu (pilihan)", th: "คำแนะนำตำแหน่งเมนู (ไม่บังคับ)", fil: "Hint ng lokasyon ng menu (opsyonal)", vi: "Gợi ý vị trí menu (tùy chọn)" },
  "help.editor.subsectionIntroPlaceholder": { id: "Kalimat pembuka sub-bagian (opsional)", en: "Subsection intro sentence (optional)", ms: "Ayat pembuka sub-bahagian (pilihan)", th: "ประโยคเปิดหัวข้อย่อย (ไม่บังคับ)", fil: "Panimulang pangungusap ng subsection (opsyonal)", vi: "Câu mở đầu mục con (tùy chọn)" },
  "help.editor.subsectionStepsPlaceholder": { id: "Langkah — satu per baris", en: "Steps — one per line", ms: "Langkah — satu setiap baris", th: "ขั้นตอน — หนึ่งรายการต่อบรรทัด", fil: "Mga Hakbang — isa bawat linya", vi: "Các bước — mỗi dòng một bước" },
  "help.editor.subsectionNotesPlaceholder": { id: "Catatan — satu per baris", en: "Notes — one per line", ms: "Nota — satu setiap baris", th: "หมายเหตุ — หนึ่งรายการต่อบรรทัด", fil: "Mga Tala — isa bawat linya", vi: "Ghi chú — mỗi dòng một ghi chú" },
});
