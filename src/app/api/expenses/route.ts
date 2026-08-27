import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { expenses, accounts, costCenters, suppliers, rentalUnits, staffUsers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createExpense, submitExpense } from "@/lib/accounting/expense";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Lists expenses plus the lookup data the Expense Management UI needs
 * (expense-type COA accounts, cost centers, suppliers, rental units, staff
 * names) in one call — avoids a waterfall of separate fetches for every row's
 * account/cost-center/creator name.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Never trust the outletId query param — this used to return any outlet's full expense
    // ledger to an unauthenticated caller who simply knew/guessed its id.
    const outletId = session.outletId;

    const status = req.nextUrl.searchParams.get("status");
    const conditions = [eq(expenses.outletId, outletId)];
    if (status) conditions.push(eq(expenses.status, status as any));

    const [rows, expenseAccounts, centers, supplierRows, units, staff] = await Promise.all([
      db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.expenseDate)),
      db.select().from(accounts).where(and(eq(accounts.outletId, outletId), eq(accounts.type, "expense"), eq(accounts.isActive, true))),
      db.select().from(costCenters).where(and(eq(costCenters.outletId, outletId), eq(costCenters.isActive, true))),
      db.select().from(suppliers).where(eq(suppliers.outletId, outletId)),
      db.select().from(rentalUnits).where(eq(rentalUnits.outletId, outletId)),
      db.select({ id: staffUsers.id, name: staffUsers.name }).from(staffUsers).where(eq(staffUsers.outletId, outletId)),
    ]);

    return NextResponse.json({ expenses: rows, accounts: expenseAccounts, costCenters: centers, suppliers: supplierRows, rentalUnits: units, staff });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Create a draft expense and immediately submit it (auto-approves/posts under the outlet's threshold, otherwise queues for approval). */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat expense." }, { status: 403 });
    }

    const body = await req.json();
    // outletId always comes from the session — never trust body.outletId (this used to prefer
    // the client-supplied value when present, letting a logged-in staffer at one outlet post
    // expenses, journal entries, and inventory deductions against another tenant).
    const expense = await createExpense({ ...body, staffUserId: session.sub, outletId: session.outletId });
    const result = await submitExpense(expense.id, session.sub);

    const [final] = await db.select().from(expenses).where(eq(expenses.id, expense.id)).limit(1);
    return NextResponse.json({ ...final, submitResult: result.status });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
