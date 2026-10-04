/**
 * Notifikasi push NEXBILL (HP / aplikasi Android) — aturan murni, diuji di rules.test.ts.
 * Pengiriman ada di service.ts; teks notifikasi mengikuti bahasa outlet (outlets.preferredLang).
 */

export const PUSH_CATEGORIES = ["session", "customer_request", "booking", "payment", "fraud", "low_stock", "shift_summary"] as const;
export type PushCategory = (typeof PUSH_CATEGORIES)[number];

/** Kategori yang boleh diterima per peran (anti-fraud & ringkasan shift khusus pimpinan). */
const ROLE_ALLOWED: Record<string, PushCategory[]> = {
  superuser: [...PUSH_CATEGORIES],
  owner: [...PUSH_CATEGORIES],
  manager: [...PUSH_CATEGORIES],
  supervisor: ["session", "customer_request", "booking", "payment", "fraud", "low_stock", "shift_summary"],
  cashier: ["session", "customer_request", "booking", "payment", "low_stock"],
  kitchen: ["customer_request", "low_stock"],
  accountant: ["payment", "shift_summary"],
};

/** Bawaan bila pengguna belum memilih sendiri. */
const ROLE_DEFAULT: Record<string, PushCategory[]> = {
  superuser: [...PUSH_CATEGORIES],
  owner: [...PUSH_CATEGORIES],
  manager: [...PUSH_CATEGORIES],
  supervisor: ["session", "customer_request", "booking", "payment", "fraud", "low_stock"],
  cashier: ["session", "customer_request", "booking", "payment"],
  kitchen: ["customer_request"],
  accountant: ["shift_summary"],
};

export function allowedCategories(role: string): PushCategory[] {
  return ROLE_ALLOWED[role] ?? [];
}

/** Kategori aktif = pilihan tersimpan (bila ada) ∩ yang diizinkan peran; selain itu bawaan peran. */
export function effectiveCategories(role: string, storedJson: string | null | undefined): PushCategory[] {
  const allowed = new Set(allowedCategories(role));
  let chosen: PushCategory[] | null = null;
  if (storedJson) {
    try {
      const v = JSON.parse(storedJson);
      if (Array.isArray(v)) chosen = v.filter((x): x is PushCategory => (PUSH_CATEGORIES as readonly string[]).includes(x));
    } catch {
      chosen = null;
    }
  }
  return (chosen ?? ROLE_DEFAULT[role] ?? []).filter((c) => allowed.has(c));
}

export function sanitizeCategories(role: string, input: unknown): PushCategory[] {
  const allowed = new Set(allowedCategories(role));
  if (!Array.isArray(input)) return [];
  return Array.from(new Set(input.filter((x): x is PushCategory => typeof x === "string" && allowed.has(x as PushCategory))));
}

export type PushLang = "id" | "en" | "ms" | "th" | "fil" | "vi";
const LANGS: PushLang[] = ["id", "en", "ms", "th", "fil", "vi"];
export function normalizeLang(v: unknown): PushLang {
  return LANGS.includes(v as PushLang) ? (v as PushLang) : "id";
}

const TEMPLATES = {
  "sessionEnding": {
    "title": {
      "id": "⏰ {unit}: sisa {n} menit",
      "en": "⏰ {unit}: {n} min left",
      "ms": "⏰ {unit}: tinggal {n} minit",
      "th": "⏰ {unit}: เหลือ {n} นาที",
      "fil": "⏰ {unit}: {n} minuto na lang",
      "vi": "⏰ {unit}: còn {n} phút"
    },
    "body": {
      "id": "Sesi {customer} hampir habis.",
      "en": "{customer}'s session is almost over.",
      "ms": "Sesi {customer} hampir tamat.",
      "th": "เซสชันของ {customer} ใกล้หมดเวลา",
      "fil": "Malapit nang matapos ang session ni {customer}.",
      "vi": "Phiên của {customer} sắp hết giờ."
    }
  },
  "sessionEnded": {
    "title": {
      "id": "⌛ Waktu {unit} habis",
      "en": "⌛ {unit}: time is up",
      "ms": "⌛ Masa {unit} tamat",
      "th": "⌛ {unit}: หมดเวลา",
      "fil": "⌛ Ubos na ang oras ng {unit}",
      "vi": "⌛ {unit}: hết giờ"
    },
    "body": {
      "id": "Sesi {customer} dihentikan otomatis. Tagihan {amount}.",
      "en": "{customer}'s session stopped automatically. Bill {amount}.",
      "ms": "Sesi {customer} dihentikan secara automatik. Bil {amount}.",
      "th": "เซสชันของ {customer} หยุดอัตโนมัติ ยอด {amount}",
      "fil": "Awtomatikong itinigil ang session ni {customer}. Bill {amount}.",
      "vi": "Phiên của {customer} đã tự dừng. Hóa đơn {amount}."
    }
  },
  "requestOrder": {
    "title": {
      "id": "🍜 {unit}: pesanan F&B",
      "en": "🍜 {unit}: F&B order",
      "ms": "🍜 {unit}: pesanan F&B",
      "th": "🍜 {unit}: สั่งอาหาร",
      "fil": "🍜 {unit}: F&B order",
      "vi": "🍜 {unit}: gọi món"
    },
    "body": {
      "id": "{items} — terima di Rental PS.",
      "en": "{items} — accept it in Rental PS.",
      "ms": "{items} — terima di Rental PS.",
      "th": "{items} — รับคำสั่งในหน้า Rental PS",
      "fil": "{items} — tanggapin sa Rental PS.",
      "vi": "{items} — xác nhận trong Rental PS."
    }
  },
  "requestExtend": {
    "title": {
      "id": "⏱️ {unit}: minta tambah {n} menit",
      "en": "⏱️ {unit}: wants {n} more minutes",
      "ms": "⏱️ {unit}: minta tambah {n} minit",
      "th": "⏱️ {unit}: ขอเพิ่ม {n} นาที",
      "fil": "⏱️ {unit}: humihingi ng dagdag na {n} minuto",
      "vi": "⏱️ {unit}: xin thêm {n} phút"
    },
    "body": {
      "id": "Terima atau tolak di Rental PS.",
      "en": "Accept or reject it in Rental PS.",
      "ms": "Terima atau tolak di Rental PS.",
      "th": "รับหรือปฏิเสธในหน้า Rental PS",
      "fil": "Tanggapin o tanggihan sa Rental PS.",
      "vi": "Chấp nhận hoặc từ chối trong Rental PS."
    }
  },
  "requestCall": {
    "title": {
      "id": "🙋 {unit}: panggil kasir",
      "en": "🙋 {unit}: calling the cashier",
      "ms": "🙋 {unit}: panggil juruwang",
      "th": "🙋 {unit}: เรียกแคชเชียร์",
      "fil": "🙋 {unit}: tumatawag sa cashier",
      "vi": "🙋 {unit}: gọi thu ngân"
    },
    "body": {
      "id": "{reason}",
      "en": "{reason}",
      "ms": "{reason}",
      "th": "{reason}",
      "fil": "{reason}",
      "vi": "{reason}"
    }
  },
  "booking": {
    "title": {
      "id": "📅 Booking online baru",
      "en": "📅 New online booking",
      "ms": "📅 Tempahan dalam talian baharu",
      "th": "📅 มีการจองออนไลน์ใหม่",
      "fil": "📅 Bagong online booking",
      "vi": "📅 Có đặt chỗ online mới"
    },
    "body": {
      "id": "{customer} · {when}",
      "en": "{customer} · {when}",
      "ms": "{customer} · {when}",
      "th": "{customer} · {when}",
      "fil": "{customer} · {when}",
      "vi": "{customer} · {when}"
    }
  },
  "bookingWaitlist": {
    "title": {
      "id": "📅 Booking masuk daftar tunggu",
      "en": "📅 Booking added to the waitlist",
      "ms": "📅 Tempahan masuk senarai menunggu",
      "th": "📅 การจองเข้าคิวรอ",
      "fil": "📅 Booking sa waitlist",
      "vi": "📅 Đặt chỗ vào danh sách chờ"
    },
    "body": {
      "id": "{customer} · {when}",
      "en": "{customer} · {when}",
      "ms": "{customer} · {when}",
      "th": "{customer} · {when}",
      "fil": "{customer} · {when}",
      "vi": "{customer} · {when}"
    }
  },
  "payment": {
    "title": {
      "id": "💳 Pembayaran {method} diterima",
      "en": "💳 {method} payment received",
      "ms": "💳 Bayaran {method} diterima",
      "th": "💳 ได้รับชำระเงิน {method}",
      "fil": "💳 Natanggap ang {method} payment",
      "vi": "💳 Đã nhận thanh toán {method}"
    },
    "body": {
      "id": "{amount} sudah masuk.",
      "en": "{amount} received.",
      "ms": "{amount} telah diterima.",
      "th": "ได้รับ {amount} แล้ว",
      "fil": "Natanggap ang {amount}.",
      "vi": "Đã nhận {amount}."
    }
  },
  "fraud": {
    "title": {
      "id": "🚩 Shift {staff} perlu ditinjau",
      "en": "🚩 {staff}'s shift needs review",
      "ms": "🚩 Syif {staff} perlu disemak",
      "th": "🚩 กะของ {staff} ต้องตรวจสอบ",
      "fil": "🚩 Kailangang suriin ang shift ni {staff}",
      "vi": "🚩 Ca của {staff} cần xem xét"
    },
    "body": {
      "id": "{flags}",
      "en": "{flags}",
      "ms": "{flags}",
      "th": "{flags}",
      "fil": "{flags}",
      "vi": "{flags}"
    }
  },
  "lowStock": {
    "title": {
      "id": "📦 Stok menipis: {product}",
      "en": "📦 Low stock: {product}",
      "ms": "📦 Stok rendah: {product}",
      "th": "📦 สต็อกใกล้หมด: {product}",
      "fil": "📦 Paubos na: {product}",
      "vi": "📦 Sắp hết hàng: {product}"
    },
    "body": {
      "id": "Sisa {qty} {uom}.",
      "en": "{qty} {uom} left.",
      "ms": "Baki {qty} {uom}.",
      "th": "เหลือ {qty} {uom}",
      "fil": "{qty} {uom} na lang.",
      "vi": "Còn {qty} {uom}."
    }
  },
  "shiftSummary": {
    "title": {
      "id": "🧾 Shift {staff} ditutup",
      "en": "🧾 {staff}'s shift closed",
      "ms": "🧾 Syif {staff} ditutup",
      "th": "🧾 ปิดกะของ {staff} แล้ว",
      "fil": "🧾 Isinara ang shift ni {staff}",
      "vi": "🧾 Đã đóng ca của {staff}"
    },
    "body": {
      "id": "Pemasukan {income} · {orders} transaksi · selisih kas {variance}",
      "en": "Income {income} · {orders} transactions · cash variance {variance}",
      "ms": "Pendapatan {income} · {orders} transaksi · beza tunai {variance}",
      "th": "รายรับ {income} · {orders} รายการ · ส่วนต่างเงินสด {variance}",
      "fil": "Kita {income} · {orders} transaksyon · diperensya sa cash {variance}",
      "vi": "Thu {income} · {orders} giao dịch · chênh lệch tiền mặt {variance}"
    }
  },
  "test": {
    "title": {
      "id": "🔔 Notifikasi NEXBILL aktif",
      "en": "🔔 NEXBILL notifications are on",
      "ms": "🔔 Pemberitahuan NEXBILL aktif",
      "th": "🔔 เปิดการแจ้งเตือน NEXBILL แล้ว",
      "fil": "🔔 Naka-on ang NEXBILL notifications",
      "vi": "🔔 Thông báo NEXBILL đã bật"
    },
    "body": {
      "id": "HP ini akan menerima notifikasi outlet.",
      "en": "This phone will receive outlet notifications.",
      "ms": "Telefon ini akan menerima pemberitahuan outlet.",
      "th": "มือถือนี้จะได้รับการแจ้งเตือนของสาขา",
      "fil": "Makakatanggap ang phone na ito ng outlet notifications.",
      "vi": "Điện thoại này sẽ nhận thông báo của cơ sở."
    }
  },
  "customerFallback": {
    "title": {
      "id": "pelanggan",
      "en": "customer",
      "ms": "pelanggan",
      "th": "ลูกค้า",
      "fil": "customer",
      "vi": "khách"
    },
    "body": {
      "id": "",
      "en": "",
      "ms": "",
      "th": "",
      "fil": "",
      "vi": ""
    }
  }
} as const;

export type PushTemplate = Exclude<keyof typeof TEMPLATES, "customerFallback">;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : ""));
}

/** Judul & isi notifikasi siap kirim (dipangkas agar tidak terpotong aneh di Android). */
export function renderPush(template: PushTemplate, lang: PushLang, vars: Record<string, string | number> = {}): { title: string; body: string } {
  const t = TEMPLATES[template];
  const v = { ...vars };
  if (!v.customer) v.customer = TEMPLATES.customerFallback.title[lang];
  const title = fill(t.title[lang] ?? t.title.id, v).trim().slice(0, 80);
  const body = fill(t.body[lang] ?? t.body.id, v).replace(/\s+·\s*$/, "").trim().slice(0, 180);
  return { title, body };
}

/** Langganan push yang sudah tidak berlaku (dihapus dari server push) → hapus dari database. */
export function isGoneStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}

/** Hapus langganan setelah sekian kali gagal kirim beruntun (selain 404/410). */
export const MAX_PUSH_FAILURES = 5;

export function formatIdr(n: number): string {
  return `Rp${Math.round(n || 0).toLocaleString("id-ID")}`;
}
