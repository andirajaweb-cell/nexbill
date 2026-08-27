import { db } from "@/db/client";
import {
  subscriptions,
  subscriptionPlans,
  subscriptionInvoices,
  subscriptionEvents,
  smartPlugOrders,
  platformProducts,
  rentalUnits,
  devices,
  staffUsers,
  outlets,
  billingGroups,
} from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { DeviceProtocol } from "@/lib/devices/types";
import { cashGateway } from "@/lib/payments/adapters/cash";
import { fastpayGateway } from "@/lib/payments/adapters/fastpay";
import { ipaymuCrossBorderGateway } from "@/lib/payments/adapters/ipaymu-crossborder";
import { VaBankMethod } from "@/lib/payments/types";
import { resolveBillingCurrencyForOutlet, convertIdrToCurrency } from "@/lib/market-risk/currency";
import { getRates } from "@/lib/shipping/biteship";
import { TRIAL_DAYS, SMART_PLUG_PROTOCOLS, ANDROID_TV_PROTOCOLS, TRIAL_REMINDER_DAYS, RENEWAL_GRACE_DAYS, RENEWAL_INVOICE_LEAD_DAYS } from "./config";
import { applyRefereeSignupDiscount, accrueReferralCommission } from "@/lib/referral/service";

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
/** Statuses where the outlet is a real paying customer — no device/AI restrictions. */
const PAID_STATUSES = new Set(["active", "grace"]);

/**
 * Ensures a "subscription_fee" renewal invoice exists for this subscription's current period —
 * idempotent (returns the existing unpaid one if there already is one, never creates a duplicate).
 * Normally the daily scheduler (sweepGenerateRenewalInvoices, RENEWAL_INVOICE_LEAD_DAYS ahead of
 * currentPeriodEnd) creates this proactively; this is the fallback path used both by the lazy
 * lifecycle self-heal below (so an outlet is never locked out with literally nothing to pay,
 * whether or not the scheduler script happens to be running in this deployment) and by the
 * merchant-initiated "Perpanjang Sekarang" button on the Billing page (requestManualRenewal).
 */
async function ensureRenewalInvoiceExists(sub: SubscriptionRow) {
  // Bundled outlets never get their own individual renewal invoice — one shared "group_renewal"
  // invoice covers every member (see ensureGroupRenewalInvoiceExists below and billingGroupId
  // on schema.ts's subscriptions table).
  if (sub.billingGroupId) return ensureGroupRenewalInvoiceExists(sub.billingGroupId);

  const [existingUnpaid] = await db
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.status, "unpaid")))
    .limit(1);
  if (existingUnpaid) return existingUnpaid;
  if (!sub.planId) return null;
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1);
  if (!plan) return null;

  const period = currentPeriodLabelFor(sub.currentPeriodEnd ?? new Date().toISOString());
  const invoice = await createInvoice({
    outletId: sub.outletId,
    subscriptionId: sub.id,
    type: "subscription_fee",
    description: `Langganan ${plan.name} — perpanjangan ${period}`,
    qty: 1,
    unitPrice: plan.priceCurrent,
    period,
  });
  await logEvent(sub.outletId, sub.id, "renewal_invoice_created", `${invoice.invoiceNumber} untuk periode ${period}`);
  return invoice;
}

interface GroupInvoiceLineItem {
  outletId: string;
  outletName: string;
  planName: string;
  period: string;
  amount: number;
}

/**
 * The consolidated equivalent of ensureRenewalInvoiceExists, for outlets bundled into a
 * billing group. Idempotent per group (one unpaid "group_renewal" invoice at a time, same as
 * the individual path) — every member subscription that has a plan contributes one line item,
 * summed into a single invoice/single payment. The anchor outlet (the row `outletId`/
 * `subscriptionId` point at, since every invoice needs exactly one of each for compatibility
 * with existing per-outlet queries) is the group owner's own outlet if it's a member, else
 * whichever member was created first.
 */
async function ensureGroupRenewalInvoiceExists(billingGroupId: string) {
  const [existingUnpaid] = await db
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.billingGroupId, billingGroupId), eq(subscriptionInvoices.type, "group_renewal"), eq(subscriptionInvoices.status, "unpaid")))
    .limit(1);
  if (existingUnpaid) return existingUnpaid;

  const [group] = await db.select().from(billingGroups).where(eq(billingGroups.id, billingGroupId)).limit(1);
  const members = await db.select().from(subscriptions).where(eq(subscriptions.billingGroupId, billingGroupId));
  const billableMembers = members.filter((m) => m.planId);
  if (billableMembers.length === 0) return null;

  const outletRows = await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, billableMembers.map((m) => m.outletId)));
  const outletNameById = new Map(outletRows.map((o) => [o.id, o.name]));
  const planIds = Array.from(new Set(billableMembers.map((m) => m.planId as string)));
  const planRows = await db.select().from(subscriptionPlans).where(inArray(subscriptionPlans.id, planIds));
  const planById = new Map(planRows.map((p) => [p.id, p]));

  const period = currentPeriodLabel();
  const lines: GroupInvoiceLineItem[] = billableMembers.map((m) => {
    const plan = planById.get(m.planId as string);
    return {
      outletId: m.outletId,
      outletName: outletNameById.get(m.outletId) ?? "Outlet",
      planName: plan?.name ?? "Langganan",
      period,
      amount: round(plan?.priceCurrent ?? 0),
    };
  });
  const total = round(lines.reduce((s, l) => s + l.amount, 0));

  // Anchor: the earliest-created member outlet. Purely cosmetic — which outlet the invoice row's
  // own outletId/subscriptionId formally point at — every member outlet still sees this same
  // invoice via billingGroupId regardless of which one is "anchor" (see the Billing page, which
  // queries by billingGroupId whenever the viewer's own outlet has one).
  const anchor = [...billableMembers].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

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

  for (const m of billableMembers) {
    await logEvent(m.outletId, m.id, "renewal_invoice_created", `${invoiceNumber} (tagihan gabungan) untuk periode ${period}`);
  }
  return invoice;
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
  const invoice = await ensureRenewalInvoiceExists(sub);
  if (!invoice) throw new Error("Paket langganan tidak ditemukan. Hubungi NEXBILL untuk mengaktifkan katalog paket.");
  return invoice;
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

/** Days remaining until trialEndsAt, floored at 0 — used for the countdown banner + reminder checkpoints. */
export function trialDaysLeft(sub: SubscriptionRow): number {
  if (sub.status !== "trial") return 0;
  return Math.max(0, Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000));
}

/** Full gate summary a dashboard/UI needs to render trial banners, lock screens, and AI teasers — one call, no business-rule duplication in components. */
export async function getSubscriptionSummary(outletId: string) {
  const sub = await getOrCreateSubscription(outletId);
  const plan = sub.planId ? (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1))[0] : null;
  // Mirrors assertAiAllowed's own rule (free during trial, else needs an unexpired AI Add-on,
  // unless the plan bundles AI in via unlimitedEntitlement) — read-only here for UI display, the
  // actual enforcement always goes through assertAiAllowed.
  const aiAddonPeriodActive = !!(sub.aiAddonActive && sub.aiAddonPeriodEnd && sub.aiAddonPeriodEnd > new Date().toISOString());
  const includedViaUnlimitedPlan = !!(sub.hasUnlimitedEntitlement || plan?.unlimitedEntitlement);
  const isAiLocked = sub.status !== "trial" && !aiAddonPeriodActive && !includedViaUnlimitedPlan;
  return {
    subscription: sub,
    plan: plan ?? null,
    isLocked: isLockedStatus(sub.status),
    isPaid: isPaidStatus(sub.status),
    isAiLocked,
    aiAddon: {
      freeViaTrial: sub.status === "trial",
      // True once the plan itself bundles AI in (NEXBILL Standard's flat pricing) — no separate
      // purchase needed and never expires on its own, unlike the legacy per-month add-on below.
      includedViaPlan: includedViaUnlimitedPlan,
      active: aiAddonPeriodActive,
      periodEnd: sub.aiAddonPeriodEnd,
      priceMonthly: (await ensureDefaultPlan()).aiAddonPriceMonthly,
    },
    trialDaysLeft: trialDaysLeft(sub),
  };
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
  // Unlimited-entitlement plans (NEXBILL Standard's flat Rp249.000/bulan — see
  // subscriptionPlans.unlimitedEntitlement) bundle AI in with everything else now, no separate
  // AI Add-on purchase. This does still cost NEXBILL real per-call money (see the AI COGS &
  // margin model referenced on subscriptionPlans.aiAddonPriceMonthly) — that cost is now
  // absorbed into the flat plan price rather than billed per-outlet, a deliberate pricing
  // decision, not an oversight. aiAddonActive/aiAddonPeriodEnd are left wired below for any
  // future non-unlimited tier that still wants AI as a paid add-on.
  if (sub.hasUnlimitedEntitlement) return;
  if (isPaidStatus(sub.status)) {
    const plan = await ensureDefaultPlan();
    // Covers the narrow window right after a first payment where confirmInvoicePayment hasn't
    // finished setting hasUnlimitedEntitlement yet — same effective allowance either way.
    if (plan.unlimitedEntitlement) return;
  }

  if (sub.aiAddonActive) {
    if (sub.aiAddonPeriodEnd && sub.aiAddonPeriodEnd > new Date().toISOString()) return;
    // Expired — lazily self-heal the same way trial/grace/suspended transitions do elsewhere in
    // this file, so status is accurate to "now" the moment anything touches it, not just whenever
    // a scheduler last ran.
    await db.update(subscriptions).set({ aiAddonActive: false }).where(eq(subscriptions.id, sub.id));
    await logEvent(sub.outletId, sub.id, "ai_addon_expired", "Masa aktif AI Add-on berakhir.");
  }

  throw new Error(
    "Fitur AI gratis selama masa percobaan 30 hari. Setelah itu, AI Add-on perlu diaktifkan terpisah (di luar paket langganan reguler) di halaman Langganan untuk terus memakainya."
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

async function generateInvoiceNumber(): Promise<string> {
  const [{ n }] = (await db.select({ n: sql<number>`count(*)` }).from(subscriptionInvoices)) as { n: number }[];
  return `SUB-INV-${String(n + 1).padStart(5, "0")}`;
}

async function createInvoice(input: {
  outletId: string;
  subscriptionId: string;
  type: (typeof subscriptionInvoices.$inferInsert)["type"];
  description: string;
  qty: number;
  unitPrice: number;
  period?: string | null;
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
      status: "unpaid",
      dueDate: addDaysIso(new Date().toISOString(), 3),
    })
    .returning();
  await logEvent(input.outletId, input.subscriptionId, "invoice_created", `${invoiceNumber} — ${input.description} (Rp${amount})`);
  return row;
}

function currentPeriodLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Idempotently seeds the "standard" plan (Rp399.000 dicoret jadi Rp249.000/bulan,
 * 10 konsol termasuk — the pricing already agreed for the landing page) if no
 * active plan catalog exists yet. Called from scripts/seed.ts, and defensively
 * again at the top of startCheckout() so a database that never ran seed.ts
 * (e.g. an outlet provisioned some other way) still has something to check
 * out into instead of hitting the "hubungi NEXBILL" error.
 */
export async function ensureDefaultPlan() {
  const [existing] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(subscriptionPlans)
    .values({
      code: "standard",
      name: "NEXBILL Standard",
      priceOriginal: 399000,
      priceCurrent: 249000,
      includedConsoles: 10,
      extraConsolePrice: 20000,
      smartPlugPrice: 275000,
      setupServicePrice: 125000,
      isActive: true,
      sortOrder: 0,
    })
    .returning();
  return row;
}

/**
 * Idempotently seeds a starter storefront catalog (a couple of smart plug variants, the
 * installation service, and the extra-console add-on) if no active product exists yet — same
 * defensive pattern as ensureDefaultPlan, called both from scripts/seed.ts and defensively at
 * the top of listStorefrontProducts() so a database that never ran the seed script still shows
 * something browsable instead of an empty etalase.
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
    {
      category: "extra_console",
      name: "Slot Konsol Tambahan",
      description: "Menambah kuota unit konsol/TV di luar jatah paket langganan yang sedang dipakai — per unit.",
      price: 20000,
      sortOrder: 0,
    },
  ]);
}

/** Active storefront products for the Billing page's etalase, grouped/sorted for rendering. */
export async function listStorefrontProducts() {
  await ensureDefaultProducts();
  const rows = await db.select().from(platformProducts).where(eq(platformProducts.isActive, true));
  return rows.sort((a, b) => a.sortOrder - b.sortOrder);
}

export interface CartCheckoutInput {
  outletId: string;
  planCode?: string; // defaults to the active "standard" plan
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
  category: "subscription" | "smart_plug" | "installation_service" | "extra_console" | "shipping";
  productId: string | null; // null for the subscription-fee and shipping lines
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

/**
 * Etalase/cart checkout — the free-form successor to startCheckout() below. The subscription fee
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
  await ensureDefaultPlan();
  const planWhere = input.planCode ? eq(subscriptionPlans.code, input.planCode) : eq(subscriptionPlans.isActive, true);
  const [plan] = await db.select().from(subscriptionPlans).where(planWhere).limit(1);
  if (!plan) throw new Error("Paket langganan tidak ditemukan. Hubungi NEXBILL untuk mengaktifkan katalog paket.");

  const lines: CartLineItem[] = [
    { category: "subscription", productId: null, name: `Langganan ${plan.name} — periode pertama`, qty: 1, unitPrice: plan.priceCurrent, amount: round(plan.priceCurrent) },
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
    // Price is NEVER trusted from the client: re-fetch rates here with the merchant's chosen
    // destination + weight-derived items, then look up the exact courier+service they picked in
    // that fresh response. If it's gone (price changed, courier deactivated, etc.) checkout fails
    // with a clear message rather than silently charging a stale/tampered number.
    const smartPlugRateItems = requestedItems
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product || !product.isActive || product.category !== "smart_plug") return null;
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

    if (smartPlugRateItems.length > 0) {
      if (!input.shippingDestinationAreaId) throw new Error("Alamat pengiriman wajib diisi untuk pembelian Smart Plug.");
      if (!input.shippingCourierCode || !input.shippingCourierServiceName) throw new Error("Pilih kurir pengiriman untuk Smart Plug terlebih dahulu.");
      const options = await getRates(input.shippingDestinationAreaId, smartPlugRateItems);
      const match = options.find((o) => o.courierCode === input.shippingCourierCode && o.courierServiceName === input.shippingCourierServiceName);
      if (!match) throw new Error("Opsi kurir yang dipilih sudah tidak tersedia lagi — cek ulang ongkos kirim dan pilih ulang.");
      shippingCost = match.price;
      lines.push({
        category: "shipping",
        productId: null,
        name: `Ongkos Kirim — ${match.courierName} ${match.courierServiceName}`,
        qty: 1,
        unitPrice: shippingCost,
        amount: shippingCost,
      });
    }
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
    .set({ status: "pending_payment", planId: plan.id })
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

export interface StartCheckoutInput {
  outletId: string;
  planCode?: string; // defaults to the active "standard" plan
  wantSmartPlugInstall: boolean;
  installContactName?: string;
  installContactPhone?: string;
  shippingAddress?: string;
}

/**
 * Kicks off the subscribe flow: auto-detects TV composition from the
 * outlet's own rentalUnits (never asked as a separate manual question —
 * see the design discussion), snapshots it onto the subscription, and
 * generates every invoice this checkout requires (always the subscription
 * fee; smart plug purchase + optional setup service only if any unit is
 * non-Android-TV; an extra-console addon if unit count exceeds the plan's
 * included quota). Subscription status moves to "pending_payment" — the
 * outlet stays locked out of normal operation until every invoice from this
 * checkout is paid (see confirmInvoicePayment below).
 */
export async function startCheckout(input: StartCheckoutInput) {
  const sub = await getOrCreateSubscription(input.outletId);
  await ensureDefaultPlan();
  const planWhere = input.planCode ? eq(subscriptionPlans.code, input.planCode) : eq(subscriptionPlans.isActive, true);
  const [plan] = await db.select().from(subscriptionPlans).where(planWhere).limit(1);
  if (!plan) throw new Error("Paket langganan tidak ditemukan. Hubungi NEXBILL untuk mengaktifkan katalog paket.");

  const composition = await computeTvComposition(input.outletId);

  await db
    .update(subscriptions)
    .set({
      status: "pending_payment",
      planId: plan.id,
      androidTvUnitCount: composition.androidTv,
      nonAndroidTvUnitCount: composition.nonAndroidTv,
      smartPlugRequiredQty: composition.nonAndroidTv,
    })
    .where(eq(subscriptions.id, sub.id));

  // Referral signup discount — no-ops (returns plan.priceCurrent unchanged) unless this outlet
  // was created via a valid ?ref=CODE link and hasn't already had the discount applied. See
  // lib/referral/service.ts.
  const firstInvoiceUnitPrice = await applyRefereeSignupDiscount(input.outletId, plan.priceCurrent);
  const invoices = [
    await createInvoice({
      outletId: input.outletId,
      subscriptionId: sub.id,
      type: "subscription_fee",
      description:
        firstInvoiceUnitPrice < plan.priceCurrent
          ? `Langganan ${plan.name} — periode pertama (diskon referral diterapkan)`
          : `Langganan ${plan.name} — periode pertama`,
      qty: 1,
      unitPrice: firstInvoiceUnitPrice,
      period: currentPeriodLabel(),
    }),
  ];

  // Plans with unlimitedEntitlement (NEXBILL Standard's flat Rp249.000/bulan) never bill for
  // extra consoles, not even on this very first invoice — "unlimited" is a property of the plan
  // the outlet chose, not something phased in only after hasUnlimitedEntitlement gets granted
  // post-payment (that flag exists to gate ongoing feature access, not first-invoice pricing).
  const extraConsoles = plan.unlimitedEntitlement ? 0 : Math.max(0, composition.total - plan.includedConsoles);
  if (extraConsoles > 0) {
    invoices.push(
      await createInvoice({
        outletId: input.outletId,
        subscriptionId: sub.id,
        type: "extra_console",
        description: `Konsol tambahan (di luar ${plan.includedConsoles} termasuk) x${extraConsoles}`,
        qty: extraConsoles,
        unitPrice: plan.extraConsolePrice,
      })
    );
  }

  if (composition.nonAndroidTv > 0) {
    const plugInvoice = await createInvoice({
      outletId: input.outletId,
      subscriptionId: sub.id,
      type: "smart_plug_purchase",
      description: `Smart Plug BARDI x${composition.nonAndroidTv} (unit TV analog/smart TV)`,
      qty: composition.nonAndroidTv,
      unitPrice: plan.smartPlugPrice,
    });
    invoices.push(plugInvoice);

    await db.insert(smartPlugOrders).values({
      outletId: input.outletId,
      subscriptionInvoiceId: plugInvoice.id,
      qty: composition.nonAndroidTv,
      installRequested: input.wantSmartPlugInstall,
      installStatus: input.wantSmartPlugInstall ? "requested" : "not_requested",
      contactName: input.installContactName,
      contactPhone: input.installContactPhone,
      shippingAddress: input.shippingAddress,
    });

    if (input.wantSmartPlugInstall) {
      invoices.push(
        await createInvoice({
          outletId: input.outletId,
          subscriptionId: sub.id,
          type: "setup_service",
          description: "Jasa Setup Jarak Jauh (dipasang/disettingkan oleh vendor)",
          qty: 1,
          unitPrice: plan.setupServicePrice,
        })
      );
    }
  }

  await logEvent(input.outletId, sub.id, "checkout_started", `${invoices.length} invoice dibuat, total Rp${invoices.reduce((s, i) => s + i.amount, 0)}`);
  return invoices;
}

/** Initiates payment on one invoice via the same cash/QRIS/VA gateway plumbing customer-facing
 * checkout uses — reused here for the reverse money direction (outlet owner -> NEXBILL). QRIS and
 * every va_* bank channel both route through fastpayGateway (see adapters/fastpay.ts), which
 * differentiates the product code/response shape per method — cash is the only one settled
 * without a real gateway call.
 *
 * "ipaymu_crossborder" is the mancanegara channel (see resolveBillingCurrencyForOutlet /
 * /platform-admin/market-risk) — the actual charge still always settles in IDR (see the top-of-
 * file note on ipaymu-crossborder.ts: iPaymu's cross-border product is card acceptance settled to
 * the merchant in IDR, the card network converts at charge time), `invoice.amount` is never
 * touched; displayCurrencyCode/displayAmount are purely what the customer SAW quoted on the
 * Billing page (see money()/data.billingCurrency there), for cosmetic receipt text only. */
export async function initiateInvoicePayment(invoiceId: string, method: "cash" | "qris" | VaBankMethod | "ipaymu_crossborder") {
  const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw new Error("Invoice tidak ditemukan.");
  if (invoice.status === "paid") throw new Error("Invoice ini sudah lunas.");

  const gateway = method === "cash" ? cashGateway : method === "ipaymu_crossborder" ? ipaymuCrossBorderGateway : fastpayGateway;

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
    })
    .where(eq(subscriptionInvoices.id, invoiceId))
    .returning();
  return updated;
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
async function grantUnlimitedEntitlementIfEligible(sub: SubscriptionRow): Promise<void> {
  if (sub.hasUnlimitedEntitlement) return;
  if (!sub.planId) return;
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1);
  if (!plan?.unlimitedEntitlement) return;
  await db
    .update(subscriptions)
    .set({ hasUnlimitedEntitlement: true, entitlementGrantedAt: new Date().toISOString() })
    .where(eq(subscriptions.id, sub.id));
  await logEvent(sub.outletId, sub.id, "unlimited_entitlement_granted", `Paket ${plan.name} — akses unlimited konsol, fitur, dan cabang aktif.`);
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

  // A paid cart_order invoice may have bought smart plug hardware (free-form qty, not tied to
  // sub.smartPlugRequiredQty) — fulfill that qty onto the subscription's owned count right away,
  // whether this is the very first checkout or a later top-up purchase while already active.
  if (invoice.type === "cart_order" && invoice.lineItemsJson) {
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
    const [{ n: unpaidCount }] = (await db
      .select({ n: sql<number>`count(*)` })
      .from(subscriptionInvoices)
      .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.status, "unpaid")))) as { n: number }[];
    if (unpaidCount === 0) {
      const now = new Date().toISOString();
      await db
        .update(subscriptions)
        .set({
          status: "active",
          currentPeriodStart: now,
          // Literally "30 hari kedepan" per the storefront checkout flow, rather than
          // addMonthsIso's calendar-month arithmetic — full access opens for exactly 30 days.
          currentPeriodEnd: addDaysIso(now, 30),
          graceUntil: null,
        })
        .where(eq(subscriptions.id, sub.id));
      await logEvent(invoice.outletId, sub.id, "subscription_activated", "Semua invoice checkout lunas — langganan aktif untuk 30 hari.");
      await grantUnlimitedEntitlementIfEligible(sub);
    }
  } else if ((sub.status === "active" || sub.status === "grace") && invoice.type === "subscription_fee") {
    // A renewal invoice paid — extend the period and clear any grace state.
    const base = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date() ? sub.currentPeriodEnd : new Date().toISOString();
    await db
      .update(subscriptions)
      .set({ status: "active", currentPeriodEnd: addMonthsIso(base, 1), graceUntil: null })
      .where(eq(subscriptions.id, sub.id));
    await grantUnlimitedEntitlementIfEligible(sub);
  } else if (invoice.type === "group_renewal" && invoice.billingGroupId) {
    // One payment renews EVERY member outlet's own subscription together — not just the
    // anchor outlet's (invoice.subscriptionId only points at the anchor, see
    // ensureGroupRenewalInvoiceExists). Each member keeps its own currentPeriodEnd/grace state
    // otherwise; only the ones actually due (active/grace) get extended by this payment.
    const members = await db.select().from(subscriptions).where(eq(subscriptions.billingGroupId, invoice.billingGroupId));
    for (const member of members) {
      if (member.status !== "active" && member.status !== "grace") continue;
      const base = member.currentPeriodEnd && new Date(member.currentPeriodEnd) > new Date() ? member.currentPeriodEnd : new Date().toISOString();
      await db
        .update(subscriptions)
        .set({ status: "active", currentPeriodEnd: addMonthsIso(base, 1), graceUntil: null })
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
      .where(and(eq(subscriptionInvoices.subscriptionId, sub.id), eq(subscriptionInvoices.type, "subscription_fee"), eq(subscriptionInvoices.period, period)))
      .limit(1);
    if (existingUnpaid) continue;
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, sub.planId)).limit(1);
    if (!plan) continue;
    const invoice = await createInvoice({
      outletId: sub.outletId,
      subscriptionId: sub.id,
      type: "subscription_fee",
      description: `Langganan ${plan.name} — perpanjangan ${period}`,
      qty: 1,
      unitPrice: plan.priceCurrent,
      period,
    });
    await logEvent(sub.outletId, sub.id, "renewal_invoice_created", `${invoice.invoiceNumber} untuk periode ${period}`);
    created.push(invoice);
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
