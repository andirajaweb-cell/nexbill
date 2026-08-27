import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { depositBalanceChannels, accounts, cashBankAccounts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { allocateDepositChannelAccountCode, invalidateAccountCache } from "@/lib/accounting/coa";
import { slugifyMethodKey } from "@/lib/payments/methods";
import { describeError } from "@/lib/api/error";

/**
 * Owner-editable list of non-cash "deposit balance" channels checked at shift
 * close (Verifikasi Saldo Channel Non-Tunai) — the built-in Fastpay PPOB saldo
 * row plus any custom float the outlet wants tracked the same way (e.g. a
 * second PPOB-style provider). Any authenticated staff can GET this (needed to
 * render the shift-close screen); only manage_coa can add/edit/delete, since
 * each row is directly calibrated to a real COA account.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db
      .select()
      .from(depositBalanceChannels)
      .where(eq(depositBalanceChannels.outletId, session.outletId))
      .orderBy(asc(depositBalanceChannels.sortOrder));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Creates a new custom deposit-balance channel — auto-provisions a dedicated
 * COA account (next free code under the 1150 "PPOB Receivable" family) and its
 * wrapping cashBankAccounts row, then a depositBalanceChannels row linking all
 * three together. This is the "add" half of the add/delete-together sync the
 * owner asked for; delete (see [id]/route.ts) tears the same three back down.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola channel saldo deposit." }, { status: 403 });
    }

    const body = await req.json();
    const label = (body.label as string | undefined)?.trim();
    if (!label) return NextResponse.json({ error: "Nama channel wajib diisi." }, { status: 400 });

    const siblings = await db.select().from(depositBalanceChannels).where(eq(depositBalanceChannels.outletId, session.outletId));
    const existingKeys = new Set(siblings.map((r) => r.channelKey));
    let channelKey = slugifyMethodKey(label);
    let suffix = 2;
    while (existingKeys.has(channelKey)) {
      channelKey = `${slugifyMethodKey(label)}_${suffix}`;
      suffix++;
    }
    const maxOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), -1);

    const code = await allocateDepositChannelAccountCode(session.outletId);
    const parentRows = await db.select().from(accounts).where(eq(accounts.outletId, session.outletId));
    const parent = parentRows.find((a) => a.code === "1150");

    const [account] = await db
      .insert(accounts)
      .values({
        outletId: session.outletId,
        code,
        name: label,
        type: "asset",
        normalBalance: "debit",
        parentId: parent?.id,
        isSystemAccount: false,
        isPostingAllowed: true,
      })
      .returning();
    invalidateAccountCache(session.outletId);

    const [cba] = await db
      .insert(cashBankAccounts)
      .values({ outletId: session.outletId, name: label, type: "bank", accountId: account.id })
      .returning();

    const [created] = await db
      .insert(depositBalanceChannels)
      .values({
        outletId: session.outletId,
        channelKey,
        label,
        accountId: account.id,
        cashBankAccountId: cba.id,
        isSystem: false,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return NextResponse.json(created);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
