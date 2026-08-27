import { db } from "@/db/client";
import { featureFlags, outlets, subscriptions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";

/**
 * Single source of truth for every per-outlet feature flag across every module (not just Home
 * Rental anymore — the file kept its original name/location to avoid a churny path rename, but
 * this registry + the listFeatureFlags/isFeatureEnabled/setFeatureFlag functions below are fully
 * generic and outlet/key-scoped, not Home-Rental-specific). Adding a new flag is exactly one
 * entry in one of the *_FLAG_DEFS arrays below (merged into ALL_FLAG_DEFS at the bottom) plus, if
 * it should actually gate something, a call to isFeatureEnabled() at the relevant guard point —
 * no schema migration needed, seedFeatureFlagsIfMissing inserts any row not yet present for an
 * outlet.
 *
 * `wired` marks flags whose gating is actually implemented by application code in the current
 * phase — the Feature Management UI shows a "Segera" badge on not-yet-wired flags so pre-
 * configuring one that doesn't do anything yet isn't misleading.
 *
 * `defaultEnabled` controls the seeded starting value for a brand-new flag row (see
 * seedFeatureFlagsIfMissing) — defaults to false (opt-in) when omitted, which is correct for a
 * genuinely new/optional module like Home Rental. A flag being added for an ALREADY-LIVE feature
 * (e.g. PPOB, which every outlet already had unconditional access to before Feature Management
 * existed for it) must set defaultEnabled: true, so introducing the toggle doesn't silently turn
 * the feature off for every existing outlet the moment this seeds their flag row.
 */
export interface FeatureFlagDef {
  key: string;
  parentKey: string | null;
  label: string;
  description: string;
  wired: boolean;
  defaultEnabled?: boolean;
}

export const HOME_RENTAL_FLAG_DEFS: FeatureFlagDef[] = [
  {
    key: "HOME_RENTAL_ENABLED",
    parentKey: null,
    label: "Home Rental / Sewa Dibawa Pulang",
    description: "Saklar utama. Jika OFF, seluruh menu, dashboard, booking, dan transaksi Home Rental disembunyikan dari user biasa — data lama tetap aman dan bisa diaktifkan kembali kapan saja.",
    wired: true,
  },
  { key: "HOME_RENTAL_PS3", parentKey: "HOME_RENTAL_ENABLED", label: "PlayStation 3", description: "Tampilkan PS3 sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_PS4", parentKey: "HOME_RENTAL_ENABLED", label: "PlayStation 4", description: "Tampilkan PS4 sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_PS5", parentKey: "HOME_RENTAL_ENABLED", label: "PlayStation 5", description: "Tampilkan PS5 sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_PLAYBOOK", parentKey: "HOME_RENTAL_ENABLED", label: "Playbox", description: "Tampilkan Playbox sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_TV32", parentKey: "HOME_RENTAL_ENABLED", label: "TV 32 inch", description: "Tampilkan TV 32\" sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_TV40", parentKey: "HOME_RENTAL_ENABLED", label: "TV 40 inch", description: "Tampilkan TV 40\" sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_TV43", parentKey: "HOME_RENTAL_ENABLED", label: "TV 43 inch", description: "Tampilkan TV 43\" sebagai produk Home Rental.", wired: true },
  { key: "HOME_RENTAL_DEPOSIT", parentKey: "HOME_RENTAL_ENABLED", label: "Security Deposit", description: "Wajibkan deposit keamanan saat checkout — dicatat terpisah dari revenue sebagai liability.", wired: true },
  { key: "HOME_RENTAL_DELIVERY", parentKey: "HOME_RENTAL_ENABLED", label: "Delivery / Antar-Jemput", description: "Izinkan opsi pengantaran/penjemputan (bukan hanya ambil sendiri di toko).", wired: true },
  { key: "HOME_RENTAL_CONTRACT", parentKey: "HOME_RENTAL_ENABLED", label: "Kontrak Digital", description: "Rental agreement digital dengan tanda tangan/konfirmasi pelanggan. (Segera — fase berikutnya)", wired: false },
  { key: "HOME_RENTAL_INSPECTION", parentKey: "HOME_RENTAL_ENABLED", label: "Inspeksi Sebelum/Sesudah", description: "Checklist kondisi + foto before/after saat checkout dan return. (Segera — fase berikutnya)", wired: false },
  { key: "HOME_RENTAL_DAMAGE", parentKey: "HOME_RENTAL_ENABLED", label: "Damage & Loss Management", description: "Pencatatan kerusakan/kehilangan aset dan potongan deposit. (Segera — fase berikutnya)", wired: false },
  { key: "HOME_RENTAL_RISK", parentKey: "HOME_RENTAL_ENABLED", label: "Customer Risk Control", description: "Skor risiko pelanggan dari riwayat sewa (telat, no-show, batal, aset rusak/hilang) + blacklist + approval otomatis untuk booking berisiko tinggi.", wired: true },
  { key: "HOME_RENTAL_REMINDER", parentKey: "HOME_RENTAL_ENABLED", label: "Reminder Otomatis", description: "Pengingat H-24/H-2 jam sebelum ambil, jatuh tempo, dan keterlambatan (overdue) — dikirim lewat WhatsApp jika fitur Notifikasi WhatsApp juga ON.", wired: true },
  { key: "HOME_RENTAL_WHATSAPP", parentKey: "HOME_RENTAL_ENABLED", label: "Notifikasi WhatsApp", description: "Kirim konfirmasi/reminder Home Rental via WhatsApp (memakai koneksi bot WhatsApp yang sama dengan modul Booking).", wired: true },
  { key: "HOME_RENTAL_TRACKING", parentKey: "HOME_RENTAL_ENABLED", label: "Consent-Based Tracking", description: "Pencatatan lokasi pengantaran berbasis persetujuan eksplisit pelanggan — tidak pernah aktif diam-diam. (Segera — fase berikutnya)", wired: false },
  { key: "HOME_RENTAL_AI", parentKey: "HOME_RENTAL_ENABLED", label: "AI Insights", description: "Analisis AI: aset paling laku, pelanggan berisiko, rekomendasi harga/deposit. (Segera — fase berikutnya)", wired: false },
];

/**
 * PPOB (Pembayaran Online — pulsa, token listrik, e-wallet top-up, transfer, tarik tunai) has
 * been a live, unconditionally-available module since before Feature Management existed for it
 * (see /dashboard/ppob and lib/ppob/engine.ts). A single master switch, no sub-features —
 * defaultEnabled: true so seeding this flag for an existing outlet never silently turns off a
 * feature they already had; only a superuser explicitly flipping it OFF afterward disables it.
 */
export const PPOB_FLAG_DEFS: FeatureFlagDef[] = [
  {
    key: "PPOB_ENABLED",
    parentKey: null,
    label: "PPOB (Pembayaran Online)",
    description: "Saklar utama modul PPOB — pulsa, token listrik, top-up e-wallet, transfer, dan tarik tunai. Jika OFF, menu PPOB disembunyikan dan transaksi baru tidak bisa dicatat — histori transaksi lama tetap aman dan bisa diakses lagi begitu diaktifkan kembali.",
    wired: true,
    defaultEnabled: true,
  },
];

/** Every module's flags in one flat list — add a new module by adding its own *_FLAG_DEFS array above and spreading it in here. */
export const ALL_FLAG_DEFS: FeatureFlagDef[] = [...HOME_RENTAL_FLAG_DEFS, ...PPOB_FLAG_DEFS];

const FLAG_DEF_BY_KEY = new Map(ALL_FLAG_DEFS.map((f) => [f.key, f]));

/**
 * True once this outlet's subscription has been granted the unlimited entitlement (see
 * subscriptions.hasUnlimitedEntitlement, set by grantUnlimitedEntitlementIfEligible() in
 * lib/subscription/service.ts on a successful payment against a plan with
 * subscriptionPlans.unlimitedEntitlement=true). Drives listFeatureFlags()/isFeatureEnabled()
 * below to report every flag as enabled, regardless of each flag's own stored per-outlet
 * value — "full max fitur" per the original requirement. Does NOT touch the stored `enabled`
 * column, so an admin's individual flag choices are preserved and instantly reappear if the
 * entitlement were ever revoked (no downgrade flow exists yet, but the data isn't destroyed).
 */
async function outletHasUnlimitedEntitlement(outletId: string): Promise<boolean> {
  const [sub] = await db
    .select({ v: subscriptions.hasUnlimitedEntitlement })
    .from(subscriptions)
    .where(eq(subscriptions.outletId, outletId))
    .limit(1);
  return sub?.v ?? false;
}

/**
 * Idempotent — inserts only rows not yet present for this outlet, all starting OFF. Safe to call on every read.
 *
 * Checks the outlet actually exists first. Without this, a stale session cookie whose
 * outletId no longer matches any row (e.g. issued before a DB reset/reseed) made this
 * insert fail with a raw Postgres foreign-key violation, surfaced to the client as an
 * opaque 500. That's a session problem, not a feature-flags problem — the caller should
 * see "log in again", not a constraint-name string.
 */
export async function seedFeatureFlagsIfMissing(outletId: string) {
  const [outletRow] = await db.select({ id: outlets.id }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  if (!outletRow) throw new Error("Sesi tidak valid — outlet untuk akun ini tidak ditemukan. Silakan logout lalu login ulang.");

  const existing = await db.select({ key: featureFlags.key }).from(featureFlags).where(eq(featureFlags.outletId, outletId));
  const existingKeys = new Set(existing.map((r) => r.key));
  const missing = ALL_FLAG_DEFS.filter((f) => !existingKeys.has(f.key));
  if (missing.length === 0) return;
  await db
    .insert(featureFlags)
    .values(missing.map((f) => ({ outletId, key: f.key, parentKey: f.parentKey, label: f.label, description: f.description, enabled: f.defaultEnabled ?? false })))
    .onConflictDoNothing({ target: [featureFlags.outletId, featureFlags.key] });
}

export interface FeatureFlagRow {
  key: string;
  parentKey: string | null;
  label: string;
  description: string | null;
  enabled: boolean;
  effectiveEnabled: boolean; // enabled AND (no parent OR parent effectiveEnabled) — what the app should actually honor
  wired: boolean;
  enabledBy: string | null;
  enabledAt: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

/** Full flag list for an outlet with cascade already resolved (a sub-flag whose parent is OFF reports effectiveEnabled=false regardless of its own stored value, without losing that stored value). */
export async function listFeatureFlags(outletId: string): Promise<FeatureFlagRow[]> {
  await seedFeatureFlagsIfMissing(outletId);
  const [rows, unlimited] = await Promise.all([
    db.select().from(featureFlags).where(eq(featureFlags.outletId, outletId)),
    outletHasUnlimitedEntitlement(outletId),
  ]);
  const enabledByKey = new Map(rows.map((r) => [r.key, r.enabled]));
  return rows
    .map((r) => {
      const def = FLAG_DEF_BY_KEY.get(r.key);
      const parentEnabled = r.parentKey ? (enabledByKey.get(r.parentKey) ?? false) : true;
      return {
        key: r.key,
        parentKey: r.parentKey,
        label: r.label,
        description: r.description,
        enabled: r.enabled,
        effectiveEnabled: unlimited || (r.enabled && parentEnabled),
        wired: def?.wired ?? false,
        enabledBy: r.enabledBy,
        enabledAt: r.enabledAt,
        updatedBy: r.updatedBy,
        updatedAt: r.updatedAt,
      };
    })
    .sort((a, b) => {
      // root flags first, then children grouped under their parent, stable by def order otherwise
      const ai = ALL_FLAG_DEFS.findIndex((f) => f.key === a.key);
      const bi = ALL_FLAG_DEFS.findIndex((f) => f.key === b.key);
      return ai - bi;
    });
}

/** Single flag's cascaded effective state — what every guard point in the app should call. Defaults to false (safe/off) if the flag row doesn't exist yet for some reason. Short-circuits to true for any outlet holding the unlimited entitlement (see outletHasUnlimitedEntitlement above). */
export async function isFeatureEnabled(outletId: string, key: string): Promise<boolean> {
  if (await outletHasUnlimitedEntitlement(outletId)) return true;
  return isFeatureEnabledUncached(outletId, key);
}

async function isFeatureEnabledUncached(outletId: string, key: string): Promise<boolean> {
  const def = FLAG_DEF_BY_KEY.get(key);
  if (!def) return false;
  const [row] = await db.select().from(featureFlags).where(and(eq(featureFlags.outletId, outletId), eq(featureFlags.key, key))).limit(1);
  if (!row || !row.enabled) return false;
  if (!def.parentKey) return true;
  return isFeatureEnabledUncached(outletId, def.parentKey);
}

/** Toggle a single flag. Caller (API route) is responsible for the owner/superuser role gate — this function just persists + audits. */
export async function setFeatureFlag(outletId: string, key: string, enabled: boolean, staffUserId: string | undefined) {
  const def = FLAG_DEF_BY_KEY.get(key);
  if (!def) throw new Error(`Feature flag "${key}" tidak dikenal.`);
  await seedFeatureFlagsIfMissing(outletId);

  const [before] = await db.select().from(featureFlags).where(and(eq(featureFlags.outletId, outletId), eq(featureFlags.key, key))).limit(1);
  const now = new Date().toISOString();
  const [after] = await db
    .update(featureFlags)
    .set({
      enabled,
      updatedBy: staffUserId,
      updatedAt: now,
      ...(enabled ? { enabledBy: staffUserId, enabledAt: now } : {}),
    })
    .where(and(eq(featureFlags.outletId, outletId), eq(featureFlags.key, key)))
    .returning();

  await logAudit({
    outletId,
    staffUserId,
    action: enabled ? "feature_flag_enabled" : "feature_flag_disabled",
    entityType: "feature_flag",
    entityId: key,
    before,
    after,
  });

  return after;
}
