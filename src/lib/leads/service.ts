import { and, desc, eq, ilike, isNotNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeadActivities, platformLeads } from "@/db/schema";
import { outletDateYmd } from "@/lib/time/outlet-time";
import {
  LEAD_CLOSED_STATUSES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
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

  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const row of byStatus) counts[row.status] = row.count;
  return { counts, dueCount: due?.count ?? 0, cities: cities.map((c) => c.city as string), areas: areas.map((a) => a.area as string) };
}

export async function addLeadActivity(leadId: string, type: LeadActivityType, content: string, admin: { sub: string; name: string }) {
  const [row] = await db
    .insert(platformLeadActivities)
    .values({ leadId, type, content, createdBy: admin.sub, createdByName: admin.name })
    .returning();
  return row;
}
