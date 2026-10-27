import { registerDict } from "./registry";

/** PIN per staf NEXBILL TV (app/dashboard/settings/tv-staff-pins.tsx). */
registerDict({
  "tvStaffPin.title": { id: "PIN per Staf (NEXBILL TV)", en: "Per-staff PIN (NEXBILL TV)", ms: "PIN setiap Staf (NEXBILL TV)", th: "PIN รายพนักงาน (NEXBILL TV)", fil: "PIN bawat Staff (NEXBILL TV)", vi: "PIN theo nhân viên (NEXBILL TV)" },
  "tvStaffPin.text": {
    id: "Setiap kasir punya PIN sendiri. Di TV, kasir menekan OK → mengetik PIN-nya → sesi yang dimulai, diperpanjang, atau diakhiri dari TV tercatat atas namanya (juga saat internet putus). PIN Staf di atas tetap bisa dipakai Owner sebagai cadangan.",
    en: "Each cashier has their own PIN. On the TV, the cashier presses OK → types their PIN → sessions started, extended, or ended from the TV are recorded under their name (also when the internet is down). The Staff PIN above still works as the Owner's backup.",
    ms: "Setiap juruwang ada PIN sendiri. Di TV, juruwang tekan OK → taip PIN → sesi yang dimulakan, dilanjutkan atau ditamatkan dari TV direkod atas namanya (juga ketika internet terputus). PIN Staf di atas masih boleh digunakan Pemilik sebagai sandaran.",
    th: "แคชเชียร์แต่ละคนมี PIN ของตัวเอง ที่ทีวีกด OK → ใส่ PIN → เซสชันที่เริ่ม ต่อเวลา หรือจบจากทีวีจะบันทึกในชื่อของคนนั้น (แม้อินเทอร์เน็ตหลุด) PIN พนักงานด้านบนยังใช้เป็น PIN สำรองของเจ้าของได้",
    fil: "May sariling PIN ang bawat cashier. Sa TV, pipindutin ng cashier ang OK → ita-type ang PIN niya → ang session na sinimulan, pinahaba, o tinapos mula sa TV ay naitatala sa pangalan niya (kahit walang internet). Gumagana pa rin ang Staff PIN sa itaas bilang backup ng Owner.",
    vi: "Mỗi thu ngân có PIN riêng. Trên TV, thu ngân nhấn OK → nhập PIN của mình → phiên bắt đầu, gia hạn hoặc kết thúc từ TV được ghi theo tên người đó (kể cả khi mất internet). PIN nhân viên ở trên vẫn dùng được làm PIN dự phòng của Chủ.",
  },
  "tvStaffPin.loading": { id: "Memuat…", en: "Loading…", ms: "Memuatkan…", th: "กำลังโหลด…", fil: "Naglo-load…", vi: "Đang tải…" },
  "tvStaffPin.empty": { id: "Belum ada staf aktif yang bisa diberi PIN TV.", en: "No active staff can be given a TV PIN yet.", ms: "Belum ada staf aktif yang boleh diberi PIN TV.", th: "ยังไม่มีพนักงานที่ใช้งานอยู่ซึ่งตั้ง PIN ทีวีได้", fil: "Wala pang aktibong staff na puwedeng bigyan ng TV PIN.", vi: "Chưa có nhân viên đang hoạt động nào có thể đặt PIN TV." },
  "tvStaffPin.hasPin": { id: "PIN aktif", en: "PIN active", ms: "PIN aktif", th: "มี PIN แล้ว", fil: "May PIN na", vi: "Đã có PIN" },
  "tvStaffPin.noPin": { id: "Belum ada PIN", en: "No PIN yet", ms: "Belum ada PIN", th: "ยังไม่มี PIN", fil: "Wala pang PIN", vi: "Chưa có PIN" },
  "tvStaffPin.set": { id: "Atur PIN", en: "Set PIN", ms: "Tetapkan PIN", th: "ตั้ง PIN", fil: "Itakda ang PIN", vi: "Đặt PIN" },
  "tvStaffPin.change": { id: "Ganti PIN", en: "Change PIN", ms: "Tukar PIN", th: "เปลี่ยน PIN", fil: "Palitan ang PIN", vi: "Đổi PIN" },
  "tvStaffPin.remove": { id: "Hapus", en: "Remove", ms: "Padam", th: "ลบ", fil: "Alisin", vi: "Xóa" },
  "tvStaffPin.save": { id: "Simpan", en: "Save", ms: "Simpan", th: "บันทึก", fil: "I-save", vi: "Lưu" },
  "tvStaffPin.prompt": {
    id: "PIN TV untuk {name} (4–6 digit, tidak boleh sama dengan staf lain):",
    en: "TV PIN for {name} (4–6 digits, must differ from other staff):",
    ms: "PIN TV untuk {name} (4–6 digit, tidak boleh sama dengan staf lain):",
    th: "PIN ทีวีของ {name} (4–6 หลัก ห้ามซ้ำกับพนักงานอื่น):",
    fil: "TV PIN para kay {name} (4–6 digit, hindi puwedeng kapareho ng ibang staff):",
    vi: "PIN TV cho {name} (4–6 chữ số, không trùng với nhân viên khác):",
  },
  "tvStaffPin.failed": { id: "Gagal menyimpan PIN.", en: "Couldn't save the PIN.", ms: "Gagal menyimpan PIN.", th: "บันทึก PIN ไม่สำเร็จ", fil: "Hindi na-save ang PIN.", vi: "Không lưu được PIN." },
  "tvStaffPin.confirmRemove": {
    id: "Hapus PIN TV {name}? Staf ini tidak bisa lagi memulai sesi dari TV.",
    en: "Remove {name}'s TV PIN? This staff member can no longer start sessions from the TV.",
    ms: "Padam PIN TV {name}? Staf ini tidak lagi boleh memulakan sesi dari TV.",
    th: "ลบ PIN ทีวีของ {name}? พนักงานคนนี้จะเริ่มเซสชันจากทีวีไม่ได้อีก",
    fil: "Alisin ang TV PIN ni {name}? Hindi na makakapagsimula ng session mula sa TV ang staff na ito.",
    vi: "Xóa PIN TV của {name}? Nhân viên này sẽ không thể bắt đầu phiên từ TV nữa.",
  },
  "tvStaffPin.note": {
    id: "PIN harus 4–6 digit, bukan angka sama semua atau berurutan (0000, 1234). TV mengingat PIN yang pernah benar supaya tetap bisa dipakai saat internet putus.",
    en: "PINs must be 4–6 digits, not all the same or sequential (0000, 1234). The TV remembers PINs that were once correct so they still work when the internet is down.",
    ms: "PIN mesti 4–6 digit, bukan semua sama atau berturutan (0000, 1234). TV mengingati PIN yang pernah betul supaya masih boleh digunakan ketika internet terputus.",
    th: "PIN ต้องมี 4–6 หลัก ไม่ซ้ำกันทั้งหมดหรือเรียงกัน (0000, 1234) ทีวีจะจำ PIN ที่เคยถูกต้องเพื่อใช้ได้แม้อินเทอร์เน็ตหลุด",
    fil: "Dapat 4–6 digit ang PIN, hindi pare-pareho o sunud-sunod (0000, 1234). Tinatandaan ng TV ang mga PIN na naging tama para magamit pa rin kahit walang internet.",
    vi: "PIN phải gồm 4–6 chữ số, không trùng hết hoặc liên tiếp (0000, 1234). TV ghi nhớ PIN đã từng đúng để vẫn dùng được khi mất internet.",
  },
});
