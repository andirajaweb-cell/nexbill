"use client";
import { useEffect, useState } from "react";
import { uiText } from "@/lib/i18n/client-text";
import "@/lib/i18n/dict-payments";

/** One active method from the outlet's own Pembayaran catalog, ready for a checkout picker. */
export interface PaymentMethodOption {
  value: string;
  label: string;
  kind: "cash" | "balance_tracked" | "info_only";
  qrisImageUrl?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
  customerNote?: string | null;
}

/**
 * Used only if the catalog can't be loaded at all (network error). Deliberately just the three
 * channels every outlet has, all confirmed manually by the cashier — never the full global list,
 * which used to include NEXBILL's own iPaymu channels and would have routed a customer's money to
 * NEXBILL instead of the outlet.
 */
const offlineFallback = (): PaymentMethodOption[] => [
  { value: "cash", label: uiText("payments.offline.cash", "Tunai (Cash)"), kind: "cash" },
  { value: "qris", label: "QRIS", kind: "info_only" },
  { value: "transfer", label: uiText("payments.offline.transfer", "Transfer Bank"), kind: "info_only" },
];

/**
 * The single source for "which payment methods can the cashier offer the customer" on Rental,
 * Kasir, Home Rental, Membership and Pendapatan Lain-lain: the outlet's ACTIVE methods from
 * /dashboard/payments, in their configured order, including each method's customer instructions
 * (QRIS image / bank account). Every one of these keys resolves to a cash/bank GL account through
 * Account Mapping (module "payment"), so whatever is picked here lands in Accounting correctly.
 */
export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethodOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/payment-methods")
      .then(async (res) => {
        const rows = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(rows)) throw new Error("load failed");
        return rows;
      })
      .then((rows) => {
        if (!alive) return;
        const active: PaymentMethodOption[] = rows
          .filter((m) => m.isActive)
          .map((m) => ({
            value: m.key,
            label: m.label,
            kind: m.kind,
            qrisImageUrl: m.qrisImageUrl,
            bankName: m.bankName,
            bankAccountNumber: m.bankAccountNumber,
            bankAccountHolder: m.bankAccountHolder,
            customerNote: m.customerNote,
          }));
        setMethods(active.length ? active : offlineFallback());
      })
      .catch(() => alive && setMethods(offlineFallback()))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const find = (key: string | null | undefined) => methods.find((m) => m.value === key) ?? null;
  const labelOf = (key: string | null | undefined) => find(key)?.label ?? key ?? "-";
  return { methods, loading, find, labelOf };
}
