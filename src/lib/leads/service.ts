import { and, desc, eq, ilike, inArray, isNotNull, lte, ne, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeadActivities, platformLeads, platformWaOutbox } from "@/db/schema";
import { outletDateYmd } from "@/lib/time/outlet-time";
import {
  LEAD_CLOSED_STATUSES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  LEAD_TEMPERATURES,
  type LeadActivityType,
  type LeadPriority,
  type LeadStatus,
  type LeadTemperature,
} from "./constants";

export interface LeadFilters {
  status?: string | null;
  city?: string | null;
  q?: string | null;
  /** Only open leads whose nextFollowUpDate is today or earlier (Asia/Jakarta). */
  due?: boolean;
  priority?: string | null;
  temperature?: string | null;
  area?: string | null;
}

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}

export function isLeadPriority(v: unknown): v is LeadPriority {
  return typeof v === "string" && (LEAD_PRIORITIES as readonly string[]).includes(v);
}

export function isLeadTemperature(v: unknown): v is LeadTemperature {
  return typeof v === "string" && (LEAD_TEMPERATURES as readonly string[]).includes(v);
}

export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  return {
    status: params.get("status"),
    city: params.get("city"),
    q: params.get("q"),
    due: params.get("due") === "1",
    priority: params.get("priority"),
    temperature: params.get("temperature"),
    area: params.get("area"),
  };
}

const QUALIFICATION_TEXT = ["area", "currentBilling", "painPoints", "acquisitionAngle", "nextAction"] as const;

/**
 * Reads the qualification fields present in a POST/PATCH body. Only keys that are present are
 * returned (so a PATCH never blanks fields it didn't send); "" clears a field back to NULL
 * (= belum diketahui). Throws a user-facing message on an invalid priority/temperature/unit count.
 */
export function parseQualification(body: Record<string, unknown>): Partial<typeof platformLeads.$inferInsert> {
  const out: Partial<typeof platformLeads.$inferInsert> = {};
  for (const key of QUALIFICATION_TEXT) {
    if (key in body) out[key] = String(body[key] ?? "").trim() || null;
  }
  if ("priority" in body) {
    const v = body.priority || null;
    if (v === null) out.priority = null;
    else if (isLeadPriority(v)) out.priority = v;
    else throw new Error("Prioritas harus A, B, atau C.");
  }
  if ("temperature" in body) {
    const v = body.temperature || null;
    if (v === null) out.temperature = null;
    else if (isLeadTemperature(v)) out.temperature = v;
    else throw new Error("Suhu lead harus hot, warm, atau cold.");
  }
  if ("unitCount" in body) {
    const raw = String(body.unitCount ?? "").trim();
    if (!raw) out.unitCount = null;
    else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 10000) throw new Error("Jumlah unit harus angka bulat.");
      out.unitCount = n;
    }
  }
  return out;
}

function buildWhere(f: LeadFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (isLeadStatus(f.status)) conds.push(eq(platformLeads.status, f.status));
  // Tanpa filter status, daftar "Semua" hanya berisi prospek aktif — usaha yang sudah tutup/tidak ada
  // punya daftar sendiri (filter status "tutup") supaya tidak ikut dihubungi.
  else conds.push(ne(platformLeads.status, "tutup"));
  if (f.city) conds.push(eq(platformLeads.city, f.city));
  if (isLeadPriority(f.priority)) conds.push(eq(platformLeads.priority, f.priority));
  if (isLeadTemperature(f.temperature)) conds.push(eq(platformLeads.temperature, f.temperature));
  if (f.area) conds.push(eq(platformLeads.area, f.area));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    conds.push(or(ilike(platformLeads.name, like), ilike(platformLeads.address, like), ilike(platformLeads.phone, like), ilike(platformLeads.contactName, like), ilike(platformLeads.notes, like), ilike(platformLeads.area, like))!);
  }
  if (f.due) {
    conds.push(isNotNull(platformLeads.nextFollowUpDate));
    conds.push(lte(platformLeads.nextFollowUpDate, outletDateYmd(new Date())));
    conds.push(notInArray(platformLeads.status, LEAD_CLOSED_STATUSES));
  }
  return conds.length ? and(...conds) : undefined;
}

export async function listLeads(f: LeadFilters) {
  return db.select().from(platformLeads).where(buildWhere(f)).orderBy(desc(platformLeads.updatedAt));
}

/** Pipeline summary for the header cards — counts per status plus how many open follow-ups are due, unfiltered. */
export async function leadSummary() {
  const byStatus = await db
    .select({ status: platformLeads.status, count: sql<number>`count(*)::int` })
    .from(platformLeads)
    .groupBy(platformLeads.status);
  const [due] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(platformLeads)
    .where(buildWhere({ due: true }));
  const cities = await db
    .selectDistinct({ city: platformLeads.city })
    .from(platformLeads)
    .where(isNotNull(platformLeads.city))
    .orderBy(platformLeads.city);

  const areas = await db
    .selectDistinct({ area: platformLeads.area })
    .from(platformLeads)
    .where(isNotNull(platformLeads.area))
    .orderBy(platformLeads.area);

  const [googleClosed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(platformLeads)
    .where(googleClosedOpenWhere());

  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const row of byStatus) if (isLeadStatus(row.status)) counts[row.status] = row.count;
  return {
    counts,
    dueCount: due?.count ?? 0,
    /** Lead yang ditandai Google "tutup permanen" tapi statusnya di CRM masih berjalan. */
    googleClosedCount: googleClosed?.count ?? 0,
    cities: cities.map((c) => c.city as string),
    areas: areas.map((a) => a.area as string),
  };
}

/** Google Maps bilang tutup permanen, tapi di CRM belum "tutup" (dan belum jadi pelanggan). */
function googleClosedOpenWhere(): SQL {
  return and(eq(platformLeads.businessStatus, "CLOSED_PERMANENTLY"), notInArray(platformLeads.status, ["tutup", "closing"]))!;
}

/**
 * Antrean WA yang belum terkirim untuk lead ini dihapus — usaha yang sudah tutup tidak perlu dikirimi
 * pesan. Pesan yang sedang/sudah terkirim tidak disentuh.
 */
export async function cancelPendingWaForLeads(leadIds: string[]): Promise<number> {
  if (leadIds.length === 0) return 0;
  const rows = await db
    .delete(platformWaOutbox)
    .where(and(inArray(platformWaOutbox.leadId, leadIds), inArray(platformWaOutbox.status, ["pending", "failed"])))
    .returning({ id: platformWaOutbox.id });
  return rows.length;
}

/**
 * Menandai sekaligus semua lead yang menurut Google Maps sudah "tutup permanen" sebagai
 * "Tutup / Tidak Ada" (kecuali yang sudah jadi pelanggan), lengkap dengan catatan aktivitas.
 */
export async function markGoogleClosedLeads(admin: { sub: string | null; name: string }): Promise<{ marked: number; waCancelled: number }> {
  const targets = await db.select({ id: platformLeads.id, status: platformLeads.status }).from(platformLeads).where(googleClosedOpenWhere());
  if (targets.length === 0) return { marked: 0, waCancelled: 0 };
  const ids = targets.map((t) => t.id);
  await db
    .update(platformLeads)
    .set({ status: "tutup", updatedAt: new Date().toISOString() })
    .where(and(inArray(platformLeads.id, ids), googleClosedOpenWhere()));
  for (const t of targets) {
    const from = isLeadStatus(t.status) ? LEAD_STATUS_LABEL[t.status] : t.status;
    await addLeadActivity(t.id, "status", `${from} → ${LEAD_STATUS_LABEL.tutup} (Google Maps: tutup permanen)`, admin);
  }
  const waCancelled = await cancelPendingWaForLeads(ids);
  return { marked: ids.length, waCancelled };
}

/** admin.sub null = dicatat oleh sistem (mis. bot WhatsApp mencatat balasan masuk dari lead). */
export async function addLeadActivity(leadId: string, type: LeadActivityType, content: string, admin: { sub: string | null; name: string }) {
  const [row] = await db
    .insert(platformLeadActivities)
    .values({ leadId, type, content, createdBy: admin.sub, createdByName: admin.name })
    .returning();
  return row;
}
