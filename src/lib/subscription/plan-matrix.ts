import { TIER_FEATURES, TIER_INCLUDES_AI, type PlanFeature, type PlanTier } from "./pricing";

/**
 * Tabel perbandingan paket (checklist fitur Starter vs Pro) — dipakai halaman harga nexbill.id (#harga).
 *
 * SATU SUMBER KEBENARAN: baris yang dikunci per paket menunjuk ke `PlanFeature` dan centangnya
 * DIHITUNG dari TIER_FEATURES di pricing.ts — jadi memindahkan fitur antar paket otomatis mengubah
 * tabel ini. Menambah PlanFeature baru tanpa baris di sini menggagalkan plan-matrix.test.ts, sehingga
 * tabel publik tidak pernah tertinggal dari aturan paket.
 *
 * ATURAN MENAMBAH FITUR BARU: tambahkan barisnya di PLAN_MATRIX (6 bahasa) pada grup yang sesuai.
 * Fitur yang tersedia di semua paket → `all: true`. Fitur yang dikunci paket → `feature`.
 * Tulis hanya fitur yang benar-benar sudah ada di aplikasi (dicek tes untuk kelengkapan bahasa).
 */

export type MatrixLang = "id" | "en" | "ms" | "th" | "vi" | "fil";
type T6 = Record<MatrixLang, string>;

export type MatrixCell = { kind: "yes" } | { kind: "no" } | { kind: "text"; text: string };

export interface MatrixRowDef {
  key: string;
  label: T6;
  /** Dikunci per paket: centang dihitung dari TIER_FEATURES. */
  feature?: PlanFeature;
  /** Tersedia di semua paket. */
  all?: true;
  /** Nilai teks khusus per paket (mis. jumlah unit). {min}/{pct} diisi saat render. */
  text?: Record<PlanTier, T6>;
  /** AI: Pro termasuk, Starter lewat add-on (TIER_INCLUDES_AI). */
  ai?: true;
}

export interface MatrixGroupDef {
  key: string;
  label: T6;
  rows: MatrixRowDef[];
}

const t6 = (id: string, en: string, ms: string, th: string, vi: string, fil: string): T6 => ({ id, en, ms, th, vi, fil });

export const PLAN_MATRIX: MatrixGroupDef[] = [
  {
    key: "capacity",
    label: t6("Kapasitas", "Capacity", "Kapasiti", "ความจุ", "Quy mô", "Kapasidad"),
    rows: [
      {
        key: "units",
        label: t6("Unit PS / TV", "PS / TV units", "Unit PS / TV", "จำนวนเครื่อง PS / ทีวี", "Số máy PS / TV", "Mga unit ng PS / TV"),
        text: {
          starter: t6("Sesuai unit dibayar (min. {min})", "Per paid unit (min. {min})", "Ikut unit dibayar (min. {min})", "ตามจำนวนที่ชำระ (ขั้นต่ำ {min})", "Theo số máy trả phí (tối thiểu {min})", "Ayon sa bayad na unit (min. {min})"),
          pro: t6("Tak terbatas", "Unlimited", "Tanpa had", "ไม่จำกัด", "Không giới hạn", "Walang limitasyon"),
        },
      },
      {
        key: "multi_outlet",
        label: t6("Multi-cabang (cabang ke-2 dst. diskon {pct}%)", "Multi-branch ({pct}% off from the 2nd branch)", "Pelbagai cawangan (diskaun {pct}% dari cawangan ke-2)", "หลายสาขา (ส่วนลด {pct}% ตั้งแต่สาขาที่ 2)", "Nhiều chi nhánh (giảm {pct}% từ chi nhánh thứ 2)", "Multi-branch ({pct}% diskwento mula sa ika-2 branch)"),
        feature: "multi_outlet",
      },
    ],
  },
  {
    key: "billing",
    label: t6("Billing & kasir", "Billing & cashier", "Bil & juruwang", "บิลและแคชเชียร์", "Tính tiền & thu ngân", "Billing at kahera"),
    rows: [
      { key: "rental_timer", all: true, label: t6("Billing rental per menit: open, paket, jeda, perpanjang", "Per-minute rental billing: open, packages, pause, extend", "Bil sewa setiap minit: terbuka, pakej, jeda, lanjut", "คิดค่าเช่ารายนาที: แบบเปิด แพ็กเกจ หยุดพัก ต่อเวลา", "Tính tiền thuê theo phút: mở, gói, tạm dừng, gia hạn", "Per-minutong billing: open, package, pause, extend") },
      { key: "pos", all: true, label: t6("Kasir F&B dan produk + stok", "F&B and product POS + stock", "Juruwang F&B dan produk + stok", "ขายอาหาร/เครื่องดื่มและสินค้า + สต็อก", "Bán đồ ăn uống, sản phẩm + tồn kho", "POS ng F&B at produkto + stock") },
      { key: "booking", all: true, label: t6("Booking online + peta booking", "Online booking + booking map", "Tempahan dalam talian + peta tempahan", "จองออนไลน์ + แผนผังการจอง", "Đặt chỗ trực tuyến + sơ đồ đặt chỗ", "Online booking + booking map") },
      { key: "booking_page", all: true, label: t6("Halaman booking: foto outlet, WhatsApp per admin, petunjuk arah, daftar cabang", "Booking page: outlet photos, WhatsApp per admin, directions, branch list", "Halaman tempahan: foto outlet, WhatsApp setiap admin, arah, senarai cawangan", "หน้าจอง: รูปร้าน WhatsApp ของแอดมินแต่ละคน เส้นทาง รายชื่อสาขา", "Trang đặt chỗ: ảnh cửa hàng, WhatsApp từng quản trị viên, chỉ đường, danh sách chi nhánh", "Booking page: larawan ng outlet, WhatsApp bawat admin, direksyon, listahan ng branch") },
      { key: "no_show_blacklist", all: true, label: t6("Blokir otomatis nomor yang sering tidak datang (no-show)", "Auto-block numbers that keep not showing up (no-show)", "Sekat automatik nombor yang kerap tidak hadir", "บล็อกอัตโนมัติเบอร์ที่ไม่มาตามนัดบ่อย", "Tự động chặn số hay không đến (no-show)", "Awtomatikong i-block ang numerong madalas hindi sumipot (no-show)") },
      { key: "member", all: true, label: t6("Member, poin, dan voucher", "Members, points, and vouchers", "Ahli, mata ganjaran, dan baucar", "สมาชิก แต้ม และบัตรกำนัล", "Thành viên, điểm và voucher", "Member, puntos, at voucher") },
      { key: "time_credit", all: true, label: t6("Saldo waktu member: sisa paket disimpan & dipakai lagi", "Member time credit: save leftover package time & use it later", "Baki masa ahli: baki pakej disimpan & digunakan semula", "เวลาสะสมสมาชิก: เก็บเวลาที่เหลือจากแพ็กเกจไว้ใช้ครั้งหน้า", "Thời gian tích lũy hội viên: lưu phần gói còn lại để dùng sau", "Time credit ng member: i-save ang natirang oras ng package at gamitin ulit") },
      { key: "lobby_board", all: true, label: t6("Papan lobi untuk pelanggan: unit kosong, sisa waktu, QR booking", "Customer lobby board: free units, time left, booking QR", "Papan lobi pelanggan: unit kosong, baki masa, QR tempahan", "กระดานล็อบบี้สำหรับลูกค้า: เครื่องว่าง เวลาที่เหลือ QR จอง", "Bảng sảnh cho khách: máy trống, thời gian còn lại, QR đặt chỗ", "Lobby board para sa customer: bakanteng unit, natitirang oras, booking QR") },
      { key: "shift", all: true, label: t6("Shift kasir, tutup shift, laporan penjualan", "Cashier shifts, shift close, sales reports", "Syif juruwang, tutup syif, laporan jualan", "กะแคชเชียร์ ปิดกะ รายงานยอดขาย", "Ca thu ngân, chốt ca, báo cáo bán hàng", "Shift ng kahera, pagsara ng shift, sales report") },
      { key: "staff", all: true, label: t6("Staf dengan izin per role", "Staff with per-role permissions", "Staf dengan kebenaran mengikut peranan", "พนักงานพร้อมสิทธิ์ตามบทบาท", "Nhân viên với quyền theo vai trò", "Staff na may permission ayon sa role") },
    ],
  },
  {
    key: "devices",
    label: t6("Kontrol perangkat", "Device control", "Kawalan peranti", "ควบคุมอุปกรณ์", "Điều khiển thiết bị", "Kontrol ng device"),
    rows: [
      { key: "tv_auto", all: true, label: t6("TV menyala/mati otomatis ikut sesi (Android TV)", "TV turns on/off with each session (Android TV)", "TV hidup/mati automatik ikut sesi (Android TV)", "ทีวีเปิด/ปิดอัตโนมัติตามรอบเล่น (Android TV)", "TV tự bật/tắt theo phiên (Android TV)", "Awtomatikong on/off ng TV ayon sa session (Android TV)") },
      { key: "smart_plug", all: true, label: t6("Smart plug untuk TV non-Android", "Smart plug for non-Android TVs", "Palam pintar untuk TV bukan Android", "สมาร์ทปลั๊กสำหรับทีวีที่ไม่ใช่ Android", "Ổ cắm thông minh cho TV không phải Android", "Smart plug para sa hindi Android na TV") },
      { key: "offline", all: true, label: t6("Tetap jalan saat internet putus (Mode Offline)", "Keeps running when the internet drops (Offline Mode)", "Terus berjalan ketika internet terputus (Mod Luar Talian)", "ทำงานต่อได้เมื่ออินเทอร์เน็ตหลุด (โหมดออฟไลน์)", "Vẫn chạy khi mất mạng (Chế độ ngoại tuyến)", "Tuloy kahit mawala ang internet (Offline Mode)") },
    ],
  },
  {
    key: "finance",
    label: t6("Keuangan & pembukuan", "Finance & bookkeeping", "Kewangan & perakaunan", "การเงินและบัญชี", "Tài chính & sổ sách", "Pananalapi at bookkeeping"),
    rows: [
      { key: "expenses", feature: "expenses", label: t6("Catat & setujui pengeluaran", "Record & approve expenses", "Rekod & lulus perbelanjaan", "บันทึกและอนุมัติค่าใช้จ่าย", "Ghi & duyệt chi phí", "Itala at aprubahan ang gastos") },
      { key: "profit_report", feature: "profit_report", label: t6("Laba Rugi ringkas", "Profit & Loss summary", "Untung Rugi ringkas", "สรุปกำไรขาดทุน", "Tóm tắt lãi lỗ", "Buod ng Profit & Loss") },
      { key: "accounting", feature: "accounting", label: t6("Pembukuan lengkap: jurnal, neraca, arus kas, CALK SAK EMKM, tutup periode, ekspor PDF/Excel", "Full bookkeeping: journals, balance sheet, cash flow, SAK EMKM notes, period close, PDF/Excel export", "Perakaunan penuh: jurnal, kunci kira-kira, aliran tunai, nota SAK EMKM, tutup tempoh, eksport PDF/Excel", "บัญชีครบ: สมุดรายวัน งบดุล กระแสเงินสด หมายเหตุ SAK EMKM ปิดงวด ส่งออก PDF/Excel", "Sổ sách đầy đủ: nhật ký, bảng cân đối, dòng tiền, thuyết minh SAK EMKM, khóa kỳ, xuất PDF/Excel", "Buong bookkeeping: journal, balance sheet, cash flow, SAK EMKM notes, period close, PDF/Excel export") },
      { key: "migration", feature: "accounting", label: t6("Migrasi dari aplikasi lain lewat template Excel", "Migrate from another app via Excel templates", "Migrasi daripada aplikasi lain melalui templat Excel", "ย้ายจากแอปอื่นผ่านเทมเพลต Excel", "Chuyển từ ứng dụng khác bằng mẫu Excel", "Lumipat mula sa ibang app gamit ang Excel template") },
      { key: "assets", feature: "assets", label: t6("Aset & penyusutan (PS, TV, stik)", "Assets & depreciation (PS, TVs, controllers)", "Aset & susut nilai (PS, TV, kawalan)", "สินทรัพย์และค่าเสื่อม (PS ทีวี จอย)", "Tài sản & khấu hao (PS, TV, tay cầm)", "Asset at depreciation (PS, TV, controller)") },
    ],
  },
  {
    key: "revenue",
    label: t6("Pendapatan tambahan", "Extra revenue", "Pendapatan tambahan", "รายได้เพิ่มเติม", "Doanh thu thêm", "Dagdag na kita"),
    rows: [
      { key: "home_rental", feature: "home_rental", label: t6("Rental PS dibawa pulang", "Take-home PS rental", "Sewa PS bawa pulang", "เช่า PS กลับบ้าน", "Cho thuê PS mang về", "Take-home na rental ng PS") },
      { key: "ppob", feature: "ppob", label: t6("PPOB: pulsa, token listrik, tagihan", "Bill payments: airtime, electricity tokens, bills", "PPOB: kredit telefon, token elektrik, bil", "ชำระบิล: เติมเงินมือถือ โทเคนไฟฟ้า บิล", "Thanh toán hóa đơn: thẻ điện thoại, điện, hóa đơn", "Bills payment: load, electricity token, bills") },
    ],
  },
  {
    key: "control",
    label: t6("Kontrol & analisis", "Control & insight", "Kawalan & analisis", "การควบคุมและวิเคราะห์", "Kiểm soát & phân tích", "Kontrol at pagsusuri"),
    rows: [
      { key: "anti_fraud", feature: "anti_fraud", label: t6("Deteksi shift berisiko otomatis", "Automatic risky-shift detection", "Pengesanan syif berisiko automatik", "ตรวจจับกะที่มีความเสี่ยงอัตโนมัติ", "Tự động phát hiện ca rủi ro", "Awtomatikong pagtukoy ng delikadong shift") },
      {
        key: "ai",
        ai: true,
        label: t6("AI Business Assistant", "AI Business Assistant", "AI Business Assistant", "AI Business Assistant", "AI Business Assistant", "AI Business Assistant"),
      },
    ],
  },
];

export const PLAN_MATRIX_UI: Record<MatrixLang, { title: string; sub: string; feature: string; show: string; hide: string; addon: string; yes: string; no: string; trial: string }> = {
  id: { title: "Bandingkan paket", sub: "Semua fitur yang ada sekarang, per paket.", feature: "Fitur", show: "Lihat perbandingan lengkap", hide: "Sembunyikan perbandingan", addon: "Add-on", yes: "Termasuk", no: "Tidak termasuk", trial: "Masa coba 30 hari membuka semua fitur Pro." },
  en: { title: "Compare plans", sub: "Every feature available today, by plan.", feature: "Feature", show: "See the full comparison", hide: "Hide comparison", addon: "Add-on", yes: "Included", no: "Not included", trial: "The 30-day trial unlocks every Pro feature." },
  ms: { title: "Bandingkan pakej", sub: "Semua ciri yang tersedia sekarang, mengikut pakej.", feature: "Ciri", show: "Lihat perbandingan penuh", hide: "Sembunyikan perbandingan", addon: "Add-on", yes: "Termasuk", no: "Tidak termasuk", trial: "Percubaan 30 hari membuka semua ciri Pro." },
  th: { title: "เปรียบเทียบแพ็กเกจ", sub: "ฟีเจอร์ทั้งหมดที่มีตอนนี้ แยกตามแพ็กเกจ", feature: "ฟีเจอร์", show: "ดูการเปรียบเทียบทั้งหมด", hide: "ซ่อนการเปรียบเทียบ", addon: "ส่วนเสริม", yes: "รวมแล้ว", no: "ไม่รวม", trial: "ทดลองใช้ 30 วันเปิดทุกฟีเจอร์ของ Pro" },
  vi: { title: "So sánh gói", sub: "Mọi tính năng hiện có, theo từng gói.", feature: "Tính năng", show: "Xem so sánh đầy đủ", hide: "Ẩn so sánh", addon: "Tiện ích thêm", yes: "Có", no: "Không có", trial: "Dùng thử 30 ngày mở mọi tính năng Pro." },
  fil: { title: "Ihambing ang mga plan", sub: "Lahat ng feature na available ngayon, bawat plan.", feature: "Feature", show: "Tingnan ang buong paghahambing", hide: "Itago ang paghahambing", addon: "Add-on", yes: "Kasama", no: "Hindi kasama", trial: "Binubuksan ng 30-araw na trial ang lahat ng Pro feature." },
};

export interface ResolvedMatrixRow {
  key: string;
  label: string;
  starter: MatrixCell;
  pro: MatrixCell;
}

export interface ResolvedMatrixGroup {
  key: string;
  label: string;
  rows: ResolvedMatrixRow[];
}

function fill(s: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), s);
}

function cellFor(row: MatrixRowDef, tier: PlanTier, lang: MatrixLang, vars: Record<string, string | number>): MatrixCell {
  if (row.text) return { kind: "text", text: fill(row.text[tier][lang], vars) };
  if (row.ai) return TIER_INCLUDES_AI[tier] ? { kind: "yes" } : { kind: "text", text: PLAN_MATRIX_UI[lang].addon };
  if (row.feature) return TIER_FEATURES[tier].includes(row.feature) ? { kind: "yes" } : { kind: "no" };
  return { kind: "yes" };
}

/** Tabel siap tampil untuk satu bahasa. `minUnits` & `multiDiscountPct` dari harga live (pricing API). */
export function resolvePlanMatrix(lang: MatrixLang, vars: { minUnits: number; multiDiscountPct: number }): ResolvedMatrixGroup[] {
  const v = { min: vars.minUnits, pct: vars.multiDiscountPct };
  return PLAN_MATRIX.map((g) => ({
    key: g.key,
    label: g.label[lang],
    rows: g.rows.map((r) => ({ key: r.key, label: fill(r.label[lang], v), starter: cellFor(r, "starter", lang, v), pro: cellFor(r, "pro", lang, v) })),
  }));
}
