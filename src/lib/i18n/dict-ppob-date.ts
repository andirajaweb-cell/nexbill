import { registerDict } from "./registry";

/** Tanggal transaksi PPOB (catat & koreksi transaksi tanggal lampau), app/dashboard/ppob/page.tsx. */
registerDict({
  "ppob.date.label": { id: "Tanggal transaksi", en: "Transaction date", ms: "Tarikh transaksi", th: "วันที่ทำรายการ", fil: "Petsa ng transaksyon", vi: "Ngày giao dịch" },
  "ppob.date.savedPast": { id: "Transaksi tersimpan dengan tanggal {date}.", en: "Transaction saved with the date {date}.", ms: "Transaksi disimpan dengan tarikh {date}.", th: "บันทึกรายการแล้วด้วยวันที่ {date}", fil: "Na-save ang transaksyon na may petsang {date}.", vi: "Đã lưu giao dịch với ngày {date}." },
  "ppob.date.editKeep": { id: "Jurnal pengganti tetap dicatat pada tanggal transaksi ini.", en: "The replacement journal stays on this transaction's date.", ms: "Jurnal pengganti kekal dicatat pada tarikh transaksi ini.", th: "สมุดรายวันที่แทนที่จะยังบันทึกในวันที่ของรายการนี้", fil: "Mananatili sa petsa ng transaksyong ito ang kapalit na journal.", vi: "Bút toán thay thế vẫn ghi theo ngày của giao dịch này." },
  "ppob.date.editMoved": { id: "Tanggal diganti dari {from} ke {to} — jurnal pengganti dicatat pada tanggal baru.", en: "Date changed from {from} to {to} — the replacement journal is recorded on the new date.", ms: "Tarikh ditukar daripada {from} ke {to} — jurnal pengganti direkod pada tarikh baharu.", th: "เปลี่ยนวันที่จาก {from} เป็น {to} — สมุดรายวันที่แทนที่จะบันทึกในวันที่ใหม่", fil: "Pinalitan ang petsa mula {from} patungong {to} — itatala sa bagong petsa ang kapalit na journal.", vi: "Đã đổi ngày từ {from} sang {to} — bút toán thay thế được ghi theo ngày mới." },
});
