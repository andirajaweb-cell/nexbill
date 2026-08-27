import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";

export interface AuditLogInput {
  outletId?: string;
  staffUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

/** Best-effort audit trail — never blocks the caller's main operation if logging fails. */
export async function logAudit(input: AuditLogInput) {
  try {
    await db.insert(auditLogs).values({
      outletId: input.outletId,
      staffUserId: input.staffUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeData: input.before !== undefined ? JSON.stringify(input.before) : undefined,
      afterData: input.after !== undefined ? JSON.stringify(input.after) : undefined,
    });
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
}
