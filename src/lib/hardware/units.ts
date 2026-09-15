import crypto from "crypto";
import { db } from "@/db/client";
import { nexbillHardwareUnits, devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * NEXBILL-branded smart plug program — see the doc comment on nexbillHardwareUnits in db/schema.ts
 * for the full lifecycle. This file is the only place that generates serial numbers / derives MQTT
 * topics from them, so the two stay in sync everywhere (platform-admin batch generation, the
 * outlet-facing claim flow, and — eventually — the internal flashing-station script that burns the
 * topic into each unit's Tasmota config before shipping).
 */

const SERIAL_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I — avoids label misreads

/** "NXB-XXXXXXXX" — 8 chars from a misread-resistant alphabet, printed on the unit's label/QR code. */
export function generateSerialNumber(): string {
  let suffix = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) suffix += SERIAL_ALPHABET[bytes[i] % SERIAL_ALPHABET.length];
  return `NXB-${suffix}`;
}

/** Deterministic from the serial alone — the flashing station computes the exact same value from
 * just the serial printed on the label, so it never has to look anything up mid-flash. */
export function mqttTopicFor(serialNumber: string): string {
  return `nexbill/${serialNumber.toLowerCase()}`;
}

/** Platform-admin only: pre-generate a batch of unclaimed units ahead of a shipment/flashing run.
 * Returns the full rows (serial + topic) so ops can export them as a CSV for the flashing station
 * and for the printed labels/QR codes. */
export async function createHardwareBatch(count: number, batchLabel?: string) {
  if (count <= 0 || count > 5000) throw new Error("Jumlah unit harus antara 1 dan 5000 per batch.");
  const rows = [];
  for (let i = 0; i < count; i++) {
    const serialNumber = generateSerialNumber();
    rows.push({ serialNumber, mqttTopic: mqttTopicFor(serialNumber), batchLabel: batchLabel || null });
  }
  // Inserted one-by-one (not a single bulk insert) so a single extremely-unlikely serial collision
  // (unique constraint violation) only has to be retried for that one row, not the whole batch.
  const inserted: (typeof nexbillHardwareUnits.$inferSelect)[] = [];
  for (const row of rows) {
    try {
      const [created] = await db.insert(nexbillHardwareUnits).values(row).returning();
      if (created) inserted.push(created);
    } catch {
      // Extremely rare serial collision — regenerate once and retry this single unit.
      const retrySerial = generateSerialNumber();
      const [created] = await db
        .insert(nexbillHardwareUnits)
        .values({ serialNumber: retrySerial, mqttTopic: mqttTopicFor(retrySerial), batchLabel: batchLabel || null })
        .returning();
      if (created) inserted.push(created);
    }
  }
  return inserted;
}

/**
 * Outlet-facing claim: turns an unclaimed physical unit into a real `devices` row scoped to this
 * outlet. Deliberately does NOT go through assertMqttTopicGloballyUnique (app/api/devices/route.ts)
 * — that check exists for self-supplied/manually-typed topics; a hardware-program unit's topic is
 * already guaranteed globally unique by construction (unique DB constraint on nexbillHardwareUnits
 * at generation time), so re-checking here would be redundant, not safer.
 */
export async function claimHardwareUnit(serialNumber: string, outletId: string, deviceName: string) {
  const normalized = serialNumber.trim().toUpperCase();
  if (!normalized) throw new Error("Nomor seri wajib diisi.");
  if (!deviceName.trim()) throw new Error("Nama perangkat wajib diisi.");

  const [unit] = await db.select().from(nexbillHardwareUnits).where(eq(nexbillHardwareUnits.serialNumber, normalized)).limit(1);
  if (!unit) throw new Error(`Nomor seri "${normalized}" tidak ditemukan — pastikan diketik persis sesuai label di unit.`);
  if (unit.status === "retired") throw new Error(`Unit dengan nomor seri "${normalized}" sudah ditandai retired (rusak/ditarik) dan tidak bisa diklaim lagi.`);
  if (unit.status === "claimed") {
    throw new Error(
      unit.claimedOutletId === outletId
        ? `Unit "${normalized}" sudah pernah kamu klaim sebelumnya — cek daftar perangkat, mungkin sudah ada.`
        : `Unit "${normalized}" sudah diklaim outlet lain. Kalau ini kesalahan (mis. unit dijual lagi/dipindah), hubungi Customer Service NEXBILL untuk memindahkan klaimnya.`
    );
  }

  return db.transaction(async (tx) => {
    const [device] = await tx
      .insert(devices)
      .values({
        outletId,
        name: deviceName.trim(),
        protocol: "tasmota_mqtt",
        mqttTopic: unit.mqttTopic,
      })
      .returning();

    // Conditioned on status still being "unclaimed" (not just id match) and checked via
    // .returning() — closes the race where two requests claim the same serial at nearly the same
    // moment: whichever transaction commits first wins the row, the second gets an empty result
    // here and throws, rolling back its own just-inserted `devices` row instead of leaving a
    // duplicate device pointing at a topic another outlet's claim already won.
    const [claimedUnit] = await tx
      .update(nexbillHardwareUnits)
      .set({ status: "claimed", claimedOutletId: outletId, claimedDeviceId: device.id, claimedAt: new Date().toISOString() })
      .where(and(eq(nexbillHardwareUnits.id, unit.id), eq(nexbillHardwareUnits.status, "unclaimed")))
      .returning();
    if (!claimedUnit) throw new Error(`Unit "${unit.serialNumber}" baru saja diklaim pihak lain — coba lagi atau hubungi Customer Service.`);

    return device;
  });
}
