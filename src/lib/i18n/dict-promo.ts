import { registerDict } from "./registry";

/**
 * Translations for the /dashboard/promo page (Promo & Paket — rental promo/package deal
 * management). Registered as a side effect on import; import this file once from
 * src/app/dashboard/promo/page.tsx before any component calls useDashboardLang().t().
 */
registerDict({
  "promo.title": { id: "Promo & Paket Rental", en: "Rental Promos & Packages", ms: "Promosi & Pakej Sewa", th: "โปรโมชั่นและแพ็กเกจเช่า", fil: "Promo at Package sa Rental", vi: "Khuyến mãi & Gói thuê" },
  "promo.subtitle": { id: "Paket harga tetap untuk durasi tertentu, dipakai juga oleh AI agent saat menjawab chat.", en: "Fixed-price packages for a set duration, also used by the AI agent when replying to chats.", ms: "Pakej harga tetap untuk tempoh tertentu, turut digunakan oleh ejen AI semasa membalas chat.", th: "แพ็กเกจราคาคงที่สำหรับระยะเวลาที่กำหนด ใช้โดย AI agent เมื่อตอบแชทด้วย", fil: "Mga package na may fixed na presyo para sa itinakdang tagal, ginagamit din ng AI agent kapag sumasagot sa chat.", vi: "Gói giá cố định cho một khoảng thời gian nhất định, cũng được AI agent sử dụng khi trả lời trò chuyện." },

  "promo.createHeading": { id: "Buat Paket Rental", en: "Create Rental Package", ms: "Cipta Pakej Sewa", th: "สร้างแพ็กเกจเช่า", fil: "Gumawa ng Rental Package", vi: "Tạo gói thuê" },
  "promo.namePlaceholder": { id: "Nama paket (mis. Paket 3 Jam PS4)", en: "Package name (e.g. 3-Hour PS4 Package)", ms: "Nama pakej (cth. Pakej 3 Jam PS4)", th: "ชื่อแพ็กเกจ (เช่น แพ็กเกจ PS4 3 ชั่วโมง)", fil: "Pangalan ng package (hal. 3-Oras na PS4 Package)", vi: "Tên gói (VD: Gói PS4 3 giờ)" },
  "promo.editNamePlaceholder": { id: "Nama paket", en: "Package name", ms: "Nama pakej", th: "ชื่อแพ็กเกจ", fil: "Pangalan ng package", vi: "Tên gói" },
  "promo.consoleAll": { id: "Semua Konsol", en: "All Consoles", ms: "Semua Konsol", th: "ทุกเครื่อง", fil: "Lahat ng Console", vi: "Tất cả máy" },
  "promo.durationPlaceholder": { id: "Durasi (menit)", en: "Duration (minutes)", ms: "Tempoh (minit)", th: "ระยะเวลา (นาที)", fil: "Tagal (minuto)", vi: "Thời lượng (phút)" },
  "promo.pricePlaceholder": { id: "Harga paket", en: "Package price", ms: "Harga pakej", th: "ราคาแพ็กเกจ", fil: "Presyo ng package", vi: "Giá gói" },
  "promo.saveButton": { id: "Simpan Paket", en: "Save Package", ms: "Simpan Pakej", th: "บันทึกแพ็กเกจ", fil: "I-save ang Package", vi: "Lưu gói" },

  "promo.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "promo.cancel": { id: "Batal", en: "Cancel", ms: "Batal", th: "ยกเลิก", fil: "Kanselahin", vi: "Hủy" },

  "promo.statusActive": { id: "Aktif", en: "Active", ms: "Aktif", th: "ใช้งานอยู่", fil: "Aktibo", vi: "Đang hoạt động" },
  "promo.statusInactive": { id: "Nonaktif", en: "Inactive", ms: "Tidak Aktif", th: "ปิดใช้งาน", fil: "Hindi Aktibo", vi: "Ngừng hoạt động" },
  "promo.durationMinutesLabel": { id: "{n} menit", en: "{n} minutes", ms: "{n} minit", th: "{n} นาที", fil: "{n} minuto", vi: "{n} phút" },

  "promo.edit": { id: "Edit", en: "Edit", ms: "Edit", th: "แก้ไข", fil: "I-edit", vi: "Sửa" },
  "promo.deactivate": { id: "Nonaktifkan", en: "Deactivate", ms: "Nyahaktifkan", th: "ปิดใช้งาน", fil: "I-deactivate", vi: "Vô hiệu hóa" },
  "promo.activate": { id: "Aktifkan", en: "Activate", ms: "Aktifkan", th: "เปิดใช้งาน", fil: "I-activate", vi: "Kích hoạt" },
  "promo.delete": { id: "Hapus", en: "Delete", ms: "Padam", th: "ลบ", fil: "Tanggalin", vi: "Xóa" },

  "promo.emptyState": { id: "Belum ada paket promo.", en: "No promo packages yet.", ms: "Belum ada pakej promosi.", th: "ยังไม่มีแพ็กเกจโปรโมชั่น", fil: "Wala pang promo package.", vi: "Chưa có gói khuyến mãi nào." },

  "promo.nameRequired": { id: "Nama paket wajib diisi.", en: "Package name is required.", ms: "Nama pakej wajib diisi.", th: "กรุณากรอกชื่อแพ็กเกจ", fil: "Kailangan ang pangalan ng package.", vi: "Vui lòng nhập tên gói." },
  "promo.confirmDelete": { id: "Hapus promo \"{name}\"?", en: "Delete promo \"{name}\"?", ms: "Padam promosi \"{name}\"?", th: "ลบโปรโมชั่น \"{name}\" ใช่หรือไม่?", fil: "Tanggalin ang promo na \"{name}\"?", vi: "Xóa khuyến mãi \"{name}\"?" },
  "promo.softDeletedNotice": { id: "\"{name}\" pernah dipakai di transaksi, jadi dinonaktifkan (bukan dihapus permanen) agar riwayat transaksi tetap aman.", en: "\"{name}\" has been used in a transaction, so it was deactivated (not permanently deleted) to keep transaction history intact.", ms: "\"{name}\" pernah digunakan dalam transaksi, jadi ia dinyahaktifkan (bukan dipadam kekal) supaya sejarah transaksi kekal selamat.", th: "\"{name}\" เคยถูกใช้ในธุรกรรมแล้ว จึงถูกปิดใช้งาน (ไม่ได้ลบถาวร) เพื่อรักษาประวัติธุรกรรมให้ปลอดภัย", fil: "Nagamit na ang \"{name}\" sa isang transaksyon, kaya na-deactivate ito (hindi permanenteng tinanggal) para manatiling ligtas ang history ng transaksyon.", vi: "\"{name}\" đã từng được sử dụng trong giao dịch, nên đã bị vô hiệu hóa (không xóa vĩnh viễn) để giữ an toàn lịch sử giao dịch." },
});
