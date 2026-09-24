import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { expenses, accounts, costCenters, suppliers, rentalUnits, staffUsers } from "@/db/schema";
import { eq, and, desc, sql, gte, or, isNull } from "drizzle-orm";
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

    /*
     * Penjaga input ganda di sisi server — lapisan kedua di belakang penjaga klik ganda di layar
     * (useProsesTunggal). Menangkap yang lolos dari layar: dua tab terbuka, koneksi lambat yang
     * membuat kasir menekan ulang, atau aplikasi lain. Expense yang SAMA PERSIS (staf, akun,
     * nominal, deskripsi) dalam 30 detik terakhir hampir pasti tekanan ganda, bukan dua biaya nyata
     * — dua gaji untuk orang yang sama selalu dicatat dengan jeda lebih dari itu.
     */
    const batas = new Date(Date.now() - 30_000).toISOString();
    const [kembar] = await db
      .select({ id: expenses.id, expenseNumber: expenses.expenseNumber })
      .from(expenses)
      .where(
        and(
          eq(expenses.outletId, session.outletId),
          eq(expenses.staffUserId, session.sub),
          eq(expenses.accountId, String(body.accountId ?? "")),
          eq(expenses.amount, Number(body.amount)),
          eq(expenses.category, String(body.category ?? "")),
          body.description ? eq(expenses.description, String(body.description)) : or(isNull(expenses.description), eq(expenses.description, "")),
          gte(expenses.createdAt, batas)
        )
      )
      .limit(1);
    if (kembar) {
      return NextResponse.json(
        {
          error: `Expense yang sama persis baru saja disimpan (${kembar.expenseNumber}) beberapa detik lalu — kemungkinan tombol tertekan dua kali. Cek daftar expense. Jika memang ingin mencatat dua kali, tunggu 30 detik lalu simpan lagi.`,
          duplicateOf: kembar.expenseNumber,
        },
        { status: 409 }
      );
    }

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
