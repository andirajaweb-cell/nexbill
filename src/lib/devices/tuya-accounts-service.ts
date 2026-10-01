import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { devices, outlets, outletTuyaAccounts } from "@/db/schema";
import {
  countDevicesPerAccount,
  maskSecret,
  mergeTuyaConfig,
  parseTuyaConfig,
  sortAccounts,
  TUYA_TRIAL_DEVICE_LIMIT,
  validateTuyaAccountInput,
  type TuyaAccountInput,
} from "./tuya-accounts";
import { findTuyaAccountForDevice, forgetTuyaToken, loadTuyaAccounts } from "./adapters/tuya";

/**
 * Dipanggil API perangkat (POST/PATCH) sebelum menyimpan perangkat Tuya: memastikan
 * config.accountId terisi akun yang benar.
 *  - akun dipilih manual → dicek masih ada di outlet ini;
 *  - "Otomatis" + outlet punya >1 akun → cari akun yang memiliki Device ID itu di Tuya Cloud;
 *  - hanya 1 akun → langsung pakai akun itu.
 * Mengembalikan config baru + peringatan kalau akun sudah melewati perkiraan batas Trial.
 */
export async function resolveTuyaDeviceConfig(
  outletId: string,
  config: string | null | undefined,
  excludeDeviceId?: string,
): Promise<{ config: string | null; warning?: string }> {
  const cfg = parseTuyaConfig(config);
  if (!cfg.deviceId) return { config: config ?? null };
  const accounts = await loadTuyaAccounts(outletId);
  const real = accounts.filter((a) => a.id !== "legacy");
  if (real.length === 0) return { config: config ?? null };

  let accountId = cfg.accountId;
  if (accountId) {
    if (!real.some((a) => a.id === accountId)) throw new Error("Akun Tuya yang dipilih tidak ditemukan. Muat ulang halaman lalu pilih lagi.");
  } else if (real.length === 1) {
    accountId = real[0].id;
  } else {
    const found = await findTuyaAccountForDevice(outletId, cfg.deviceId);
    if (!found.accountId) {
      throw new Error(
        `Device ID "${cfg.deviceId}" tidak ditemukan di akun Tuya mana pun milik outlet ini.` +
          (found.error ? ` (${found.error})` : "") +
          " Cek lagi Device ID-nya, atau pilih akun Tuya secara manual.",
      );
    }
    accountId = found.accountId;
  }

  const next = mergeTuyaConfig(config, { accountId });
  const acc = real.find((a) => a.id === accountId)!;
  const devs = await db.select({ id: devices.id, protocol: devices.protocol, config: devices.config }).from(devices).where(eq(devices.outletId, outletId));
  const others = devs.filter((d) => d.id !== excludeDeviceId);
  const count = (countDevicesPerAccount(real, [...others, { protocol: "tuya", config: next }])[accountId] ?? 0);
  const warning =
    count > TUYA_TRIAL_DEVICE_LIMIT
      ? `Akun Tuya "${acc.label}" sekarang dipakai ${count} perangkat. Akun Trial Tuya umumnya hanya bisa mengontrol ${TUYA_TRIAL_DEVICE_LIMIT} perangkat — kalau ada yang tidak merespon, tambahkan akun Tuya baru di Pengaturan dan pindahkan sebagian perangkat ke akun itu.`
      : undefined;
  return { config: next, warning };
}

/** Bentuk akun yang aman dikirim ke browser (secret disamarkan). */
export interface TuyaAccountPublic {
  id: string;
  label: string;
  accessId: string;
  secretMasked: string;
  projectCode: string | null;
  region: string;
  sortOrder: number;
  deviceCount: number;
}

async function rawAccounts(outletId: string) {
  const rows = await db.select().from(outletTuyaAccounts).where(eq(outletTuyaAccounts.outletId, outletId));
  return sortAccounts(rows);
}

/**
 * Outlet lama yang kredensialnya masih di kolom outlets.tuya* (migrasi 0027 belum menyalinnya)
 * — salin dulu jadi "Akun 1" sebelum ada akun baru, supaya perangkat lama tidak kehilangan akunnya.
 */
async function materializeLegacyAccount(outletId: string) {
  const existing = await db.select({ id: outletTuyaAccounts.id }).from(outletTuyaAccounts).where(eq(outletTuyaAccounts.outletId, outletId)).limit(1);
  if (existing.length) return;
  const [o] = await db
    .select({ id: outlets.tuyaAccessId, secret: outlets.tuyaAccessSecret, project: outlets.tuyaProjectCode, region: outlets.tuyaRegion })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);
  if (!o?.id || !o.secret) return;
  await db.insert(outletTuyaAccounts).values({ outletId, label: "Akun 1", accessId: o.id, accessSecret: o.secret, projectCode: o.project, region: o.region, sortOrder: 0 });
}

export async function listTuyaAccounts(outletId: string): Promise<{ accounts: TuyaAccountPublic[]; trialLimit: number }> {
  await materializeLegacyAccount(outletId);
  const accounts = await rawAccounts(outletId);
  const devs = await db.select({ protocol: devices.protocol, config: devices.config }).from(devices).where(eq(devices.outletId, outletId));
  const counts = countDevicesPerAccount(accounts, devs);
  return {
    accounts: accounts.map((a) => ({
      id: a.id,
      label: a.label,
      accessId: a.accessId,
      secretMasked: maskSecret(a.accessSecret),
      projectCode: a.projectCode,
      region: a.region,
      sortOrder: a.sortOrder,
      deviceCount: counts[a.id] ?? 0,
    })),
    trialLimit: TUYA_TRIAL_DEVICE_LIMIT,
  };
}

export async function createTuyaAccount(outletId: string, input: TuyaAccountInput) {
  await materializeLegacyAccount(outletId);
  const existing = await rawAccounts(outletId);
  if (existing.length >= 20) throw new Error("Maksimal 20 akun Tuya per outlet.");
  const clean = validateTuyaAccountInput(input, true, `Akun ${existing.length + 1}`);
  if (existing.some((a) => a.accessId === clean.accessId)) throw new Error("Access ID ini sudah terdaftar di outlet ini.");
  const nextOrder = existing.reduce((m, a) => Math.max(m, a.sortOrder), -1) + 1;
  const [row] = await db
    .insert(outletTuyaAccounts)
    .values({ outletId, label: clean.label, accessId: clean.accessId, accessSecret: clean.accessSecret!, projectCode: clean.projectCode, region: clean.region, sortOrder: nextOrder })
    .returning({ id: outletTuyaAccounts.id });
  return row.id;
}

export async function updateTuyaAccount(outletId: string, accountId: string, input: TuyaAccountInput) {
  const [acc] = await db.select().from(outletTuyaAccounts).where(and(eq(outletTuyaAccounts.id, accountId), eq(outletTuyaAccounts.outletId, outletId))).limit(1);
  if (!acc) throw new Error("Akun Tuya tidak ditemukan.");
  const clean = validateTuyaAccountInput(input, false, acc.label);
  const others = await rawAccounts(outletId);
  if (others.some((a) => a.id !== accountId && a.accessId === clean.accessId)) throw new Error("Access ID ini sudah terdaftar di akun lain outlet ini.");
  forgetTuyaToken(acc.accessId);
  await db
    .update(outletTuyaAccounts)
    .set({
      label: clean.label,
      accessId: clean.accessId,
      ...(clean.accessSecret ? { accessSecret: clean.accessSecret } : {}),
      projectCode: clean.projectCode,
      region: clean.region,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(outletTuyaAccounts.id, accountId));
}

export async function deleteTuyaAccount(outletId: string, accountId: string) {
  const accounts = await rawAccounts(outletId);
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) throw new Error("Akun Tuya tidak ditemukan.");
  const devs = await db.select({ protocol: devices.protocol, config: devices.config }).from(devices).where(eq(devices.outletId, outletId));
  const counts = countDevicesPerAccount(accounts, devs);
  if ((counts[accountId] ?? 0) > 0) {
    throw new Error(`Akun "${acc.label}" masih dipakai ${counts[accountId]} perangkat. Pindahkan atau hapus perangkat itu dulu di Kontrol Perangkat.`);
  }
  forgetTuyaToken(acc.accessId);
  await db.delete(outletTuyaAccounts).where(eq(outletTuyaAccounts.id, accountId));
  // Akun terakhir dihapus: kosongkan juga kolom lama di outlets supaya tidak "hidup lagi" sebagai cadangan.
  if (accounts.length === 1) {
    await db.update(outlets).set({ tuyaAccessId: null, tuyaAccessSecret: null, tuyaProjectCode: null }).where(eq(outlets.id, outletId));
  }
}
