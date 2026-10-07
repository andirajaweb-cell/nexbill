import { registerDict } from "./registry";

/** Pilihan periode bersama (components/reports/PeriodPicker.tsx) — dipakai Accounting, CALK, laporan. */
registerDict({
  "period.today": { id: "Hari Ini", en: "Today", ms: "Hari Ini", th: "วันนี้", fil: "Ngayon", vi: "Hôm nay" },
  "period.yesterday": { id: "Kemarin", en: "Yesterday", ms: "Semalam", th: "เมื่อวาน", fil: "Kahapon", vi: "Hôm qua" },
  "period.this_week": { id: "Minggu Ini", en: "This Week", ms: "Minggu Ini", th: "สัปดาห์นี้", fil: "Ngayong Linggo", vi: "Tuần này" },
  "period.last_week": { id: "Minggu Lalu", en: "Last Week", ms: "Minggu Lepas", th: "สัปดาห์ที่แล้ว", fil: "Nakaraang Linggo", vi: "Tuần trước" },
  "period.this_month": { id: "Bulan Ini", en: "This Month", ms: "Bulan Ini", th: "เดือนนี้", fil: "Ngayong Buwan", vi: "Tháng này" },
  "period.last_month": { id: "Bulan Lalu", en: "Last Month", ms: "Bulan Lepas", th: "เดือนที่แล้ว", fil: "Nakaraang Buwan", vi: "Tháng trước" },
  "period.this_year": { id: "Tahun Ini", en: "This Year", ms: "Tahun Ini", th: "ปีนี้", fil: "Ngayong Taon", vi: "Năm nay" },
  "period.last_year": { id: "Tahun Lalu", en: "Last Year", ms: "Tahun Lepas", th: "ปีที่แล้ว", fil: "Nakaraang Taon", vi: "Năm trước" },
  "period.custom": { id: "Custom / Tanggal Tertentu", en: "Custom / Specific Date", ms: "Tersuai / Tarikh Tertentu", th: "กำหนดเอง / วันที่เจาะจง", fil: "Custom / Partikular na Petsa", vi: "Tùy chọn / Ngày cụ thể" },
  "period.allTime": { id: "Sepanjang Waktu", en: "All Time", ms: "Sepanjang Masa", th: "ทั้งหมด", fil: "Lahat ng Panahon", vi: "Toàn bộ thời gian" },
  "period.singleDateHint": { id: "— (kosongkan untuk tanggal tunggal)", en: "— (leave empty for a single date)", ms: "— (biarkan kosong untuk tarikh tunggal)", th: "— (เว้นว่างไว้หากเป็นวันเดียว)", fil: "— (iwanang blangko para sa iisang petsa)", vi: "— (để trống nếu chỉ một ngày)" },
});
