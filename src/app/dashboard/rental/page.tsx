"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Power, Play, Square, Pause, PlayCircle, Clock, UtensilsCrossed, Plus, Minus, Settings, Pencil, Archive, RotateCcw, ArrowLeftRight, AlertTriangle, Gamepad, History, Activity, BadgeCheck, Wrench } from "lucide-react";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payments/labels";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { describeError } from "@/lib/api/error";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-rental";

// recharts moved to its own lazy-loaded chunk — see RentalActivityChart.tsx's doc comment.
const RentalActivityChart = dynamic(() => import("@/components/dashboard/RentalActivityChart"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: 220 }} className="animate-pulse rounded-lg bg-white/5" />,
});

interface RentalUnit {
  id: string;
  name: string;
  consoleType: string;
  tvType: string;
  hourlyRate: number;
  status: "available" | "occupied" | "booked" | "maintenance";
  deviceId: string | null;
  isActive?: boolean;
}

interface RentalSession {
  id: string;
  rentalUnitId: string;
  customerName: string | null;
  startedAt: string;
  status: string;
  ratePerHour: number;
  pausedAt: string | null;
  accumulatedPauseMs: number;
  extendedMinutes: number;
  gameName: string | null;
  plannedMinutes: number | null;
}

const CONSOLE_TYPES = [
  { value: "ps2", label: "PS2" },
  { value: "ps3", label: "PS3" },
  { value: "ps4", label: "PS4" },
  { value: "ps4_pro", label: "PS4 Pro" },
  { value: "ps5", label: "PS5" },
  { value: "ps5_slim", label: "PS5 Slim" },
];
const TV_TYPES = [
  { value: "android_tv", label: "Android TV" },
  { value: "smart_tv", label: "Smart TV" },
  { value: "analog_tv", label: "TV Analog" },
];
const DURATION_OPTIONS = [
  { value: "", key: "rental.duration.open", fallback: "Terbuka (tanpa batas waktu)" },
  { value: "30", key: "rental.duration.30m", fallback: "30 menit" },
  { value: "60", key: "rental.duration.1h", fallback: "1 jam" },
  { value: "90", key: "rental.duration.1h30m", fallback: "1,5 jam" },
  { value: "120", key: "rental.duration.2h", fallback: "2 jam" },
  { value: "180", key: "rental.duration.3h", fallback: "3 jam" },
  { value: "240", key: "rental.duration.4h", fallback: "4 jam" },
];
const TIME_WARNING_THRESHOLD_MIN = 5;
const EXTEND_OPTIONS = [10, 20, 30, 40, 50, 60, 90, 120];

/** Short double-beep via Web Audio API — no external audio asset needed. */
function playAlertBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const beep = (startAt: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + 0.32);
    };
    beep(0);
    beep(0.4);
  } catch {
    // Autoplay/permission restrictions — silently skip the sound, the visual warning still shows.
  }
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
}

interface BillBreakdown {
  order: { id: string; subtotal: number; discount: number; tax: number; serviceCharge: number; total: number; status: string };
  items: { id: string; description: string; qty: number; lineTotal: number; itemType: string; kitchenStatus: string }[];
  rentalSubtotal: number;
  fnbSubtotal: number;
  miscSubtotal: number;
  accessorySubtotal: number;
  fnbItemCount: number;
  payments: { id: string; method: string; amount: number; status: string; qrString?: string | null; qrImageUrl?: string | null }[];
  paidTotal: number;
  balanceDue: number;
}

interface SessionAccessory {
  id: string;
  rentalSessionId: string;
  name: string;
  qty: number;
  ratePerHour: number;
  addedAt: string;
  removedAt: string | null;
}

/** Rental packages come straight from the Promo & Paket Rental page (/dashboard/promo) — the
 * SESI BARU panel doesn't keep its own duration presets anymore, it reads live promo rows so
 * a package created/edited/deactivated there shows up here (and in billing) immediately. */
interface Promo {
  id: string;
  outletId: string;
  name: string;
  type: string;
  consoleType?: string | null;
  durationMinutes?: number | null;
  packagePrice?: number | null;
  isActive: boolean;
}

/** Minimal shape from /api/customers?search=... — just enough to show a pick list and know
 * whether a match has an active membership tier (drives member-rate pricing + revenue routing). */
interface CustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  membershipTierId: string | null;
  memberNumber?: string | null;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

// Unit names are free text ("PS 1", "TV Android 2", "Meja 10", ...) with no separate numeric
// column to sort by — this pulls out the first run of digits so units order 1, 2, ..., 10
// instead of the lexicographic 1, 10, 2 a plain string sort would produce. Names with no digits
// at all sort after every numbered one (Infinity), then fall back to alphabetical.
const extractUnitNumber = (name: string): number => {
  const match = name.match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.POSITIVE_INFINITY;
};

// Currently-playing units surface first so a cashier glancing at the grid sees active sessions
// immediately instead of hunting for them among idle stations; everything else (including other
// non-available statuses like booked/maintenance) follows in unit-number order.
const sortUnitsForDisplay = (list: RentalUnit[]): RentalUnit[] =>
  [...list].sort((a, b) => {
    const aPlaying = a.status === "occupied" ? 0 : 1;
    const bPlaying = b.status === "occupied" ? 0 : 1;
    if (aPlaying !== bPlaying) return aPlaying - bPlaying;
    const numDiff = extractUnitNumber(a.name) - extractUnitNumber(b.name);
    if (numDiff !== 0) return numDiff;
    return a.name.localeCompare(b.name, "id");
  });
// `name` doubles as the value sent to the API and matched against (e.g. accessoryForm.name ===
// "Lainnya") — never translate it directly. `labelKey`/`fallback` are only for the displayed
// <option> text via t(), so the underlying stored/matched string stays stable across languages.
const ACCESSORY_PRESETS = [
  { name: "Stick Tambahan", labelKey: "rental.accessoryPreset.stick", ratePerHour: 3000 },
  { name: "Kacamata VR", labelKey: "rental.accessoryPreset.vr", ratePerHour: 10000 },
  { name: "Headset", labelKey: "rental.accessoryPreset.headset", ratePerHour: 3000 },
];

/** Human-readable duration for the bill breakdown (e.g. "1 jam 25 menit", "45 menit") — separate from
 * ElapsedTimer's live hh:mm:ss clock, which is meant for at-a-glance ticking, not billing context. */
function formatPlayDuration(totalMinutes: number) {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} menit`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} menit`;
}

/** Live (unrounded) estimate matching the server's estimateAccessoryCharge — pure display math, no writes. */
function estimateAccessoryCharge(acc: SessionAccessory, now: number) {
  const endMs = acc.removedAt ? new Date(acc.removedAt).getTime() : now;
  const hours = Math.max(0, (endMs - new Date(acc.addedAt).getTime()) / 3600000);
  return Math.round(acc.qty * acc.ratePerHour * hours);
}

function ElapsedTimer({ startedAt, accumulatedPauseMs, paused }: { startedAt: string; accumulatedPauseMs: number; paused: boolean }) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    const tick = () => {
      const diff = Date.now() - new Date(startedAt).getTime() - accumulatedPauseMs;
      const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    if (paused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, accumulatedPauseMs, paused]);
  return <span className={`gm-heading font-mono text-base ${paused ? "text-amber-400" : "text-cyan-300"}`}>{elapsed}</span>;
}

/**
 * Live count-DOWN of remaining play time — separate from ElapsedTimer (which counts UP
 * played-so-far). Only rendered when the session has a known duration (plannedMinutes or a
 * promo with durationMinutes); an open-ended session has nothing to count down to, so it
 * keeps showing only the elapsed clock. Ticks every second on its own, same pattern as
 * ElapsedTimer, so staff always sees an accurate "sisa waktu" without waiting for the next
 * poll. Customers who booked get the same information via WhatsApp (see
 * runSessionTimeWarning in scheduler.ts) once remaining time drops under ~15 minutes.
 */
function CountdownTimer({ startedAt, accumulatedPauseMs, paused, allowedMinutes }: { startedAt: string; accumulatedPauseMs: number; paused: boolean; allowedMinutes: number }) {
  const [remainingSec, setRemainingSec] = useState(0);
  useEffect(() => {
    const tick = () => {
      const elapsedMs = Date.now() - new Date(startedAt).getTime() - accumulatedPauseMs;
      const remainingMs = allowedMinutes * 60000 - elapsedMs;
      setRemainingSec(Math.floor(remainingMs / 1000));
    };
    tick();
    if (paused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, accumulatedPauseMs, paused, allowedMinutes]);

  const expired = remainingSec <= 0;
  const abs = Math.abs(remainingSec);
  const h = String(Math.floor(abs / 3600)).padStart(2, "0");
  const m = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  const s = String(abs % 60).padStart(2, "0");
  return (
    <span className={`gm-heading font-mono text-base ${expired ? "text-rose-400" : remainingSec <= 15 * 60 ? "text-amber-400" : "text-emerald-300"}`}>
      {expired ? "-" : ""}
      {h}:{m}:{s}
    </span>
  );
}

/** Neon circular progress ring — purely decorative framing around whatever clock (ElapsedTimer/
 * CountdownTimer) is passed as children. `percent` is remaining-time-left for sessions with a
 * known duration, or a flat 100 (full ring, no "target" to visualize) for open-ended sessions. */
function RingTimer({ percent, colorClass, glowRgb, size = 104, strokeWidth = 6, children }: {
  percent: number; colorClass: string; glowRgb: string; size?: number; strokeWidth?: number; children: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} fill="none" className="stroke-white/10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={colorClass}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, filter: `drop-shadow(0 0 5px ${glowRgb})`, transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-2 text-center">{children}</div>
    </div>
  );
}

function consoleLabel(type: string) {
  return CONSOLE_TYPES.find((c) => c.value === type)?.label ?? type.toUpperCase();
}

export default function RentalPage() {
  const { user } = useAuth();
  const { t } = useDashboardLang();
  const staffUserId = user?.id ?? null;
  const [outletId, setOutletId] = useState<string | null>(null);
  const [methods, setMethods] = useState(PAYMENT_METHOD_OPTIONS); // static 8 as a safe default, replaced once the outlet's live catalog loads
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [sessions, setSessions] = useState<RentalSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bills, setBills] = useState<Record<string, BillBreakdown>>({});
  const [customerName, setCustomerName] = useState("");
  const [gameName, setGameName] = useState("");
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [fnbSessionId, setFnbSessionId] = useState<string | null>(null);
  const [fnbCart, setFnbCart] = useState<Record<string, number>>({});
  // Multiple sessions can finish within the same moment (manual Stop clicks on two units close
  // together, or several sessions expiring in the same auto-stop sweep below) — this is a list,
  // not a single slot, so none of them get silently overwritten/lost when the next one lands.
  // Each entry remembers which unit/TV it came from since the order itself has no unit reference.
  const [finishedBills, setFinishedBills] = useState<{ bill: BillBreakdown; unitName: string; sessionId: string }[]>([]);
  // Only one finished bill's payment form is open/editable at a time (payMethod/payAmount/etc.
  // below are shared fields for whichever one this points at) — new arrivals stay collapsed in
  // the list instead of yanking focus away from a payment the cashier is already mid-typing.
  const [expandedFinishedOrderId, setExpandedFinishedOrderId] = useState<string | null>(null);
  const activeFinishedBill = finishedBills.find((f) => f.bill.order.id === expandedFinishedOrderId)?.bill ?? null;
  const [payMethod, setPayMethod] = useState("cash");
  const [payAmount, setPayAmount] = useState(0);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutTax, setCheckoutTax] = useState(false);
  const [checkoutVoucherCode, setCheckoutVoucherCode] = useState("");
  const [voucherMsg, setVoucherMsg] = useState("");
  const [plannedMinutes, setPlannedMinutes] = useState("");
  const [promos, setPromos] = useState<Promo[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  // "Bayar Dimuka" — optional prepayment collected right when a session starts (see
  // StartSessionInput.prepay in lib/rental/sessions.ts). Only cash/qris are offered here.
  const [collectPrepay, setCollectPrepay] = useState(false);
  const [prepayAmount, setPrepayAmount] = useState(0);
  const [prepayMethod, setPrepayMethod] = useState<"cash" | "qris">("cash");
  const [pendingPrepay, setPendingPrepay] = useState<{ paymentId: string; qrImageUrl: string | null; amount: number } | null>(null);
  // Optional link to an existing customer record so a session can get member-rate pricing
  // (see computeEffectiveHourlyRate) and route its revenue to the Member account in
  // accounting (see isMemberCustomer in postings.ts) — a walk-in with no record is still
  // fully supported, customerName alone is sent and customerId stays null.
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerRow[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  // Non-Member = free-text walk-in name (default, unchanged behavior). Member = lookup by kode
  // member (customers.memberNumber) instead of typing a name — once matched, a link surfaces to
  // that member's transaction history on the Membership page.
  const [customerMode, setCustomerMode] = useState<"non_member" | "member">("non_member");
  const [showUnitManager, setShowUnitManager] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", consoleType: "ps4", tvType: "smart_tv", hourlyRate: 0, note: "" });
  const [addingUnit, setAddingUnit] = useState(false);
  const [transferUnitFor, setTransferUnitFor] = useState<string | null>(null);
  const [extendSessionFor, setExtendSessionFor] = useState<string | null>(null);
  const [accessories, setAccessories] = useState<Record<string, SessionAccessory[]>>({});
  const [accessorySessionId, setAccessorySessionId] = useState<string | null>(null);
  const [accessoryForm, setAccessoryForm] = useState({ name: ACCESSORY_PRESETS[0].name, qty: 1, ratePerHour: ACCESSORY_PRESETS[0].ratePerHour });
  const alertedSessionsRef = useState(() => new Set<string>())[0];
  // Guards the auto-stop effect below from firing /stop twice for the same session while we're
  // waiting on the API round-trip (the 5s poll can otherwise see "still running, still expired"
  // on the next tick before the first call finishes). Cleared on failure so a transient network
  // error gets retried on the next poll instead of leaving the session stuck forever.
  const autoStoppingSessionsRef = useState(() => new Set<string>())[0];

  // Additive control-center widgets (recent transactions + hourly activity chart) — read-only,
  // don't touch the session/checkout logic above at all.
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [busyHours, setBusyHours] = useState<{ hour: number; count: number }[]>([]);

  // In-flight guards: this page polls every few seconds while responses can themselves take
  // several seconds under load, so without a guard a slow response window lets multiple polls'
  // worth of requests pile up concurrently (the exact "45s waterfall of duplicate calls" pattern
  // reported from the Network tab). Skipping a tick whenever the previous one hasn't resolved yet
  // keeps at most one round of these requests in flight at a time. loadingBillsRef is keyed per
  // session id so one slow session's bill/accessories fetch doesn't block polling for the others.
  const loadInFlightRef = useRef(false);
  const widgetsInFlightRef = useRef(false);
  const sessionFetchInFlightRef = useRef<Set<string>>(new Set());

  const load = async () => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    try {
      const [unitsRows, sessionRows] = await Promise.all([
        fetchJsonArray("/api/rental-units"),
        fetchJsonArray("/api/rental-sessions"),
      ]);
      setUnits(unitsRows);
      const active = sessionRows.filter((s: RentalSession) => s.status === "running" || s.status === "paused");
      setSessions(active);
      await Promise.all(
        active
          .filter((s: RentalSession) => !sessionFetchInFlightRef.current.has(s.id))
          .map(async (s: RentalSession) => {
            sessionFetchInFlightRef.current.add(s.id);
            try {
              const [b, rows] = await Promise.all([
                fetchJsonObject<BillBreakdown>(`/api/rental-sessions/${s.id}/bill`),
                fetchJsonArray<SessionAccessory>(`/api/rental-sessions/${s.id}/accessories`),
              ]);
              if (b) setBills((prev) => ({ ...prev, [s.id]: b }));
              setAccessories((prev) => ({ ...prev, [s.id]: rows.filter((a) => !a.removedAt) }));
            } finally {
              sessionFetchInFlightRef.current.delete(s.id);
            }
          })
      );
    } finally {
      loadInFlightRef.current = false;
    }
  };

  const loadWidgets = async (oid: string) => {
    if (widgetsInFlightRef.current) return;
    widgetsInFlightRef.current = true;
    try {
      const [orderRows, data] = await Promise.all([
        fetchJsonArray("/api/orders?status=paid"),
        fetchJsonObject<{ busyHours: { hour: number; count: number }[] }>(`/api/dashboard/owner?outletId=${oid}`),
      ]);
      setRecentOrders(orderRows.filter((o: any) => o.outletId === oid).slice(0, 7));
      if (data) setBusyHours(data.busyHours);
    } finally {
      widgetsInFlightRef.current = false;
    }
  };

  useEffect(() => {
    fetchJsonObject<{ id: string }>("/api/outlets/default").then((o) => {
      if (!o) return;
      setOutletId(o.id);
      // Owner-editable payment methods (add/edit/delete from the Pembayaran page) — falls back to the static 8 above if this fails.
      fetchJsonArray(`/api/payment-methods?outletId=${o.id}`).then((rows) => {
        const active = rows.filter((m: any) => m.isActive);
        if (active.length > 0) setMethods(active.map((m: any) => ({ value: m.key, label: m.label })));
      });
      // Rental packages from the Promo page — API returns all outlets' rows, filter to this one.
      fetchJsonArray<Promo>("/api/promos").then((rows) => {
        setPromos(rows.filter((p) => p.outletId === o.id));
      });
      loadWidgets(o.id);
    });
    fetchJsonArray("/api/products").then((rows) => setProducts(rows.filter((p: Product) => p.isActive)));
    load();
    // Was 5000ms — with the in-flight guards above this no longer stacks requests, but 5s was
    // still needlessly tight for data that's mostly cosmetic countdown-timer accuracy (the visible
    // per-second countdowns above run off local Date.now() ticks, not this poll). 8s keeps the
    // board feeling live without over-polling every session's bill+accessories on every tick.
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!outletId) return;
    const id = setInterval(() => loadWidgets(outletId), 20000);
    return () => clearInterval(id);
  }, [outletId]);

  // A promo package is scoped to one console type — switching the selected station clears
  // any package pick that might not even apply to the new unit, back to plain per-jam billing.
  useEffect(() => {
    setSelectedPromoId(null);
    setPlannedMinutes("");
    setSelectedCustomerId(null);
    setCustomerQuery("");
    setCustomerResults([]);
    setCustomerMode("non_member");
    setCustomerName("");
  }, [activeUnitId]);

  useEffect(() => {
    if (!customerQuery.trim() || selectedCustomerId) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetchJsonArray<CustomerRow>(`/api/customers?search=${encodeURIComponent(customerQuery)}`).then(setCustomerResults);
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery, selectedCustomerId]);

  // Time-almost-up alert: fires once per session when remaining planned time first
  // drops to the warning threshold, and resets if the session gets extended back
  // above it (so extending buys a fresh warning later instead of staying silent).
  useEffect(() => {
    for (const session of sessions) {
      if (!session.plannedMinutes) continue;
      let effectivePauseMs = session.accumulatedPauseMs;
      if (session.status === "paused" && session.pausedAt) {
        effectivePauseMs += Date.now() - new Date(session.pausedAt).getTime();
      }
      const elapsedMinutes = Math.max(0, (Date.now() - new Date(session.startedAt).getTime() - effectivePauseMs) / 60000);
      const remaining = session.plannedMinutes + session.extendedMinutes - elapsedMinutes;

      if (remaining <= TIME_WARNING_THRESHOLD_MIN) {
        if (!alertedSessionsRef.has(session.id)) {
          alertedSessionsRef.add(session.id);
          playAlertBeep();
        }
      } else {
        alertedSessionsRef.delete(session.id);
      }
    }
  }, [sessions]);

  // Auto-stop: once a session's planned time (+ any extensions) actually hits zero, close it
  // out on its own instead of waiting for the kasir to notice and click Stop. Runs off the same
  // 5s session poll as the warning effect above, so multiple units expiring around the same poll
  // all get finalized here — each one lands in finishedBills (see finalizeSession) rather than
  // racing to overwrite a single slot.
  useEffect(() => {
    for (const session of sessions) {
      if (!session.plannedMinutes || session.status !== "running") continue;
      const elapsedMinutes = (Date.now() - new Date(session.startedAt).getTime() - session.accumulatedPauseMs) / 60000;
      const remaining = session.plannedMinutes + session.extendedMinutes - elapsedMinutes;
      if (remaining > 0) {
        autoStoppingSessionsRef.delete(session.id);
        continue;
      }
      if (autoStoppingSessionsRef.has(session.id)) continue;
      autoStoppingSessionsRef.add(session.id);
      finalizeSession(session.id).catch(() => {
        // Transient failure (network blip, etc.) — drop the guard so the next 5s poll retries
        // instead of leaving this session stuck "expired but never actually stopped".
        autoStoppingSessionsRef.delete(session.id);
      });
    }
  }, [sessions]);

  /** Shared by the manual Stop button and the auto-stop sweep above: calls /stop, fetches the
   * resulting bill, and appends it to finishedBills (never overwrites an existing entry) tagged
   * with the unit/TV name so the cashier can tell which station each finished card belongs to.
   * The very first bill with nothing else open auto-expands into the payment form; later arrivals
   * stay collapsed in the list until clicked, so they don't interrupt an in-progress payment. */
  const finalizeSession = async (sessionId: string) => {
    const res = await fetch(`/api/rental-sessions/${sessionId}/stop`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "stop failed");
    const bill = await fetchJsonObject<BillBreakdown>(`/api/orders/${data.order.id}/bill`);
    if (bill) {
      const session = sessions.find((s) => s.id === sessionId);
      const unitName = session ? units.find((u) => u.id === session.rentalUnitId)?.name ?? "Unit" : "Unit";
      setFinishedBills((prev) => (prev.some((f) => f.bill.order.id === bill.order.id) ? prev : [...prev, { bill, unitName, sessionId }]));
      setExpandedFinishedOrderId((cur) => {
        if (cur) return cur;
        setPayAmount(bill.balanceDue);
        setCheckoutDiscount(0);
        setCheckoutTax(false);
        setCheckoutVoucherCode("");
        setVoucherMsg("");
        setPayMethod("cash");
        return bill.order.id;
      });
    }
    load();
  };

  /** Switches which collapsed finished-bill card is open for payment, resetting the shared
   * payment-form fields (discount/tax/voucher/amount/method) to match the one just opened. */
  const openFinishedBillPayment = (entry: { bill: BillBreakdown; unitName: string; sessionId: string }) => {
    setExpandedFinishedOrderId(entry.bill.order.id);
    setPayAmount(entry.bill.balanceDue);
    setCheckoutDiscount(0);
    setCheckoutTax(false);
    setCheckoutVoucherCode("");
    setVoucherMsg("");
    setPayMethod("cash");
  };

  /** Writes back a refreshed bill for one specific order (voucher applied, partial payment
   * landed, etc.), or removes it entirely from the list when bill is null (fully paid, or
   * dismissed via "Tutup" to collect payment later at POS). */
  const updateFinishedBillEntry = (orderId: string, bill: BillBreakdown | null) => {
    if (bill === null) {
      setFinishedBills((prev) => prev.filter((f) => f.bill.order.id !== orderId));
      setExpandedFinishedOrderId((cur) => (cur === orderId ? null : cur));
    } else {
      setFinishedBills((prev) => prev.map((f) => (f.bill.order.id === orderId ? { ...f, bill } : f)));
    }
  };

  const start = async (unitId: string) => {
    const res = await fetch("/api/rental-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rentalUnitId: unitId,
        customerId: selectedCustomerId || undefined,
        customerName: customerName || undefined,
        gameName: gameName || undefined,
        staffUserId,
        plannedMinutes: plannedMinutes ? Number(plannedMinutes) : undefined,
        // Promo package takes over billing (flat rate at stop time) — see startRentalSession,
        // which also overrides plannedMinutes from promo.durationMinutes server-side.
        promoId: selectedPromoId || undefined,
        prepay: collectPrepay && prepayAmount > 0 ? { amount: prepayAmount, method: prepayMethod } : undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      showAlert(err.error);
      return;
    }
    const data = await res.json();
    if (data.prepayment) {
      if (data.prepayment.status === "success") {
        showAlert(
          t("rental.dpReceivedToast", "DP {amount} ({method}) diterima.")
            .replace("{amount}", rupiah(prepayAmount))
            .replace("{method}", prepayMethod.toUpperCase())
        );
      } else {
        // qris (or any async gateway) — show the QR right away so the cashier can hand it to
        // the customer, same "Tandai Diterima" pattern as end-of-session checkout.
        setPendingPrepay({ paymentId: data.prepayment.id, qrImageUrl: data.prepayment.qrImageUrl ?? null, amount: prepayAmount });
      }
    }
    setCustomerName("");
    setGameName("");
    setPlannedMinutes("");
    setSelectedPromoId(null);
    setSelectedCustomerId(null);
    setCustomerQuery("");
    setActiveUnitId(null);
    setCollectPrepay(false);
    setPrepayAmount(0);
    setPrepayMethod("cash");
    load();
  };

  const confirmPendingPrepay = async () => {
    if (!pendingPrepay) return;
    // confirm-deposit, not confirm-cash — a DP mustn't trigger settlement
    // (journal posting / "paid" status) against the session's still-estimated
    // total. See confirmDeposit() in lib/payments/index.ts.
    await fetch(`/api/payments/${pendingPrepay.paymentId}/confirm-deposit`, { method: "POST" });
    setPendingPrepay(null);
    load();
  };

  const stop = async (sessionId: string) => {
    try {
      await finalizeSession(sessionId);
    } catch (err: unknown) {
      showAlert(describeError(err) || t("rental.stopSessionFailed", "Gagal menghentikan sesi."));
    }
  };

  const pause = async (sessionId: string) => {
    await fetch(`/api/rental-sessions/${sessionId}/pause`, { method: "POST" });
    load();
  };

  const resume = async (sessionId: string) => {
    await fetch(`/api/rental-sessions/${sessionId}/resume`, { method: "POST" });
    load();
  };

  const extend = async (sessionId: string, minutes: number) => {
    await fetch(`/api/rental-sessions/${sessionId}/extend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ additionalMinutes: minutes }),
    });
    setExtendSessionFor(null);
    load();
  };

  const toggleDevice = async (unit: RentalUnit, on: boolean) => {
    if (!unit.deviceId) return showAlert(t("rental.unitNotLinkedDevice", "Unit ini belum terhubung ke smart plug. Atur di halaman Kontrol Perangkat."));
    await fetch(`/api/devices/${unit.deviceId}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on }),
    });
  };

  const startNewUnit = () => {
    setUnitForm({ name: "", consoleType: "ps4", tvType: "smart_tv", hourlyRate: 0, note: "" });
    setEditingUnitId(null);
    setAddingUnit(true);
  };

  const startEditUnit = (unit: RentalUnit) => {
    setUnitForm({ name: unit.name, consoleType: unit.consoleType, tvType: unit.tvType, hourlyRate: unit.hourlyRate, note: "" });
    setEditingUnitId(unit.id);
    setAddingUnit(false);
  };

  const cancelUnitForm = () => {
    setEditingUnitId(null);
    setAddingUnit(false);
  };

  const saveUnit = async () => {
    if (!unitForm.name.trim()) return showAlert(t("rental.unitNameRequired", "Nama unit wajib diisi."));
    if (editingUnitId) {
      const res = await fetch(`/api/rental-units/${editingUnitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitForm),
      });
      if (!res.ok) return showAlert((await res.json()).error);
    } else {
      if (!outletId) return;
      const res = await fetch("/api/rental-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...unitForm, outletId }),
      });
      if (!res.ok) return showAlert((await res.json()).error);
    }
    cancelUnitForm();
    load();
  };

  const archiveUnit = async (unit: RentalUnit) => {
    if (
      !(await showConfirm(
        t("rental.confirmDeactivateUnit", "Nonaktifkan {unit}? Unit tidak akan tampil di grid rental, tapi riwayat sesinya tetap tersimpan.").replace("{unit}", unit.name)
      ))
    )
      return;
    const res = await fetch(`/api/rental-units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (!res.ok) return showAlert((await res.json()).error);
    load();
  };

  const reactivateUnit = async (unit: RentalUnit) => {
    await fetch(`/api/rental-units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    load();
  };

  /**
   * Flips a unit between "maintenance" and "available" — this is what actually shows up as the
   * grey "Maintenance" badge on the public /book page (its API already returns/renders that
   * status; the Kelola Unit panel just never had a control to set it). Blocked while a session
   * is running so staff can't maintenance-flag a unit mid-rental without stopping it first,
   * mirroring the same guard the API already enforces for isActive:false.
   */
  const toggleMaintenance = async (unit: RentalUnit) => {
    const goingUnderMaintenance = unit.status !== "maintenance";
    if (
      goingUnderMaintenance &&
      !(await showConfirm(
        t(
          "rental.confirmSetMaintenance",
          "Tandai {unit} sedang maintenance? Unit tidak bisa dipilih untuk sesi baru atau booking online sampai diaktifkan lagi."
        ).replace("{unit}", unit.name)
      ))
    )
      return;
    const res = await fetch(`/api/rental-units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: goingUnderMaintenance ? "maintenance" : "available" }),
    });
    if (!res.ok) return showAlert((await res.json()).error);
    load();
  };

  const transferUnit = async (sessionId: string, newRentalUnitId: string) => {
    const res = await fetch(`/api/rental-sessions/${sessionId}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newRentalUnitId, staffUserId }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setTransferUnitFor(null);
    load();
  };

  const openFnbPanel = (sessionId: string) => {
    setFnbCart({});
    setFnbSessionId(fnbSessionId === sessionId ? null : sessionId);
  };

  const addFnbToBill = async (session: RentalSession) => {
    const items = Object.entries(fnbCart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const p = products.find((x) => x.id === productId)!;
        return { productId, description: p.name, qty, unitPrice: p.price };
      });
    if (items.length === 0) return;
    if (!outletId) return;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outletId, rentalSessionId: session.id, staffUserId, items }),
    });
    if (!res.ok) {
      const err = await res.json();
      return showAlert(err.error);
    }
    setFnbCart({});
    setFnbSessionId(null);
    load();
  };

  const openAccessoryPanel = (sessionId: string) => {
    setAccessoryForm({ name: ACCESSORY_PRESETS[0].name, qty: 1, ratePerHour: ACCESSORY_PRESETS[0].ratePerHour });
    setAccessorySessionId(accessorySessionId === sessionId ? null : sessionId);
  };

  const addAccessory = async (sessionId: string) => {
    if (!accessoryForm.name.trim() || accessoryForm.qty <= 0 || accessoryForm.ratePerHour < 0) return;
    const res = await fetch(`/api/rental-sessions/${sessionId}/accessories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...accessoryForm, staffUserId }),
    });
    if (!res.ok) return showAlert((await res.json()).error);
    setAccessorySessionId(null);
    load();
  };

  const returnAccessory = async (accessoryId: string) => {
    const res = await fetch(`/api/session-accessories/${accessoryId}/remove`, { method: "POST" });
    if (!res.ok) return showAlert((await res.json()).error);
    load();
  };

  /** Payment methods with a live online gateway behind them (Fastpay H2H powers QRIS/DANA/GoPay,
   * plus BukuPay) settle asynchronously via webhook (see /api/payments/webhook/*) — they're never
   * auto-confirmed from this panel. Everything else (cash, transfer, card, and any custom method
   * an owner adds via the Pembayaran page) has no webhook behind it — resolveGateway() in
   * lib/payments falls back to the same staff-confirmed "manual" gateway cash already used, so the
   * kasir confirms receipt on the spot for all of those, exactly like cash always worked. */
  const ASYNC_GATEWAY_METHODS = new Set(["qris", "fastpay_h2h", "dana", "gopay", "bukupay"]);

  /**
   * Supports split payment across ANY combination/order of methods — cash then QRIS, QRIS then
   * cash, cash + transfer + card, etc. Pay less than the full total, keep the card open showing
   * the remaining balance (and anything still awaiting gateway confirmation), then settle the
   * rest with a different method. Previously only the cash branch re-checked balanceDue before
   * deciding whether to close the panel; any other method unconditionally closed it after a
   * single leg, which broke "QRIS sebagian dulu, cash sisanya" style splits. Both paths now share
   * the same refresh-then-decide logic below.
   */
  /** Applies a voucher/loyalty-reward code (e.g. a "diskon main" reward minted by redeeming
   * loyalty points — see lib/membership/rewards.ts) immediately, before payment — same endpoint
   * the discount/tax inputs use, reusing the exact validation + consume flow already built for
   * POS checkout (see lib/pos/vouchers.ts). Only allowed pre-payment, same as discount/tax. */
  const applyVoucher = async () => {
    if (!activeFinishedBill || !checkoutVoucherCode.trim()) return;
    const orderId = activeFinishedBill.order.id;
    const res = await fetch(`/api/orders/${orderId}/checkout-options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voucherCode: checkoutVoucherCode.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setVoucherMsg(data.error); return; }
    setVoucherMsg(t("rental.voucherApplied", "Kode diterapkan."));
    setCheckoutVoucherCode("");
    const refreshed = await fetchJsonObject<BillBreakdown>(`/api/orders/${orderId}/bill`);
    if (refreshed) { updateFinishedBillEntry(orderId, refreshed); setPayAmount(refreshed.balanceDue); }
  };

  const payFinishedOrder = async () => {
    if (!activeFinishedBill) return;
    const orderId = activeFinishedBill.order.id;

    // Discount/tax only apply once, before any payment has landed — resending them on a
    // second split-payment round would re-negotiate the bill mid-settlement.
    if (activeFinishedBill.paidTotal === 0 && (checkoutDiscount > 0 || checkoutTax)) {
      await fetch(`/api/orders/${orderId}/checkout-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount: checkoutDiscount, applyTax: checkoutTax }),
      });
    }

    const res = await fetch(`/api/orders/${orderId}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: payMethod, amount: payAmount }),
    });
    const payment = await res.json();
    if (!res.ok) return showAlert(payment.error);

    // Every payment starts "pending" regardless of method (see cash/manual/fastpay adapters) —
    // only flip it to "success" here ourselves for the staff-confirmed methods; gateway-backed
    // methods wait for their webhook (or the manual "Tandai Diterima" override below, e.g. mock mode).
    if (!ASYNC_GATEWAY_METHODS.has(payMethod)) {
      await fetch(`/api/payments/${payment.id}/confirm-cash`, { method: "POST" });
    }

    const refreshed = await fetchJsonObject<BillBreakdown>(`/api/orders/${orderId}/bill`);
    if (!refreshed || refreshed.balanceDue <= 0.5) {
      updateFinishedBillEntry(orderId, null);
      load();
    } else {
      updateFinishedBillEntry(orderId, refreshed);
      setPayAmount(refreshed.balanceDue);
    }
  };

  /** Manual override for a payment still "pending" (a QRIS/gateway leg whose webhook hasn't
   * landed yet, or mock mode with no gateway configured) — lets the kasir confirm it was actually
   * received without leaving this panel. Reuses the same confirm-cash endpoint the cash flow
   * uses; despite the name it just flips any payment id to "success", no method check server-side. */
  const confirmPendingPayment = async (paymentId: string) => {
    const orderId = activeFinishedBill?.order.id;
    if (!orderId) return;
    await fetch(`/api/payments/${paymentId}/confirm-cash`, { method: "POST" });
    const refreshed = await fetchJsonObject<BillBreakdown>(`/api/orders/${orderId}/bill`);
    if (!refreshed || refreshed.balanceDue <= 0.5) {
      updateFinishedBillEntry(orderId, null);
      load();
    } else {
      updateFinishedBillEntry(orderId, refreshed);
      setPayAmount(refreshed.balanceDue);
    }
  };

  const activeUnits = sortUnitsForDisplay(units.filter((u) => u.isActive !== false));
  const availableUnits = activeUnits.filter((u) => u.status === "available");
  const selectedUnit = activeUnitId ? activeUnits.find((u) => u.id === activeUnitId) : null;
  // Packages from /dashboard/promo that apply to the selected station: active, type
  // "rental_package", and scoped to this console type (or "any" = every console).
  const unitPackages = selectedUnit
    ? promos.filter((p) => {
        if (!p.isActive || p.type !== "rental_package" || !p.durationMinutes) return false;
        const scope = p.consoleType ?? "any";
        return scope === "any" || scope === selectedUnit.consoleType;
      })
    : [];
  // Best-effort estimate to prefill "Bayar Dimuka" — package price if one's picked, else
  // planned-hours x hourly rate, else 0 (cashier can always type a custom DP amount instead).
  const suggestedPrepay = selectedPromoId
    ? unitPackages.find((p) => p.id === selectedPromoId)?.packagePrice ?? 0
    : plannedMinutes && selectedUnit
    ? Math.round((Number(plannedMinutes) / 60) * selectedUnit.hourlyRate)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="gm-display text-2xl sm:text-3xl font-bold leading-tight">
            <span className="text-neutral-200">{t("rental.pageTitle", "PUSAT KONTROL BILLING RENTAL")}</span>
            <br />
            <span className="gm-gradient-title">NEXBILL</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {t(
              "rental.pageSubtitle",
              "Satu bill per sesi: tambah F&B kapan saja selama bermain, timer & biaya rental otomatis, semua tergabung di satu invoice saat selesai."
            )}
          </p>
        </div>
        <Button variant="secondary" className="flex items-center gap-2 text-xs" onClick={() => setShowUnitManager((v) => !v)}>
          <Settings size={14} /> {showUnitManager ? t("rental.toggleCloseUnitManager", "Tutup Kelola Unit") : t("rental.toggleOpenUnitManager", "Kelola Unit")}
        </Button>
      </div>

      {showUnitManager && (
        <Card className="space-y-3">
          <h2 className="gm-heading font-semibold">{t("rental.manageUnitsHeading", "Kelola Unit PS")}</h2>
          <div className="space-y-2">
            {units.map((unit) => (
              <div key={unit.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${unit.isActive === false ? "border-white/5 opacity-50" : unit.status === "maintenance" ? "border-amber-500/30" : "border-white/10"}`}>
                <div>
                  <span className="font-medium">{unit.name}</span>
                  <span className="text-xs text-neutral-500 ml-2 uppercase">{unit.consoleType} · {unit.tvType.replace("_", " ")} · {rupiah(unit.hourlyRate)}{t("rental.perHourSuffix", "/jam")}</span>
                  {unit.isActive === false && <span className="text-xs text-rose-400 ml-2">{t("rental.inactiveTag", "(nonaktif)")}</span>}
                  {unit.isActive !== false && unit.status === "maintenance" && <span className="text-xs text-amber-400 ml-2">{t("rental.maintenanceHiddenTag", "(maintenance — disembunyikan dari booking online)")}</span>}
                </div>
                <div className="flex gap-2">
                  {unit.isActive === false ? (
                    <Button variant="ghost" className="text-xs flex items-center gap-1" onClick={() => reactivateUnit(unit)}>
                      <RotateCcw size={12} /> {t("rental.activateUnit", "Aktifkan")}
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" className="text-xs flex items-center gap-1" onClick={() => startEditUnit(unit)}>
                        <Pencil size={12} /> {t("rental.editUnit", "Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        className={`text-xs flex items-center gap-1 ${unit.status === "maintenance" ? "text-emerald-400" : "text-amber-400"}`}
                        disabled={unit.status === "occupied"}
                        title={unit.status === "occupied" ? t("rental.stopSessionFirstTooltip", "Hentikan sesi dulu sebelum menandai maintenance") : undefined}
                        onClick={() => toggleMaintenance(unit)}
                      >
                        <Wrench size={12} /> {unit.status === "maintenance" ? t("rental.finishMaintenance", "Selesai Maintenance") : t("rental.setMaintenance", "Set Maintenance")}
                      </Button>
                      <Button variant="ghost" className="text-xs flex items-center gap-1 text-rose-400" onClick={() => archiveUnit(unit)}>
                        <Archive size={12} /> {t("rental.deactivateUnit", "Nonaktifkan")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(editingUnitId || addingUnit) ? (
            <div className="rounded-lg border border-white/10 p-3 space-y-2">
              <div className="text-xs text-neutral-500">{editingUnitId ? t("rental.editUnitFormTitle", "Edit unit") : t("rental.addUnitFormTitle", "Tambah unit baru")}</div>
              <input className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder={t("rental.unitNamePlaceholder", "Nama unit (mis. Bilik 4)")}
                value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <select className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" value={unitForm.consoleType}
                  onChange={(e) => setUnitForm((f) => ({ ...f, consoleType: e.target.value }))}>
                  {CONSOLE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" value={unitForm.tvType}
                  onChange={(e) => setUnitForm((f) => ({ ...f, tvType: e.target.value }))}>
                  {TV_TYPES.map((tv) => <option key={tv.value} value={tv.value}>{tv.label}</option>)}
                </select>
              </div>
              <input type="number" className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder={t("rental.hourlyRatePlaceholder", "Tarif per jam (Rp)")}
                value={unitForm.hourlyRate || ""} onChange={(e) => setUnitForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))} />
              <div className="flex gap-2">
                <Button onClick={saveUnit}>{t("rental.save", "Simpan")}</Button>
                <Button variant="ghost" onClick={cancelUnitForm}>{t("rental.cancel", "Batal")}</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" className="flex items-center gap-2 text-xs" onClick={startNewUnit}>
              <Plus size={14} /> {t("rental.addUnit", "Tambah Unit")}
            </Button>
          )}
        </Card>
      )}

      {/* Every session that just finished shows up here, stacked top-to-bottom — several units
          ending close together (auto-stop sweep or quick manual clicks) all get their own card,
          none get overwritten. Each is tagged with its unit/TV name; only one is expanded into
          the full payment form at a time, the rest sit collapsed as a summary until clicked. */}
      {finishedBills.map((entry) => {
        const bill = entry.bill;
        const isOpen = bill.order.id === expandedFinishedOrderId;
        if (!isOpen) {
          return (
            <div
              key={bill.order.id}
              role="button"
              tabIndex={0}
              onClick={() => openFinishedBillPayment(entry)}
              onKeyDown={(e) => { if (e.key === "Enter") openFinishedBillPayment(entry); }}
            >
              <Card className="border-emerald-400/40 shadow-[0_0_14px_rgba(52,211,153,0.12)] cursor-pointer hover:border-emerald-400/70 transition">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="gm-heading font-semibold text-sm flex items-center gap-2">
                      {t("rental.sessionFinishedPrefix", "Sesi Selesai — {unit}").replace("{unit}", entry.unitName)}
                      <Badge status="pending">{t("rental.billNumber", "Bill #{id}").replace("{id}", bill.order.id.slice(0, 8))}</Badge>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">{t("rental.remainingBillShort", "Sisa tagihan {amount}").replace("{amount}", rupiah(bill.balanceDue))}</div>
                  </div>
                  <Button className="text-xs">{t("rental.pay", "Bayar")}</Button>
                </div>
              </Card>
            </div>
          );
        }
        return (
          <Card key={bill.order.id} className="border-emerald-400/40 shadow-[0_0_20px_rgba(52,211,153,0.15)]">
            <h2 className="gm-heading font-semibold mb-2 flex items-center gap-2 flex-wrap">
              {t("rental.sessionFinishedPrefix", "Sesi Selesai — {unit}").replace("{unit}", entry.unitName)}
              <Badge status="pending">{t("rental.billNumber", "Bill #{id}").replace("{id}", bill.order.id.slice(0, 8))}</Badge>
              {finishedBills.length > 1 && (
                <span className="text-xs font-normal text-neutral-500">{t("rental.otherFinishedSessionsWaiting", "({n} sesi selesai menunggu)").replace("{n}", String(finishedBills.length))}</span>
              )}
            </h2>
            <div className="text-sm space-y-1 mb-3">
              <div className="flex justify-between"><span className="text-neutral-500">{t("rental.rentalLabel", "Rental")}</span><span>{rupiah(bill.rentalSubtotal)}</span></div>
              {bill.accessorySubtotal > 0 && <div className="flex justify-between"><span className="text-neutral-500">{t("rental.accessoriesLabel", "Aksesoris")}</span><span>{rupiah(bill.accessorySubtotal)}</span></div>}
              <div className="flex justify-between"><span className="text-neutral-500">{t("rental.fnbLabel", "F&B")}</span><span>{rupiah(bill.fnbSubtotal)}</span></div>
              {bill.order.discount > 0 && <div className="flex justify-between text-amber-400"><span>{t("rental.discountLabel", "Diskon")}</span><span>-{rupiah(bill.order.discount)}</span></div>}
              {bill.order.tax > 0 && <div className="flex justify-between"><span className="text-neutral-500">{t("rental.taxLabel", "Pajak")}</span><span>{rupiah(bill.order.tax)}</span></div>}
              <div className="flex justify-between font-semibold pt-1 border-t border-white/10"><span>{t("rental.grandTotal", "Grand Total")}</span><span className="text-cyan-300">{rupiah(bill.order.total)}</span></div>
            </div>

            {bill.payments.filter((p) => p.status === "success").length > 0 && (
              <div className="rounded-lg bg-white/5 px-3 py-2 text-xs space-y-1 mb-3">
                <div className="text-neutral-500 mb-1">{t("rental.paymentsReceivedSplit", "Pembayaran diterima (split):")}</div>
                {bill.payments.filter((p) => p.status === "success").map((p) => (
                  <div key={p.id} className="flex justify-between"><span className="uppercase">{p.method}</span><span>{rupiah(p.amount)}</span></div>
                ))}
                <div className="flex justify-between font-semibold pt-1 border-t border-white/10 text-amber-400">
                  <span>{t("rental.remainingBalance", "Sisa Tagihan")}</span><span>{rupiah(bill.balanceDue)}</span>
                </div>
              </div>
            )}

            {bill.payments.filter((p) => p.status === "pending").length > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2 text-xs space-y-2 mb-3">
                <div className="text-amber-300">{t("rental.awaitingConfirmation", "Menunggu konfirmasi:")}</div>
                {bill.payments.filter((p) => p.status === "pending").map((p) => (
                  <div key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="uppercase">{p.method} — {rupiah(p.amount)}</span>
                      <Button variant="ghost" className="text-[11px] py-0.5" onClick={() => confirmPendingPayment(p.id)}>
                        {t("rental.markReceived", "Tandai Diterima")}
                      </Button>
                    </div>
                    {p.qrImageUrl && <img src={p.qrImageUrl} alt={t("rental.qrPaymentAlt", "QR pembayaran")} className="w-28 h-28 rounded-lg border border-white/10" />}
                  </div>
                ))}
              </div>
            )}

            {bill.paidTotal === 0 && (
              <div className="space-y-2 mb-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="number" className="w-32 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" placeholder={t("rental.discountPlaceholder", "Diskon (Rp)")}
                    value={checkoutDiscount || ""} onChange={(e) => setCheckoutDiscount(Number(e.target.value))} />
                  <label className="flex items-center gap-1 text-xs text-neutral-400">
                    <input type="checkbox" checked={checkoutTax} onChange={(e) => setCheckoutTax(e.target.checked)} /> {t("rental.taxLabel", "Pajak")}
                  </label>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input className="w-40 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm uppercase" placeholder={t("rental.voucherPlaceholder", "Kode voucher/reward")}
                    value={checkoutVoucherCode} onChange={(e) => setCheckoutVoucherCode(e.target.value)} />
                  <Button className="text-xs" onClick={applyVoucher}>{t("rental.applyVoucher", "Terapkan")}</Button>
                  {voucherMsg && <span className="text-xs text-neutral-400">{voucherMsg}</span>}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="number"
                className="w-32 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                placeholder={t("rental.payAmountPlaceholder", "Jumlah bayar")}
                value={payAmount || ""}
                max={bill.balanceDue}
                onChange={(e) => setPayAmount(Math.min(Number(e.target.value), bill.balanceDue))}
              />
              <select className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {methods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <Button onClick={payFinishedOrder}>{t("rental.payButtonAmount", "Bayar {amount}").replace("{amount}", rupiah(payAmount))}</Button>
              <Button variant="ghost" onClick={() => updateFinishedBillEntry(bill.order.id, null)}>{t("rental.closePayLater", "Tutup (bayar nanti di POS)")}</Button>
            </div>
            {payAmount < bill.balanceDue && (
              <div className="text-[11px] text-amber-400 mt-1">
                {t("rental.splitPaymentNote", "Split payment: sisa {amount} bisa dibayar dengan metode lain setelah ini.").replace("{amount}", rupiah(bill.balanceDue - payAmount))}
              </div>
            )}
          </Card>
        );
      })}

      {pendingPrepay && (
        <Card className="border-amber-400/40">
          <h2 className="gm-heading font-semibold mb-2 text-amber-300">{t("rental.awaitingPrepayHeading", "Menunggu Pembayaran DP — QRIS")}</h2>
          <div className="flex items-center gap-4">
            {pendingPrepay.qrImageUrl && (
              <img src={pendingPrepay.qrImageUrl} alt={t("rental.qrPrepayAlt", "QR pembayaran DP")} className="w-28 h-28 rounded-lg border border-white/10" />
            )}
            <div className="space-y-2">
              <div className="text-sm">{t("rental.prepayScanNote", "DP {amount} — minta pelanggan scan QR di atas.").replace("{amount}", rupiah(pendingPrepay.amount))}</div>
              <div className="flex gap-2">
                <Button className="text-xs" onClick={confirmPendingPrepay}>{t("rental.markReceived", "Tandai Diterima")}</Button>
                <Button variant="ghost" className="text-xs" onClick={() => setPendingPrepay(null)}>{t("rental.closeCheckBillLater", "Tutup (cek nanti di bill)")}</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Station grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {activeUnits.map((unit) => {
            const session = sessions.find((s) => s.rentalUnitId === unit.id);
            const bill = session ? bills[session.id] : undefined;
            let effectivePauseMs = session ? session.accumulatedPauseMs : 0;
            if (session && session.status === "paused" && session.pausedAt) {
              effectivePauseMs += Date.now() - new Date(session.pausedAt).getTime();
            }
            const elapsedHours = session ? Math.max(0, (Date.now() - new Date(session.startedAt).getTime() - effectivePauseMs) / 3600000) : 0;
            const rentalEstimate = session ? Math.round(elapsedHours * session.ratePerHour) : 0;
            const sessionAccessories = session ? accessories[session.id] ?? [] : [];
            const accessoryEstimate = sessionAccessories.reduce((s, a) => s + estimateAccessoryCharge(a, Date.now()), 0);
            const runningTotal = (bill?.fnbSubtotal ?? 0) + rentalEstimate + accessoryEstimate;

            const allowedMinutes = session?.plannedMinutes ? session.plannedMinutes + session.extendedMinutes : null;
            const remainingMinutes = allowedMinutes ? allowedMinutes - elapsedHours * 60 : null;
            const timeExpired = remainingMinutes !== null && remainingMinutes <= 0;
            const timeWarning = remainingMinutes !== null && remainingMinutes > 0 && remainingMinutes <= TIME_WARNING_THRESHOLD_MIN;
            const otherAvailableUnits = activeUnits.filter((u) => u.id !== unit.id && u.status === "available");

            const ringPercent = allowedMinutes ? Math.max(0, Math.min(100, ((remainingMinutes ?? 0) / allowedMinutes) * 100)) : 100;
            const ringColor = timeExpired ? "stroke-rose-400" : timeWarning ? "stroke-amber-400" : allowedMinutes ? "stroke-emerald-400" : "stroke-cyan-400";
            const ringGlow = timeExpired ? "rgba(244,63,94,0.75)" : timeWarning ? "rgba(251,191,36,0.7)" : allowedMinutes ? "rgba(52,211,153,0.6)" : "rgba(34,211,238,0.55)";
            const isSelected = activeUnitId === unit.id;

            return (
              <Card
                key={unit.id}
                className={`space-y-3 transition ${timeExpired ? "border-rose-500/60 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.25)]" : timeWarning ? "border-amber-500/50 shadow-[0_0_16px_rgba(251,191,36,0.2)]" : isSelected ? "border-cyan-400/50 shadow-[0_0_16px_rgba(34,211,238,0.25)]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="gm-heading font-semibold">{unit.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide rounded bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 text-blue-300 px-1.5 py-0.5">
                        {consoleLabel(unit.consoleType)}
                      </span>
                      <span className="text-[10px] text-neutral-500 uppercase">{unit.tvType.replace("_", " ")}</span>
                    </div>
                  </div>
                  <Badge status={unit.status}>{t(`rental.unitStatus.${unit.status}`, unit.status)}</Badge>
                </div>

                <div className="text-sm text-neutral-400">{rupiah(unit.hourlyRate)} {t("rental.perHourSuffix", "/jam")}</div>

                {session ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <RingTimer percent={ringPercent} colorClass={ringColor} glowRgb={ringGlow}>
                        <span className="text-[8px] uppercase tracking-wide text-neutral-500">{allowedMinutes ? t("rental.remainingTimeLabel", "Sisa Waktu") : t("rental.runningLabel", "Berjalan")}</span>
                        {allowedMinutes ? (
                          <CountdownTimer startedAt={session.startedAt} accumulatedPauseMs={session.accumulatedPauseMs} paused={session.status === "paused"} allowedMinutes={allowedMinutes} />
                        ) : (
                          <ElapsedTimer startedAt={session.startedAt} accumulatedPauseMs={session.accumulatedPauseMs} paused={session.status === "paused"} />
                        )}
                      </RingTimer>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs text-neutral-300 truncate">{session.customerName || t("rental.noNameFallback", "Tanpa nama")}</div>
                        {session.gameName && <div className="text-[10px] text-neutral-500 truncate">{t("rental.playingPrefix", "Main:")} {session.gameName}</div>}
                        {session.extendedMinutes > 0 && (
                          <div className="text-[10px] text-emerald-400">
                            {t("rental.extendedBadge", "+{n} menit extend").replace("{n}", String(session.extendedMinutes))}
                          </div>
                        )}
                        {!allowedMinutes && <div className="text-[10px] text-neutral-600">{t("rental.openDuration", "Durasi terbuka")}</div>}
                      </div>
                    </div>

                    {(timeWarning || timeExpired) && (
                      <div className={`flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-1 ${timeExpired ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>
                        <AlertTriangle size={12} />{" "}
                        {timeExpired
                          ? t("rental.timeUp", "Waktu habis!")
                          : t("rental.timeAlmostUp", "Waktu hampir habis — sisa {n} menit").replace("{n}", String(Math.ceil(remainingMinutes!)))}
                      </div>
                    )}

                    <div className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">
                          {t("rental.playDurationLabel", "Lama Bermain")}
                          {allowedMinutes ? ` ${t("rental.plannedSuffix", "(rencana {duration})").replace("{duration}", formatPlayDuration(allowedMinutes))}` : ""}
                        </span>
                        <span>{formatPlayDuration(elapsedHours * 60)}</span>
                      </div>
                      <div className="flex justify-between"><span className="text-neutral-500">{t("rental.costAccrued", "Cost Accrued")}</span><span>{rupiah(rentalEstimate)}</span></div>
                      {sessionAccessories.length > 0 && (
                        <div className="flex justify-between"><span className="text-neutral-500">{t("rental.accessoriesLabel", "Aksesoris")} ({sessionAccessories.length})</span><span>{rupiah(accessoryEstimate)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-neutral-500">{t("rental.fnbItemCount", "F&B ({n} item)").replace("{n}", String(bill?.fnbItemCount ?? 0))}</span><span>{rupiah(bill?.fnbSubtotal ?? 0)}</span></div>
                      <div className="flex justify-between font-semibold pt-1 border-t border-white/10"><span>{t("rental.runningBill", "Bill Berjalan")}</span><span className="text-cyan-300">{rupiah(runningTotal)}</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {session.status === "running" ? (
                        <Button variant="secondary" className="text-xs flex items-center justify-center gap-1" onClick={() => pause(session.id)}>
                          <Pause size={12} /> {t("rental.pause", "Jeda")}
                        </Button>
                      ) : (
                        <Button variant="secondary" className="text-xs flex items-center justify-center gap-1" onClick={() => resume(session.id)}>
                          <PlayCircle size={12} /> {t("rental.resume", "Lanjut")}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        className="text-xs flex items-center justify-center gap-1"
                        onClick={() => setExtendSessionFor(extendSessionFor === session.id ? null : session.id)}
                      >
                        <Clock size={12} /> {t("rental.addTime", "Add Time")}
                      </Button>
                    </div>
                    {extendSessionFor === session.id && (
                      <div className="grid grid-cols-4 gap-1">
                        {EXTEND_OPTIONS.map((m) => (
                          <button
                            key={m}
                            className="text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 px-1 py-1.5"
                            onClick={() => extend(session.id, m)}
                          >
                            +{m < 60 ? `${m}m` : `${Math.floor(m / 60)}j${m % 60 ? m % 60 : ""}`}
                          </button>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-2 text-xs"
                      disabled={otherAvailableUnits.length === 0}
                      onClick={() => setTransferUnitFor(transferUnitFor === session.id ? null : session.id)}
                    >
                      <ArrowLeftRight size={14} /> {t("rental.transferUnit", "Pindah Unit")}
                    </Button>
                    {transferUnitFor === session.id && (
                      <div className="rounded-lg border border-white/10 p-2 space-y-1">
                        {otherAvailableUnits.map((u) => (
                          <button
                            key={u.id}
                            className="w-full text-left text-xs rounded bg-white/5 hover:bg-white/10 px-2 py-1.5"
                            onClick={() => transferUnit(session.id, u.id)}
                          >
                            {u.name} <span className="text-neutral-500">({rupiah(u.hourlyRate)}{t("rental.perHourSuffix", "/jam")})</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {sessionAccessories.length > 0 && (
                      <div className="rounded-lg border border-white/10 p-2 space-y-1">
                        {sessionAccessories.map((a) => (
                          <div key={a.id} className="flex items-center justify-between text-xs">
                            <span>{a.name} x{a.qty} <span className="text-neutral-500">({rupiah(a.ratePerHour)}{t("rental.perHourSuffix", "/jam")})</span></span>
                            <div className="flex items-center gap-2">
                              <span className="text-neutral-400">{rupiah(estimateAccessoryCharge(a, Date.now()))}</span>
                              <button className="text-rose-400" onClick={() => returnAccessory(a.id)}>{t("rental.returnAccessory", "Kembalikan")}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button variant="secondary" className="w-full flex items-center justify-center gap-2 text-xs" onClick={() => openAccessoryPanel(session.id)}>
                      <Gamepad size={14} /> {accessorySessionId === session.id ? t("rental.closeAccessories", "Tutup Aksesoris") : t("rental.addAccessoriesToggle", "+ Aksesoris")}
                    </Button>

                    {accessorySessionId === session.id && (
                      <div className="rounded-lg border border-white/10 p-2 space-y-2">
                        <select
                          className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs"
                          value={accessoryForm.name}
                          onChange={(e) => {
                            const preset = ACCESSORY_PRESETS.find((p) => p.name === e.target.value);
                            setAccessoryForm((f) => ({ ...f, name: e.target.value, ratePerHour: preset?.ratePerHour ?? f.ratePerHour }));
                          }}
                        >
                          {ACCESSORY_PRESETS.map((p) => <option key={p.name} value={p.name}>{t(p.labelKey, p.name)}</option>)}
                          <option value="Lainnya">{t("rental.otherOption", "Lainnya")}</option>
                        </select>
                        {accessoryForm.name === "Lainnya" && (
                          <input
                            className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs"
                            placeholder={t("rental.accessoryNamePlaceholder", "Nama aksesoris")}
                            onChange={(e) => setAccessoryForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-neutral-500">{t("rental.qtyLabel", "Jumlah")}</span>
                            <button className="w-5 h-5 rounded bg-white/10 flex items-center justify-center" onClick={() => setAccessoryForm((f) => ({ ...f, qty: Math.max(1, f.qty - 1) }))}>
                              <Minus size={10} />
                            </button>
                            <span className="w-4 text-center text-xs">{accessoryForm.qty}</span>
                            <button className="w-5 h-5 rounded bg-white/10 flex items-center justify-center" onClick={() => setAccessoryForm((f) => ({ ...f, qty: f.qty + 1 }))}>
                              <Plus size={10} />
                            </button>
                          </div>
                          <input
                            type="number"
                            className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs"
                            placeholder={t("rental.ratePerHourPlaceholder", "Tarif/jam")}
                            value={accessoryForm.ratePerHour || ""}
                            onChange={(e) => setAccessoryForm((f) => ({ ...f, ratePerHour: Number(e.target.value) }))}
                          />
                        </div>
                        <Button className="w-full text-xs" onClick={() => addAccessory(session.id)}>{t("rental.addAccessoryButton", "Tambah Aksesoris")}</Button>
                      </div>
                    )}

                    <Button variant="secondary" className="w-full flex items-center justify-center gap-2 text-xs" onClick={() => openFnbPanel(session.id)}>
                      <UtensilsCrossed size={14} /> {fnbSessionId === session.id ? t("rental.closeMenu", "Tutup Menu") : t("rental.addFnbToggle", "+ F&B")}
                    </Button>

                    {fnbSessionId === session.id && (
                      <div className="rounded-lg border border-white/10 p-2 space-y-2 max-h-56 overflow-y-auto">
                        {products.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs">
                            <span className="flex-1">{p.name} <span className="text-neutral-500">({rupiah(p.price)})</span></span>
                            <div className="flex items-center gap-1">
                              <button className="w-5 h-5 rounded bg-white/10 flex items-center justify-center" onClick={() => setFnbCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}>
                                <Minus size={10} />
                              </button>
                              <span className="w-4 text-center">{fnbCart[p.id] ?? 0}</span>
                              <button className="w-5 h-5 rounded bg-white/10 flex items-center justify-center" onClick={() => setFnbCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}>
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                        <Button className="w-full text-xs" onClick={() => addFnbToBill(session)}>{t("rental.addToBill", "Tambah ke Bill")}</Button>
                      </div>
                    )}

                    <Button variant="danger" className="w-full flex items-center justify-center gap-2" onClick={() => stop(session.id)}>
                      <Square size={14} /> {t("rental.endSessionAndPay", "End Session & Bayar")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant={isSelected ? "primary" : "secondary"}
                    className="w-full flex items-center justify-center gap-2"
                    disabled={unit.status !== "available"}
                    onClick={() => setActiveUnitId(unit.id)}
                  >
                    <Play size={14} />{" "}
                    {isSelected
                      ? t("rental.selectedForNewSession", "Dipilih di Sesi Baru →")
                      : unit.status === "available"
                      ? t("rental.selectThisStation", "Pilih Stasiun Ini")
                      : t(`rental.unitStatus.${unit.status}`, unit.status)}
                  </Button>
                )}

                <div className="flex gap-2 pt-1 border-t border-white/10">
                  <Button variant="ghost" className="flex-1 flex items-center justify-center gap-1 text-xs" onClick={() => toggleDevice(unit, true)}>
                    <Power size={12} /> {t("rental.tvOn", "TV On")}
                  </Button>
                  <Button variant="ghost" className="flex-1 flex items-center justify-center gap-1 text-xs" onClick={() => toggleDevice(unit, false)}>
                    <Power size={12} /> {t("rental.tvOff", "TV Off")}
                  </Button>
                </div>
              </Card>
            );
          })}
          {activeUnits.length === 0 && (
            <Card className="sm:col-span-2 2xl:col-span-3 text-center text-neutral-500 text-sm py-8">
              {t("rental.noUnitsEmptyState", 'Belum ada unit PS. Klik "Kelola Unit" untuk menambahkan.')}
            </Card>
          )}
        </div>

        {/* Right column: quick-start + recent activity */}
        <div className="space-y-4">
          <Card className="space-y-3 border-cyan-400/20">
            <div>
              <h2 className="gm-heading font-semibold text-cyan-300">{t("rental.newSessionHeading", "SESI BARU")}</h2>
              <p className="text-xs text-neutral-500">{t("rental.quickStartSubtitle", "Quick start panel — pilih stasiun PlayStation yang tersedia.")}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wide text-neutral-500">{t("rental.selectStationLabel", "Select Station")}</label>
              <select
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                value={activeUnitId ?? ""}
                onChange={(e) => setActiveUnitId(e.target.value || null)}
              >
                <option value="">{t("rental.selectAvailableUnitOption", "— Pilih unit tersedia —")}</option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} · {consoleLabel(u.consoleType)} · {rupiah(u.hourlyRate)}{t("rental.perHourSuffix", "/jam")}</option>
                ))}
              </select>
            </div>

            {selectedUnit && (
              <>
                <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs flex items-center justify-between">
                  <span className="text-neutral-400">{t("rental.consoleTypeLabel", "Console Type")}</span>
                  <span className="font-medium text-blue-300">{consoleLabel(selectedUnit.consoleType)}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-neutral-500">{t("rental.packageLabel", "Package")}</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => { setSelectedPromoId(null); setPlannedMinutes(""); }}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${!selectedPromoId && plannedMinutes === "" ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "border-white/10 text-neutral-400 hover:bg-white/5"}`}
                    >
                      {t("rental.perHour", "Per Jam")}
                    </button>
                    {unitPackages.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPromoId(p.id); setPlannedMinutes(String(p.durationMinutes)); }}
                        title={`${p.name} — ${formatPlayDuration(p.durationMinutes ?? 0)} · ${rupiah(p.packagePrice ?? 0)}`}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs text-left transition ${selectedPromoId === p.id ? "border-cyan-400 bg-cyan-500/15 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]" : "border-white/10 text-neutral-400 hover:bg-white/5"}`}
                      >
                        <div className="font-medium leading-tight">{p.name}</div>
                        <div className="text-[10px] opacity-80 leading-tight">{formatPlayDuration(p.durationMinutes ?? 0)} · {rupiah(p.packagePrice ?? 0)}</div>
                      </button>
                    ))}
                  </div>
                  {unitPackages.length === 0 && (
                    <p className="text-[10px] text-neutral-600">
                      {t("rental.noPackagesForConsole", "Belum ada paket promo untuk {console}. Buat di halaman").replace("{console}", consoleLabel(selectedUnit.consoleType))}{" "}
                      <a href="/dashboard/promo" className="text-cyan-400 underline hover:text-cyan-300">{t("rental.promoPageLinkText", "Promo & Paket Rental")}</a>.
                    </p>
                  )}
                  <select
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs mt-1"
                    value={plannedMinutes}
                    onChange={(e) => { setPlannedMinutes(e.target.value); setSelectedPromoId(null); }}
                  >
                    {DURATION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{t(d.key, d.fallback)}</option>)}
                  </select>
                  {selectedPromoId && (
                    <p className="text-[10px] text-cyan-300">{t("rental.packageFlatRateNote", "Paket dipilih — harga flat otomatis diterapkan saat sesi selesai (bukan per-jam).")}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-wide text-neutral-500">{t("rental.customerLabel", "Customer")}</label>
                    <div className="flex rounded-lg border border-white/10 overflow-hidden text-[10px]">
                      <button
                        type="button"
                        className={`px-2.5 py-1 ${customerMode === "non_member" ? "bg-cyan-500/20 text-cyan-300" : "text-neutral-400 hover:bg-white/5"}`}
                        onClick={() => { setCustomerMode("non_member"); setSelectedCustomerId(null); setCustomerQuery(""); setCustomerResults([]); }}
                      >
                        {t("rental.nonMember", "Non-Member")}
                      </button>
                      <button
                        type="button"
                        className={`px-2.5 py-1 border-l border-white/10 ${customerMode === "member" ? "bg-cyan-500/20 text-cyan-300" : "text-neutral-400 hover:bg-white/5"}`}
                        onClick={() => { setCustomerMode("member"); setSelectedCustomerId(null); setCustomerName(""); setCustomerQuery(""); setCustomerResults([]); }}
                      >
                        {t("rental.member", "Member")}
                      </button>
                    </div>
                  </div>

                  {customerMode === "non_member" ? (
                    <input
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                      placeholder={t("rental.customerNamePlaceholder", "Nama pelanggan (walk-in)")}
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomerQuery(e.target.value);
                        setSelectedCustomerId(null);
                      }}
                    />
                  ) : (
                    <input
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                      placeholder={t("rental.memberCodePlaceholder", "Ketik kode member (No. Anggota)")}
                      value={selectedCustomerId ? customerName : customerQuery}
                      disabled={!!selectedCustomerId}
                      onChange={(e) => {
                        setCustomerQuery(e.target.value);
                        setSelectedCustomerId(null);
                      }}
                    />
                  )}

                  {selectedCustomerId ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                        <BadgeCheck size={11} /> {t("rental.memberRegisteredNote", "Member terdaftar — tarif & pendapatan otomatis pakai akun Member.")}
                        <button type="button" className="text-neutral-500 underline ml-1" onClick={() => { setSelectedCustomerId(null); if (customerMode === "member") setCustomerQuery(""); }}>{t("rental.unlink", "Lepas")}</button>
                      </div>
                      {customerMode === "member" && (
                        <a
                          href={`/dashboard/membership?customerId=${selectedCustomerId}`}
                          className="inline-flex items-center gap-1 text-[10px] text-cyan-300 underline hover:text-cyan-200"
                        >
                          {t("rental.viewMemberHistory", "Lihat histori transaksi member →")}
                        </a>
                      )}
                    </div>
                  ) : customerResults.length > 0 ? (
                    <div className="rounded-lg border border-white/10 bg-[#0a1020] max-h-32 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-white/5 flex items-center justify-between gap-2"
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            setCustomerName(c.name || "");
                            setCustomerQuery("");
                            setCustomerResults([]);
                          }}
                        >
                          <span className="truncate">
                            {c.name || t("rental.noNameParen", "(tanpa nama)")} <span className="text-neutral-500">{customerMode === "member" ? c.memberNumber : c.phone}</span>
                          </span>
                          {c.membershipTierId && <span className="shrink-0 text-[9px] text-cyan-300 border border-cyan-400/30 rounded px-1 py-0.5">{t("rental.member", "Member")}</span>}
                        </button>
                      ))}
                    </div>
                  ) : customerMode === "member" && customerQuery.trim() ? (
                    <p className="text-[10px] text-neutral-500">{t("rental.memberNotFound", "Tidak ditemukan member dengan kode tersebut.")}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wide text-neutral-500">{t("rental.gameLabel", "Main Game Apa?")}</label>
                  <input
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                    placeholder={t("rental.optionalPlaceholder", "Opsional")}
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                  />
                </div>

                <div className="rounded-lg border border-white/10 px-3 py-2 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-300">
                    <input
                      type="checkbox"
                      checked={collectPrepay}
                      onChange={(e) => {
                        setCollectPrepay(e.target.checked);
                        if (e.target.checked) setPrepayAmount(suggestedPrepay);
                      }}
                    />
                    {t("rental.prepayCheckbox", "Customer Bayar Dimuka (DP)")}
                  </label>
                  {collectPrepay && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        className="w-28 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs"
                        placeholder={t("rental.prepayAmountPlaceholder", "Jumlah DP")}
                        value={prepayAmount || ""}
                        onChange={(e) => setPrepayAmount(Number(e.target.value))}
                      />
                      <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
                        <button
                          type="button"
                          className={`px-3 py-1.5 ${prepayMethod === "cash" ? "bg-cyan-500/20 text-cyan-300" : "text-neutral-400 hover:bg-white/5"}`}
                          onClick={() => setPrepayMethod("cash")}
                        >
                          {t("rental.cash", "Cash")}
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 border-l border-white/10 ${prepayMethod === "qris" ? "bg-cyan-500/20 text-cyan-300" : "text-neutral-400 hover:bg-white/5"}`}
                          onClick={() => setPrepayMethod("qris")}
                        >
                          QRIS
                        </button>
                      </div>
                    </div>
                  )}
                  {collectPrepay && suggestedPrepay > 0 && prepayAmount !== suggestedPrepay && (
                    <p className="text-[10px] text-neutral-500">{t("rental.prepayEstimateNote", "Estimasi dari paket/durasi: {amount}").replace("{amount}", rupiah(suggestedPrepay))}</p>
                  )}
                </div>

                <Button className="w-full flex items-center justify-center gap-2 py-2.5 gm-heading tracking-wide" onClick={() => start(selectedUnit.id)}>
                  <Play size={16} /> {t("rental.startSessionButton", "MULAI SESI")}
                </Button>
              </>
            )}

            {!selectedUnit && availableUnits.length === 0 && (
              <div className="text-xs text-neutral-500 text-center py-2">{t("rental.allStationsBusy", "Semua stasiun sedang terpakai.")}</div>
            )}
          </Card>

          <Card className="space-y-2">
            <h2 className="gm-heading font-semibold flex items-center gap-2 text-sm"><History size={14} className="text-purple-300" /> {t("rental.recentTransactionsHeading", "Riwayat Transaksi Terakhir")}</h2>
            <div className="space-y-1.5">
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs border-b border-white/5 pb-1.5 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-neutral-300">{new Date(o.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</div>
                    <div className="text-[10px] text-neutral-500">{o.rentalSessionId ? t("rental.rentalLabel", "Rental") : t("rental.posLabel", "POS")}</div>
                  </div>
                  <span className="font-medium text-cyan-300">{rupiah(o.total)}</span>
                </div>
              ))}
              {recentOrders.length === 0 && <div className="text-xs text-neutral-600 text-center py-2">{t("rental.noTransactionsYet", "Belum ada transaksi.")}</div>}
            </div>
          </Card>
        </div>
      </div>

      <Card className="space-y-3">
        <h2 className="gm-heading font-semibold flex items-center gap-2 text-sm"><Activity size={14} className="text-cyan-300" /> {t("rental.activityDashboardHeading", "Dashboard Aktivitas — Transaksi per Jam (30 Hari Terakhir)")}</h2>
        <RentalActivityChart data={busyHours} t={t} />
      </Card>
    </div>
  );
}
