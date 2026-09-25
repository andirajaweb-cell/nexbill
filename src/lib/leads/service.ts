import { and, desc, eq, ilike, isNotNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeadActivities, platformLeads } from "@/db/schema";
import { outletDateYmd } from "@/lib/time/outlet-time";
import { LEAD_CLOSED_STATUSES, LEAD_STATUSES, type LeadActivityType, type LeadStatus } from "./constants";

export interface LeadFilters {
  status?: string | null;
  city?: string | null;
  q?: string | null;
  /** Only open leads whose nextFollowUpDate is today or earlier (Asia/Jakarta). */
  due?: boolean;
}

export function isLeadStatus(v: unknown): v is LeadStatus {
  return typeof v === "string" && (LEAD_STATUSES as readonly string[]).includes(v);
}

export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  return {
    status: params.get("status"),
    city: params.get("city"),
    q: params.get("q"),
    due: params.get("due") === "1",
  };
}

function buildWhere(f: LeadFilters): SQL | undefined {
  const conds: SQL[] = [];
  if (isLeadStatus(f.status)) conds.push(eq(platformLeads.status, f.status));
  if (f.city) conds.push(eq(platformLeads.city, f.city));
  if (f.q?.trim()) {
    const like = `%${f.q.trim()}%`;
    conds.push(or(ilike(platformLeads.name, like), ilike(platformLeads.address, like), ilike(platformLeads.phone, like), ilike(platformLeads.contactName, like))!);
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

  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const row of byStatus) counts[row.status] = row.count;
  return { counts, dueCount: due?.count ?? 0, cities: cities.map((c) => c.city as string) };
}

export async function addLeadActivity(leadId: string, type: LeadActivityType, content: string, admin: { sub: string; name: string }) {
  const [row] = await db
    .insert(platformLeadActivities)
    .values({ leadId, type, content, createdBy: admin.sub, createdByName: admin.name })
    .returning();
  return row;
}
