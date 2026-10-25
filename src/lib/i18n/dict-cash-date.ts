import { registerDict } from "./registry";

/** Tanggal transaksi Setoran Kas & Pindah Kas (app/dashboard/shift/page.tsx). */
registerDict({
  "cashDate.label": { id: "Tanggal", en: "Date", ms: "Tarikh", th: "วันที่", fil: "Petsa", vi: "Ngày" },
  "cashDate.col": { id: "Tanggal", en: "Date", ms: "Tarikh", th: "วันที่", fil: "Petsa", vi: "Ngày" },
  "cashDate.backdateHint": { id: "Dicatat pada {date} — jurnal memakai tanggal ini dan tidak ditautkan ke shift yang sedang buka.", en: "Recorded on {date} — the journal uses this date and it isn't linked to the open shift.", ms: "Direkod pada {date} — jurnal menggunakan tarikh ini dan tidak dipautkan ke syif yang sedang dibuka.", th: "บันทึกวันที่ {date} — สมุดรายวันใช้วันที่นี้และไม่ผูกกับกะที่เปิดอยู่", fil: "Itatala sa {date} — gagamitin ng journal ang petsang ito at hindi iuugnay sa bukas na shift.", vi: "Ghi nhận ngày {date} — bút toán dùng ngày này và không gắn với ca đang mở." },
});
