import { registerDict } from "./registry";

/** Laba Rugi multi-periode — harian/mingguan/bulanan/kuartalan/tahunan & bandingkan bebas (2026-11-21). */
registerDict({
  "plMulti.mode.day": { id: "Harian", en: "Daily", ms: "Harian", th: "รายวัน", fil: "Araw-araw", vi: "Theo ngày" },
  "plMulti.mode.week": { id: "Mingguan", en: "Weekly", ms: "Mingguan", th: "รายสัปดาห์", fil: "Lingguhan", vi: "Theo tuần" },
  "plMulti.mode.month": { id: "Bulanan", en: "Monthly", ms: "Bulanan", th: "รายเดือน", fil: "Buwanan", vi: "Theo tháng" },
  "plMulti.mode.quarter": { id: "Kuartalan", en: "Quarterly", ms: "Suku tahunan", th: "รายไตรมาส", fil: "Quarterly", vi: "Theo quý" },
  "plMulti.mode.year": { id: "Tahunan", en: "Yearly", ms: "Tahunan", th: "รายปี", fil: "Taunan", vi: "Theo năm" },
  "plMulti.mode.manual": { id: "Bandingkan bebas", en: "Custom comparison", ms: "Perbandingan bebas", th: "เปรียบเทียบแบบกำหนดเอง", fil: "Custom na paghahambing", vi: "So sánh tùy chọn" },
  "plMulti.from": { id: "Dari", en: "From", ms: "Dari", th: "ตั้งแต่", fil: "Mula", vi: "Từ" },
  "plMulti.to": { id: "Sampai", en: "To", ms: "Hingga", th: "ถึง", fil: "Hanggang", vi: "Đến" },
  "plMulti.maxColumns": { id: "Maksimal {n} kolom", en: "Up to {n} columns", ms: "Maksimum {n} lajur", th: "สูงสุด {n} คอลัมน์", fil: "Hanggang {n} kolum", vi: "Tối đa {n} cột" },
  "plMulti.total": { id: "Total", en: "Total", ms: "Jumlah", th: "รวม", fil: "Kabuuan", vi: "Tổng" },
  "plMulti.change": { id: "Perubahan", en: "Change", ms: "Perubahan", th: "เปลี่ยนแปลง", fil: "Pagbabago", vi: "Chênh lệch" },
  "plMulti.netMargin": { id: "Margin laba bersih", en: "Net profit margin", ms: "Margin untung bersih", th: "อัตรากำไรสุทธิ", fil: "Net profit margin", vi: "Biên lợi nhuận ròng" },
  "plMulti.showAccounts": { id: "Tampilkan rincian akun", en: "Show account detail", ms: "Papar butiran akaun", th: "แสดงรายละเอียดบัญชี", fil: "Ipakita ang detalye ng account", vi: "Hiện chi tiết tài khoản" },
  "plMulti.downloadCsv": { id: "Unduh CSV (Excel)", en: "Download CSV (Excel)", ms: "Muat turun CSV (Excel)", th: "ดาวน์โหลด CSV (Excel)", fil: "I-download ang CSV (Excel)", vi: "Tải CSV (Excel)" },
  "plMulti.loading": { id: "Menghitung Laba Rugi per periode...", en: "Calculating profit & loss per period...", ms: "Mengira untung rugi setiap tempoh...", th: "กำลังคำนวณกำไรขาดทุนแต่ละช่วง...", fil: "Kinakalkula ang kita at lugi bawat panahon...", vi: "Đang tính lãi lỗ theo từng kỳ..." },
  "plMulti.loadFailed": { id: "Laba Rugi multi-periode gagal dimuat.", en: "Couldn't load the multi-period profit & loss.", ms: "Untung rugi pelbagai tempoh gagal dimuatkan.", th: "โหลดกำไรขาดทุนหลายช่วงไม่สำเร็จ", fil: "Hindi na-load ang multi-period na kita at lugi.", vi: "Không tải được lãi lỗ nhiều kỳ." },
  "plMulti.manualHint": { id: "Pilih 2–4 periode bebas untuk dibandingkan berdampingan. Dua periode menampilkan kolom Perubahan.", en: "Pick 2–4 periods to compare side by side. Two periods add a Change column.", ms: "Pilih 2–4 tempoh untuk dibandingkan sebelah-menyebelah. Dua tempoh memaparkan lajur Perubahan.", th: "เลือก 2–4 ช่วงเวลาเพื่อเปรียบเทียบเคียงกัน หากเลือกสองช่วงจะมีคอลัมน์ส่วนต่าง", fil: "Pumili ng 2–4 na panahon para paghambingin nang magkatabi. Kapag dalawa, may kolum na Pagbabago.", vi: "Chọn 2–4 kỳ để so sánh song song. Hai kỳ sẽ có thêm cột Chênh lệch." },
  "plMulti.partialNote": { id: "* Kolom bertanda bintang tidak penuh satu periode (dipotong tanggal awal/akhir rentang).", en: "* Columns marked with an asterisk are not a full period (cut by the range's start/end date).", ms: "* Lajur bertanda bintang bukan tempoh penuh (dipotong oleh tarikh mula/akhir julat).", th: "* คอลัมน์ที่มีดอกจันไม่ครบหนึ่งช่วง (ถูกตัดด้วยวันเริ่ม/วันสิ้นสุดของช่วง)", fil: "* Ang kolum na may asterisk ay hindi buong panahon (pinutol ng simula/katapusan ng saklaw).", vi: "* Cột có dấu sao không đủ một kỳ (bị cắt bởi ngày đầu/cuối của khoảng)." },
  "plMulti.sumNote": { id: "Jumlah semua kolom sama dengan kolom Total — Laba Rugi satu periode untuk rentang yang sama.", en: "All columns add up to the Total column — the single-period profit & loss for the same range.", ms: "Jumlah semua lajur sama dengan lajur Jumlah — untung rugi satu tempoh bagi julat yang sama.", th: "ผลรวมทุกคอลัมน์เท่ากับคอลัมน์รวม — กำไรขาดทุนช่วงเดียวสำหรับช่วงเดียวกัน", fil: "Ang kabuuan ng lahat ng kolum ay katumbas ng kolum na Kabuuan — ang kita at lugi ng iisang panahon para sa parehong saklaw.", vi: "Tổng các cột bằng cột Tổng — lãi lỗ một kỳ cho cùng khoảng thời gian." },
});
