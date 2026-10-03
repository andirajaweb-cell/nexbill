import { registerDict } from "./registry";

/** Cetak struk Bluetooth dari HP / aplikasi NEXBILL Android. */
registerDict({
  "printer.print": { id: "Cetak Struk", en: "Print Receipt", ms: "Cetak Resit", th: "พิมพ์ใบเสร็จ", fil: "I-print ang Resibo", vi: "In hóa đơn" },
  "printer.printing": { id: "Mencetak...", en: "Printing...", ms: "Mencetak...", th: "กำลังพิมพ์...", fil: "Nagpi-print...", vi: "Đang in..." },
  "printer.printed": { id: "Struk terkirim ke printer.", en: "Receipt sent to the printer.", ms: "Resit dihantar ke pencetak.", th: "ส่งใบเสร็จไปยังเครื่องพิมพ์แล้ว", fil: "Naipadala na ang resibo sa printer.", vi: "Đã gửi hóa đơn tới máy in." },
  "printer.btPrint": { id: "Cetak via Bluetooth", en: "Print via Bluetooth", ms: "Cetak melalui Bluetooth", th: "พิมพ์ผ่านบลูทูธ", fil: "I-print sa Bluetooth", vi: "In qua Bluetooth" },
  "printer.systemPrint": { id: "Cetak (dialog sistem)", en: "Print (system dialog)", ms: "Cetak (dialog sistem)", th: "พิมพ์ (หน้าต่างระบบ)", fil: "I-print (system dialog)", vi: "In (hộp thoại hệ thống)" },
  "printer.openReceipt": { id: "Lihat struk", en: "View receipt", ms: "Lihat resit", th: "ดูใบเสร็จ", fil: "Tingnan ang resibo", vi: "Xem hóa đơn" },
  "printer.failed": { id: "Gagal mencetak", en: "Printing failed", ms: "Gagal mencetak", th: "พิมพ์ไม่สำเร็จ", fil: "Hindi na-print", vi: "In thất bại" },

  "settings.printer.connection": { id: "Cara cetak di perangkat ini", en: "How this device prints", ms: "Cara peranti ini mencetak", th: "วิธีพิมพ์ของอุปกรณ์นี้", fil: "Paano nagpi-print ang device na ito", vi: "Cách thiết bị này in" },
  "settings.printer.conn.system": { id: "Dialog print (PC / printer USB atau LAN)", en: "Print dialog (PC / USB or LAN printer)", ms: "Dialog cetak (PC / pencetak USB atau LAN)", th: "หน้าต่างพิมพ์ (PC / เครื่องพิมพ์ USB หรือ LAN)", fil: "Print dialog (PC / USB o LAN printer)", vi: "Hộp thoại in (PC / máy in USB hoặc LAN)" },
  "settings.printer.conn.bluetooth": { id: "Bluetooth langsung dari HP (printer BLE)", en: "Direct Bluetooth from phone (BLE printer)", ms: "Bluetooth terus dari telefon (pencetak BLE)", th: "บลูทูธตรงจากมือถือ (เครื่องพิมพ์ BLE)", fil: "Direktang Bluetooth mula sa phone (BLE printer)", vi: "Bluetooth trực tiếp từ điện thoại (máy in BLE)" },
  "settings.printer.conn.rawbt": { id: "Lewat aplikasi RawBT (printer Bluetooth Classic)", en: "Via the RawBT app (Bluetooth Classic printer)", ms: "Melalui aplikasi RawBT (pencetak Bluetooth Classic)", th: "ผ่านแอป RawBT (เครื่องพิมพ์บลูทูธแบบ Classic)", fil: "Sa RawBT app (Bluetooth Classic na printer)", vi: "Qua ứng dụng RawBT (máy in Bluetooth Classic)" },
  "settings.printer.btUnsupported": {
    id: "Browser ini tidak mendukung Bluetooth web. Pakai Chrome di Android atau aplikasi NEXBILL Android — atau pilih mode RawBT.",
    en: "This browser doesn't support web Bluetooth. Use Chrome on Android or the NEXBILL Android app — or choose RawBT mode.",
    ms: "Pelayar ini tidak menyokong Bluetooth web. Gunakan Chrome di Android atau aplikasi NEXBILL Android — atau pilih mod RawBT.",
    th: "เบราว์เซอร์นี้ไม่รองรับบลูทูธบนเว็บ ใช้ Chrome บน Android หรือแอป NEXBILL Android หรือเลือกโหมด RawBT",
    fil: "Hindi sinusuportahan ng browser na ito ang web Bluetooth. Gamitin ang Chrome sa Android o ang NEXBILL Android app — o piliin ang RawBT mode.",
    vi: "Trình duyệt này không hỗ trợ Bluetooth web. Dùng Chrome trên Android hoặc ứng dụng NEXBILL Android — hoặc chọn chế độ RawBT.",
  },
  "settings.printer.pair": { id: "Pilih Printer Bluetooth", en: "Choose Bluetooth Printer", ms: "Pilih Pencetak Bluetooth", th: "เลือกเครื่องพิมพ์บลูทูธ", fil: "Pumili ng Bluetooth Printer", vi: "Chọn máy in Bluetooth" },
  "settings.printer.paired": { id: "Printer tersambung: {name}", en: "Paired printer: {name}", ms: "Pencetak dipasangkan: {name}", th: "เครื่องพิมพ์ที่จับคู่: {name}", fil: "Naka-pair na printer: {name}", vi: "Máy in đã ghép: {name}" },
  "settings.printer.test": { id: "Tes Cetak", en: "Test Print", ms: "Cetak Ujian", th: "ทดสอบพิมพ์", fil: "Test Print", vi: "In thử" },
  "settings.printer.autoCut": { id: "Potong kertas otomatis (printer dengan cutter)", en: "Auto-cut paper (printers with a cutter)", ms: "Potong kertas automatik (pencetak dengan pemotong)", th: "ตัดกระดาษอัตโนมัติ (เครื่องที่มีใบมีด)", fil: "Awtomatikong pag-cut ng papel (printer na may cutter)", vi: "Tự cắt giấy (máy in có dao cắt)" },
  "settings.printer.btHint": {
    id: "Nyalakan Bluetooth HP dan printer, lalu ketuk Pilih Printer Bluetooth. Printer harus mendukung Bluetooth LE (BLE). Kalau printer tidak muncul di daftar, pakai mode RawBT.",
    en: "Turn on the phone's Bluetooth and the printer, then tap Choose Bluetooth Printer. The printer must support Bluetooth LE (BLE). If it doesn't appear in the list, use RawBT mode.",
    ms: "Hidupkan Bluetooth telefon dan pencetak, kemudian ketik Pilih Pencetak Bluetooth. Pencetak mesti menyokong Bluetooth LE (BLE). Jika pencetak tidak muncul, gunakan mod RawBT.",
    th: "เปิดบลูทูธของมือถือและเครื่องพิมพ์ แล้วแตะ เลือกเครื่องพิมพ์บลูทูธ เครื่องพิมพ์ต้องรองรับ Bluetooth LE (BLE) หากไม่ปรากฏในรายการ ให้ใช้โหมด RawBT",
    fil: "I-on ang Bluetooth ng phone at ang printer, saka i-tap ang Pumili ng Bluetooth Printer. Dapat suportado ng printer ang Bluetooth LE (BLE). Kung hindi lumabas sa listahan, gamitin ang RawBT mode.",
    vi: "Bật Bluetooth của điện thoại và máy in, rồi chạm Chọn máy in Bluetooth. Máy in phải hỗ trợ Bluetooth LE (BLE). Nếu máy in không hiện trong danh sách, dùng chế độ RawBT.",
  },
  "settings.printer.rawbtHint": {
    id: "Pasang aplikasi gratis RawBT dari Play Store dan pasangkan printer di RawBT sekali. Setelah itu setiap Cetak Struk dikirim otomatis lewat RawBT.",
    en: "Install the free RawBT app from the Play Store and pair the printer in RawBT once. After that every Print Receipt is sent through RawBT automatically.",
    ms: "Pasang aplikasi percuma RawBT dari Play Store dan pasangkan pencetak di RawBT sekali. Selepas itu setiap Cetak Resit dihantar melalui RawBT secara automatik.",
    th: "ติดตั้งแอป RawBT ฟรีจาก Play Store และจับคู่เครื่องพิมพ์ใน RawBT ครั้งเดียว หลังจากนั้นทุกการพิมพ์ใบเสร็จจะส่งผ่าน RawBT อัตโนมัติ",
    fil: "I-install ang libreng RawBT app mula sa Play Store at i-pair ang printer sa RawBT nang isang beses. Pagkatapos, ipapadala na sa RawBT ang bawat Print Receipt.",
    vi: "Cài ứng dụng RawBT miễn phí từ Play Store và ghép máy in trong RawBT một lần. Sau đó mọi lần In hóa đơn sẽ tự động gửi qua RawBT.",
  },
});
