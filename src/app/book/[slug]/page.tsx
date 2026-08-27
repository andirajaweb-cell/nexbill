"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { showAlert } from "@/lib/ui/dialog";

const CONSOLE_LABEL: Record<string, string> = {
  ps2: "PS2", ps3: "PS3", ps4: "PS4", ps4_pro: "PS4 Pro", ps5: "PS5", ps5_slim: "PS5 Slim",
};
const DURATION_OPTIONS = [
  { minutes: 60, label: "1 jam" },
  { minutes: 120, label: "2 jam" },
  { minutes: 180, label: "3 jam" },
  { minutes: 240, label: "4 jam" },
  { minutes: 360, label: "6 jam" },
];
const TIMELINE_HOURS = 12;
const SEGMENT_MINUTES = 30;
const SEGMENT_COUNT = (TIMELINE_HOURS * 60) / SEGMENT_MINUTES;

type Outlet = { id: string; name: string; address: string | null; phone: string | null; logoUrl: string | null; acceptOnlineBooking: boolean; bookingMinLeadMinutes: number };
type Unit = { id: string; name: string; consoleType: string; tvType: string | null; hourlyRate: number; status: "available" | "occupied" | "maintenance"; remainingMinutes: number | null; nextBookingAt: string | null };
type BusyBlock = { start: string; end: string; kind: "session" | "booking"; label: string; openEnded?: boolean };
type TimelineUnit = { id: string; name: string; consoleType: string; status: string; busyBlocks: BusyBlock[] };
type TimelineData = { windowStart: string; windowEnd: string; units: TimelineUnit[]; floatingBookings: { consoleType: string; scheduledStart: string; scheduledEnd: string; status: string }[] };
type BannerSlide = { id: string; imageUrl: string; linkUrl: string | null; title: string | null };

/** Small brand-accurate WhatsApp glyph — lucide-react only ships generic icons, not brand marks, so this is an inline SVG rather than a new dependency for one icon. */
function WhatsAppIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.657 4.527 1.797 6.39L4 29l7.86-1.75A11.93 11.93 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75a9.7 9.7 0 0 1-4.95-1.36l-.355-.21-4.664 1.04 1.02-4.55-.232-.37A9.7 9.7 0 0 1 5.25 15c0-5.93 4.82-10.75 10.754-10.75S26.75 9.07 26.75 15 21.938 24.75 16.004 24.75Zm5.62-7.77c-.307-.154-1.817-.897-2.1-1-.283-.103-.489-.154-.695.154-.205.308-.797 1-.977 1.205-.18.205-.36.23-.667.077-.307-.154-1.296-.478-2.47-1.524-.913-.814-1.53-1.82-1.71-2.128-.18-.308-.02-.474.135-.627.138-.138.307-.36.46-.54.154-.18.205-.308.308-.513.103-.205.051-.385-.026-.539-.077-.154-.695-1.677-.953-2.296-.25-.6-.505-.52-.695-.53l-.593-.01c-.205 0-.539.077-.82.385-.283.308-1.08 1.056-1.08 2.578s1.106 2.99 1.26 3.196c.154.205 2.176 3.322 5.27 4.658.736.318 1.31.508 1.758.65.738.235 1.41.202 1.94.123.592-.088 1.817-.743 2.073-1.46.256-.717.256-1.332.18-1.46-.077-.128-.283-.205-.59-.36Z" />
    </svg>
  );
}

/**
 * Auto-looping ad/promo banner slideshow — managed from the dashboard (Pengaturan > Banner
 * Iklan), fetched via /api/public/banners. Advances every 5s and wraps back to the first
 * slide (true loop, not a "reset to start" that pauses at the end). Renders nothing if there
 * are no active banners, so an outlet that hasn't set any up sees no empty gap on the page.
 */
function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section>
      <div className="relative rounded-xl border border-blue-500/15 bg-[#0d1526]/80 backdrop-blur-md overflow-hidden shadow-[0_0_0_1px_rgba(59,130,246,0.06),0_8px_24px_-8px_rgba(0,0,0,0.7)]">
        <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((s) => {
            const img = <img src={s.imageUrl} alt={s.title ?? "Banner"} className="w-full aspect-[16/5] sm:aspect-[21/6] object-cover shrink-0 grow-0 basis-full" />;
            return s.linkUrl ? (
              <a key={s.id} href={s.linkUrl} target="_blank" rel="noreferrer" className="shrink-0 grow-0 basis-full">
                {img}
              </a>
            ) : (
              <div key={s.id} className="shrink-0 grow-0 basis-full">
                {img}
              </div>
            );
          })}
        </div>
        {slides.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-blue-400" : "w-1.5 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const rupiah = (n: number) => `Rp${Math.round(n ?? 0).toLocaleString("id-ID")}`;
const fmtRemaining = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} jam ${min % 60 ? `${min % 60} mnt` : ""}`.trim() : `${min} mnt`);

function toLocalDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Segment status for one unit's timeline bar: busy kind wins over free; "sel" marks overlap with the customer's currently-selected slot. */
function computeSegments(windowStart: string, unit: TimelineUnit, selStart: Date | null, selEnd: Date | null, highlightUnit: boolean) {
  const winStartMs = new Date(windowStart).getTime();
  const segments: { status: "maintenance" | "busy-session" | "busy-booking" | "free"; label: string; selected: boolean }[] = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const segStart = winStartMs + i * SEGMENT_MINUTES * 60000;
    const segEnd = segStart + SEGMENT_MINUTES * 60000;
    let status: "maintenance" | "busy-session" | "busy-booking" | "free" = "free";
    let label = "Tersedia";
    if (unit.status === "maintenance") {
      status = "maintenance";
      label = "Maintenance";
    } else {
      for (const b of unit.busyBlocks) {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        if (segStart < be && bs < segEnd) {
          status = b.kind === "session" ? "busy-session" : "busy-booking";
          label = b.label;
          break;
        }
      }
    }
    const selected = highlightUnit && !!selStart && !!selEnd && segStart < selEnd.getTime() && selStart.getTime() < segEnd;
    segments.push({ status, label, selected });
  }
  return segments;
}

const SEGMENT_COLOR: Record<string, string> = {
  free: "bg-emerald-400/80",
  "busy-session": "bg-amber-400/80",
  "busy-booking": "bg-sky-400/80",
  maintenance: "bg-neutral-600",
};

type Segment = { status: "maintenance" | "busy-session" | "busy-booking" | "free"; label: string; selected: boolean };

/**
 * A "unit apa saja" (any-console-type) booking has no rentalUnitId, so computeSegments alone
 * can't draw it anywhere — it doesn't know which physical unit will end up serving it. This
 * takes a second pass over the already-computed per-unit segment grid and, for each 30-min
 * slot, turns exactly as many still-"free" segments of the matching console type blue as there
 * are overlapping floating bookings for that slot — an approximation ("this many units of this
 * type are spoken for right now, could be any of these"), not a guarantee of which unit. Skips
 * maintenance units (never repurposed for a floating booking) and never overwrites a slot
 * that's already busy from a real session/pinned booking. Mutates and returns `bySegment`.
 */
function distributeFloatingBookings(timeline: TimelineData, bySegment: Record<string, Segment[]>) {
  const winStartMs = new Date(timeline.windowStart).getTime();
  const unitsByConsole = new Map<string, TimelineUnit[]>();
  for (const u of timeline.units) {
    if (!unitsByConsole.has(u.consoleType)) unitsByConsole.set(u.consoleType, []);
    unitsByConsole.get(u.consoleType)!.push(u);
  }

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const segStart = winStartMs + i * SEGMENT_MINUTES * 60000;
    const segEnd = segStart + SEGMENT_MINUTES * 60000;

    const demandByConsole = new Map<string, number>();
    for (const fb of timeline.floatingBookings) {
      const fs = new Date(fb.scheduledStart).getTime();
      const fe = new Date(fb.scheduledEnd).getTime();
      if (segStart < fe && fs < segEnd) demandByConsole.set(fb.consoleType, (demandByConsole.get(fb.consoleType) ?? 0) + 1);
    }

    for (const [consoleType, demand] of demandByConsole) {
      let remaining = demand;
      for (const u of unitsByConsole.get(consoleType) ?? []) {
        if (remaining <= 0) break;
        const seg = bySegment[u.id]?.[i];
        if (seg && seg.status === "free") {
          seg.status = "busy-booking";
          seg.label = "Dibooking (tipe konsol, unit belum ditentukan)";
          remaining--;
        }
      }
    }
  }
  return bySegment;
}

/**
 * Given the same 12-hour timeline the grid renders, finds the earliest few start times (up to
 * `maxSuggestions`) where the requested duration fits with zero conflict — for the exact unit
 * (Unit Spesifik) or any unit of the chosen console type (Tipe Konsol, matching a free unit
 * anywhere in that type). Powers the "jam tersedia terdekat" suggestions shown once a picked
 * slot is blocked, so a customer doesn't have to guess-and-check by hand.
 */
function findSuggestedSlots(
  timeline: TimelineData,
  pickMode: "unit" | "console",
  rentalUnitId: string,
  consoleType: string,
  durationMinutes: number,
  minLeadMinutes: number,
  maxSuggestions = 4
): Date[] {
  const winStartMs = new Date(timeline.windowStart).getTime();
  const segmentsNeeded = Math.max(1, Math.ceil(durationMinutes / SEGMENT_MINUTES));
  const earliestMs = Date.now() + minLeadMinutes * 60000;

  const candidateUnits = timeline.units.filter(
    (u) => u.status !== "maintenance" && (pickMode === "unit" ? u.id === rentalUnitId : u.consoleType === consoleType)
  );
  if (candidateUnits.length === 0) return [];

  const bySegment: Record<string, Segment[]> = {};
  for (const u of timeline.units) bySegment[u.id] = computeSegments(timeline.windowStart, u, null, null, false);
  distributeFloatingBookings(timeline, bySegment);

  const found = new Set<number>();
  for (const u of candidateUnits) {
    const segs = bySegment[u.id];
    for (let i = 0; i + segmentsNeeded <= SEGMENT_COUNT; i++) {
      const segStartMs = winStartMs + i * SEGMENT_MINUTES * 60000;
      if (segStartMs < earliestMs) continue;
      let allFree = true;
      for (let k = i; k < i + segmentsNeeded; k++) {
        if (segs[k].status !== "free") { allFree = false; break; }
      }
      if (allFree) found.add(segStartMs);
    }
  }

  return [...found].sort((a, b) => a - b).slice(0, maxSuggestions).map((ms) => new Date(ms));
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickMode, setPickMode] = useState<"unit" | "console">("console");
  const [rentalUnitId, setRentalUnitId] = useState("");
  const [consoleType, setConsoleType] = useState("");
  const [start, setStart] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 60 * 60000)));
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [notes, setNotes] = useState("");
  const website = useRef(""); // honeypot — never rendered as a visible field

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bookingCode: string; status: string; waitlistPosition: number | null; scheduledStart: string } | null>(null);

  const [checking, setChecking] = useState(false);
  const [availableVerdict, setAvailableVerdict] = useState<boolean | null>(null);

  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [banners, setBanners] = useState<BannerSlide[] | null>(null);

  const loadAvailability = useCallback((outletId: string) => {
    fetch(`/api/public/rental-units?outletId=${outletId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setUnits(data); })
      .catch(() => {});
    fetch(`/api/public/availability-timeline?outletId=${outletId}&hours=${TIMELINE_HOURS}`)
      .then((r) => r.json())
      .then((data) => { if (data.units) setTimeline(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/public/outlet-info?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); return; }
        setOutlet(data);
        loadAvailability(data.id);
        fetch(`/api/public/banners?outletId=${data.id}`)
          .then((r) => r.json())
          .then((rows) => { if (Array.isArray(rows)) setBanners(rows); })
          .catch(() => {});
      })
      .catch(() => setLoadError("Gagal memuat data outlet. Coba refresh halaman."));
  }, [slug, loadAvailability]);

  useEffect(() => {
    if (!outlet) return;
    const interval = setInterval(() => loadAvailability(outlet.id), 25000);
    return () => clearInterval(interval);
  }, [outlet, loadAvailability]);

  const availableConsoleTypes = units ? [...new Set(units.filter((u) => u.status !== "maintenance").map((u) => u.consoleType))] : [];

  // Live "Tersedia / Bentrok" check as the customer picks a slot — debounced, and uses the
  // exact same conflict logic the real booking submission does (see check-availability route).
  useEffect(() => {
    if (!outlet || !start || !durationMinutes) { setAvailableVerdict(null); return; }
    if (pickMode === "unit" && !rentalUnitId) { setAvailableVerdict(null); return; }
    if (pickMode === "console" && !consoleType) { setAvailableVerdict(null); return; }

    const scheduledStart = new Date(start);
    if (Number.isNaN(scheduledStart.getTime())) { setAvailableVerdict(null); return; }
    const scheduledEnd = new Date(scheduledStart.getTime() + durationMinutes * 60000);

    setChecking(true);
    const timeout = setTimeout(() => {
      fetch("/api/public/check-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: outlet.id,
          rentalUnitId: pickMode === "unit" ? rentalUnitId : null,
          consoleType: pickMode === "console" ? consoleType : null,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
        }),
      })
        .then((r) => r.json())
        .then((data) => setAvailableVerdict(typeof data.available === "boolean" ? data.available : null))
        .catch(() => setAvailableVerdict(null))
        .finally(() => setChecking(false));
    }, 400);
    return () => { clearTimeout(timeout); setChecking(false); };
  }, [outlet, pickMode, rentalUnitId, consoleType, start, durationMinutes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outlet) return;
    // Belt-and-suspenders: the submit button is already disabled while availableVerdict is
    // false, but a <form> still fires onSubmit if the customer hits Enter in a text field, so
    // this guard is what actually blocks the request from ever reaching the server.
    if (availableVerdict === false) {
      showAlert("Jam yang kamu pilih sudah terisi (sedang dipakai atau sudah dibooking). Pilih salah satu jam yang tersedia di atas, lalu submit ulang.", { title: "Jam Tidak Tersedia", tone: "danger" });
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const scheduledStart = new Date(start).toISOString();
      const scheduledEnd = new Date(new Date(start).getTime() + durationMinutes * 60000).toISOString();
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: outlet.id,
          name,
          phone,
          rentalUnitId: pickMode === "unit" ? rentalUnitId : null,
          consoleType: pickMode === "console" ? consoleType : null,
          scheduledStart,
          scheduledEnd,
          notes,
          website: website.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? "Gagal membuat booking."); return; }
      setResult(data);
      loadAvailability(outlet.id);
    } catch {
      setSubmitError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!outlet || !lookupCode.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const res = await fetch(`/api/public/bookings/${encodeURIComponent(lookupCode.trim())}?outletId=${outlet.id}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error ?? "Booking tidak ditemukan."); return; }
      setLookupResult(data);
    } catch {
      setLookupError("Gagal terhubung ke server.");
    } finally {
      setLookupLoading(false);
    }
  }

  const pageShell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb] relative isolate">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{
        background:
          "radial-gradient(600px circle at 10% 8%, rgba(59,130,246,0.12), transparent 60%)," +
          "radial-gradient(700px circle at 92% 12%, rgba(56,189,248,0.08), transparent 60%)," +
          "linear-gradient(180deg, #050810 0%, #0a1020 100%)",
      }} />
      {content}
    </div>
  );

  if (loadError) {
    return pageShell(<div className="min-h-screen flex items-center justify-center text-[#93a2c4] px-4 text-center">{loadError}</div>);
  }
  if (!outlet) {
    return pageShell(<div className="min-h-screen flex items-center justify-center text-[#93a2c4] font-medium">Memuat...</div>);
  }

  const GM_STATUS: Record<string, { label: string; className: string }> = {
    available: { label: "Tersedia", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
    occupied: { label: "Terpakai", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
    maintenance: { label: "Maintenance", className: "bg-white/5 text-neutral-400 border-white/10" },
  };
  const statusLabelFor = (code: string) => GM_STATUS[code] ?? GM_STATUS.maintenance;
  const selStart = start && !Number.isNaN(new Date(start).getTime()) ? new Date(start) : null;
  const selEnd = selStart ? new Date(selStart.getTime() + durationMinutes * 60000) : null;
  const inputCls = "w-full rounded-lg bg-[#0a1020] border border-blue-500/15 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/30";
  const titleCls = "text-lg font-bold bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent";
  const cardCls = "rounded-xl border border-blue-500/15 bg-[#0d1526]/80 backdrop-blur-md shadow-[0_0_0_1px_rgba(59,130,246,0.06),0_8px_24px_-8px_rgba(0,0,0,0.7)]";

  // Only computed once the picked slot is actually blocked — feeds the "jam tersedia terdekat" chips.
  const suggestedSlots =
    availableVerdict === false && timeline && (pickMode === "unit" ? rentalUnitId : consoleType)
      ? findSuggestedSlots(timeline, pickMode, rentalUnitId, consoleType, durationMinutes, outlet.bookingMinLeadMinutes)
      : [];
  const applySuggestedSlot = (d: Date) => setStart(toLocalDateTimeValue(d));

  return pageShell(
    <div className="text-neutral-100">
      <header className="bg-[#0a1020]/90 backdrop-blur-md border-b border-blue-500/15 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          {/* Business logo — pulled straight from Pengaturan > Business & Tax (outlet.logoUrl via
              /api/public/outlet-info). Falls back to an initial badge so the header still reads
              as "the business's logo slot" even before an owner uploads one. */}
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden border border-blue-500/15 shrink-0 shadow-[0_0_16px_-4px_rgba(59,130,246,0.45)] bg-[#0d1526] flex items-center justify-center">
            {outlet.logoUrl ? (
              <img src={outlet.logoUrl} alt={outlet.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold text-xl bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">{outlet.name.trim().charAt(0).toUpperCase() || "?"}</span>
            )}
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-wide">{outlet.name}</h1>
            {outlet.address && <p className="text-xs text-[#93a2c4]">{outlet.address}</p>}
          </div>
          {outlet.phone && (
            <a
              href={`https://wa.me/${outlet.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto flex items-center gap-1.5 text-sm text-blue-300 font-medium hover:text-blue-200"
            >
              <WhatsAppIcon size={18} className="text-emerald-400" />
              Hubungi via WA
            </a>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <section>
          <h2 className={`${titleCls} mb-3`}>Status Unit PlayStation</h2>
          {!units ? (
            <p className="text-sm text-[#93a2c4]">Memuat status unit...</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {units.map((u) => {
                const s = statusLabelFor(u.status);
                return (
                  <div key={u.id} className={`${cardCls} p-3 space-y-1`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-neutral-100">{u.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${s.className}`}>{s.label}</span>
                    </div>
                    <div className="text-xs text-[#93a2c4]">{CONSOLE_LABEL[u.consoleType] ?? u.consoleType}{u.tvType ? ` · ${u.tvType}` : ""}</div>
                    <div className="text-xs text-[#93a2c4]">{rupiah(u.hourlyRate)}/jam</div>
                    {u.status === "occupied" && u.remainingMinutes !== null && (
                      <div className="text-xs font-medium text-amber-300">Sisa ~{fmtRemaining(u.remainingMinutes)}</div>
                    )}
                    {u.status === "available" && u.nextBookingAt && (
                      <div className="text-[11px] text-[#93a2c4]">Dibooking mulai {new Date(u.nextBookingAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className={titleCls}>Peta Ketersediaan Live ({TIMELINE_HOURS} Jam ke Depan)</h2>
            <div className="flex items-center gap-3 text-[11px] text-[#93a2c4]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/80 inline-block" /> Tersedia</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80 inline-block" /> Sedang main</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400/80 inline-block" /> Dibooking</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-neutral-600 inline-block" /> Maintenance</span>
            </div>
          </div>
          {!timeline ? (
            <p className="text-sm text-[#93a2c4]">Memuat peta ketersediaan...</p>
          ) : (
            <div className={`${cardCls} p-4 space-y-3 overflow-x-auto`}>
              <div className="min-w-[640px] space-y-2">
                {(() => {
                  // Two passes: first the normal per-unit segments (session/pinned-booking/maintenance),
                  // then distributeFloatingBookings() overlays "unit apa saja" bookings onto free
                  // segments of the matching console type — see that function's comment for why.
                  const bySegment: Record<string, Segment[]> = {};
                  for (const u of timeline.units) {
                    const highlightUnit = pickMode === "unit" ? u.id === rentalUnitId : u.consoleType === consoleType;
                    bySegment[u.id] = computeSegments(timeline.windowStart, u, selStart, selEnd, !!(highlightUnit && (rentalUnitId || consoleType)));
                  }
                  distributeFloatingBookings(timeline, bySegment);
                  return timeline.units.map((u) => {
                  const segments = bySegment[u.id];
                  return (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="w-28 shrink-0 text-xs">
                        <div className="font-medium text-neutral-200">{u.name}</div>
                        <div className="text-[#93a2c4]">{CONSOLE_LABEL[u.consoleType] ?? u.consoleType}</div>
                      </div>
                      <div className="flex-1 flex gap-[2px]">
                        {segments.map((seg, i) => (
                          <div
                            key={i}
                            title={seg.label}
                            className={`h-5 flex-1 rounded-[2px] ${SEGMENT_COLOR[seg.status]} ${seg.selected ? "ring-2 ring-offset-1 ring-offset-[#0d1526] ring-blue-300" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                  });
                })()}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-28 shrink-0" />
                  <div className="flex-1 flex gap-[2px] text-[10px] text-[#93a2c4]">
                    {Array.from({ length: SEGMENT_COUNT }).map((_, i) => (
                      <div key={i} className="flex-1 text-center">
                        {i % 2 === 0 ? new Date(new Date(timeline.windowStart).getTime() + i * SEGMENT_MINUTES * 60000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {timeline.floatingBookings.length > 0 && (
                <p className="text-[11px] text-[#93a2c4] border-t border-blue-500/15 pt-2">
                  Catatan: ada {timeline.floatingBookings.length} booking tipe konsol "unit apa saja" dalam {TIMELINE_HOURS} jam ke depan yang belum ditentukan unit fisiknya — kotak biru di atas jadi perkiraan (unit mana persisnya baru pasti saat check-in), bukan reservasi pasti ke unit tertentu.
                </p>
              )}
              <p className="text-[11px] text-[#93a2c4]">Kotak dengan garis tebal biru = jam yang sedang kamu pilih di form booking di bawah.</p>
            </div>
          )}
        </section>

        {outlet.acceptOnlineBooking ? (
          <section className={`${cardCls} p-4`}>
            <h2 className={`${titleCls} mb-3`}>Booking Sekarang</h2>
            {result ? (
              <div className="space-y-2 text-sm">
                <div className="text-emerald-300 font-medium">Booking berhasil dibuat!</div>
                <div>Kode booking: <span className="font-mono font-semibold text-blue-300">{result.bookingCode}</span></div>
                <div>
                  Status: {result.status === "confirmed" && "Terkonfirmasi ✅"}
                  {result.status === "pending" && "Menunggu konfirmasi staf"}
                  {result.status === "waitlisted" && `Waiting list posisi #${result.waitlistPosition}`}
                </div>
                <div className="text-[#93a2c4]">Jadwal: {new Date(result.scheduledStart).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</div>
                <p className="text-xs text-[#93a2c4]">Simpan kode ini untuk cek status atau tunjukkan ke kasir saat datang. Konfirmasi juga dikirim ke WhatsApp kamu.</p>
                <button onClick={() => setResult(null)} className="text-xs text-blue-300 underline mt-2 hover:text-blue-200">Buat booking lain</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* honeypot — hidden from real users via CSS, bots that fill every field will trip it */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" onChange={(e) => (website.current = e.target.value)} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#93a2c4] mb-1">Nama</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-[#93a2c4] mb-1">Nomor WhatsApp</label>
                    <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#93a2c4] mb-1">Pilih</label>
                  <div className="flex gap-2 mb-2">
                    <button type="button" onClick={() => setPickMode("console")} className={`text-xs px-3 py-1.5 rounded-lg border ${pickMode === "console" ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-transparent font-medium shadow-[0_0_12px_-2px_rgba(59,130,246,0.6)]" : "border-blue-500/15 text-[#93a2c4] hover:border-blue-400/40"}`}>Tipe Konsol (unit apa saja)</button>
                    <button type="button" onClick={() => setPickMode("unit")} className={`text-xs px-3 py-1.5 rounded-lg border ${pickMode === "unit" ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-transparent font-medium shadow-[0_0_12px_-2px_rgba(59,130,246,0.6)]" : "border-blue-500/15 text-[#93a2c4] hover:border-blue-400/40"}`}>Unit Spesifik</button>
                  </div>
                  {pickMode === "console" ? (
                    <select required value={consoleType} onChange={(e) => setConsoleType(e.target.value)} className={inputCls}>
                      <option value="">Pilih tipe konsol</option>
                      {availableConsoleTypes.map((c) => <option key={c} value={c}>{CONSOLE_LABEL[c] ?? c}</option>)}
                    </select>
                  ) : (
                    <select required value={rentalUnitId} onChange={(e) => setRentalUnitId(e.target.value)} className={inputCls}>
                      <option value="">Pilih unit</option>
                      {(units ?? []).filter((u) => u.status !== "maintenance").map((u) => (
                        <option key={u.id} value={u.id}>{u.name} — {CONSOLE_LABEL[u.consoleType] ?? u.consoleType}{u.status === "occupied" ? " (sedang terpakai)" : ""}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#93a2c4] mb-1">Tanggal &amp; Jam Mulai</label>
                    <input required type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-[#93a2c4] mb-1">Durasi</label>
                    <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={inputCls}>
                      {DURATION_OPTIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
                    </select>
                  </div>
                </div>

                {(pickMode === "unit" ? rentalUnitId : consoleType) && (
                  <div className="text-sm">
                    {checking ? (
                      <span className="text-[#93a2c4]">Mengecek ketersediaan slot...</span>
                    ) : availableVerdict === true ? (
                      <span className="text-emerald-300 font-medium">✅ Slot ini tersedia.</span>
                    ) : availableVerdict === false ? (
                      <div className="space-y-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                        <span className="text-rose-300 font-medium block">⚠️ Jam ini sudah terisi (sedang bermain atau sudah dibooking) — pilih jam lain untuk lanjut booking.</span>
                        {suggestedSlots.length > 0 ? (
                          <div className="space-y-1.5">
                            <p className="text-xs text-neutral-400">Jam tersedia terdekat:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {suggestedSlots.map((d) => (
                                <button
                                  key={d.toISOString()}
                                  type="button"
                                  onClick={() => applySuggestedSlot(d)}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-blue-400/40 text-blue-300 hover:bg-blue-500/10"
                                >
                                  {d.toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#93a2c4]">Belum ada slot kosong dalam {TIMELINE_HOURS} jam ke depan untuk pilihan ini — coba unit/tipe lain, durasi lebih pendek, atau hubungi kami langsung.</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {outlet.bookingMinLeadMinutes > 0 && (
                  <p className="text-xs text-[#93a2c4]">Booking online minimal {outlet.bookingMinLeadMinutes} menit sebelum waktu mulai.</p>
                )}

                <div>
                  <label className="block text-xs text-[#93a2c4] mb-1">Catatan (opsional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
                </div>

                {submitError && <p className="text-sm text-rose-400">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting || availableVerdict === false}
                  title={availableVerdict === false ? "Jam ini sudah terisi — pilih salah satu jam yang tersedia di atas dulu." : undefined}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 text-white text-sm font-semibold shadow-[0_0_16px_-2px_rgba(59,130,246,0.6)] hover:shadow-[0_0_20px_-2px_rgba(59,130,246,0.8)] disabled:opacity-50 transition"
                >
                  {submitting ? "Memproses..." : availableVerdict === false ? "Jam Tidak Tersedia" : "Booking Sekarang"}
                </button>
              </form>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
            Booking online sedang tidak dibuka. Silakan hubungi kami langsung{outlet.phone ? ` di ${outlet.phone}` : ""} untuk reservasi.
          </section>
        )}

        {banners && banners.length > 0 && <BannerCarousel slides={banners} />}

        <section className={`${cardCls} p-4`}>
          <h2 className={`${titleCls} mb-3`}>Cek Status Booking</h2>
          <form onSubmit={handleLookup} className="flex gap-2 mb-3">
            <input value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} placeholder="Kode booking, mis. BK-00001" className={`flex-1 ${inputCls}`} />
            <button type="submit" disabled={lookupLoading} className="px-4 py-2 rounded-lg border border-blue-500/15 text-neutral-200 text-sm font-medium hover:border-blue-400/50 disabled:opacity-50">Cek</button>
          </form>
          {lookupError && <p className="text-sm text-rose-400">{lookupError}</p>}
          {lookupResult && (
            <div className="text-sm space-y-1 bg-[#0a1020] border border-blue-500/15 rounded-lg p-3">
              <div>Kode: <span className="font-mono font-semibold text-blue-300">{lookupResult.bookingCode}</span></div>
              <div>Nama: {lookupResult.customerName ?? "-"}</div>
              <div>Status: {lookupResult.status}</div>
              <div>Jadwal: {new Date(lookupResult.scheduledStart).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</div>
              {lookupResult.unitName && <div>Unit: {lookupResult.unitName}</div>}
              {lookupResult.waitlistPosition && <div>Posisi waiting list: #{lookupResult.waitlistPosition}</div>}
              {lookupResult.cancelReason && <div>Alasan batal: {lookupResult.cancelReason}</div>}
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-[#566485]">
        &copy; {new Date().getFullYear()} &mdash; Dibuat oleh{" "}
        <a href="http://www.digitrajasa.web.id" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
          Digitrajasa
        </a>
      </footer>
    </div>
  );
}
