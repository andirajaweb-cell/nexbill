import { computeTrialBalance } from "../reports";
import { computeAccountsPayable } from "../ar-ap";
import { getMappedAccountId } from "../account-mapping";
import { EXPENSE_PAYABLE_ACCOUNT_CODE } from "../coa";

/*
 * Rekonsiliasi Hutang (AP): saldo akun hutang di Buku Besar harus sama dengan jumlah dokumen yang
 * tampil di tab Hutang (AP) — invoice supplier (2111), expense hutang (2163), dan pembelian aset
 * (akun mapping other/asset_purchase_payable, bawaan 2163). Selisih berarti ada hutang di
 * pembukuan yang tidak punya dokumen untuk dibayar (mis. saldo awal / jurnal manual ke akun hutang,
 * atau data lama), atau sebaliknya dokumen yang jurnalnya hilang. Hanya MEMBACA.
 */

export interface PayablesLedgerRow {
  code: string;
  name: string;
  ledger: number;
  documents: number;
  diff: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function reconcilePayables(
  balances: { accountId: string; code: string; name: string; balance: number }[],
  docs: { type: "purchase_invoice" | "expense" | "asset_purchase"; amount: number }[],
  accountForType: Record<"purchase_invoice" | "expense" | "asset_purchase", string | null>
): PayablesLedgerRow[] {
  const ids = new Set(Object.values(accountForType).filter((x): x is string => !!x));
  const docsBy = new Map<string, number>();
  for (const d of docs) {
    const acc = accountForType[d.type];
    if (!acc) continue;
    docsBy.set(acc, (docsBy.get(acc) ?? 0) + d.amount);
  }
  const rows: PayablesLedgerRow[] = [];
  for (const id of ids) {
    const b = balances.find((r) => r.accountId === id);
    const ledger = round(b?.balance ?? 0);
    const documents = round(docsBy.get(id) ?? 0);
    rows.push({ code: b?.code ?? "?", name: b?.name ?? "?", ledger, documents, diff: round(ledger - documents) });
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code));
}

export async function auditPayablesLedger(outletId: string): Promise<PayablesLedgerRow[]> {
  const [tb, ap] = await Promise.all([computeTrialBalance(outletId), computeAccountsPayable(outletId)]);
  const byCode = (code: string) => tb.find((r) => r.code === code)?.accountId ?? null;
  const assetPayable = await getMappedAccountId(outletId, "other", "asset_purchase_payable", EXPENSE_PAYABLE_ACCOUNT_CODE).catch(() => byCode(EXPENSE_PAYABLE_ACCOUNT_CODE));
  return reconcilePayables(tb, ap.detail, {
    purchase_invoice: byCode("2111"),
    expense: byCode(EXPENSE_PAYABLE_ACCOUNT_CODE),
    asset_purchase: assetPayable,
  });
}
