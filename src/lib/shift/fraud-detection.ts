import { db } from "@/db/client";
import { auditLogs, shifts, outlets } from "@/db/schema";
import { eq, and, sql, desc, ne, inArray } from "drizzle-orm";

/**
 * Sensitive cashier-initiated actions that matter for a SHIFT-level fraud
 * review — voids, refunds, and permanent deletes across every module that
 * touches the till (POS orders, PPOB, Other Income, Expense). Each of these
 * already calls logAudit() at the point of action (see lib/pos/void.ts,
 * lib/pos/refund.ts, lib/ppob/engine.ts, lib/accounting/other-income.ts,
 * lib/accounting/expense.ts) — this module doesn't add any new logging, it
 * just reads what's already being recorded and looks for a concentration of
 * it inside one shift's time window.
 */
const SENSITIVE_ACTIONS = [
  "void_order",
  "void_item",
  "request_void",
  "request_void_item",
  "delete_order",
  "refund_order",
  "request_refund",
  "void_ppob_transaction",
  "delete_ppob_transaction",
  "void_other_income",
  "void_expense",
] as const;

export interface ShiftRiskFlag {
  code: string;
  label: string;
  severity: "warn" | "high";
}

export interface ShiftRiskResult {
  flags: ShiftRiskFlag[];
  severity: "none" | "warn" | "high";
  sensitiveActionCount: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes why (if at all) a shift deserves a human review — called once at
 * close time (see closeShift() in shift.ts) and the result snapshotted onto
 * shifts.riskFlags, never recomputed later, so a shift's flagged reasons
 * can't silently drift if later data changes (e.g. a since-voided order).
 */
export async function computeShiftRiskFlags(params: {
  shiftId: string;
  outletId: string;
  staffUserId: string;
  openedAt: string;
  closedAt: string;
  cashVariance: number;
  nonCashVarianceTotal: number;
}): Promise<ShiftRiskResult> {
  const [outlet] = await db
    .select({ fraudVarianceThreshold: outlets.fraudVarianceThreshold, fraudVoidCountThreshold: outlets.fraudVoidCountThreshold })
    .from(outlets)
    .where(eq(outlets.id, params.outletId))
    .limit(1);
  const varianceThreshold = outlet?.fraudVarianceThreshold ?? 50000;
  const voidThreshold = outlet?.fraudVoidCountThreshold ?? 3;

  const flags: ShiftRiskFlag[] = [];

  const absCashVariance = Math.abs(round(params.cashVariance));
  if (absCashVariance >= varianceThreshold) {
    flags.push({
      code: "cash_variance",
      label: `Selisih kas ${params.cashVariance < 0 ? "kurang" : "lebih"} Rp${absCashVariance.toLocaleString("id-ID")} — melebihi ambang batas Rp${varianceThreshold.toLocaleString("id-ID")}.`,
      severity: absCashVariance >= varianceThreshold * 3 ? "high" : "warn",
    });
  }

  const absNonCashVariance = Math.abs(round(params.nonCashVarianceTotal));
  if (absNonCashVariance >= varianceThreshold) {
    flags.push({
      code: "non_cash_variance",
      label: `Selisih saldo channel non-tunai Rp${absNonCashVariance.toLocaleString("id-ID")} — melebihi ambang batas Rp${varianceThreshold.toLocaleString("id-ID")}.`,
      severity: absNonCashVariance >= varianceThreshold * 3 ? "high" : "warn",
    });
  }

  const sensitiveLogs = await db
    .select({ action: auditLogs.action })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.outletId, params.outletId),
        eq(auditLogs.staffUserId, params.staffUserId),
        inArray(auditLogs.action, [...SENSITIVE_ACTIONS]),
        sql`${auditLogs.createdAt} >= ${params.openedAt}`,
        sql`${auditLogs.createdAt} <= ${params.closedAt}`
      )
    );
  const sensitiveActionCount = sensitiveLogs.length;
  if (sensitiveActionCount >= voidThreshold) {
    flags.push({
      code: "frequent_void_refund",
      label: `${sensitiveActionCount}x aksi void/refund/hapus dalam satu shift — melebihi ambang batas ${voidThreshold}x.`,
      severity: sensitiveActionCount >= voidThreshold * 2 ? "high" : "warn",
    });
  }

  // Repeat-offender pattern: this cashier's last 5 CLOSED shifts before this one (any outlet,
  // since a cashier could in theory work more than one) — if 2+ of them were already flagged,
  // a single borderline shift becomes more meaningful in context than it looks in isolation.
  const priorShifts = await db
    .select({ riskFlags: shifts.riskFlags })
    .from(shifts)
    .where(and(eq(shifts.staffUserId, params.staffUserId), eq(shifts.status, "closed"), ne(shifts.id, params.shiftId)))
    .orderBy(desc(shifts.closedAt))
    .limit(5);
  const priorFlaggedCount = priorShifts.filter((s) => s.riskFlags && s.riskFlags !== "[]").length;
  if (priorFlaggedCount >= 2) {
    flags.push({
      code: "repeat_pattern",
      label: `Kasir ini sudah ditandai pada ${priorFlaggedCount} dari 5 shift terakhirnya sebelum ini — pola berulang, bukan kejadian sekali.`,
      severity: "high",
    });
  }

  const severity: ShiftRiskResult["severity"] = flags.some((f) => f.severity === "high") ? "high" : flags.length > 0 ? "warn" : "none";
  return { flags, severity, sensitiveActionCount };
}
