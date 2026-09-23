import { db } from "@/db/client";
import { tvScreens, tvScreensaverSettings, rentalUnits, rentalSessions, outlets, devices } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";
import {
  generatePairingCode,
  generateScreenToken,
  isPairingCodeValid,
  normalizePairingCode,
  pairingCodeExpiry,
  validatePin,
} from "@/lib/tv/pairing";
import { computeUnitView, nightDimOpacity, type TvUnitView } from "@/lib/tv/view";
import { assessTvEligibility, canPairScreen, type TvEligibility } from "@/lib/tv/eligibility";

/**
 * Lapisan basis data TV Screensaver. Semua yang menyentuh `db` ada di sini; perhitungan murninya
 * di lib/tv/view.ts dan lib/tv/pairing.ts (lihat komentar di kedua berkas itu).
 */

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

/** #rrggbb saja. Nilai ini ditulis langsung ke atribut style di halaman TV, jadi apa pun yang bukan warna heks ditolak, bukan "dibersihkan seadanya". */
const safeAccent = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toLowerCase() : fallback;

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, 120) : null;
};

export type TvSettingsRow = typeof tvScreensaverSettings.$inferSelect;

/**
 * Baris setelan outlet, dibuat malas saat pertama kali dibutuhkan.
 *
 * onConflictDoNothing + baca ulang, bukan "cek lalu sisipkan": halaman Pengaturan dan polling
 * /api/tv/state bisa tiba bersamaan untuk outlet yang sama, dan pola cek-lalu-sisipkan akan
 * membuat dua baris (atau melempar galat unik) di celah antara keduanya. Unique index
 * tv_screensaver_settings_outlet_idx yang menjadi penengahnya.
 */
export async function getOrCreateTvSettings(outletId: string): Promise<TvSettingsRow> {
  const [existing] = await db.select().from(tvScreensaverSettings).where(eq(tvScreensaverSettings.outletId, outletId)).limit(1);
  if (existing) return existing;

  await db.insert(tvScreensaverSettings).values({ outletId }).onConflictDoNothing({ target: tvScreensaverSettings.outletId });
  const [row] = await db.select().from(tvScreensaverSettings).where(eq(tvScreensaverSettings.outletId, outletId)).limit(1);
  if (!row) throw new Error("Gagal menyiapkan pengaturan TV Screensaver untuk outlet ini.");
  return row;
}

export interface UpdateTvSettingsInput {
  idleMinutes?: number;
  headline?: string | null;
  tagline?: string | null;
  priceText?: string | null;
  footerText?: string | null;
  showClock?: boolean;
  showUnitStatus?: boolean;
  showBookingQr?: boolean;
  showWifi?: boolean;
  accentColor?: string;
  nightModeEnabled?: boolean;
  nightStartHour?: number;
  nightEndHour?: number;
  nightDimPercent?: number;
  /** "" atau null = hapus PIN (kembali ke unlockMode "none"). Tidak dikirim sama sekali = biarkan apa adanya. */
  unlockPin?: string | null;
}

export async function updateTvSettings(outletId: string, input: UpdateTvSettingsInput): Promise<TvSettingsRow> {
  const current = await getOrCreateTvSettings(outletId);
  // Record<string, unknown>, bukan Partial<TvSettingsRow>: itu bentuk yang sudah terbukti lolos
  // pengetikan Drizzle di route lain repo ini (lihat platform-admin/products/[id]/route.ts).
  // Partial dari $inferSelect tidak selalu sepadan dengan tipe yang diminta .set(), karena kolom
  // dengan nilai bawaan punya bentuk berbeda antara $inferSelect dan $inferInsert.
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (input.idleMinutes !== undefined) patch.idleMinutes = clampInt(input.idleMinutes, 1, 30, current.idleMinutes);
  if (input.headline !== undefined) patch.headline = trimOrNull(input.headline);
  if (input.tagline !== undefined) patch.tagline = trimOrNull(input.tagline);
  if (input.priceText !== undefined) patch.priceText = trimOrNull(input.priceText);
  if (input.footerText !== undefined) patch.footerText = trimOrNull(input.footerText);
  if (input.showClock !== undefined) patch.showClock = !!input.showClock;
  if (input.showUnitStatus !== undefined) patch.showUnitStatus = !!input.showUnitStatus;
  if (input.showBookingQr !== undefined) patch.showBookingQr = !!input.showBookingQr;
  if (input.showWifi !== undefined) patch.showWifi = !!input.showWifi;
  if (input.accentColor !== undefined) patch.accentColor = safeAccent(input.accentColor, current.accentColor);
  if (input.nightModeEnabled !== undefined) patch.nightModeEnabled = !!input.nightModeEnabled;
  if (input.nightStartHour !== undefined) patch.nightStartHour = clampInt(input.nightStartHour, 0, 23, current.nightStartHour);
  if (input.nightEndHour !== undefined) patch.nightEndHour = clampInt(input.nightEndHour, 0, 23, current.nightEndHour);
  if (input.nightDimPercent !== undefined) patch.nightDimPercent = clampInt(input.nightDimPercent, 0, 90, current.nightDimPercent);

  if (input.unlockPin !== undefined) {
    const pin = typeof input.unlockPin === "string" ? input.unlockPin.trim() : "";
    if (!pin) {
      patch.unlockPinHash = null;
      patch.unlockMode = "none";
    } else {
      const check = validatePin(pin);
      if (!check.ok) throw new Error(check.error);
      patch.unlockPinHash = await bcrypt.hash(pin, 10);
      patch.unlockMode = "pin";
    }
  }

  const [row] = await db.update(tvScreensaverSettings).set(patch).where(eq(tvScreensaverSettings.outletId, outletId)).returning();
  return row;
}

/** ---------------- KELAYAKAN UNIT ---------------- */

export interface TvUnitCompatibilityRow {
  id: string;
  name: string;
  tvType: string;
  deviceProtocol: string | null;
  eligibility: TvEligibility;
}

/**
 * Semua unit aktif outlet beserta kelayakannya untuk TV Screensaver — sumber dropdown "Unit
 * rental" dan ringkasan kompatibilitas di Pengaturan.
 *
 * Protokol diambil dari perangkat yang benar-benar terhubung ke unit (rentalUnits.deviceId ->
 * devices.protocol), bukan ditebak dari tipe TV-nya: dua TV Android yang identik bisa punya
 * nasib berbeda — yang satu dikontrol ADB (layar tetap hidup), yang lain lewat smart plug (bisa
 * mati total). Justru itu yang menentukan apakah screensaver-nya akan pernah terlihat.
 */
export async function listTvUnitCompatibility(outletId: string): Promise<TvUnitCompatibilityRow[]> {
  const units = await db
    .select({ id: rentalUnits.id, name: rentalUnits.name, tvType: rentalUnits.tvType, deviceId: rentalUnits.deviceId })
    .from(rentalUnits)
    .where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));

  const deviceIds = [...new Set(units.map((u) => u.deviceId).filter((v): v is string => !!v))];
  const deviceRows = deviceIds.length
    ? await db.select({ id: devices.id, protocol: devices.protocol }).from(devices).where(inArray(devices.id, deviceIds))
    : [];
  const protocolById = new Map(deviceRows.map((d) => [d.id, d.protocol as string]));

  return units
    .map((u) => {
      const deviceProtocol = u.deviceId ? protocolById.get(u.deviceId) ?? null : null;
      return { id: u.id, name: u.name, tvType: u.tvType, deviceProtocol, eligibility: assessTvEligibility(u.tvType, deviceProtocol) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }));
}

/**
 * Kelayakan satu unit, sekaligus memastikan unit itu milik outlet ini. Melempar galat dengan
 * alasan yang bisa dibaca merchant bila unit tidak ditemukan atau tidak didukung.
 *
 * Ditegakkan DI SERVER, bukan hanya dengan menyembunyikan pilihan di dropdown: dropdown hanyalah
 * kenyamanan tampilan, sedangkan aturan "hanya TV Android" adalah keputusan bisnis — ia harus
 * berlaku juga untuk permintaan yang tidak datang dari halaman Pengaturan.
 */
async function assertUnitCanHaveScreen(outletId: string, rentalUnitId: string): Promise<TvEligibility> {
  const [unit] = await db
    .select({ id: rentalUnits.id, tvType: rentalUnits.tvType, deviceId: rentalUnits.deviceId })
    .from(rentalUnits)
    .where(and(eq(rentalUnits.id, rentalUnitId), eq(rentalUnits.outletId, outletId)))
    .limit(1);
  if (!unit) throw new Error("Unit rental tidak ditemukan di outlet ini.");

  let protocol: string | null = null;
  if (unit.deviceId) {
    const [device] = await db.select({ protocol: devices.protocol }).from(devices).where(eq(devices.id, unit.deviceId)).limit(1);
    protocol = (device?.protocol as string | undefined) ?? null;
  }

  const eligibility = assessTvEligibility(unit.tvType, protocol);
  if (!canPairScreen(eligibility)) throw new Error(eligibility.reason);
  return eligibility;
}

/** ---------------- LAYAR ---------------- */

export interface TvScreenListRow {
  id: string;
  name: string;
  rentalUnitId: string | null;
  unitName: string | null;
  isActive: boolean;
  isPaired: boolean;
  lastSeenAt: string | null;
  /** Kode pairing hanya dikembalikan selama masih berlaku — kode kedaluwarsa dilaporkan null supaya dashboard tidak menampilkan angka yang sudah tidak bisa dipakai. */
  pairingCode: string | null;
  pairingCodeExpiresAt: string | null;
  /**
   * Kelayakan unit yang diwakili layar ini SAAT INI — bukan saat layar dibuat. Tipe TV atau
   * perangkat kontrol sebuah unit bisa diganti belakangan (mis. dari Android TV ke Smart TV), dan
   * layar yang sudah terpasang harus menunjukkan bahwa ia kini tidak lagi didukung, bukan diam-diam
   * terus berjalan di setup yang aturannya melarang. null = layar tanpa unit (branding saja).
   */
  eligibility: TvEligibility | null;
}

export async function listTvScreens(outletId: string): Promise<TvScreenListRow[]> {
  const [screens, compat] = await Promise.all([
    db.select().from(tvScreens).where(eq(tvScreens.outletId, outletId)),
    listTvUnitCompatibility(outletId),
  ]);
  const unitIds = [...new Set(screens.map((s) => s.rentalUnitId).filter((v): v is string => !!v))];
  // Unit yang sudah diarsipkan tidak ada di `compat` (yang hanya memuat unit aktif), jadi namanya
  // diambil terpisah — layar yang masih menunjuk ke unit arsip tetap harus bisa dikenali di daftar.
  const units = unitIds.length ? await db.select().from(rentalUnits).where(inArray(rentalUnits.id, unitIds)) : [];
  const unitById = new Map(units.map((u) => [u.id, u]));
  const compatById = new Map(compat.map((c) => [c.id, c]));
  const now = new Date();

  return screens
    .map((s) => {
      const codeStillValid = isPairingCodeValid(s.pairingCodeExpiresAt, now);
      const unit = s.rentalUnitId ? unitById.get(s.rentalUnitId) : undefined;
      const eligibility = s.rentalUnitId
        ? compatById.get(s.rentalUnitId)?.eligibility ??
          // Unit arsip / tak ditemukan: nilai dari tipe TV-nya saja, tanpa perangkat.
          assessTvEligibility(unit?.tvType ?? null, null)
        : null;
      return {
        id: s.id,
        name: s.name,
        rentalUnitId: s.rentalUnitId,
        eligibility,
        unitName: unit?.name ?? null,
        isActive: s.isActive,
        isPaired: !!s.pairedAt,
        lastSeenAt: s.lastSeenAt,
        pairingCode: codeStillValid ? s.pairingCode : null,
        pairingCodeExpiresAt: codeStillValid ? s.pairingCodeExpiresAt : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Membuat layar baru beserta kode pairing pertamanya.
 *
 * Bentrokan kode ditangani dengan MENCOBA LAGI, bukan dengan memeriksa lebih dulu — pemeriksaan
 * lebih dulu punya celah balapan yang sama seperti cek-lalu-sisipkan di atas. Dengan sejuta
 * kemungkinan kode dan hanya segelintir kode aktif pada satu waktu, percobaan kedua praktis selalu
 * berhasil; batas 5 ada supaya kegagalan yang sesungguhnya berhenti, bukan berputar selamanya.
 */
export async function createTvScreen(outletId: string, name: string, rentalUnitId: string | null) {
  const cleanName = (name ?? "").trim().slice(0, 60);
  if (!cleanName) throw new Error("Nama layar wajib diisi.");

  if (rentalUnitId) await assertUnitCanHaveScreen(outletId, rentalUnitId);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .insert(tvScreens)
        .values({
          outletId,
          name: cleanName,
          rentalUnitId: rentalUnitId || null,
          token: generateScreenToken(),
          pairingCode: generatePairingCode(),
          pairingCodeExpiresAt: pairingCodeExpiry(),
        })
        .returning();
      return row;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 4 || !message.includes("tv_screens_pairing_code_idx")) throw err;
    }
  }
  throw new Error("Gagal membuat kode pairing — coba lagi.");
}

/** Kode pairing baru untuk layar yang sudah ada (kode lama hangus seketika karena kolomnya ditimpa). */
export async function regenerateTvPairingCode(outletId: string, screenId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await db
        .update(tvScreens)
        .set({ pairingCode: generatePairingCode(), pairingCodeExpiresAt: pairingCodeExpiry(), updatedAt: new Date().toISOString() })
        .where(and(eq(tvScreens.id, screenId), eq(tvScreens.outletId, outletId)))
        .returning();
      if (!row) throw new Error("Layar tidak ditemukan.");
      return row;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 4 || !message.includes("tv_screens_pairing_code_idx")) throw err;
    }
  }
  throw new Error("Gagal membuat kode pairing — coba lagi.");
}

export async function updateTvScreen(
  outletId: string,
  screenId: string,
  patch: { name?: string; rentalUnitId?: string | null; isActive?: boolean }
) {
  const set: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (patch.name !== undefined) {
    const cleanName = patch.name.trim().slice(0, 60);
    if (!cleanName) throw new Error("Nama layar wajib diisi.");
    set.name = cleanName;
  }
  if (patch.rentalUnitId !== undefined) {
    if (patch.rentalUnitId) await assertUnitCanHaveScreen(outletId, patch.rentalUnitId);
    set.rentalUnitId = patch.rentalUnitId || null;
    // Layar dipindah ke unit lain → hasil tes otomatisasi (NexbillAgent v1.2) tidak berlaku lagi:
    // yang dites dulu adalah TV unit LAMA. Otomatisasi dimatikan sampai dites ulang. Hanya
    // dilakukan kalau unitnya benar-benar berubah, bukan setiap kali formulir disimpan.
    const [current] = await db.select({ rentalUnitId: tvScreens.rentalUnitId }).from(tvScreens).where(and(eq(tvScreens.id, screenId), eq(tvScreens.outletId, outletId))).limit(1);
    if (current && (current.rentalUnitId ?? null) !== (patch.rentalUnitId || null)) {
      set.autoSwitchVerifiedAt = null;
      set.autoSwitchEnabled = false;
    }
  }
  if (patch.isActive !== undefined) set.isActive = !!patch.isActive;

  const [row] = await db.update(tvScreens).set(set).where(and(eq(tvScreens.id, screenId), eq(tvScreens.outletId, outletId))).returning();
  if (!row) throw new Error("Layar tidak ditemukan.");
  return row;
}

/**
 * Hapus permanen. Tidak ada soft delete di sini, dan itu disengaja: baris ini tidak dirujuk oleh
 * transaksi, jurnal, atau laporan mana pun — ia hanya memegang token sebuah perangkat. Menyimpan
 * token layar yang sudah dicopot justru kebalikan dari yang diinginkan: mencabut layar harus
 * benar-benar mencabut aksesnya.
 */
export async function deleteTvScreen(outletId: string, screenId: string) {
  const [row] = await db.delete(tvScreens).where(and(eq(tvScreens.id, screenId), eq(tvScreens.outletId, outletId))).returning();
  if (!row) throw new Error("Layar tidak ditemukan.");
  return row;
}

/** ---------------- SISI TV (PUBLIK) ---------------- */

/**
 * Menukar kode pairing 6 digit dengan token layar.
 *
 * Kode dihanguskan (pairingCode: null) dalam operasi UPDATE yang sama yang mencocokkannya — jadi
 * dua TV yang mengetik kode sama pada saat yang sama tidak bisa dua-duanya berhasil: yang kedua
 * tidak akan menemukan baris yang cocok lagi. Itu sebabnya penghangusan tidak dilakukan lewat
 * SELECT terpisah lalu UPDATE.
 */
export async function pairTvScreen(rawCode: string): Promise<{ token: string; screenName: string; outletName: string }> {
  const code = normalizePairingCode(rawCode);
  if (!code) throw new Error("Kode harus 6 digit angka.");

  const [screen] = await db.select().from(tvScreens).where(eq(tvScreens.pairingCode, code)).limit(1);
  if (!screen) throw new Error("Kode tidak dikenal. Periksa lagi di Pengaturan > TV Screensaver.");
  if (!isPairingCodeValid(screen.pairingCodeExpiresAt)) throw new Error("Kode sudah kedaluwarsa. Buat kode baru di dashboard.");

  const now = new Date().toISOString();
  const [paired] = await db
    .update(tvScreens)
    .set({ pairingCode: null, pairingCodeExpiresAt: null, pairedAt: now, lastSeenAt: now, updatedAt: now })
    .where(and(eq(tvScreens.id, screen.id), eq(tvScreens.pairingCode, code)))
    .returning();
  if (!paired) throw new Error("Kode sudah dipakai layar lain. Buat kode baru di dashboard.");

  const [outlet] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, paired.outletId)).limit(1);
  return { token: paired.token, screenName: paired.name, outletName: outlet?.name ?? "Outlet" };
}

export interface TvStateResponse {
  /**
   * false ketika feature flag TV_SCREENSAVER_ENABLED dimatikan, atau layar ini dinonaktifkan.
   * Layar TETAP mendapat balasan 200 yang sah dengan bendera ini, bukan galat — supaya TV
   * menampilkan pesan tenang "screensaver dimatikan" dan tetap melakukan polling, lalu hidup lagi
   * sendiri begitu saklarnya dinyalakan. Balasan galat akan membuat layar mati mendadak dan
   * seseorang harus naik tangga untuk memasangkannya ulang.
   */
  enabled: boolean;
  /** Kenapa `enabled` false, dalam kalimat yang bisa dibaca staf yang berdiri di depan TV. null bila menyala. */
  disabledReason: string | null;
  outletName: string;
  logoUrl: string | null;
  screenName: string;
  unitName: string | null;
  consoleType: string | null;
  hourlyRate: number | null;
  view: TvUnitView;
  display: {
    idleMinutes: number;
    headline: string | null;
    tagline: string | null;
    priceText: string | null;
    footerText: string | null;
    showClock: boolean;
    showUnitStatus: boolean;
    showBookingQr: boolean;
    showWifi: boolean;
    wifiSsid: string | null;
    accentColor: string;
    requiresPin: boolean;
    nightDimOpacity: number;
  };
  bookingUrl: string | null;
  serverTime: string;
}

/**
 * Seluruh isi layar dalam satu balasan, dicari dari token.
 *
 * Yang SENGAJA TIDAK ADA di sini: nama pelanggan, nilai tagihan berjalan, rincian F&B, nomor
 * telepon. Layar ini menghadap ruang publik dan tidak bisa diawasi — siapa pun yang duduk di bilik
 * bisa membacanya, dan token-nya sekali bocor berlaku sampai dicabut. Jadi batasnya ditarik di
 * sini, bukan di komponen tampilan: yang tidak pernah dikirim tidak bisa bocor. Status unit dan
 * sisa waktu sudah diketahui orang yang duduk di depannya.
 *
 * wifiPassword juga tidak pernah dikirim meski showWifi menyala — hanya SSID-nya. Menampilkan kata
 * sandi WiFi di layar yang terlihat dari jalan adalah keputusan yang harus diambil merchant secara
 * sadar, bukan efek samping menyalakan screensaver.
 */
export async function getTvState(token: string): Promise<TvStateResponse> {
  const [screen] = await db.select().from(tvScreens).where(eq(tvScreens.token, token)).limit(1);
  if (!screen) throw new Error("UNKNOWN_SCREEN");

  const now = new Date();
  // Denyut "terakhir terlihat" — DITUNGGU, bukan dilepas begitu saja. Versi pertama fungsi ini
  // menulisnya tanpa await supaya balasan tidak tertahan, tapi di lingkungan serverless (Vercel,
  // tempat aplikasi ini dijalankan) proses bisa dihentikan begitu balasan terkirim, jadi tulisan
  // yang tidak ditunggu kerap hilang diam-diam. Akibatnya kolom "Terakhir aktif" di dashboard akan
  // selamanya kosong — tepatnya satu-satunya cara merchant tahu layar di bilik masih hidup atau
  // sudah dicabut orang. Satu UPDATE berindeks jauh lebih murah daripada fitur yang berbohong.
  await db.update(tvScreens).set({ lastSeenAt: now.toISOString() }).where(eq(tvScreens.id, screen.id));

  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, screen.outletId)).limit(1);
  const settings = await getOrCreateTvSettings(screen.outletId);

  const [moduleOn, unitStatusOn, bookingQrOn] = await Promise.all([
    isFeatureEnabled(screen.outletId, "TV_SCREENSAVER_ENABLED"),
    isFeatureEnabled(screen.outletId, "TV_SCREENSAVER_UNIT_STATUS"),
    isFeatureEnabled(screen.outletId, "TV_SCREENSAVER_BOOKING_QR"),
  ]);

  let unit: typeof rentalUnits.$inferSelect | null = null;
  let session: typeof rentalSessions.$inferSelect | null = null;
  if (screen.rentalUnitId) {
    const [u] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, screen.rentalUnitId)).limit(1);
    unit = u ?? null;
    if (u) {
      const [s] = await db
        .select()
        .from(rentalSessions)
        .where(and(eq(rentalSessions.rentalUnitId, u.id), inArray(rentalSessions.status, ["running", "paused"])))
        .limit(1);
      session = s ?? null;
    }
  }

  const view = computeUnitView(
    unit?.status ?? null,
    session
      ? {
          status: session.status as "running" | "paused",
          startedAt: session.startedAt,
          accumulatedPauseMs: session.accumulatedPauseMs,
          pausedAt: session.pausedAt,
          plannedMinutes: session.plannedMinutes,
          extendedMinutes: session.extendedMinutes,
        }
      : null,
    now.getTime()
  );

  const showBookingQr = settings.showBookingQr && bookingQrOn && !!outlet?.slug;

  // Aturan "hanya TV Android" juga berlaku untuk layar yang SUDAH terpasang: kalau tipe TV unitnya
  // diganti belakangan (mis. menjadi Smart TV), layar berhenti dengan alasan yang jelas alih-alih
  // terus berjalan di setup yang tidak didukung. Cukup tipe TV-nya yang dinilai — penolakan tidak
  // pernah bergantung pada perangkat kontrol (lihat lib/tv/eligibility.ts), jadi query perangkat
  // tambahan di jalur polling ini tidak diperlukan.
  const unitEligibility = unit ? assessTvEligibility(unit.tvType, null) : null;

  let disabledReason: string | null = null;
  if (!moduleOn) disabledReason = "Screensaver dimatikan di Pengaturan › Feature Management.";
  else if (!screen.isActive) disabledReason = "Layar ini dinonaktifkan di Pengaturan › TV Screensaver.";
  else if (unitEligibility && !canPairScreen(unitEligibility)) disabledReason = unitEligibility.reason;

  return {
    enabled: disabledReason === null,
    disabledReason,
    outletName: outlet?.name ?? "Outlet",
    logoUrl: outlet?.logoUrl ?? null,
    screenName: screen.name,
    unitName: unit?.name ?? null,
    consoleType: unit?.consoleType ?? null,
    hourlyRate: unit?.hourlyRate ?? null,
    view,
    display: {
      idleMinutes: settings.idleMinutes,
      headline: settings.headline,
      tagline: settings.tagline,
      priceText: settings.priceText,
      footerText: settings.footerText,
      showClock: settings.showClock,
      showUnitStatus: settings.showUnitStatus && unitStatusOn,
      showBookingQr,
      showWifi: settings.showWifi && !!outlet?.wifiSsid,
      wifiSsid: settings.showWifi ? outlet?.wifiSsid ?? null : null,
      accentColor: settings.accentColor,
      requiresPin: settings.unlockMode === "pin" && !!settings.unlockPinHash,
      nightDimOpacity: nightDimOpacity(settings.nightModeEnabled, settings.nightDimPercent, settings.nightStartHour, settings.nightEndHour, now),
    },
    bookingUrl: showBookingQr && outlet?.slug ? `/book/${outlet.slug}` : null,
    serverTime: now.toISOString(),
  };
}

/**
 * Memeriksa PIN yang diketik di TV.
 *
 * bcrypt.compare tetap dijalankan terhadap hash boneka ketika layar tidak dikenal, supaya lamanya
 * balasan tidak membocorkan apakah sebuah token sah — tanpa itu, token yang benar bisa dibedakan
 * dari yang salah hanya dengan mengukur waktu balasan.
 */
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function verifyTvPin(token: string, pin: string): Promise<boolean> {
  const [screen] = await db.select().from(tvScreens).where(eq(tvScreens.token, token)).limit(1);
  if (!screen) {
    await bcrypt.compare(pin ?? "", DUMMY_HASH);
    return false;
  }
  const settings = await getOrCreateTvSettings(screen.outletId);
  if (settings.unlockMode !== "pin" || !settings.unlockPinHash) return true; // tanpa PIN, layar memang boleh dibuka siapa saja
  return bcrypt.compare(pin ?? "", settings.unlockPinHash);
}
