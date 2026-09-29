/**
 * Template pesan WhatsApp untuk pipeline CRM platform-admin (/platform-admin/leads).
 *
 * Modul murni (tanpa DB/React) — dipakai halaman "use client", rute API, dan test
 * (wa-template.test.ts). Tabelnya: platformWaTemplates (migrasi 0025).
 *
 * Konsep:
 *  - TAHAP  : status lead tempat template paling cocok dipakai (baru, dihubungi, ...), atau "umum".
 *  - UNSUR  : sudut pesan — masalah, solusi, kemudahan, kelengkapan, bukti, penawaran, dll. Membantu
 *             admin memilih pesan yang pas, bukan mengirim promosi yang sama ke semua orang.
 *  - PLACEHOLDER : {nama_usaha}, {sapaan}, ... diisi dari data lead saat pesan disusun. Data kosong
 *             memakai kalimat cadangan yang tetap wajar dibaca, dan admin diberi tahu field mana yang
 *             sebaiknya dilengkapi dulu.
 */
import { LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "./constants";

/* ------------------------------------------------------------------ tahap ------------------------------------------------------------------ */

export const WA_TEMPLATE_STAGES = [...LEAD_STATUSES, "umum"] as const;
export type WaTemplateStage = (typeof WA_TEMPLATE_STAGES)[number];

export const WA_STAGE_LABEL: Record<WaTemplateStage, string> = {
  ...LEAD_STATUS_LABEL,
  closing: "Closing",
  umum: "Umum (semua tahap)",
};

export function isWaTemplateStage(v: unknown): v is WaTemplateStage {
  return typeof v === "string" && (WA_TEMPLATE_STAGES as readonly string[]).includes(v);
}

/* ------------------------------------------------------------------ unsur ------------------------------------------------------------------ */

export const WA_TEMPLATE_ELEMENTS = [
  "pembuka",
  "masalah",
  "solusi",
  "kemudahan",
  "kelengkapan",
  "bukti",
  "penawaran",
  "follow_up",
  "penutup",
] as const;
export type WaTemplateElement = (typeof WA_TEMPLATE_ELEMENTS)[number];

export const WA_ELEMENT_INFO: Record<WaTemplateElement, { label: string; hint: string }> = {
  pembuka: { label: "Pembuka", hint: "Perkenalan singkat & alasan menghubungi — belum jualan." },
  masalah: { label: "Permasalahan", hint: "Angkat masalah nyata owner: selisih kas, jam main terlewat, TV lupa dimatikan, tidak bisa pantau." },
  solusi: { label: "Solusi", hint: "Tunjukkan bagaimana NEXBILL menyelesaikan masalah tadi — spesifik, bukan daftar fitur." },
  kemudahan: { label: "Kemudahan", hint: "Hapus rasa ribet: tanpa install, bisa di HP, setup dibantu, trial gratis." },
  kelengkapan: { label: "Kelengkapan", hint: "Satu aplikasi untuk semua: rental, kasir F&B, booking, member, stok, laporan." },
  bukti: { label: "Bukti / Kepercayaan", hint: "Demo, contoh laporan, atau pengalaman outlet lain (hanya yang benar-benar ada)." },
  penawaran: { label: "Penawaran / Ajakan", hint: "Ajakan jelas: jadwalkan demo, mulai trial, atau lanjut berlangganan." },
  follow_up: { label: "Follow Up", hint: "Pengingat sopan setelah tidak ada balasan atau setelah demo/trial." },
  penutup: { label: "Penutup", hint: "Menutup percakapan dengan baik & membuka pintu untuk nanti." },
};

export function isWaTemplateElement(v: unknown): v is WaTemplateElement {
  return typeof v === "string" && (WA_TEMPLATE_ELEMENTS as readonly string[]).includes(v);
}

/* --------------------------------------------------------------- placeholder --------------------------------------------------------------- */

export const LINK_DAFTAR = "https://dashboard.nexbill.id/daftar";
export const LINK_KATALOG = "https://dashboard.nexbill.id/downloads/katalog-fitur-nexbill.html";

/** Data lead yang dipakai untuk mengisi placeholder (subset dari baris platform_leads). */
export interface WaLeadContext {
  name: string;
  contactName?: string | null;
  city?: string | null;
  area?: string | null;
  unitCount?: number | null;
  currentBilling?: string | null;
  painPoints?: string | null;
}

interface PlaceholderDef {
  key: string;
  label: string;
  /** Nilai dari data lead; null = data belum ada. */
  value: (lead: WaLeadContext, adminName: string) => string | null;
  /** Kalimat cadangan bila data kosong — harus tetap wajar di tengah kalimat. */
  fallback: string;
  /** Field lead yang perlu diisi agar tidak memakai cadangan (untuk peringatan di UI). */
  field?: string;
}

const clean = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  return t ? t : null;
};

export const WA_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "nama_usaha", label: "Nama usaha", value: (l) => clean(l.name), fallback: "rental kakak", field: "Nama Usaha" },
  { key: "sapaan", label: "Sapaan (Kak + nama kontak)", value: (l) => (clean(l.contactName) ? `Kak ${clean(l.contactName)}` : null), fallback: "Kak", field: "Nama Pemilik / Kontak" },
  { key: "nama_kontak", label: "Nama kontak", value: (l) => clean(l.contactName), fallback: "kakak", field: "Nama Pemilik / Kontak" },
  { key: "kota", label: "Kota", value: (l) => clean(l.city), fallback: "daerah kakak", field: "Kota" },
  { key: "area", label: "Area / klaster", value: (l) => clean(l.area), fallback: "sekitar kakak", field: "Area / Klaster" },
  { key: "jumlah_unit", label: "Jumlah unit", value: (l) => (l.unitCount != null && l.unitCount > 0 ? `${l.unitCount} unit` : null), fallback: "beberapa unit", field: "Jumlah Unit PS" },
  { key: "billing_sekarang", label: "Billing sekarang", value: (l) => clean(l.currentBilling), fallback: "catatan manual/stopwatch", field: "Billing Dipakai Sekarang" },
  { key: "pain_point", label: "Pain point", value: (l) => clean(l.painPoints), fallback: "selisih kas saat tutup shift", field: "Pain Point" },
  { key: "nama_admin", label: "Nama Anda", value: (_l, admin) => clean(admin), fallback: "tim NEXBILL" },
  { key: "link_daftar", label: "Link daftar/trial", value: () => LINK_DAFTAR, fallback: LINK_DAFTAR },
  { key: "link_katalog", label: "Link katalog fitur", value: () => LINK_KATALOG, fallback: LINK_KATALOG },
];

const PLACEHOLDER_RE = /\{([a-z_]+)\}/g;
const BY_KEY = new Map(WA_PLACEHOLDERS.map((p) => [p.key, p]));

/** Placeholder yang dipakai sebuah teks (unik, urut kemunculan). Placeholder tak dikenal ikut disebut. */
export function placeholdersIn(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(PLACEHOLDER_RE)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

export function unknownPlaceholders(body: string): string[] {
  return placeholdersIn(body).filter((k) => !BY_KEY.has(k));
}

/** Isi placeholder dengan data lead. Placeholder tak dikenal dibiarkan apa adanya supaya kesalahannya terlihat. */
export function renderWaTemplate(body: string, lead: WaLeadContext, adminName = ""): string {
  return body.replace(PLACEHOLDER_RE, (whole, key: string) => {
    const def = BY_KEY.get(key);
    if (!def) return whole;
    return def.value(lead, adminName) ?? def.fallback;
  });
}

/** Field lead yang kosong sehingga pesan memakai kalimat cadangan — untuk saran "lengkapi dulu". */
export function missingLeadFields(body: string, lead: WaLeadContext, adminName = ""): string[] {
  const out: string[] = [];
  for (const key of placeholdersIn(body)) {
    const def = BY_KEY.get(key);
    if (!def?.field) continue;
    if (def.value(lead, adminName) == null && !out.includes(def.field)) out.push(def.field);
  }
  return out;
}

/**
 * Nomor WA (628xxx) dari kolom waNumber, atau dari nomor telepon bila waNumber kosong (lead manual).
 * Aturan sama dengan toWhatsappNumber di places.ts — disalin agar modul ini tetap aman untuk klien.
 */
export function leadWaNumber(waNumber: string | null | undefined, phone: string | null | undefined): string | null {
  if (waNumber && /^628\d{7,12}$/.test(waNumber)) return waNumber;
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  return /^628\d{7,12}$/.test(digits) ? digits : null;
}

/** Link wa.me dengan teks terisi. */
export function waMeLink(waNumber: string, text: string): string {
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

/** Contoh lead untuk pratinjau di editor template. */
export const SAMPLE_LEAD: WaLeadContext = {
  name: "Galaxy PS",
  contactName: "Rudi",
  city: "Kab. Bandung",
  area: "Majalaya",
  unitCount: 8,
  currentBilling: "stopwatch & buku catatan",
  painPoints: "sering selisih kas waktu tutup shift",
};

/* ------------------------------------------------------------------ validasi ------------------------------------------------------------------ */

export const WA_BODY_MAX = 2000;
export const WA_TITLE_MAX = 80;

export interface WaTemplateInput {
  stage: WaTemplateStage;
  element: WaTemplateElement;
  title: string;
  body: string;
  sortOrder: number;
  isActive: boolean;
}

/** Validasi & normalisasi input dari form/API. Mengembalikan pesan galat berbahasa Indonesia. */
export function parseWaTemplateInput(raw: Record<string, unknown>, partial = false): { ok: true; value: Partial<WaTemplateInput> } | { ok: false; error: string } {
  const v: Partial<WaTemplateInput> = {};
  if (!partial || "stage" in raw) {
    if (!isWaTemplateStage(raw.stage)) return { ok: false, error: "Tahap tidak valid." };
    v.stage = raw.stage;
  }
  if (!partial || "element" in raw) {
    if (!isWaTemplateElement(raw.element)) return { ok: false, error: "Unsur pesan tidak valid." };
    v.element = raw.element;
  }
  if (!partial || "title" in raw) {
    const title = String(raw.title ?? "").trim();
    if (!title) return { ok: false, error: "Judul template wajib diisi." };
    if (title.length > WA_TITLE_MAX) return { ok: false, error: `Judul maksimal ${WA_TITLE_MAX} karakter.` };
    v.title = title;
  }
  if (!partial || "body" in raw) {
    const body = String(raw.body ?? "").replace(/\r\n/g, "\n").trim();
    if (!body) return { ok: false, error: "Isi pesan wajib diisi." };
    if (body.length > WA_BODY_MAX) return { ok: false, error: `Isi pesan maksimal ${WA_BODY_MAX} karakter.` };
    const unknown = unknownPlaceholders(body);
    if (unknown.length) return { ok: false, error: `Placeholder tidak dikenal: ${unknown.map((k) => `{${k}}`).join(", ")}.` };
    v.body = body;
  }
  if ("sortOrder" in raw) {
    const n = Number(raw.sortOrder);
    v.sortOrder = Number.isFinite(n) ? Math.max(0, Math.min(9999, Math.round(n))) : 0;
  } else if (!partial) v.sortOrder = 0;
  if ("isActive" in raw) v.isActive = Boolean(raw.isActive);
  else if (!partial) v.isActive = true;
  return { ok: true, value: v };
}

/** Urutan tampilan: mengikuti urutan pipeline, "umum" paling akhir. */
export function stageOrder(stage: string): number {
  const i = (WA_TEMPLATE_STAGES as readonly string[]).indexOf(stage);
  return i < 0 ? 999 : i;
}

/** Template untuk tahap lead tertentu: yang tahapnya sama dulu, lalu "umum". Hanya yang aktif. */
export function templatesForStage<T extends { stage: string; isActive: boolean; sortOrder: number }>(all: T[], stage: LeadStatus): T[] {
  return all
    .filter((t) => t.isActive && (t.stage === stage || t.stage === "umum"))
    .sort((a, b) => (a.stage === "umum" ? 1 : 0) - (b.stage === "umum" ? 1 : 0) || a.sortOrder - b.sortOrder);
}

/* ------------------------------------------------------------ template bawaan ------------------------------------------------------------ */

type DefaultTemplate = Omit<WaTemplateInput, "isActive">;

/**
 * Template bawaan — dipasang lewat tombol "Tambahkan template bawaan" (hanya yang belum ada, dicocokkan
 * dari tahap + judul). Tidak menyebut harga atau klaim angka yang belum terbukti.
 */
export const DEFAULT_WA_TEMPLATES: DefaultTemplate[] = [
  // ---- BARU ----
  {
    stage: "baru",
    element: "pembuka",
    sortOrder: 10,
    title: "Perkenalan singkat",
    body:
      "Halo {sapaan}, saya {nama_admin} dari NEXBILL 🙏\n\nSaya lihat *{nama_usaha}* di Google Maps. Kami bantu rental PS di {kota} merapikan billing & kasir. Boleh saya tanya sebentar soal cara pencatatan di {nama_usaha} sekarang?",
  },
  {
    stage: "baru",
    element: "masalah",
    sortOrder: 20,
    title: "Angkat permasalahan owner",
    body:
      "Halo {sapaan}, izin tanya 🙏 Di {nama_usaha} hitung jam main & tutup shift masih pakai {billing_sekarang}?\n\nBanyak owner rental PS yang cerita masalahnya mirip:\n• jam main lebih tapi tidak tercatat\n• TV lupa dimatikan setelah sesi habis\n• selisih kas saat tutup shift\n• tidak bisa pantau outlet dari rumah\n\nKalau kakak pernah mengalami salah satunya, saya bisa kirim cara kami mengatasinya. Boleh?",
  },
  // ---- DIHUBUNGI ----
  {
    stage: "dihubungi",
    element: "solusi",
    sortOrder: 10,
    title: "Solusi sesuai masalah",
    body:
      "Terima kasih sudah membalas, {sapaan} 🙏\n\nUntuk masalah *{pain_point}*, di NEXBILL caranya begini:\n✅ Timer tiap unit jalan otomatis, tagihan dihitung sistem\n✅ TV nyala sendiri saat sesi mulai & mati/tampil promo saat selesai\n✅ Tutup shift: uang dihitung per kasir, selisih langsung kelihatan\n✅ Owner pantau omzet & kas dari HP, real-time\n\nKalau cocok, saya bisa tunjukkan langsung untuk {jumlah_unit} di {nama_usaha}.",
  },
  {
    stage: "dihubungi",
    element: "kelengkapan",
    sortOrder: 20,
    title: "Satu aplikasi, semua kebutuhan",
    body:
      "{sapaan}, NEXBILL bukan cuma kasir. Dalam satu aplikasi sudah ada:\n• Sewa PS & billing + booking online\n• Kasir makanan/minuman & dapur\n• Member, poin & promo\n• Stok, pembelian & pengeluaran\n• Pembukuan & laporan laba rugi otomatis\n• Kontrol TV otomatis\n\nDaftar lengkapnya bisa dilihat di sini: {link_katalog}",
  },
  // ---- FOLLOW UP ----
  {
    stage: "follow_up",
    element: "kemudahan",
    sortOrder: 10,
    title: "Tidak ribet, dibantu setup",
    body:
      "Halo {sapaan}, mau lanjut info kemarin 🙏\n\nSupaya tidak ribet:\n• Tanpa install — cukup buka di HP/PC lewat browser\n• Data unit & tarif bisa kami bantu input\n• Kasir cukup tekan Mulai/Stop, sisanya otomatis\n• Coba gratis dulu 30 hari\n\nMau saya bantu siapkan untuk {nama_usaha}?",
  },
  {
    stage: "follow_up",
    element: "follow_up",
    sortOrder: 20,
    title: "Pengingat sopan",
    body:
      "Halo {sapaan}, maaf mengganggu 🙏 Sekadar mengingatkan info NEXBILL untuk {nama_usaha} kemarin. Kalau sekarang belum waktunya, tidak apa-apa — cukup balas \"nanti\" dan saya hubungi lagi di waktu yang lebih pas.",
  },
  // ---- DEMO ----
  {
    stage: "demo",
    element: "penawaran",
    sortOrder: 10,
    title: "Ajak jadwalkan demo",
    body:
      "{sapaan}, bagaimana kalau saya tunjukkan langsung? Demo cukup ±15 menit, pakai data contoh rental dengan {jumlah_unit}.\n\nPilihan:\n1️⃣ Saya datang ke {nama_usaha}\n2️⃣ Video call\n\nKakak lebih longgar hari apa & jam berapa?",
  },
  {
    stage: "demo",
    element: "bukti",
    sortOrder: 20,
    title: "Rangkuman setelah demo",
    body:
      "Terima kasih waktunya tadi, {sapaan} 🙏\n\nRangkuman yang paling relevan untuk {nama_usaha}:\n• {pain_point} → tertangani lewat laporan shift per kasir\n• TV & timer berjalan otomatis per unit\n• Laporan harian bisa dicek dari HP\n\nKalau siap mencoba, trial 30 hari bisa dimulai di sini: {link_daftar}",
  },
  // ---- TRIAL ----
  {
    stage: "trial",
    element: "kemudahan",
    sortOrder: 10,
    title: "Selamat datang di trial",
    body:
      "Selamat datang di NEXBILL, {sapaan} 🎉 Trial 30 hari untuk {nama_usaha} sudah aktif.\n\nLangkah awal yang saya sarankan:\n1. Tambah unit PS & paket tarif\n2. Tambah produk kasir (makanan/minuman)\n3. Coba 1 sesi sewa dari awal sampai tutup shift\n\nKalau ada yang bingung, langsung chat saya di sini ya.",
  },
  {
    stage: "trial",
    element: "follow_up",
    sortOrder: 20,
    title: "Cek progres trial",
    body:
      "Halo {sapaan}, bagaimana trial NEXBILL di {nama_usaha} sejauh ini? 🙏\n\nAda fitur yang belum jalan atau belum dipahami? Saya bisa bantu lewat video call singkat, termasuk setting TV otomatis.",
  },
  // ---- CLOSING ----
  {
    stage: "closing",
    element: "penawaran",
    sortOrder: 10,
    title: "Lanjut berlangganan",
    body:
      "{sapaan}, masa trial {nama_usaha} sebentar lagi selesai 🙏 Supaya data dan pengaturan yang sudah dibuat tetap jalan, langganan bisa dilanjutkan dari menu *Langganan* di dashboard — pembayaran bisa QRIS atau transfer.\n\nKalau ada pertanyaan soal paket, saya siap bantu.",
  },
  {
    stage: "closing",
    element: "penutup",
    sortOrder: 20,
    title: "Terima kasih & program referral",
    body:
      "Terima kasih sudah memilih NEXBILL, {sapaan} 🙏 Kalau ada kendala, tim support siap lewat menu Customer Service di dashboard.\n\nPunya kenalan pemilik rental PS lain? Ajak pakai NEXBILL lewat Program Referral di dashboard — ada komisinya untuk kakak.",
  },
  // ---- TIDAK TERTARIK ----
  {
    stage: "tidak_tertarik",
    element: "penutup",
    sortOrder: 10,
    title: "Tutup dengan baik",
    body:
      "Siap, terima kasih banyak atas waktunya, {sapaan} 🙏 Semoga {nama_usaha} makin ramai. Kalau suatu saat butuh sistem billing & kasir, kakak bisa hubungi saya kapan saja di nomor ini.",
  },
  {
    stage: "tidak_tertarik",
    element: "masalah",
    sortOrder: 20,
    title: "Sapa ulang (beberapa bulan kemudian)",
    body:
      "Halo {sapaan}, apa kabar {nama_usaha}? 🙏 Beberapa waktu lalu kita sempat ngobrol soal billing rental. Sekarang pencatatan masih pakai {billing_sekarang}? Kalau {pain_point} masih sering terjadi, NEXBILL bisa dicoba gratis 30 hari: {link_daftar}",
  },
  // ---- UMUM ----
  {
    stage: "umum",
    element: "kelengkapan",
    sortOrder: 10,
    title: "Kirim katalog fitur",
    body: "{sapaan}, berikut katalog lengkap fitur NEXBILL — bisa dibuka di HP dan disimpan sebagai PDF:\n{link_katalog}\n\nKalau ada fitur yang ingin dilihat langsung, kabari saya ya 🙏",
  },
];
