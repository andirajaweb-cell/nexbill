import { db } from "@/db/client";
import {
  subscriptions,
  subscriptionPlans,
  subscriptionInvoices,
  subscriptionEvents,
  subscriptionDepositMutations,
  smartPlugOrders,
  platformProducts,
  rentalUnits,
  devices,
  staffUsers,
  outlets,
  billingGroups,
  orders,
} from "@/db/schema";
import { eq, and, sql, inArray, lte, desc, gte, or, isNull, gt } from "drizzle-orm";
import { nomorBerikutnya } from "@/lib/db/nomor-urut";
import { DeviceProtocol } from "@/lib/devices/types";
import {
  ipaymuCrossBorderGateway,
  ipaymuHostedGateway,
  ipaymuQrisGateway,
  ipaymuVaBcaGateway,
  ipaymuVaBniGateway,
  ipaymuVaMandiriGateway,
  ipaymuVaBriGateway,
  ipaymuVaPermataGateway,
} from "@/lib/payments/adapters/ipaymu";
import { PaymentGateway, VaBankMethod } from "@/lib/payments/types";
import { resolveBillingCurrencyForOutlet, convertIdrToCurrency } from "@/lib/market-risk/currency";
import { getRates } from "@/lib/shipping/biteship";
import { TRIAL_DAYS, SMART_PLUG_PROTOCOLS, ANDROID_TV_PROTOCOLS, TRIAL_REMINDER_DAYS, RENEWAL_GRACE_DAYS, RENEWAL_INVOICE_LEAD_DAYS } from "./config";
import { accrueReferralCommission } from "@/lib/referral/service";
import {
  computePlanCharge,
  describeCharge,
  prorateUpgrade,
  resolveEntitlements,
  hasFeature,
  planTierOf,
  minUnitsOf,
  normalizeCycle,
  TIER_INCLUDES_AI,
  FEATURE_LABEL_ID,
  type BillingCycle,
  type PlanFeature,
  type Entitlements,
} from "./pricing";
import {
  ensureDefaultPlans,
  listCatalogPlans,
  getPlanById,
  getPlanByCode,
  countActiveUnits,
  isAdditionalProOutlet,
  desiredSelection,
  chargeFor,
  type PlanRow,
} from "./plan-catalog";

const round = (n: number) => Math.round(n);
const addDaysIso = (fromIso: string, days: number) => new Date(new Date(fromIso).getTime() + days * 86_400_000).toISOString();
const addMonthsIso = (fromIso: string, months: number) => {
  const d = new Date(fromIso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

export type SubscriptionRow = typeof subscriptions.$inferSelect;

/** Statuses where the outlet's dashboard should go read-only + show the "berlangganan" page instead of normal operations. */
const LOCKED_STATUSES = new Set(["trial_expired", "pending_payment", "suspended", "cancelled"]);
/**
 * Statuses where the outlet is never blocked from normal operation — no device-count/branch
 * restrictions, dashboard never shows the locked screen, never gets swept toward grace/suspended.
 * "free_forever" (platform-admin-granted, see grantFreeForever below) belongs here for that reason
 * — but is NOT automatically "AI included": assertAiAllowed has its own explicit exclusion for it,
 * since a free-forever outlet still needs the AI Add-on like a trial-graduated paying outlet would.
 */
const PAID_STATUSES = new Set(["active", "grace", "free_forever"]);

/**
 * Ensures a "subscription_fee" renewal invoice exists for this subscription's current period —
 * idempotent (returns the existing unpaid one if there already is one, never creates a duplicate).
 * Normally the daily scheduler (sweepGenerateRenewalInvoices, RENEWAL_INVOICE_LEAD_DAYS ahead of
 * currentPeriodEnd) creates this proactively; this is the fallback path used both by the lazy
 * lifecycle self-heal below (so an outlet is never locked out with literally nothing to pay,
 * whether or not the scheduler script happens to be running in this deployment) and by the
 * merchant-initiated "Perpanjang Sekarang" button on the Billing page (requestManualRenewal).
 */
async function ensureRenewalInvoiceExists(sub: SubscriptionRow, opts: { force?: boolean } = {}) {
  // Bundled outlets never get their own individual renewal invoice — one shared "group_renewal"
  // invoice covers every member (see ensureGroupRenewalInvoiceExists below and billingGroupId
  // on schema.ts's subscriptions table).
  if (sub.billingGroupId) return ensureGroupRenewalInvoiceExists(sub.billingGroupId, opts.force ? sub.id : undefined);

  const [existingUnpaid] = await db
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.status, "unpaid"), isRenewalFeeInvoice))
    .limit(1);
  if (existingUnpaid) return existingUnpaid;
  const period = currentPeriodLabelFor(sub.currentPeriodEnd ?? new Date().toISOString());
  const invoice = await createRenewalInvoice(sub, period);
  if (!invoice) return null;
  // Auto-pay from Saldo Deposit if the outlet has topped up in advance — see applyDepositToInvoice.
  return applyDepositToInvoice(sub, invoice);
}

/**
 * Membuat invoice perpanjangan untuk paket/siklus/kuota yang diinginkan (next* kalau ada —
 * turun paket / ganti siklus berlaku di sini). Harga dari computePlanCharge (pricing.ts):
 * Starter per unit (min 5), Pro flat (diskon cabang ke-2 dst), tahunan bayar 10 aktif 12.
 */
async function createRenewalInvoice(sub: SubscriptionRow, period: string) {
  const want = desiredSelection(sub);
  const plan = await getPlanById(want.planId);
  if (!plan) return null;
  const charge = await chargeFor(sub, plan, { cycle: want.cycle, units: want.units });
  const invoice = await createInvoice({
    outletId: sub.outletId,
    subscriptionId: sub.id,
    type: "subscription_fee",
    description: `Perpanjangan ${period} — ${describeCharge(plan.name, charge)}`,
    qty: 1,
    unitPrice: charge.amount,
    period,
    periodMonths: charge.monthsGranted,
    targetPlanId: plan.id,
    targetBillingCycle: charge.cycle,
    targetPlanUnits: charge.pricingModel === "per_unit" ? charge.billedUnits : 0,
  });
  await logEvent(sub.outletId, sub.id, "renewal_invoice_created", `${invoice.invoiceNumber} untuk periode ${period}`);
  return invoice;
}

/** Filter "invoice perpanjangan" — mengecualikan invoice upgrade prorata (periodMonths = 0). */
const isRenewalFeeInvoice = or(isNull(subscriptionInvoices.periodMonths), gt(subscriptionInvoices.periodMonths, 0));

interface GroupInvoiceLineItem {
  outletId: string;
  outletName: string;
  planName: string;
  period: string;
  amount: number;
  // Struktur harga 2026-10 — diterapkan per anggota saat tagihan gabungan lunas. Opsional karena
  // invoice gabungan lama (sebelum 2026-10) tidak punya field ini (diperlakukan 1 bulan).
  subscriptionId?: string;
  description?: string;
  periodMonths?: number;
  targetPlanId?: string;
  targetBillingCycle?: BillingCycle;
  targetPlanUnits?: number;
}

/** Anggota grup yang perlu ditagih sekarang: masa tenggang/ditangguhkan, atau aktif yang jatuh temponya dalam RENEWAL_INVOICE_LEAD_DAYS. */
function isGroupMemberDue(m: SubscriptionRow, forceSubId?: string): boolean {
  if (!m.planId && !m.nextPlanId) return false;
  if (m.id === forceSubId && ["active", "grace", "suspended"].includes(m.status)) return true;
  if (m.status === "grace" || m.status === "suspended") return true;
  if (m.status !== "active") return false;
  if (!m.currentPeriodEnd) return true;
  const daysLeft = Math.ceil((new Date(m.currentPeriodEnd).getTime() - Date.now()) / 86_400_000);
  return daysLeft <= RENEWAL_INVOICE_LEAD_DAYS;
}

/**
 * The consolidated equivalent of ensureRenewalInvoiceExists, for outlets bundled into a
 * billing group. Idempotent per group (one unpaid "group_renewal" invoice at a time, same as
 * the individual path). Sejak struktur harga 2026-10 hanya anggota yang JATUH TEMPO yang masuk
 * (tiap anggota bisa bulanan/tahunan dengan tanggal berbeda), tiap baris dihitung dengan
 * computePlanCharge (Starter per unit, Pro flat + diskon cabang ke-2 dst, tahunan bayar 10 bulan),
 * dan kalau ada anggota jatuh tempo yang belum tercakup invoice gabungan yang masih terbuka,
 * invoice itu dikedaluwarsakan lalu dibuat ulang. The anchor outlet (the row `outletId`/
 * `subscriptionId` point at) is whichever included member was created first.
 */
async function ensureGroupRenewalInvoiceExists(billingGroupId: string, forceSubId?: string) {
  const members = await db.select().from(subscriptions).where(eq(subscriptions.billingGroupId, billingGroupId));
  const dueMembers = members.filter((m) => isGroupMemberDue(m, forceSubId));

  const [existingUnpaid] = await db
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.billingGroupId, billingGroupId), eq(subscriptionInvoices.type, "group_renewal"), eq(subscriptionInvoices.status, "unpaid")))
    .limit(1);
  if (existingUnpaid) {
    let covered = new Set<string>();
    try {
      covered = new Set((JSON.parse(existingUnpaid.lineItemsJson ?? "[]") as GroupInvoiceLineItem[]).map((l) => l.outletId));
    } catch {
      // lineItemsJson rusak — anggap mencakup semua supaya tidak membuat ulang terus-menerus.
      return existingUnpaid;
    }
    if (dueMembers.every((m) => covered.has(m.outletId))) return existingUnpaid;
    await db
      .update(subscriptionInvoices)
      .set({ status: "expired", cancelReason: "regenerated_new_members", method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null })
      .where(eq(subscriptionInvoices.id, existingUnpaid.id));
  }
  if (dueMembers.length === 0) return null;

  const [group] = await db.select().from(billingGroups).where(eq(billingGroups.id, billingGroupId)).limit(1);
  const outletRows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, dueMembers.map((m) => m.outletId)));
  const outletNameById = new Map(outletRows.map((o) => [o.id, o.name]));

  const period = currentPeriodLabel();
  const lines: GroupInvoiceLineItem[] = [];
  for (const m of dueMembers) {
    const want = desiredSelection(m);
    const plan = await getPlanById(want.planId);
    if (!plan) continue;
    const charge = await chargeFor(m, plan, { cycle: want.cycle, units: want.units });
    lines.push({
      outletId: m.outletId,
      outletName: outletNameById.get(m.outletId) ?? "Outlet",
      planName: plan.name,
      period,
      amount: round(charge.amount),
      subscriptionId: m.id,
      description: describeCharge(plan.name, charge),
      periodMonths: charge.monthsGranted,
      targetPlanId: plan.id,
      targetBillingCycle: charge.cycle,
      targetPlanUnits: charge.pricingModel === "per_unit" ? charge.billedUnits : 0,
    });
  }
  if (lines.length === 0) return null;
  const total = round(lines.reduce((s, l) => s + l.amount, 0));
  const included = dueMembers.filter((m) => lines.some((l) => l.subscriptionId === m.id));
  const anchor = [...included].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

  const invoiceNumber = await generateInvoiceNumber();
  const [invoice] = await db
    .insert(subscriptionInvoices)
    .values({
      invoiceNumber,
      outletId: anchor.outletId,
      subscriptionId: anchor.id,
      billingGroupId,
      type: "group_renewal",
      period,
      description: `Tagihan gabungan ${lines.length} outlet — ${group?.name ?? "Grup Penagihan"} — ${period}`,
      qty: 1,
      unitPrice: total,
      amount: total,
      lineItemsJson: JSON.stringify(lines),
      status: "unpaid",
      dueDate: addDaysIso(new Date().toISOString(), 3),
    })
    .returning();

  for (const m of included) {
    await logEvent(m.outletId, m.id, "renewal_invoice_created", `${invoiceNumber} (tagihan gabungan) untuk periode ${period}`);
  }
  // Group deposit lives on billingGroups, not any one member's subscription — passing `anchor`
  // here is fine either way since getDepositOwner reads scope.billingGroupId first, which is the
  // same on every member of this group.
  return applyDepositToInvoice(anchor, invoice);
}

/** An unpaid invoice older than this is auto soft-cancelled — see sweepExpireStaleUnpaidInvoicesForOutlet. */
const INVOICE_AUTO_EXPIRE_HOURS = 48;

/**
 * "Tagihan yang belum lunas memiliki masa berlaku 2x24 jam" — any invoice still `unpaid`
 * INVOICE_AUTO_EXPIRE_HOURS after it was created gets soft-cancelled: status -> "expired",
 * cancelReason recorded, method/providerRef/VA/QR cleared (so a stale VA number can never be
 * reused/paid after the fact). Deliberately a SOFT cancel, not a hard DELETE — the row stays in
 * Riwayat Tagihan for audit purposes (nothing financial ever silently disappears), it just moves
 * out of "Tagihan Belum Lunas" and out of the count `ensureRenewalInvoiceExists`'s
 * "existingUnpaid" guard looks at, so the very next read regenerates a fresh renewal invoice for
 * whoever needs one. Scoped to one outlet/billing-group (not a blanket table scan) so it's cheap
 * enough to call inline on every request — see the two call sites: applyLifecycleTransitions
 * (self-heal on read, same reasoning as that function's own doc comment) and the standalone
 * scheduler's sweepExpireStaleUnpaidInvoices (global, for outlets nobody happens to be actively
 * viewing right now).
 */
async function sweepExpireStaleUnpaidInvoicesForOutlet(sub: SubscriptionRow): Promise<void> {
  const cutoff = new Date(Date.now() - INVOICE_AUTO_EXPIRE_HOURS * 3600_000).toISOString();
  const scope = sub.billingGroupId
    ? sql`(${subscriptionInvoices.outletId} = ${sub.outletId} or ${subscriptionInvoices.billingGroupId} = ${sub.billingGroupId})`
    : eq(subscriptionInvoices.outletId, sub.outletId);
  const stale = await db
    .select({ id: subscriptionInvoices.id, invoiceNumber: subscriptionInvoices.invoiceNumber, outletId: subscriptionInvoices.outletId, subscriptionId: subscriptionInvoices.subscriptionId })
    .from(subscriptionInvoices)
    .where(and(scope, eq(subscriptionInvoices.status, "unpaid"), lte(subscriptionInvoices.createdAt, cutoff)));
  for (const inv of stale) {
    await db
      .update(subscriptionInvoices)
      .set({ status: "expired", cancelReason: "auto_expired_48h", method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null })
      .where(eq(subscriptionInvoices.id, inv.id));
    await logEvent(inv.outletId, inv.subscriptionId, "invoice_expired", `${inv.invoiceNumber} — kedaluwarsa otomatis setelah ${INVOICE_AUTO_EXPIRE_HOURS} jam tidak dibayar.`);
  }
}

/**
 * Self-healing status transitions applied lazily on every read (via getOrCreateSubscription),
 * not just by the standalone scheduler script (scripts/subscription-scheduler.ts). Locking is a
 * business-critical guarantee — it must not silently stop working just because a deployment
 * forgot to wire up an external cron for that script. Mirrors sweepExpireTrials /
 * sweepGraceAndSuspend's per-subscription logic, but runs inline the moment anyone (staff login,
 * the Billing page, a device-add attempt) touches this outlet's subscription after a transition
 * became due, so status is always accurate to "now" rather than to "whenever the sweep last ran".
 */
async function applyLifecycleTransitions(subIn: SubscriptionRow): Promise<SubscriptionRow> {
  let sub = subIn;
  const now = new Date().toISOString();

  await sweepExpireStaleUnpaidInvoicesForOutlet(sub);

  if (sub.status === "trial" && sub.trialEndsAt && sub.trialEndsAt <= now) {
    const [updated] = await db.update(subscriptions).set({ status: "trial_expired" }).where(eq(subscriptions.id, sub.id)).returning();
    await logEvent(sub.outletId, sub.id, "trial_expired", "Masa percobaan 30 hari berakhir.");
    sub = updated;
  }

  if (sub.status === "active" && sub.currentPeriodEnd && sub.currentPeriodEnd <= now) {
    const graceUntil = addDaysIso(sub.currentPeriodEnd, RENEWAL_GRACE_DAYS);
    const [updated] = await db.update(subscriptions).set({ status: "grace", graceUntil }).where(eq(subscriptions.id, sub.id)).returning();
    await logEvent(sub.outletId, sub.id, "grace_started", `Jatuh tempo lewat, masa tenggang (toleransi) sampai ${graceUntil}`);
    sub = updated;
    await ensureRenewalInvoiceExists(sub); // so there's always something to pay once grace starts
  }

  if (sub.status === "grace" && sub.graceUntil && sub.graceUntil <= now) {
    const [updated] = await db.update(subscriptions).set({ status: "suspended" }).where(eq(subscriptions.id, sub.id)).returning();
    await logEvent(sub.outletId, sub.id, "suspended", "Masa tenggang habis tanpa pembayaran — akses dikunci penuh.");
    sub = updated;
  }

  return sub;
}

/**
 * Fetches the outlet's current subscription row, creating a fresh 30-day
 * trial the first time this is ever called for that outlet. This is the
 * ONLY place a `subscriptions` row gets created, so both brand-new outlets
 * (provisioned via scripts/seed.ts or a future admin-provisioning flow) and
 * any outlet that existed before this feature shipped get a trial the first
 * time anything here touches them — no separate backfill migration needed.
 * Every read also runs applyLifecycleTransitions, so status/lock state is
 * always current even if the external scheduler script never ran.
 */
export async function getOrCreateSubscription(outletId: string): Promise<SubscriptionRow> {
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.outletId, outletId)).limit(1);
  if (existing) return applyLifecycleTransitions(existing);

  const now = new Date().toISOString();
  const [row] = await db
    .insert(subscriptions)
    .values({
      outletId,
      status: "trial",
      trialStartedAt: now,
      trialEndsAt: addDaysIso(now, TRIAL_DAYS),
    })
    .returning();

  await logEvent(outletId, row.id, "trial_started", `Trial dimulai, berakhir ${row.trialEndsAt}`);
  return row;
}

/**
 * Merchant-initiated renewal — the "Perpanjang Sekarang" button on the Billing page for an
 * outlet that's already active/grace/suspended (i.e. has subscribed before) and wants to pay
 * ahead rather than wait for the scheduler's lead-time invoice or for grace to force the issue.
 * Idempotent (see ensureRenewalInvoiceExists) — clicking it twice never creates two invoices.
 */
export async function requestManualRenewal(outletId: string) {
  const sub = await getOrCreateSubscription(outletId);
  if (!["active", "grace", "suspended"].includes(sub.status)) {
    throw new Error("Perpanjangan hanya berlaku untuk outlet yang sudah pernah berlangganan. Gunakan etalase belanja di atas untuk berlangganan pertama kali.");
  }
  const invoice = await ensureRenewalInvoiceExists(sub, { force: true });
  if (!invoice) throw new Error("Paket langganan tidak ditemukan. Hubungi NEXBILL untuk mengaktifkan katalog paket.");
  return invoice;
}

/** Kedaluwarsakan invoice perpanjangan yang masih terbuka (individu atau gabungan) supaya dibuat ulang dengan pilihan paket terbaru. */
async function expireOpenRenewalInvoices(sub: SubscriptionRow, reason: string) {
  const cleared = { status: "expired" as const, cancelReason: reason, method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null };
  if (sub.billingGroupId) {
    await db
      .update(subscriptionInvoices)
      .set(cleared)
      .where(and(eq(subscriptionInvoices.billingGroupId, sub.billingGroupId), eq(subscriptionInvoices.type, "group_renewal"), eq(subscriptionInvoices.status, "unpaid")));
  }
  await db
    .update(subscriptionInvoices)
    .set(cleared)
    .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.status, "unpaid"), isRenewalFeeInvoice));
}

export interface ChangePlanInput {
  planCode: string;
  billingCycle?: BillingCycle;
  /** Kuota unit Starter. */
  units?: number;
}

/**
 * Ganti paket untuk outlet yang sudah berlangganan (active/grace/suspended):
 *  - Naik paket (Starter → Pro) atau tambah kuota unit Starter saat aktif → invoice prorata
 *    (periodMonths 0) untuk sisa periode; begitu lunas, paket/kuota baru langsung berlaku.
 *  - Turun paket, kurangi kuota, atau ganti siklus bulanan/tahunan → berlaku di perpanjangan
 *    berikutnya (disimpan di next*), tanpa refund.
 * Outlet free_forever tidak bisa (dan tidak perlu) ganti paket — statusnya tidak disentuh.
 */
export async function changeSubscriptionPlan(outletId: string, input: ChangePlanInput) {
  let sub = await getOrCreateSubscription(outletId);
  if (sub.status === "free_forever") throw new Error("Outlet ini memiliki akses gratis selamanya — tidak perlu memilih paket.");
  if (!["active", "grace", "suspended"].includes(sub.status)) {
    throw new Error("Outlet ini belum berlangganan. Pilih paket lewat tombol Berlangganan di halaman Langganan.");
  }
  await ensureDefaultPlans();
  const plan = await getPlanByCode(String(input.planCode ?? ""));
  if (!plan || !plan.isActive) throw new Error("Paket tidak ditemukan.");
  const isStarter = planTierOf(plan) === "starter";
  const cycle = normalizeCycle(input.billingCycle ?? sub.nextBillingCycle ?? sub.billingCycle);
  const activeUnits = await countActiveUnits(outletId);
  const requested = Math.floor(Number(input.units) || 0);
  const units = isStarter ? Math.max(minUnitsOf(plan), requested || sub.nextPlanUnits || sub.planUnits || 0, activeUnits) : 0;
  if (isStarter && requested > 0 && requested < activeUnits) {
    throw new Error(`Outlet ini punya ${activeUnits} unit PS aktif — kuota Starter minimal ${activeUnits} unit. Nonaktifkan unit di Rental PS dulu untuk menurunkan kuota.`);
  }

  const currentPlan = await getPlanById(sub.planId);
  const currentCycle = normalizeCycle(sub.billingCycle);

  // Invoice upgrade prorata lama yang belum dibayar diganti yang baru.
  await db
    .update(subscriptionInvoices)
    .set({ status: "expired", cancelReason: "plan_changed", method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null })
    .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.status, "unpaid"), eq(subscriptionInvoices.periodMonths, 0)));

  let upgradeInvoice: typeof subscriptionInvoices.$inferSelect | null = null;
  let appliedNow = false;
  if (sub.status === "active" && currentPlan) {
    const fromTier = planTierOf(currentPlan);
    const toTier = planTierOf(plan);
    const isUpgrade = (fromTier === "starter" && toTier === "pro") || (fromTier === "starter" && toTier === "starter" && units > (sub.planUnits || 0));
    if (isUpgrade) {
      const oldCharge = await chargeFor(sub, currentPlan, { cycle: currentCycle, units: sub.planUnits });
      const newCharge = await chargeFor(sub, plan, { cycle: currentCycle, units });
      const amount = prorateUpgrade({ oldCycleAmount: oldCharge.amount, newCycleAmount: newCharge.amount, periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd });
      if (amount > 0) {
        upgradeInvoice = await createInvoice({
          outletId,
          subscriptionId: sub.id,
          type: "subscription_fee",
          description:
            toTier === "pro" && fromTier === "starter"
              ? `Upgrade ke ${plan.name} (prorata sisa periode s/d ${sub.currentPeriodEnd?.slice(0, 10) ?? "-"})`
              : `Tambah kuota ${plan.name} jadi ${newCharge.billedUnits} unit (prorata sisa periode s/d ${sub.currentPeriodEnd?.slice(0, 10) ?? "-"})`,
          qty: 1,
          unitPrice: amount,
          periodMonths: 0,
          targetPlanId: plan.id,
          targetBillingCycle: currentCycle,
          targetPlanUnits: isStarter ? newCharge.billedUnits : 0,
        });
      } else {
        await applySelectionFromInvoice(sub.id, { planId: plan.id, cycle: currentCycle, units: isStarter ? units : 0 }, 0);
        await grantUnlimitedEntitlementIfEligible(sub);
        appliedNow = true;
      }
    }
  }

  // Pilihan untuk perpanjangan berikutnya (juga dipakai upgrade di atas setelah periode ini).
  await db
    .update(subscriptions)
    .set({ nextPlanId: plan.id, nextBillingCycle: cycle, nextPlanUnits: isStarter ? units : 0 })
    .where(eq(subscriptions.id, sub.id));
  await logEvent(outletId, sub.id, "plan_changed", `Pilihan paket: ${plan.name}${isStarter ? ` ${units} unit` : ""}, ${cycle === "annual" ? "tahunan" : "bulanan"}${upgradeInvoice ? ` — upgrade prorata ${upgradeInvoice.invoiceNumber}` : ""}`);

  // Invoice perpanjangan terbuka dibuat ulang dengan harga pilihan baru.
  [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, sub.id)).limit(1);
  await expireOpenRenewalInvoices(sub, "plan_changed");
  const daysToEnd = sub.currentPeriodEnd ? Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / 86_400_000) : 0;
  const renewalInvoice = sub.status !== "active" || daysToEnd <= RENEWAL_INVOICE_LEAD_DAYS ? await ensureRenewalInvoiceExists(sub, { force: sub.status !== "active" }) : null;

  return { upgradeInvoice, renewalInvoice, appliedNow };
}

/** Billing contact for trial/payment notification emails — prefers the outlet's Owner login, falls back to a legacy Superuser row, then to any staff email if neither exists (shouldn't happen in practice, but avoids silently dropping the notification). */
export async function getOutletBillingContact(outletId: string): Promise<{ email: string | null; outletName: string }> {
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const [owner] = await db.select().from(staffUsers).where(and(eq(staffUsers.outletId, outletId), eq(staffUsers.role, "owner"))).limit(1);
  const [superuser] = owner ? [] : await db.select().from(staffUsers).where(and(eq(staffUsers.outletId, outletId), eq(staffUsers.role, "superuser"))).limit(1);
  const [anyStaff] = owner || superuser ? [] : await db.select().from(staffUsers).where(eq(staffUsers.outletId, outletId)).limit(1);
  return { email: owner?.email ?? superuser?.email ?? anyStaff?.email ?? null, outletName: outlet?.name ?? "Outlet" };
}

export async function logEvent(outletId: string, subscriptionId: string, type: (typeof subscriptionEvents.$inferInsert)["type"], note?: string) {
  await db.insert(subscriptionEvents).values({ outletId, subscriptionId, type, note });
}

export function isLockedStatus(status: string): boolean {
  return LOCKED_STATUSES.has(status);
}

export function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status);
}

/**
 * Platform-admin-only: permanently marks an outlet's subscription free — no plan, no billing
 * period, no invoice ever generated again (see the "free_forever" doc comment on schema.ts's
 * subscriptions.status for exactly why every sweep/invoice function in this file structurally
 * can't touch it once planId is cleared and the status itself isn't "active"). Unlimited
 * devices/branches/staff, same as isPaidStatus(sub.status) grants any other paid outlet — but
 * deliberately NOT unlimited AI: assertAiAllowed has its own explicit carve-out for this status,
 * so the AI Add-on still has to be purchased separately like it would for a normal paying outlet.
 * Idempotent to call again on an already-free-forever outlet (harmless re-set + another log entry).
 */
export async function grantFreeForever(outletId: string, grantedByLabel: string, note?: string) {
  const sub = await getOrCreateSubscription(outletId);
  await db
    .update(subscriptions)
    .set({ status: "free_forever", planId: null, currentPeriodStart: null, currentPeriodEnd: null, graceUntil: null })
    .where(eq(subscriptions.id, sub.id));
  await logEvent(outletId, sub.id, "free_forever_granted", note || `Diberikan akses gratis selamanya oleh ${grantedByLabel}.`);
}

/**
 * Reverses grantFreeForever — puts the outlet into "trial_expired" (the same locked state any
 * other outlet lands in once its access runs out), so it goes through the exact same "Selesaikan
 * pembayaran di halaman Langganan" path as any other outlet whose access needs renewing, rather
 * than the admin having to also pick and re-activate a specific plan on its behalf. No-op if the
 * outlet isn't currently free_forever (nothing to revoke).
 */
export async function revokeFreeForever(outletId: string, revokedByLabel: string, note?: string) {
  const sub = await getOrCreateSubscription(outletId);
  if (sub.status !== "free_forever") return;
  await db.update(subscriptions).set({ status: "trial_expired" }).where(eq(subscriptions.id, sub.id));
  await logEvent(outletId, sub.id, "free_forever_revoked", note || `Akses gratis selamanya dicabut oleh ${revokedByLabel}.`);
}

/** Days remaining until trialEndsAt, floored at 0 — used for the countdown banner + reminder checkpoints. */
export function trialDaysLeft(sub: SubscriptionRow): number {
  if (sub.status !== "trial") return 0;
  return Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

/** Full gate summary a dashboard/UI needs to render trial banners, lock screens, and AI teasers — one call, no business-rule duplication in components. */
export async function getSubscriptionSummary(outletId: string) {
  const sub = await getOrCreateSubscription(outletId);
  const catalog = await ensureDefaultPlans();
  const plan = await getPlanById(sub.planId);
  const nextPlan = sub.nextPlanId ? await getPlanById(sub.nextPlanId) : null;
  // Mirrors assertAiAllowed's own rule (free during trial, else needs an unexpired AI Add-on,
  // unless the plan bundles AI in — Pro) — read-only here for UI display, the actual enforcement
  // always goes through assertAiAllowed.
  const aiAddonPeriodActive = !!(sub.aiAddonActive && sub.aiAddonPeriodEnd && sub.aiAddonPeriodEnd > new Date().toISOString());
  const includedViaPlan = planIncludesAi(sub, plan);
  const isAiLocked = sub.status !== "trial" && !aiAddonPeriodActive && !includedViaPlan;
  const entitlements = entitlementsFor(sub, plan);
  const activeUnits = await countActiveUnits(outletId);
  const additionalOutlet = await isAdditionalProOutlet(sub);
  const want = desiredSelection(sub);

  // Harga tiap paket katalog untuk outlet ini (unit aktif sekarang, diskon cabang, bulanan & tahunan).
  const catalogPricing = catalog.map((p) => {
    const units = Math.max(activeUnits, minUnitsOf(p), planTierOf(p) === "starter" ? sub.planUnits || 0 : 0);
    const isAdditional = planTierOf(p) === "pro" && additionalOutlet;
    return {
      plan: p,
      tier: planTierOf(p),
      monthly: computePlanCharge(p, { units, cycle: "monthly", additionalOutlet: isAdditional }),
      annual: computePlanCharge(p, { units, cycle: "annual", additionalOutlet: isAdditional }),
    };
  });

  const [pendingUpgrade] = await db
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.status, "unpaid"), eq(subscriptionInvoices.periodMonths, 0)))
    .limit(1);

  return {
    subscription: sub,
    plan: plan ?? null,
    planTier: plan ? planTierOf(plan) : null,
    nextPlan,
    selection: { planId: want.planId, cycle: want.cycle, units: want.units },
    entitlements,
    activeUnits,
    isAdditionalOutlet: additionalOutlet,
    catalog: catalogPricing,
    pendingUpgradeInvoice: pendingUpgrade ?? null,
    isLocked: isLockedStatus(sub.status),
    isPaid: isPaidStatus(sub.status),
    isAiLocked,
    aiAddon: {
      freeViaTrial: sub.status === "trial",
      // True when the current plan bundles AI in (Pro) — no separate purchase needed.
      includedViaPlan,
      active: aiAddonPeriodActive,
      periodEnd: sub.aiAddonPeriodEnd,
      priceMonthly: (await ensureDefaultPlan()).aiAddonPriceMonthly,
    },
    trialDaysLeft: trialDaysLeft(sub),
  };
}

/** AI termasuk paket? Pro = ya. free_forever TIDAK berubah: hanya lewat hasUnlimitedEntitlement lamanya. */
function planIncludesAi(sub: SubscriptionRow, plan: PlanRow | null): boolean {
  if (sub.status === "free_forever") return sub.hasUnlimitedEntitlement;
  if (!isPaidStatus(sub.status)) return false;
  if (plan) return TIER_INCLUDES_AI[planTierOf(plan)];
  return sub.hasUnlimitedEntitlement;
}

function entitlementsFor(sub: SubscriptionRow, plan: PlanRow | null): Entitlements {
  return resolveEntitlements({
    status: sub.status,
    tier: plan ? planTierOf(plan) : null,
    planUnits: sub.planUnits,
    minUnits: plan ? minUnitsOf(plan) : null,
  });
}

/** Hak fitur outlet saat ini (status + paket). */
export async function getOutletEntitlements(outletId: string): Promise<{ sub: SubscriptionRow; plan: PlanRow | null; entitlements: Entitlements }> {
  const sub = await getOrCreateSubscription(outletId);
  const plan = await getPlanById(sub.planId);
  return { sub, plan, entitlements: entitlementsFor(sub, plan) };
}

/** Error terkunci-paket — status 403 supaya route mengembalikan kode yang benar lewat errorStatus(). */
export class PlanFeatureLockedError extends Error {
  status = 403;
  code = "PLAN_FEATURE_LOCKED";
  constructor(public feature: PlanFeature) {
    super(`Fitur ${FEATURE_LABEL_ID[feature]} hanya tersedia di paket NEXBILL Pro. Upgrade di menu Langganan untuk membukanya.`);
  }
}

export async function outletHasPlanFeature(outletId: string, feature: PlanFeature): Promise<boolean> {
  const { entitlements } = await getOutletEntitlements(outletId);
  return hasFeature(entitlements, feature);
}

/** Lempar PlanFeatureLockedError kalau paket outlet tidak mencakup fitur ini. Superuser selalu lolos. */
export async function assertPlanFeature(outletId: string, feature: PlanFeature, role?: string): Promise<void> {
  if (role === "superuser") return;
  if (!(await outletHasPlanFeature(outletId, feature))) throw new PlanFeatureLockedError(feature);
}

/**
 * Batas kuota unit PS aktif untuk paket Starter — panggil sebelum membuat unit baru atau
 * mengaktifkan kembali unit. Pro, trial, dan free_forever tidak dibatasi.
 */
export async function assertUnitQuotaAvailable(outletId: string, role?: string, excludeUnitId?: string): Promise<void> {
  if (role === "superuser") return;
  const { entitlements } = await getOutletEntitlements(outletId);
  if (entitlements.unitLimit == null) return;
  const active = await countActiveUnits(outletId, excludeUnitId);
  if (active >= entitlements.unitLimit) {
    const err = new Error(
      `Kuota paket Starter: ${entitlements.unitLimit} unit aktif. Tambah kuota unit atau upgrade ke Pro (unit tak terbatas) di menu Langganan.`
    ) as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

/**
 * Enforces the trial's device rules — call this BEFORE inserting a new row
 * in POST /api/devices. Paid subscribers (active/grace) have no restriction.
 * During trial: smart-plug-family protocols are blocked outright (must
 * purchase via checkout first); Android-TV-family protocols are capped at 1
 * device outlet-wide. Any locked status (trial expired / suspended /
 * cancelled / mid-checkout) blocks adding devices entirely.
 *
 * Only Superuser bypasses this — NEXBILL's own internal/testing account, never blocked by any
 * commercial gate so every feature stays reachable for support/QA. Owner is deliberately NOT
 * exempt here (unlike the void/refund/approval authority bypasses elsewhere in this app, which
 * are about who has business AUTHORITY, not about commercial gating): Owner is the role every
 * real paying merchant logs in as day to day, so it must be subject to trial/device limits like
 * any other account, or the entire trial mechanism becomes unenforceable in practice.
 */
export async function assertDeviceAllowed(outletId: string, protocol: DeviceProtocol, excludeDeviceId?: string, role?: string): Promise<void> {
  if (role === "superuser") return;

  const sub = await getOrCreateSubscription(outletId);
  if (isPaidStatus(sub.status)) return;

  if (isLockedStatus(sub.status)) {
    throw new Error("Langganan tidak aktif. Selesaikan pembayaran di halaman Langganan untuk menambah perangkat.");
  }

  // status === "trial"
  if (SMART_PLUG_PROTOCOLS.includes(protocol)) {
    throw new Error("Smart plug belum bisa dipakai saat masa percobaan. Beli smart plug lewat halaman Langganan untuk membuka protokol ini.");
  }
  if (ANDROID_TV_PROTOCOLS.includes(protocol)) {
    // devices.protocol's Drizzle column type is narrower than DeviceProtocol (the DB enum list
    // predates android_tv_adb/android_tv_relay being added — see the comment on that column in
    // schema.ts; there's no real SQL CHECK constraint, so this is a type-level-only mismatch).
    const existingRows = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.outletId, outletId), inArray(devices.protocol, ANDROID_TV_PROTOCOLS as any)));
    const n = existingRows.filter((r) => r.id !== excludeDeviceId).length;
    if (n >= 1) {
      throw new Error("Masa percobaan hanya bisa memakai 1 unit TV Android. Berlangganan untuk menambah unit lagi.");
    }
  }
}

/**
 * Enforces WHO is even allowed to touch the AI features, independent of trial/billing state — call
 * this BEFORE assertAiAllowed at the top of any AI Assistant/Insights route. Deliberately narrower
 * than the "view_reports" RBAC permission (which manager/accountant/supervisor also hold for the
 * ordinary Reports pages): AI usage is currently restricted to "superuser" (NEXBILL's own internal/
 * testing account) and "owner" (the one real-merchant role allowed to spend the outlet's own money
 * on the AI Add-on) — a cashier/manager/accountant/kitchen/supervisor account can never trigger AI,
 * even on an outlet that has an active AI Add-on, and even though some of those roles do hold
 * view_reports. This is intentionally NOT wired into the editable role_permissions matrix (Staf &
 * Hak Akses > Role & Izin) — it's a hard product rule, not something an Owner should be able to
 * loosen for their own staff via that UI.
 */
export function assertAiRoleAllowed(role?: string): void {
  if (role === "superuser" || role === "owner") return;
  throw new Error("Fitur AI saat ini hanya bisa dipakai oleh akun Owner atau Superuser, bukan staf biasa.");
}

/**
 * Enforces the AI Add-on entitlement (trial/billing state) — call at the top of any AI Assistant/
 * Insights route, after assertAiRoleAllowed. AI is a genuinely separate paid product from the base
 * subscription (see aiAddonPriceMonthly on subscriptionPlans and the AI COGS & margin model): every
 * call costs real Claude API tokens (COGS), unlike flat-priced add-ons like the smart plug. Free
 * automatically during the base subscription's 30-day trial (a taste of the feature, no separate
 * signup needed); once trial ends, it requires this add-on regardless of whether the base
 * subscription itself is active.
 *
 * Only "superuser" bypasses here — NEXBILL's own internal/testing account, never gated by trial or
 * payment so every feature stays reachable for support/QA (same rationale as assertDeviceAllowed
 * and SubscriptionGate). "owner" is NOT exempt: unlike void/refund/approval elsewhere in this file
 * (AUTHORITY questions where the account owner's own judgment should never be second-guessed), AI
 * usage is a metered cost — every call an owner makes personally costs NEXBILL the same real money
 * as anyone else's call, so the owner's own account must still go through trial/AI Add-on like a
 * real customer.
 */
export async function assertAiAllowed(outletId: string, role?: string): Promise<void> {
  if (role === "superuser") return;
  const sub = await getOrCreateSubscription(outletId);
  if (sub.status === "trial") return; // free during the 30-day trial, no add-on purchase needed yet
  // Paket Pro (flat per outlet) bundles AI in — the per-call AI cost is absorbed into the flat
  // plan price, a deliberate pricing decision. Starter still buys the AI Add-on
  // (aiAddonActive/aiAddonPeriodEnd below).
  // Struktur harga 2026-10: AI termasuk paket Pro; Starter perlu AI Add-on. free_forever TIDAK
  // berubah — hanya lolos lewat hasUnlimitedEntitlement lamanya, selain itu tetap perlu Add-on
  // (lihat planIncludesAi). Paket dibaca dari langganan ini sendiri, bukan paket default platform.
  if (planIncludesAi(sub, await getPlanById(sub.planId))) return;

  if (sub.aiAddonActive) {
    if (sub.aiAddonPeriodEnd && sub.aiAddonPeriodEnd > new Date().toISOString()) return;
    // Expired — lazily self-heal the same way trial/grace/suspended transitions do elsewhere in
    // this file, so status is accurate to "now" the moment anything touches it, not just whenever
    // a scheduler last ran.
    await db.update(subscriptions).set({ aiAddonActive: false }).where(eq(subscriptions.id, sub.id));
    await logEvent(sub.outletId, sub.id, "ai_addon_expired", "Masa aktif AI Add-on berakhir.");
  }

  throw new Error(
    "Fitur AI gratis selama masa percobaan 30 hari dan sudah termasuk di paket NEXBILL Pro. Untuk paket Starter, aktifkan AI Add-on di halaman Langganan — atau upgrade ke Pro."
  );
}

/**
 * Idempotent — ensures ONE unpaid "ai_addon" invoice exists for this outlet (same
 * one-unpaid-at-a-time pattern as ensureRenewalInvoiceExists), priced from the active plan's
 * aiAddonPriceMonthly. Paying it (via the normal initiateInvoicePayment/confirmInvoicePayment
 * flow, same as any other invoice) is what flips subscriptions.aiAddonActive on / extends
 * aiAddonPeriodEnd by 1 month — see the dedicated fulfillment block in confirmInvoicePayment.
 */
export async function requestAiAddonActivation(outletId: string) {
  const sub = await getOrCreateSubscription(outletId);
  const [existingUnpaid] = await db
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "ai_addon"), eq(subscriptionInvoices.status, "unpaid")))
    .limit(1);
  if (existingUnpaid) return existingUnpaid;

  const plan = await ensureDefaultPlan();
  const label = sub.aiAddonActive ? "perpanjangan 1 bulan" : "aktivasi 1 bulan";
  const invoice = await createInvoice({
    outletId,
    subscriptionId: sub.id,
    type: "ai_addon",
    description: `AI Add-on NEXBILL — ${label}`,
    qty: 1,
    unitPrice: plan.aiAddonPriceMonthly,
  });
  await logEvent(outletId, sub.id, "invoice_created", `${invoice.invoiceNumber} — AI Add-on (Rp${invoice.amount})`);
  return invoice;
}

/** Counts active rental units by TV type — the basis for smart-plug quantity + extra-console billing at checkout, computed fresh (not trusted from client input). */
export async function computeTvComposition(outletId: string) {
  const units = await db
    .select({ tvType: rentalUnits.tvType })
    .from(rentalUnits)
    .where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  const androidTv = units.filter((u) => u.tvType === "android_tv").length;
  const nonAndroidTv = units.length - androidTv;
  return { androidTv, nonAndroidTv, total: units.length };
}

/** invoice_number UNIQUE secara global — lihat lib/db/nomor-urut.ts untuk bug count(*)+1 yang digantikan. */
function generateInvoiceNumber(): Promise<string> {
  return nomorBerikutnya(subscriptionInvoices, subscriptionInvoices.invoiceNumber, "SUB-INV");
}

async function createInvoice(input: {
  outletId: string;
  subscriptionId: string;
  type: (typeof subscriptionInvoices.$inferInsert)["type"];
  description: string;
  qty: number;
  unitPrice: number;
  period?: string | null;
  periodMonths?: number | null;
  targetPlanId?: string | null;
  targetBillingCycle?: BillingCycle | null;
  targetPlanUnits?: number | null;
}) {
  const invoiceNumber = await generateInvoiceNumber();
  const amount = round(input.qty * input.unitPrice);
  const [row] = await db
    .insert(subscriptionInvoices)
    .values({
      invoiceNumber,
      outletId: input.outletId,
      subscriptionId: input.subscriptionId,
      type: input.type,
      period: input.period ?? null,
      description: input.description,
      qty: input.qty,
      unitPrice: input.unitPrice,
      amount,
      periodMonths: input.periodMonths ?? null,
      targetPlanId: input.targetPlanId ?? null,
      targetBillingCycle: input.targetBillingCycle ?? null,
      targetPlanUnits: input.targetPlanUnits ?? null,
      status: "unpaid",
      dueDate: addDaysIso(new Date().toISOString(), 3),
    })
    .returning();
  await logEvent(input.outletId, input.subscriptionId, "invoice_created", `${invoiceNumber} — ${input.description} (Rp${amount})`);
  return row;
}

/** ================= Saldo Deposit ("Daftar Mutasi") ================= */

/** Whatever subscriptions.depositBalance/billingGroups.depositBalance's doc comments describe —
 * accepts either a full SubscriptionRow or (for the group-renewal path, which only ever has the
 * anchor member's row on hand, not the caller's own) any row shaped the same way. */
type DepositScope = { billingGroupId: string | null; id: string; outletId: string };
type DepositOwner = { kind: "group"; id: string } | { kind: "subscription"; id: string };

function getDepositOwner(scope: DepositScope): DepositOwner {
  return scope.billingGroupId ? { kind: "group", id: scope.billingGroupId } : { kind: "subscription", id: scope.id };
}

async function getDepositBalance(scope: DepositScope): Promise<number> {
  const owner = getDepositOwner(scope);
  if (owner.kind === "group") {
    const [g] = await db.select({ depositBalance: billingGroups.depositBalance }).from(billingGroups).where(eq(billingGroups.id, owner.id)).limit(1);
    return g?.depositBalance ?? 0;
  }
  const [s] = await db.select({ depositBalance: subscriptions.depositBalance }).from(subscriptions).where(eq(subscriptions.id, owner.id)).limit(1);
  return s?.depositBalance ?? 0;
}

/** Applies a signed delta (positive = credit, negative = debit) to whichever balance owns this
 * scope, and appends one row to subscriptionDepositMutations recording the change — every top-up/
 * usage/refund/adjustment goes through here so the ledger and the live balance can never drift
 * apart. Returns the new balance. */
async function adjustDepositBalance(
  scope: DepositScope,
  delta: number,
  type: (typeof subscriptionDepositMutations.$inferInsert)["type"],
  opts: { relatedInvoiceId?: string; note?: string } = {}
): Promise<number> {
  const owner = getDepositOwner(scope);
  let balanceAfter: number;
  if (owner.kind === "group") {
    const [updated] = await db
      .update(billingGroups)
      .set({ depositBalance: sql`${billingGroups.depositBalance} + ${delta}` })
      .where(eq(billingGroups.id, owner.id))
      .returning();
    balanceAfter = updated.depositBalance;
  } else {
    const [updated] = await db
      .update(subscriptions)
      .set({ depositBalance: sql`${subscriptions.depositBalance} + ${delta}` })
      .where(eq(subscriptions.id, owner.id))
      .returning();
    balanceAfter = updated.depositBalance;
  }
  await db.insert(subscriptionDepositMutations).values({
    subscriptionId: owner.kind === "subscription" ? owner.id : null,
    billingGroupId: owner.kind === "group" ? owner.id : null,
    type,
    amount: delta,
    balanceAfter,
    relatedInvoiceId: opts.relatedInvoiceId ?? null,
    note: opts.note ?? null,
  });
  return balanceAfter;
}

/**
 * Auto-applies whatever's sitting in Saldo Deposit against a freshly-created renewal invoice —
 * called right after ensureRenewalInvoiceExists/ensureGroupRenewalInvoiceExists creates one, so a
 * topped-up outlet never has to manually remember to pay from deposit. Fully covers the invoice ->
 * confirms it paid immediately (reusing confirmInvoicePayment's own activation logic, nothing
 * duplicated here). Partially covers it -> reduces the invoice's own amount by the covered portion
 * and leaves it unpaid for the remainder (so the payment-method buttons show the smaller number).
 * A no-op (returns the invoice unchanged) when there's no balance to apply, or the invoice is
 * already non-unpaid.
 */
async function applyDepositToInvoice(scope: DepositScope, invoice: typeof subscriptionInvoices.$inferSelect): Promise<typeof subscriptionInvoices.$inferSelect> {
  if (invoice.status !== "unpaid") return invoice;
  const balance = await getDepositBalance(scope);
  if (balance <= 0) return invoice;

  const deducted = round(Math.min(balance, invoice.amount));
  await adjustDepositBalance(scope, -deducted, "usage", { relatedInvoiceId: invoice.id, note: `Dipakai otomatis untuk ${invoice.invoiceNumber}` });
  await logEvent(invoice.outletId, scope.id, "deposit_used", `${invoice.invoiceNumber} — Rp${deducted} dipakai dari saldo deposit.`);

  if (deducted >= invoice.amount) {
    return (await confirmInvoicePayment(invoice.id)) as typeof subscriptionInvoices.$inferSelect;
  }
  const [updated] = await db
    .update(subscriptionInvoices)
    .set({ amount: round(invoice.amount - deducted) })
    .where(eq(subscriptionInvoices.id, invoice.id))
    .returning();
  return updated;
}

/** Creates an unpaid "deposit_topup" invoice for the requested amount — the outlet pays it through
 * the exact same cash/QRIS/VA/iPaymu flow as any other invoice (initiateInvoicePayment/
 * confirmInvoicePayment), which is what actually credits the balance once paid (see the
 * `invoice.type === "deposit_topup"` branch inside confirmInvoicePayment below). */
export async function createDepositTopupInvoice(outletId: string, amount: number) {
  if (!(amount > 0)) throw new Error("Jumlah top up harus lebih dari 0.");
  const sub = await getOrCreateSubscription(outletId);
  return createInvoice({
    outletId,
    subscriptionId: sub.id,
    type: "deposit_topup",
    description: `Top up Saldo Deposit — Rp${round(amount)}`,
    qty: 1,
    unitPrice: round(amount),
  });
}

/** Current balance + full mutation history for the Billing page's "Saldo Deposit" tab. */
export async function getDepositOverview(outletId: string) {
  const sub = await getOrCreateSubscription(outletId);
  const owner = getDepositOwner(sub);
  const balance = await getDepositBalance(sub);
  const mutations = await db
    .select()
    .from(subscriptionDepositMutations)
    .where(owner.kind === "group" ? eq(subscriptionDepositMutations.billingGroupId, owner.id) : eq(subscriptionDepositMutations.subscriptionId, owner.id))
    .orderBy(desc(subscriptionDepositMutations.createdAt));
  return { balance, mutations, isGroupBalance: owner.kind === "group" };
}

/** ================= "Pertumbuhan Data" usage-growth stats ================= */

/**
 * Monthly transaction-count + revenue trend for the "Pertumbuhan Data" chart — NEXBILL's own
 * equivalent of Accurate.id's data-growth graph, just scoped to something that's actually
 * meaningful for a POS/rental app (how much is this outlet transacting month over month) rather
 * than a generic "data row count" metric that has no real analogue here. Always returns exactly
 * `months` entries in chronological order, zero-filled for any month with no orders, so the chart
 * never has a gap.
 */
export async function getMonthlyUsageStats(outletId: string, months = 6) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (months - 1));
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);
  const cutoffIso = cutoff.toISOString();

  const rows = await db
    .select({
      month: sql<string>`to_char(${orders.createdAt}::timestamptz, 'YYYY-MM')`,
      orderCount: sql<number>`count(*)`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(and(eq(orders.outletId, outletId), gte(orders.createdAt, cutoffIso)))
    .groupBy(sql`to_char(${orders.createdAt}::timestamptz, 'YYYY-MM')`)
    .orderBy(sql`to_char(${orders.createdAt}::timestamptz, 'YYYY-MM')`);

  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const out: { month: string; orderCount: number; revenue: number }[] = [];
  const cursor = new Date(cutoff);
  for (let i = 0; i < months; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const existing = byMonth.get(key);
    out.push({ month: key, orderCount: Number(existing?.orderCount ?? 0), revenue: Number(existing?.revenue ?? 0) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

function currentPeriodLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Memastikan katalog paket Starter & Pro ada (lihat plan-catalog.ts / pricing.ts) dan
 * mengembalikan paket Pro — dipakai sebagai sumber harga AI Add-on dan paket bawaan. Dipanggil
 * dari scripts/seed.ts dan secara defensif di checkout.
 */
export async function ensureDefaultPlan(): Promise<PlanRow> {
  const catalog = await ensureDefaultPlans();
  const pro = catalog.find((p) => p.code === "pro") ?? (await getPlanByCode("pro")) ?? catalog[0];
  if (!pro) throw new Error("Paket langganan tidak ditemukan. Hubungi NEXBILL untuk mengaktifkan katalog paket.");
  return pro;
}

/**
 * Seeds a starter storefront catalog (a couple of smart plug variants and the installation
 * service) into an empty catalog. (Kuota unit kini bagian dari paket Starter, bukan produk Toko.) Called ONLY from scripts/seed.ts.
 *
 * Sengaja TIDAK dipanggil dari listStorefrontProducts(). Sebelum 2026-09-23 fungsi ini dipanggil
 * di awal listStorefrontProducts() "secara defensif", dan itu ternyata bug serius: penjaganya
 * hanya `if (existing) return`, jadi begitu platform-admin menghapus SELURUH produk, tabelnya
 * kosong — dan kunjungan merchant berikutnya ke tab Toko langsung menyemai ulang keempat produk
 * bawaan ini. Dari sisi admin tombol Hapus tampak gagal padahal berhasil; produknya "hidup lagi"
 * sendiri. Etalase kosong adalah keadaan yang sah (admin memang sedang mengosongkannya), dan
 * satu-satunya cara membedakannya dari database yang belum pernah di-seed adalah menyemai hanya
 * pada saat seed eksplisit — bukan pada setiap pembacaan.
 */
export async function ensureDefaultProducts() {
  const [existing] = await db.select().from(platformProducts).limit(1);
  if (existing) return;
  await db.insert(platformProducts).values([
    {
      category: "smart_plug",
      name: "Smart Plug BARDI Basic",
      description: "Colokan pintar 1 saluran, kontrol on/off via Tuya Cloud — cukup untuk TV analog/smart TV biasa.",
      price: 275000,
      sortOrder: 0,
    },
    {
      category: "smart_plug",
      name: "Smart Plug BARDI Pro (Energy Monitor)",
      description: "Sama seperti Basic, ditambah pemantauan konsumsi listrik (watt/jam) per unit — cocok untuk pantau biaya listrik per bilik.",
      price: 349000,
      sortOrder: 1,
    },
    {
      category: "installation_service",
      name: "Jasa Setup Jarak Jauh",
      description: "Dipasang/disettingkan oleh vendor dari jarak jauh (remote) — kamu tinggal colok, vendor yang konfigurasi ke akun Tuya Cloud outlet-mu.",
      price: 125000,
      sortOrder: 0,
    },
  ]);
}

/** Active storefront products for the Billing page's etalase, grouped/sorted for rendering. */
export async function listStorefrontProducts() {
  const rows = await db.select().from(platformProducts).where(eq(platformProducts.isActive, true));
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface CartCheckoutInput {
  outletId: string;
  planCode?: string; // "starter" | "pro" — default "pro"
  billingCycle?: BillingCycle;
  /** Kuota unit untuk paket Starter (min 5, minimal sejumlah unit aktif). Diabaikan untuk Pro. */
  units?: number;
  items: { productId: string; qty: number }[]; // free-form — merchant picks whatever quantity they want
  installContactName?: string;
  installContactPhone?: string;
  shippingAddress?: string;
  // Required (and re-verified server-side against Biteship) whenever the cart contains any
  // smart_plug item — see the shipping block inside checkoutCart. shippingDestinationAreaId
  // comes from /api/shipping/areas (searchAreas); courierCode/courierServiceName come from
  // whichever option the merchant picked from /api/shipping/rates.
  shippingDestinationAreaId?: string;
  shippingDestinationAreaLabel?: string;
  shippingCourierCode?: string;
  shippingCourierServiceName?: string;
}

interface CartLineItem {
  category: "subscription" | "smart_plug" | "installation_service" | "extra_console" | "other_product" | "shipping";
  productId: string | null; // null for the subscription-fee and shipping lines
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

/**
 * Shared shipping-pricing helper for both checkoutCart (bundled first-checkout) and
 * checkoutProductOrder (standalone "Toko" tab, added 2026-09-13) — re-verifies the Biteship rate
 * for whichever smart_plug items are in the cart, entirely server-side. Price is NEVER trusted
 * from the client: re-fetch rates here with the merchant's chosen destination + weight-derived
 * items, then look up the exact courier+service they picked in that fresh response. If it's gone
 * (price changed, courier deactivated, etc.) checkout fails with a clear message rather than
 * silently charging a stale/tampered number. Returns `line: null` (nothing to charge or ship) when
 * the cart has no smart_plug items at all.
 */
async function priceShippingIfNeeded(
  requestedItems: { productId: string; qty: number }[],
  productMap: Map<string, typeof platformProducts.$inferSelect>,
  input: { shippingDestinationAreaId?: string; shippingCourierCode?: string; shippingCourierServiceName?: string }
): Promise<{ shippingCost: number; line: CartLineItem | null }> {
  const smartPlugRateItems = requestedItems
    .map((item) => {
      const product = productMap.get(item.productId);
      // Both physical-goods categories ship — "smart_plug" (the original case) and "other_product"
      // (added 2026-09-13 for the standalone Toko tab's generic merchandise). installation_service
      // and extra_console are never physical, so they're excluded here same as before.
      if (!product || !product.isActive || (product.category !== "smart_plug" && product.category !== "other_product")) return null;
      return {
        name: product.name,
        value: product.price,
        weight: product.weightGrams,
        quantity: Math.max(1, Math.round(Number(item.qty))),
        length: product.lengthCm,
        width: product.widthCm,
        height: product.heightCm,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (smartPlugRateItems.length === 0) return { shippingCost: 0, line: null };

  if (!input.shippingDestinationAreaId) throw new Error("Alamat pengiriman wajib diisi untuk pembelian Smart Plug.");
  if (!input.shippingCourierCode || !input.shippingCourierServiceName) throw new Error("Pilih kurir pengiriman untuk Smart Plug terlebih dahulu.");
  const options = await getRates(input.shippingDestinationAreaId, smartPlugRateItems);
  const match = options.find((o) => o.courierCode === input.shippingCourierCode && o.courierServiceName === input.shippingCourierServiceName);
  if (!match) throw new Error("Opsi kurir yang dipilih sudah tidak tersedia lagi — cek ulang ongkos kirim dan pilih ulang.");
  const shippingCost = match.price;
  return {
    shippingCost,
    line: { category: "shipping", productId: null, name: `Ongkos Kirim — ${match.courierName} ${match.courierServiceName}`, qty: 1, unitPrice: shippingCost, amount: shippingCost },
  };
}

/**
 * Etalase/cart checkout — the free-form successor to the old startCheckout() (removed 2026-10). The subscription fee
 * line is always included and mandatory (qty locked at 1); every other line comes from whatever
 * the merchant put in their cart, at whatever quantity they chose — no longer tied to the
 * outlet's actual rentalUnits composition (see the product decision that motivated this: cart
 * quantities are genuinely free-form e-commerce, not an auto-computed usage bill). Everything
 * collapses into ONE subscriptionInvoices row (type "cart_order") with an itemized
 * `lineItemsJson` breakdown, so the outlet gets one payment/one VA/one QR to settle the whole
 * cart at once, matching the single "keranjang -> checkout -> bayar" flow on the Billing page.
 *
 * IMPORTANT — accounting isolation: this whole file never imports postJournal/lib/accounting/*
 * and never touches journalEntries/journalLines. Money an outlet pays here is NEXBILL's own
 * subscription/hardware/service revenue (tracked in subscriptionInvoices, surfaced at
 * /platform-admin/subscriptions + /platform-admin/cogs) — it must NEVER be posted into that
 * outlet's own COA/journal, or it would look like the outlet's merchant revenue in their P&L.
 * Keep it that way if this file is ever touched again.
 */
export async function checkoutCart(input: CartCheckoutInput) {
  const sub = await getOrCreateSubscription(input.outletId);
  if (sub.status === "free_forever") throw new Error("Outlet ini memiliki akses gratis selamanya — tidak perlu berlangganan.");
  if (isPaidStatus(sub.status)) throw new Error("Langganan outlet ini sudah aktif. Gunakan Ganti Paket untuk upgrade/ubah paket.");
  const fallback = await ensureDefaultPlan();
  const plan = input.planCode ? await getPlanByCode(input.planCode) : fallback;
  if (!plan || !plan.isActive) throw new Error("Paket langganan tidak ditemukan. Hubungi NEXBILL untuk mengaktifkan katalog paket.");
  const cycle = normalizeCycle(input.billingCycle);
  const isStarter = planTierOf(plan) === "starter";
  const activeUnits = await countActiveUnits(input.outletId);
  const requestedUnits = Math.floor(Number(input.units) || 0);
  if (isStarter && requestedUnits > 0 && requestedUnits < activeUnits) {
    throw new Error(`Outlet ini punya ${activeUnits} unit PS aktif — kuota Starter minimal ${activeUnits} unit (atau nonaktifkan unit di Rental PS dulu).`);
  }
  const charge = await chargeFor(sub, plan, { cycle, units: requestedUnits });

  const lines: CartLineItem[] = [
    { category: "subscription", productId: null, name: `Langganan ${describeCharge(plan.name, charge)} — periode pertama`, qty: 1, unitPrice: charge.amount, amount: round(charge.amount) },
  ];

  let shippingCost = 0;
  const requestedItems = (input.items ?? []).filter((i) => i.productId && Number(i.qty) > 0);
  if (requestedItems.length > 0) {
    const productIds = requestedItems.map((i) => i.productId);
    const products = await db.select().from(platformProducts).where(inArray(platformProducts.id, productIds));
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of requestedItems) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) continue; // silently skip a stale/removed cart entry rather than failing the whole checkout
      const qty = Math.max(1, Math.round(Number(item.qty)));
      lines.push({
        category: product.category as CartLineItem["category"],
        productId: product.id,
        name: product.name,
        qty,
        unitPrice: product.price,
        amount: round(qty * product.price),
      });
    }

    // ---- Shipping (Biteship) — only when the cart actually has physical Smart Plug units ----
    const shipping = await priceShippingIfNeeded(requestedItems, productMap, input);
    shippingCost = shipping.shippingCost;
    if (shipping.line) lines.push(shipping.line);
  }

  const total = round(lines.reduce((s, l) => s + l.amount, 0));
  const invoiceNumber = await generateInvoiceNumber();
  const [invoice] = await db
    .insert(subscriptionInvoices)
    .values({
      invoiceNumber,
      outletId: input.outletId,
      subscriptionId: sub.id,
      type: "cart_order",
      description: `Belanja Langganan NEXBILL — ${lines.length} item`,
      qty: 1,
      unitPrice: total,
      amount: total,
      lineItemsJson: JSON.stringify(lines),
      status: "unpaid",
      dueDate: addDaysIso(new Date().toISOString(), 3),
    })
    .returning();
  await logEvent(input.outletId, sub.id, "invoice_created", `${invoiceNumber} — belanja ${lines.length} item (Rp${total})`);

  await db
    .update(subscriptions)
    .set({
      status: "pending_payment",
      planId: plan.id,
      billingCycle: charge.cycle,
      planUnits: isStarter ? charge.billedUnits : 0,
      nextPlanId: null,
      nextBillingCycle: null,
      nextPlanUnits: null,
    })
    .where(eq(subscriptions.id, sub.id));

  const smartPlugQty = lines.filter((l) => l.category === "smart_plug").reduce((s, l) => s + l.qty, 0);
  const wantsInstall = lines.some((l) => l.category === "installation_service");
  if (smartPlugQty > 0) {
    await db.insert(smartPlugOrders).values({
      outletId: input.outletId,
      subscriptionInvoiceId: invoice.id,
      qty: smartPlugQty,
      installRequested: wantsInstall,
      installStatus: wantsInstall ? "requested" : "not_requested",
      contactName: input.installContactName,
      contactPhone: input.installContactPhone,
      shippingAddress: input.shippingAddress,
      shippingAreaId: input.shippingDestinationAreaId ?? null,
      shippingAreaLabel: input.shippingDestinationAreaLabel ?? null,
      shippingCourierCode: input.shippingCourierCode ?? null,
      shippingCourierServiceName: input.shippingCourierServiceName ?? null,
      shippingCost,
    });
  }

  await logEvent(input.outletId, sub.id, "checkout_started", `Cart checkout — ${invoiceNumber}, total Rp${total}`);
  return invoice;
}

export interface ProductCheckoutInput {
  outletId: string;
  items: { productId: string; qty: number }[]; // free-form — merchant picks whatever quantity they want
  installContactName?: string;
  installContactPhone?: string;
  shippingAddress?: string;
  shippingDestinationAreaId?: string;
  shippingDestinationAreaLabel?: string;
  shippingCourierCode?: string;
  shippingCourierServiceName?: string;
}

/**
 * "Toko" tab checkout (added 2026-09-13, per the owner's explicit request) — buys NEXBILL's
 * physical products (Smart Plug, other merchandise) and/or services on their own, WITHOUT the
 * subscription-fee line checkoutCart always bundles in. Deliberately usable regardless of the
 * outlet's subscription status — including trial, trial_expired, suspended, or cancelled — since
 * buying hardware has nothing to do with software access; the owner's own explicit choice was
 * "selalu bisa, termasuk saat terkunci". So this function, unlike checkoutCart,
 * never reads or writes `subscriptions.status`/`planId` at all — getOrCreateSubscription() below is
 * called ONLY to obtain sub.id for the invoice's required subscriptionId foreign key.
 *
 * Produces its own `subscriptionInvoices` row (type "product_order", never "cart_order") so it's
 * cleanly distinguishable in reporting/COGS AND so it's excluded from the pending_payment
 * activation unpaid-invoice count in confirmInvoicePayment — an outlet mid first-checkout who also
 * orders a t-shirt here must not have their access activation blocked on the t-shirt invoice too.
 *
 * Same accounting isolation rule as checkoutCart applies here: never posts to the outlet's own
 * journal — this is NEXBILL's own revenue, tracked only in subscriptionInvoices.
 */
export async function checkoutProductOrder(input: ProductCheckoutInput) {
  const sub = await getOrCreateSubscription(input.outletId);

  const requestedItems = (input.items ?? []).filter((i) => i.productId && Number(i.qty) > 0);
  if (requestedItems.length === 0) throw new Error("Keranjang kosong — pilih minimal satu produk.");

  const productIds = requestedItems.map((i) => i.productId);
  const products = await db.select().from(platformProducts).where(inArray(platformProducts.id, productIds));
  const productMap = new Map(products.map((p) => [p.id, p]));

  const lines: CartLineItem[] = [];
  for (const item of requestedItems) {
    const product = productMap.get(item.productId);
    if (!product || !product.isActive) continue; // silently skip a stale/removed cart entry rather than failing the whole checkout
    const qty = Math.max(1, Math.round(Number(item.qty)));
    lines.push({
      category: product.category as CartLineItem["category"],
      productId: product.id,
      name: product.name,
      qty,
      unitPrice: product.price,
      amount: round(qty * product.price),
    });
  }
  if (lines.length === 0) throw new Error("Semua produk di keranjang sudah tidak tersedia — muat ulang etalase dan coba lagi.");

  const { shippingCost, line: shippingLine } = await priceShippingIfNeeded(requestedItems, productMap, input);
  if (shippingLine) lines.push(shippingLine);

  const total = round(lines.reduce((s, l) => s + l.amount, 0));
  const invoiceNumber = await generateInvoiceNumber();
  const [invoice] = await db
    .insert(subscriptionInvoices)
    .values({
      invoiceNumber,
      outletId: input.outletId,
      subscriptionId: sub.id,
      type: "product_order",
      description: `Belanja Produk NEXBILL — ${lines.length} item`,
      qty: 1,
      unitPrice: total,
      amount: total,
      lineItemsJson: JSON.stringify(lines),
      status: "unpaid",
      dueDate: addDaysIso(new Date().toISOString(), 3),
    })
    .returning();
  await logEvent(input.outletId, sub.id, "invoice_created", `${invoiceNumber} — belanja produk ${lines.length} item (Rp${total})`);

  const smartPlugQty = lines.filter((l) => l.category === "smart_plug").reduce((s, l) => s + l.qty, 0);
  const otherProductQty = lines.filter((l) => l.category === "other_product").reduce((s, l) => s + l.qty, 0);
  const wantsInstall = lines.some((l) => l.category === "installation_service");
  // Fires for EITHER physical category — a pure "other_product" order (no smart_plug at all) still
  // needs a fulfillment record for NEXBILL to know where to ship it, even though `qty` here only
  // ever tracks the smart_plug count specifically (it feeds the "N smart plug terdaftar" line on
  // the Billing page — see confirmInvoicePayment, which reads smartPlugQty straight from
  // lineItemsJson, never from this row's qty column, so leaving other_product out of it is safe).
  if (smartPlugQty > 0 || otherProductQty > 0) {
    await db.insert(smartPlugOrders).values({
      outletId: input.outletId,
      subscriptionInvoiceId: invoice.id,
      qty: smartPlugQty,
      installRequested: wantsInstall,
      installStatus: wantsInstall ? "requested" : "not_requested",
      contactName: input.installContactName,
      contactPhone: input.installContactPhone,
      shippingAddress: input.shippingAddress,
      shippingAreaId: input.shippingDestinationAreaId ?? null,
      shippingAreaLabel: input.shippingDestinationAreaLabel ?? null,
      shippingCourierCode: input.shippingCourierCode ?? null,
      shippingCourierServiceName: input.shippingCourierServiceName ?? null,
      shippingCost,
    });
  }

  await logEvent(input.outletId, sub.id, "checkout_started", `Toko checkout — ${invoiceNumber}, total Rp${total}`);
  return invoice;
}

/** Initiates payment on one subscription/platform invoice — money flowing from the outlet owner TO
 * NEXBILL. Every channel goes through NEXBILL's own iPaymu account via SUBSCRIPTION_GATEWAYS
 * below; see that map's comment for why this must never share gateways with the outlet's own
 * customer-facing checkout.
 *
 * "ipaymu_crossborder" is the mancanegara channel (see resolveBillingCurrencyForOutlet /
 * /platform-admin/market-risk) — the actual charge still always settles in IDR (see the top-of-
 * file note on ipaymu-crossborder.ts: iPaymu's cross-border product is card acceptance settled to
 * the merchant in IDR, the card network converts at charge time), `invoice.amount` is never
 * touched; displayCurrencyCode/displayAmount are purely what the customer SAW quoted on the
 * Billing page (see money()/data.billingCurrency there), for cosmetic receipt text only. */
/**
 * Every channel on this page settles into NEXBILL's OWN iPaymu account, because that is what this
 * money is: an outlet paying NEXBILL for the software it subscribes to and the hardware it buys
 * from the NEXBILL team. It is never an outlet's customer paying the outlet — that direction is
 * the POS/Rental flow in lib/payments/index.ts, which keeps its own gateways (Fastpay, cash,
 * e-wallets) so the money lands in the OUTLET's account. The two must never share a gateway.
 *
 * Until 2026-09-16 the QRIS and va_* channels here went through fastpayGateway, which was simply
 * wrong on those grounds — and in practice it also meant billing ran on mock numbers, since the
 * FASTPAY_* env vars were never set for this deployment while the IPAYMU_* ones were. The direct
 * gateways below already existed in the iPaymu adapter (added for a since-reverted outlet-facing
 * feature) but had no caller; this is the flow they were always right for.
 */
const SUBSCRIPTION_GATEWAYS: Record<string, PaymentGateway> = {
  qris: ipaymuQrisGateway,
  va_bca: ipaymuVaBcaGateway,
  va_bni: ipaymuVaBniGateway,
  va_mandiri: ipaymuVaMandiriGateway,
  va_bri: ipaymuVaBriGateway,
  va_permata: ipaymuVaPermataGateway,
  ipaymu_crossborder: ipaymuCrossBorderGateway,
  ipaymu_hosted: ipaymuHostedGateway,
};

export async function initiateInvoicePayment(invoiceId: string, method: "qris" | VaBankMethod | "ipaymu_crossborder" | "ipaymu_hosted") {
  const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");
  if (invoice.status === "paid") throw new Error("Invoice ini sudah lunas.");

  // "cash" was removed as a selectable channel on 2026-09-16 (owner's call: NEXBILL's own billing
  // is an online service, so an outlet paying its subscription in cash was never a real flow).
  // Historical invoices that already carry method "cash" are untouched: they keep their guard in
  // syncInvoicePaymentStatus below and stay confirmable through confirmInvoicePayment
  // (POST /api/subscription/invoices/[id]/confirm).
  const gateway = SUBSCRIPTION_GATEWAYS[method];
  if (!gateway) throw new Error("Metode pembayaran tidak dikenal.");

  let displayCurrencyCode: string | undefined;
  let displayAmount: number | undefined;
  if (method === "ipaymu_crossborder") {
    const billingCurrency = await resolveBillingCurrencyForOutlet(invoice.outletId);
    if (billingCurrency.code && billingCurrency.effectiveRateIdrPerUnit) {
      displayCurrencyCode = billingCurrency.code;
      displayAmount = convertIdrToCurrency(invoice.amount, billingCurrency.effectiveRateIdrPerUnit);
    }
  }

  const result = await gateway.createPayment({
    orderId: invoice.id,
    amount: invoice.amount,
    method,
    description: `NEXBILL — ${invoice.description}`,
    displayCurrencyCode,
    displayAmount,
  });

  const [updated] = await db
    .update(subscriptionInvoices)
    .set({
      method,
      providerRef: result.providerRef,
      qrString: result.qrString,
      qrImageUrl: result.qrImageUrl,
      vaNumber: result.vaNumber,
      vaBankCode: result.bankCode,
      // Previously never persisted — the Billing page's countdown timer reads inv.expiresAt, but
      // this column was always null until now, so the countdown silently never rendered. See
      // schema.ts's doc comment on subscriptionInvoices.expiresAt for how this differs from the
      // 48-hour invoice-level auto-expire sweep.
      expiresAt: result.expiresAt ?? null,
    })
    .where(eq(subscriptionInvoices.id, invoiceId))
    .returning();

  // paymentUrl is returned alongside the row but deliberately NOT persisted: subscriptionInvoices
  // has no column for it, and a hosted-checkout session URL is short-lived anyway. Before this,
  // the function returned the bare row, so the Billing page's `window.open(out.paymentUrl)` was
  // opening `undefined` — the redirect to iPaymu silently never happened for ipaymu_hosted and
  // ipaymu_crossborder. If an outlet closes the tab and needs the link again, re-initiating the
  // payment (the "Buka Hal. Pembayaran" button) mints a fresh session, which is the correct
  // behaviour for an expiring checkout URL.
  return { ...updated, paymentUrl: result.checkoutUrl ?? null };
}

/**
 * The actual implementation behind the Billing page's "Cek Status Pembayaran" button (POST
 * /api/subscription/invoices/[id]/sync) — previously a dead route (see the doc comment history on
 * this file), so this button always 404'd no matter which gateway an invoice was paying through.
 * Resolves the SAME gateway initiateInvoicePayment used, by looking invoice.method up in
 * SUBSCRIPTION_GATEWAYS, calls its checkStatus(), and:
 *   - "success" -> confirms the invoice paid (idempotent, reuses confirmInvoicePayment's own
 *     activation/renewal/deposit-fulfillment logic — nothing duplicated here).
 *   - "failed" -> clears the stale method/providerRef/VA/QR so the payment-method buttons
 *     reappear, letting the outlet just try a different channel instead of being stuck.
 *   - "pending" (or gateway not configured — mock mode always returns "pending", see the iPaymu
 *     adapter's isConfigured() check) -> no-op, invoice stays unpaid.
 * Every adapter's checkStatus is live-safe to call without credentials: mock mode simply returns
 * "pending" forever, so this never throws or fakes a payment when the IPAYMU_* env vars are unset.
 */
export async function syncInvoicePaymentStatus(invoiceId: string): Promise<{ status: string }> {
  const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");
  if (invoice.status !== "unpaid") return { status: invoice.status };
  if (!invoice.method || invoice.method === "cash" || !invoice.providerRef) return { status: "unpaid" };

  // Same map initiateInvoicePayment used, so a poll always asks the gateway that actually created
  // the payment. An unknown method (a legacy row from before a channel was retired — "cash", or
  // one of the old Fastpay-era values) simply has no entry and is left alone rather than being
  // asked about at a gateway that never saw it.
  const gateway = SUBSCRIPTION_GATEWAYS[invoice.method];
  if (!gateway?.checkStatus) return { status: "unpaid" };
  const gwStatus = await gateway.checkStatus(invoice.providerRef);

  if (gwStatus === "success") {
    const updated = await confirmInvoicePayment(invoiceId);
    return { status: updated.status };
  }
  if (gwStatus === "failed") {
    await db
      .update(subscriptionInvoices)
      .set({ method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null, expiresAt: null })
      .where(eq(subscriptionInvoices.id, invoiceId));
    return { status: "unpaid" };
  }
  return { status: "unpaid" };
}

/**
 * Push counterpart of syncInvoicePaymentStatus's pull-based polling — called from
 * /api/subscription/webhook/ipaymu once that route has verified the request's signature
 * (verifyIpaymuWebhookSignature) and extracted the gateway's own transaction reference. The
 * sibling Fastpay webhook that used to also call this was deleted on 2026-09-16 along with
 * Fastpay's role in subscription billing; the POS one at /api/payments/webhook/fastpay is a
 * different endpoint updating a different table and is unaffected. Looks the
 * invoice up by providerRef (not id — a webhook only ever carries the gateway's own reference),
 * silently no-ops on an unknown/already-settled providerRef (idempotent against replayed/duplicate
 * webhook deliveries, which every payment gateway can send).
 */
export async function applyInvoiceWebhookStatus(providerRef: string, status: "success" | "failed"): Promise<void> {
  const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.providerRef, providerRef)).limit(1);
  if (!invoice || invoice.status !== "unpaid") return;

  if (status === "success") {
    await confirmInvoicePayment(invoice.id);
    return;
  }
  await db
    .update(subscriptionInvoices)
    .set({ method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null, expiresAt: null })
    .where(eq(subscriptionInvoices.id, invoice.id));
}

/**
 * Grants the "unlimited console/unit count, every feature flag on, unlimited branches"
 * entitlement (see subscriptionPlans.unlimitedEntitlement / subscriptions.hasUnlimitedEntitlement
 * / listFeatureFlags() in lib/home-rental/feature-flags.ts) the moment a payment against an
 * eligible plan is confirmed. Called from all three confirmInvoicePayment success branches below
 * (first activation, normal renewal, group renewal) — the requirement is "setiap melakukan
 * pembayaran langganan", not just the first payment ever made.
 *
 * Idempotent: a no-op once hasUnlimitedEntitlement is already true (never re-grants or
 * re-timestamps), and a no-op if the subscription has no plan yet or its plan doesn't have
 * unlimitedEntitlement set — so calling this unconditionally on every paid invoice is safe.
 */
async function grantUnlimitedEntitlementIfEligible(subIn: SubscriptionRow): Promise<void> {
  // Struktur harga 2026-10: flag ini sekarang MENGIKUTI paket yang berjalan (Pro = true, Starter =
  // false) — dibaca ulang dari DB karena pemanggil bisa memegang baris lama sebelum paket diganti.
  // free_forever tidak pernah lewat sini (tidak punya invoice langganan).
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subIn.id)).limit(1);
  if (!sub || !sub.planId || sub.status === "free_forever") return;
  const plan = await getPlanById(sub.planId);
  if (!plan) return;
  const shouldHave = !!plan.unlimitedEntitlement;
  if (sub.hasUnlimitedEntitlement === shouldHave) return;
  await db
    .update(subscriptions)
    .set({ hasUnlimitedEntitlement: shouldHave, entitlementGrantedAt: shouldHave ? new Date().toISOString() : sub.entitlementGrantedAt })
    .where(eq(subscriptions.id, sub.id));
  if (shouldHave) await logEvent(sub.outletId, sub.id, "unlimited_entitlement_granted", `Paket ${plan.name} — unit tak terbatas, semua fitur, dan AI aktif.`);
}

/** Terapkan paket/siklus/kuota target dari invoice yang lunas ke langganan (dan bersihkan pilihan next*). */
async function applySelectionFromInvoice(subId: string, target: { planId?: string | null; cycle?: string | null; units?: number | null }, extendMonths: number) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId)).limit(1);
  if (!sub) return;
  const patch: Partial<typeof subscriptions.$inferInsert> = {};
  if (target.planId) {
    if (target.planId !== sub.planId) {
      const plan = await getPlanById(target.planId);
      await logEvent(sub.outletId, sub.id, "plan_changed", `Paket berganti ke ${plan?.name ?? target.planId}`);
    }
    patch.planId = target.planId;
  }
  if (target.cycle) patch.billingCycle = normalizeCycle(target.cycle);
  if (target.units != null) patch.planUnits = Math.max(0, Math.floor(target.units));
  if (extendMonths > 0) {
    // Perpanjangan reguler: next* sudah dipakai untuk invoice ini → kosongkan.
    patch.nextPlanId = null;
    patch.nextBillingCycle = null;
    patch.nextPlanUnits = null;
  }
  if (Object.keys(patch).length) await db.update(subscriptions).set(patch).where(eq(subscriptions.id, sub.id));
}

/**
 * Marks one invoice paid (cash confirmed by NEXBILL ops, or QRIS webhook/poll
 * success) and, once every invoice from the same checkout is paid, activates
 * the subscription: status -> "active", billing period opens for 1 month.
 * Idempotent — replaying on an already-paid invoice is a safe no-op.
 */
export async function confirmInvoicePayment(invoiceId: string) {
  const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");
  if (invoice.status === "paid") return invoice;

  const [updated] = await db
    .update(subscriptionInvoices)
    .set({ status: "paid", paidAt: new Date().toISOString() })
    .where(eq(subscriptionInvoices.id, invoiceId))
    .returning();

  await logEvent(invoice.outletId, invoice.subscriptionId, "invoice_paid", `${invoice.invoiceNumber} — Rp${invoice.amount}`);

  // Referral commission accrual — no-ops for an outlet that wasn't referred, and is idempotent
  // per invoice (see accrueReferralCommission), so this is safe to run unconditionally on every
  // paid subscription_fee invoice: first checkout AND every later renewal, for as long as the
  // referred outlet keeps paying. Deliberately NOT gated behind the status-based if/else-if
  // chain below, same reasoning as the AI Add-on fulfillment block above it.
  await accrueReferralCommission(updated);

  let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, invoice.subscriptionId)).limit(1);
  if (!sub) return updated;

  // Deposit top-up fulfillment — deliberately its own early return, NOT folded into the
  // status-based if/else-if chain below: crediting Saldo Deposit has nothing to do with the base
  // subscription's own lifecycle status (trial/active/grace/whatever), and a deposit_topup invoice
  // should never accidentally activate/renew a subscription just because it happened to be paid
  // while that subscription was mid pending_payment checkout.
  if (invoice.type === "deposit_topup") {
    const balanceAfter = await adjustDepositBalance(sub, invoice.amount, "topup", { relatedInvoiceId: invoice.id, note: `Top up via ${invoice.method ?? "-"}` });
    await logEvent(invoice.outletId, sub.id, "deposit_topup", `${invoice.invoiceNumber} — saldo bertambah Rp${invoice.amount}, saldo sekarang Rp${balanceAfter}`);
    return updated;
  }

  // A paid cart_order OR product_order invoice may have bought smart plug hardware (free-form qty,
  // not tied to sub.smartPlugRequiredQty) — fulfill that qty onto the subscription's owned count
  // right away, whether this is the very first checkout, a later top-up while already active, or
  // a standalone "Toko" purchase (product_order, added 2026-09-13) made regardless of subscription
  // status. Both types share the exact same lineItemsJson shape (CartLineItem[]), so one branch
  // handles both.
  if ((invoice.type === "cart_order" || invoice.type === "product_order") && invoice.lineItemsJson) {
    try {
      const lines = JSON.parse(invoice.lineItemsJson) as CartLineItem[];
      const smartPlugQty = lines.filter((l) => l.category === "smart_plug").reduce((s, l) => s + l.qty, 0);
      if (smartPlugQty > 0) {
        const [bumped] = await db
          .update(subscriptions)
          .set({ smartPlugOwnedQty: sub.smartPlugOwnedQty + smartPlugQty, smartPlugRequiredQty: sub.smartPlugRequiredQty + smartPlugQty })
          .where(eq(subscriptions.id, sub.id))
          .returning();
        sub = bumped;
      }
    } catch {
      // Malformed/legacy lineItemsJson — skip fulfillment bump rather than fail the whole payment confirmation.
    }
  }

  // AI Add-on fulfillment — deliberately its own unconditional check, NOT folded into the
  // status-based if/else-if chain below: the base subscription's own status (pending_payment /
  // active / grace / whatever) has nothing to do with whether an ai_addon invoice should activate
  // the add-on. Folding it into that chain would silently skip fulfillment whenever an ai_addon
  // invoice happens to get paid while the base subscription is mid pending_payment checkout.
  if (invoice.type === "ai_addon") {
    const base = sub.aiAddonPeriodEnd && new Date(sub.aiAddonPeriodEnd) > new Date() ? sub.aiAddonPeriodEnd : new Date().toISOString();
    const wasActive = sub.aiAddonActive;
    const newPeriodEnd = addMonthsIso(base, 1);
    const [bumped] = await db
      .update(subscriptions)
      .set({ aiAddonActive: true, aiAddonPeriodEnd: newPeriodEnd })
      .where(eq(subscriptions.id, sub.id))
      .returning();
    sub = bumped;
    await logEvent(invoice.outletId, sub.id, wasActive ? "ai_addon_renewed" : "ai_addon_activated", `${invoice.invoiceNumber} — AI Add-on aktif sampai ${newPeriodEnd}`);
  }

  if (sub.status === "pending_payment") {
    // Scoped to invoice types that actually gate activation (the first-checkout's mandatory
    // subscription_fee/cart_order invoice) — deliberately EXCLUDES "product_order" (added
    // 2026-09-13 for the standalone "Toko" tab), since buying hardware there has nothing to do
    // with subscription access. Without this filter, an outlet mid first-checkout who also placed
    // an unrelated Toko order would stay stuck in "pending_payment" forever if they paid the
    // subscription invoice but left the Toko order unpaid a while longer (or vice versa).
    const [{ n: unpaidCount }] = (await db
      .select({ n: sql<number>`count(*)` })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.subscriptionId, sub.id),
          eq(subscriptionInvoices.status, "unpaid"),
          inArray(subscriptionInvoices.type, ["subscription_fee", "cart_order"])
        )
      )) as { n: number }[];
    if (Number(unpaidCount) === 0) {
      const now = new Date().toISOString();
      // Paket/siklus/kuota sudah disimpan di langganan saat checkoutCart. Bulanan = 30 hari ke
      // depan (sesuai alur etalase), tahunan = 12 bulan kalender.
      const annual = normalizeCycle(sub.billingCycle) === "annual";
      await db
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: annual ? addMonthsIso(now, 12) : addDaysIso(now, 30),
          graceUntil: null,
        })
        .where(eq(subscriptions.id, sub.id));
      await logEvent(invoice.outletId, sub.id, "subscription_activated", `Semua invoice checkout lunas — langganan aktif ${annual ? "12 bulan" : "30 hari"}.`);
      await grantUnlimitedEntitlementIfEligible(sub);
    }
  } else if ((sub.status === "active" || sub.status === "grace" || sub.status === "suspended") && invoice.type === "subscription_fee") {
    // Invoice langganan lunas. periodMonths: null (data lama) = 1 bulan; 0 = upgrade/tambah kuota
    // prorata (paket berubah sekarang, masa aktif tetap); selain itu perpanjangan N bulan.
    const months = invoice.periodMonths ?? 1;
    await applySelectionFromInvoice(sub.id, { planId: invoice.targetPlanId, cycle: invoice.targetBillingCycle, units: invoice.targetPlanUnits }, months);
    if (months > 0) {
      const base = sub.status !== "suspended" && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date() ? sub.currentPeriodEnd : new Date().toISOString();
      await db
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: sub.status === "suspended" ? new Date().toISOString() : sub.currentPeriodStart,
          currentPeriodEnd: addMonthsIso(base, months),
          graceUntil: null,
        })
        .where(eq(subscriptions.id, sub.id));
      if (sub.status === "suspended") await logEvent(invoice.outletId, sub.id, "reactivated", `${invoice.invoiceNumber} lunas — akses dibuka kembali.`);
    }
    await grantUnlimitedEntitlementIfEligible(sub);
  } else if (invoice.type === "group_renewal" && invoice.billingGroupId) {
    // One payment renews every member outlet listed on the invoice — each by its own line
    // (bulanan/tahunan, paket & kuota masing-masing). Invoice gabungan lama tanpa subscriptionId
    // per baris diperlakukan seperti dulu: semua anggota active/grace diperpanjang 1 bulan.
    let lines: GroupInvoiceLineItem[] = [];
    try {
      lines = JSON.parse(invoice.lineItemsJson ?? "[]") as GroupInvoiceLineItem[];
    } catch {
      lines = [];
    }
    const members = await db.select().from(subscriptions).where(eq(subscriptions.billingGroupId, invoice.billingGroupId));
    const lineBySub = new Map(lines.filter((l) => l.subscriptionId).map((l) => [l.subscriptionId as string, l]));
    const legacy = lineBySub.size === 0;
    for (const member of members) {
      const line = lineBySub.get(member.id);
      if (!legacy && !line) continue;
      if (member.status !== "active" && member.status !== "grace" && member.status !== "suspended") continue;
      if (legacy && member.status === "suspended") continue;
      const months = line?.periodMonths ?? 1;
      if (line) await applySelectionFromInvoice(member.id, { planId: line.targetPlanId, cycle: line.targetBillingCycle, units: line.targetPlanUnits }, months);
      const base = member.status !== "suspended" && member.currentPeriodEnd && new Date(member.currentPeriodEnd) > new Date() ? member.currentPeriodEnd : new Date().toISOString();
      await db
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: member.status === "suspended" ? new Date().toISOString() : member.currentPeriodStart,
          currentPeriodEnd: addMonthsIso(base, Math.max(1, months)),
          graceUntil: null,
        })
        .where(eq(subscriptions.id, member.id));
      await logEvent(member.outletId, member.id, "invoice_paid", `${invoice.invoiceNumber} (tagihan gabungan) — diperpanjang bersama`);
      await grantUnlimitedEntitlementIfEligible(member);
    }
  }

  return updated;
}

/** ================= Scheduler-facing sweeps (see scripts/subscription-scheduler.ts) ================= */

/** Trials whose window just closed -> trial_expired. Returns the affected subscriptions so the caller can email/notify. */
export async function sweepExpireTrials() {
  const now = new Date().toISOString();
  const expiring = await db.select().from(subscriptions).where(and(eq(subscriptions.status, "trial"), sql`${subscriptions.trialEndsAt} <= ${now}`));
  for (const sub of expiring) {
    await db.update(subscriptions).set({ status: "trial_expired" }).where(eq(subscriptions.id, sub.id));
    await logEvent(sub.outletId, sub.id, "trial_expired", "Masa percobaan 30 hari berakhir.");
  }
  return expiring;
}

/**
 * Global counterpart of sweepExpireStaleUnpaidInvoicesForOutlet (used by applyLifecycleTransitions'
 * per-request self-heal) — table-wide, for the standalone scheduler script so an outlet nobody is
 * actively viewing right now still gets its stale invoices soft-cancelled on schedule rather than
 * only the next time someone happens to open its Billing page. Returns the expired rows for the
 * scheduler to log/report.
 */
export async function sweepExpireStaleUnpaidInvoices() {
  const cutoff = new Date(Date.now() - INVOICE_AUTO_EXPIRE_HOURS * 3600_000).toISOString();
  const stale = await db
    .select({ id: subscriptionInvoices.id, invoiceNumber: subscriptionInvoices.invoiceNumber, outletId: subscriptionInvoices.outletId, subscriptionId: subscriptionInvoices.subscriptionId })
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.status, "unpaid"), lte(subscriptionInvoices.createdAt, cutoff)));
  for (const inv of stale) {
    await db
      .update(subscriptionInvoices)
      .set({ status: "expired", cancelReason: "auto_expired_48h", method: null, providerRef: null, qrString: null, qrImageUrl: null, vaNumber: null, vaBankCode: null })
      .where(eq(subscriptionInvoices.id, inv.id));
    await logEvent(inv.outletId, inv.subscriptionId, "invoice_expired", `${inv.invoiceNumber} — kedaluwarsa otomatis setelah ${INVOICE_AUTO_EXPIRE_HOURS} jam tidak dibayar.`);
  }
  return stale;
}

/** Trials crossing an H-5/H-2/H-0 checkpoint that hasn't already been logged — returns who to remind, then the caller must log the event after actually sending it (see scheduler). */
export async function sweepTrialReminders() {
  const trials = await db.select().from(subscriptions).where(eq(subscriptions.status, "trial"));
  const due: { sub: SubscriptionRow; daysLeft: number; eventType: "trial_reminder_h5" | "trial_reminder_h2" | "trial_reminder_h0" }[] = [];
  for (const sub of trials) {
    const daysLeft = trialDaysLeft(sub);
    if (!(TRIAL_REMINDER_DAYS as readonly number[]).includes(daysLeft)) continue;
    const eventType = (daysLeft === 5 ? "trial_reminder_h5" : daysLeft === 2 ? "trial_reminder_h2" : "trial_reminder_h0") as
      | "trial_reminder_h5"
      | "trial_reminder_h2"
      | "trial_reminder_h0";
    const [already] = await db
      .select()
      .from(subscriptionEvents)
      .where(and(eq(subscriptionEvents.subscriptionId, sub.id), eq(subscriptionEvents.type, eventType)))
      .limit(1);
    if (already) continue;
    due.push({ sub, daysLeft, eventType });
  }
  return due;
}

/** Active subscriptions nearing renewal with no unpaid renewal invoice yet for the upcoming period -> create one. Returns the created invoices for notification. */
export async function sweepGenerateRenewalInvoices() {
  const active = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
  const created: (typeof subscriptionInvoices.$inferSelect)[] = [];
  const groupsHandled = new Set<string>();

  for (const sub of active) {
    if (!sub.currentPeriodEnd || !sub.planId) continue;
    const daysToRenewal = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / 86_400_000);
    if (daysToRenewal > RENEWAL_INVOICE_LEAD_DAYS) continue;

    if (sub.billingGroupId) {
      // One combined invoice per group, triggered by whichever member hits the lead-time
      // window first — dedupe so a 3-outlet group doesn't get processed 3 times in this loop.
      if (groupsHandled.has(sub.billingGroupId)) continue;
      groupsHandled.add(sub.billingGroupId);
      const invoice = await ensureGroupRenewalInvoiceExists(sub.billingGroupId);
      if (invoice && invoice.status === "unpaid") created.push(invoice);
      continue;
    }

    const period = currentPeriodLabelFor(sub.currentPeriodEnd);
    const [existingUnpaid] = await db
      .select()
      .from(subscriptionInvoices)
      .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.period, period), inArray(subscriptionInvoices.status, ["unpaid", "paid"])))
      .limit(1);
    if (existingUnpaid) continue;
    const invoice = await createRenewalInvoice(sub, period);
    if (invoice) created.push(invoice);
  }
  return created;
}

function currentPeriodLabelFor(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Active subs whose period ended with an unpaid renewal invoice -> grace. Grace subs whose graceUntil passed -> suspended. */
export async function sweepGraceAndSuspend() {
  const now = new Date().toISOString();
  const transitions: { outletId: string; subscriptionId: string; to: "grace" | "suspended" }[] = [];

  const active = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
  for (const sub of active) {
    if (!sub.currentPeriodEnd || sub.currentPeriodEnd > now) continue;
    const graceUntil = addDaysIso(sub.currentPeriodEnd, RENEWAL_GRACE_DAYS);
    await db.update(subscriptions).set({ status: "grace", graceUntil }).where(eq(subscriptions.id, sub.id));
    await logEvent(sub.outletId, sub.id, "grace_started", `Jatuh tempo lewat, masa tenggang sampai ${graceUntil}`);
    transitions.push({ outletId: sub.outletId, subscriptionId: sub.id, to: "grace" });
  }

  const grace = await db.select().from(subscriptions).where(eq(subscriptions.status, "grace"));
  for (const sub of grace) {
    if (!sub.graceUntil || sub.graceUntil > now) continue;
    await db.update(subscriptions).set({ status: "suspended" }).where(eq(subscriptions.id, sub.id));
    await logEvent(sub.outletId, sub.id, "suspended", "Masa tenggang habis tanpa pembayaran.");
    transitions.push({ outletId: sub.outletId, subscriptionId: sub.id, to: "suspended" });
  }

  return transitions;
}
