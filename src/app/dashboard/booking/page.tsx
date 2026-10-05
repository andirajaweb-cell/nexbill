"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarRange, List, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { showAlert, showConfirm, showPrompt } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-booking";
import { BookingMap, toLocalYmd } from "./BookingMap";
import { OPEN_BOOKING_EVENT, BOOKINGS_CHANGED_EVENT } from "@/lib/rental/booking-events";

interface Booking {
  id: string;
  bookingCode: string | null;
  rentalUnitId: string | null;
  consoleType: string | null;
  customerName: string | null;
  phone: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  status: string;
  dpAmount: number;
  waitlistPosition: number | null;
  notes: string | null;
  cancelReason: string | null;
  source: "kasir" | "online" | "whatsapp";
}

interface RentalUnit { id: string; name: string; consoleType: string; isActive?: boolean }

/** Date → nilai input datetime-local (waktu lokal browser). */
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;
const STATUS_BADGE: Record<string, string> = {
  pending: "pending", confirmed: "available", checked_in: "occupied",
  completed: "finished", cancelled: "failed", no_show: "failed", expired: "failed", waitlisted: "pending",
};
const SOURCE_CLASS: Record<string, string> = {
  kasir: "bg-neutral-800 text-neutral-400 border-neutral-700",
  online: "bg-sky-950 text-sky-400 border-sky-800",
  whatsapp: "bg-emerald-950 text-emerald-400 border-emerald-800",
};

export default function BookingPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const isAdmin = user?.role === "superuser" || user?.role === "owner";
  const STATUS_LABEL: Record<string, string> = {
    pending: t("booking.status.pending", "Pending"),
    confirmed: t("booking.status.confirmed", "Confirmed"),
    checked_in: t("booking.status.checkedIn", "Checked-in"),
    completed: t("booking.status.completed", "Completed"),
    cancelled: t("booking.status.cancelled", "Cancelled"),
    no_show: t("booking.status.noShow", "No-show"),
    expired: t("booking.status.expired", "Expired"),
    waitlisted: t("booking.status.waitlisted", "Waiting List"),
  };
  const SOURCE_LABEL: Record<string, string> = {
    kasir: t("booking.source.kasir", "Kasir"),
    online: t("booking.source.online", "Online"),
    whatsapp: t("booking.source.whatsapp", "WhatsApp"),
  };
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [form, setForm] = useState({
    rentalUnitId: "", consoleType: "any", customerName: "", phone: "",
    scheduledStart: "", scheduledEnd: "", dpAmount: 0, notes: "",
  });
  const [lookupCode, setLookupCode] = useState("");
  const [qrFor, setQrFor] = useState<{ bookingCode: string; qrDataUrl: string } | null>(null);
  const [transferFor, setTransferFor] = useState<{ id: string; unitId: string } | null>(null);

  const [view, setView] = useState<"map" | "list">("map");
  const [mapDate, setMapDate] = useState(() => toLocalYmd(new Date()));
  const [detailId, setDetailId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetchJsonArray("/api/bookings").then(setBookings);
    fetchJsonArray("/api/rental-units").then(setUnits);
  };
  useEffect(() => { load(); }, []);

  // Dibuka dari pop-up "Booking Baru" (?b=<id> atau event saat sudah di halaman ini).
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("b");
    if (fromQuery) setDetailId(fromQuery);
    const onOpen = (e: Event) => { setDetailId((e as CustomEvent<string>).detail); load(); };
    const onChanged = () => load();
    window.addEventListener(OPEN_BOOKING_EVENT, onOpen);
    window.addEventListener(BOOKINGS_CHANGED_EVENT, onChanged);
    return () => { window.removeEventListener(OPEN_BOOKING_EVENT, onOpen); window.removeEventListener(BOOKINGS_CHANGED_EVENT, onChanged); };
  }, []);
  const detail = detailId ? bookings.find((b) => b.id === detailId) ?? null : null;
  // Panel QR / Pindah Unit tampil di atas halaman — tutup modal detail supaya panelnya terlihat.
  useEffect(() => {
    if (!qrFor && !transferFor) return;
    setDetailId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [qrFor, transferFor]);
  // Pindahkan map ke tanggal booking yang dibuka supaya bloknya kelihatan.
  useEffect(() => {
    if (!detail) return;
    const s = new Date(detail.scheduledStart);
    const day = s.getHours() < 8 ? new Date(s.getFullYear(), s.getMonth(), s.getDate() - 1) : s;
    setMapDate(toLocalYmd(day));
  }, [detail?.id]);

  /** Klik slot kosong di map → isi form Booking Baru dengan unit & jam itu (durasi awal 1 jam). */
  const onSlotClick = (unitId: string | null, consoleType: string | null, start: Date) => {
    const end = new Date(start.getTime() + 3600_000);
    setForm((f) => ({ ...f, rentalUnitId: unitId ?? "", consoleType: unitId ? f.consoleType : consoleType ?? "any", scheduledStart: toLocalInput(start), scheduledEnd: toLocalInput(end) }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => nameRef.current?.focus(), 350);
  };

  const submit = async () => {
    if (!form.scheduledStart || !form.scheduledEnd) return showAlert(t("booking.alertFillSchedule", "Isi jadwal mulai & selesai."));
    const outlet = await (await fetch("/api/outlets/default")).json();
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId: outlet.id,
        rentalUnitId: form.rentalUnitId || null,
        consoleType: form.rentalUnitId ? null : form.consoleType,
        customerName: form.customerName,
        phone: form.phone,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: new Date(form.scheduledEnd).toISOString(),
        dpAmount: form.dpAmount,
        notes: form.notes,
      }),
    });
    const result = await res.json();
    if (!res.ok) return showAlert(result.error);
    if (result.waitlisted) showAlert(t("booking.alertWaitlisted", "Jadwal bentrok — booking {code} dimasukkan ke waiting list (#{position}).").replace("{code}", String(result.booking.bookingCode)).replace("{position}", String(result.booking.waitlistPosition)));
    setForm({ ...form, customerName: "", phone: "", scheduledStart: "", scheduledEnd: "", dpAmount: 0, notes: "" });
    load();
  };

  const action = async (id: string, path: string, body?: any) => {
    const res = await fetch(`/api/bookings/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  const lookupAndCheckIn = async () => {
    if (!lookupCode.trim()) return;
    const outlet = await (await fetch("/api/outlets/default")).json();
    const res = await fetch(`/api/bookings/lookup/${lookupCode.trim().toUpperCase()}?outletId=${outlet.id}`);
    const found = await res.json();
    if (!res.ok) return showAlert(found.error);
    await action(found.id, "check-in");
    setLookupCode("");
  };

  const showQr = async (id: string) => {
    const res = await fetch(`/api/bookings/${id}/qr`);
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setQrFor(data);
  };

  const submitTransfer = async () => {
    if (!transferFor?.unitId) return showAlert(t("booking.alertSelectDestUnit", "Pilih unit tujuan."));
    const reason = await showPrompt(t("booking.transferReasonPrompt", "Alasan pindah unit? (opsional)"), { multiline: true, confirmLabel: t("booking.transferButton", "Pindahkan") });
    if (reason === null) return; // Batal = tidak jadi pindah (dulu tetap dipindah walau prompt dibatalkan)
    await action(transferFor.id, "transfer", { rentalUnitId: transferFor.unitId, reason: reason || undefined });
    setTransferFor(null);
  };

  const renderActions = (b: Booking) => (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge status={STATUS_BADGE[b.status] ?? "unknown"}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
      {(b.status === "pending" || b.status === "waitlisted") && (
        <Button variant="secondary" className="text-xs" onClick={() => action(b.id, "confirm")}>{t("booking.confirmButton", "Konfirmasi")}</Button>
      )}
      {(b.status === "confirmed" || b.status === "pending") && (
        <Button className="text-xs" onClick={() => action(b.id, "check-in")}>{t("booking.checkInButton", "Check-in")}</Button>
      )}
      {b.bookingCode && ["pending", "confirmed"].includes(b.status) && (
        <Button variant="ghost" className="text-xs" onClick={() => showQr(b.id)}>{t("booking.qrButton", "QR")}</Button>
      )}
      {["pending", "confirmed"].includes(b.status) && (
        <Button variant="ghost" className="text-xs" onClick={() => setTransferFor({ id: b.id, unitId: "" })}>{t("booking.transferUnitTitle", "Pindah Unit")}</Button>
      )}
      {!["completed", "cancelled", "checked_in", "no_show", "expired"].includes(b.status) && (
        <>
          <Button variant="ghost" className="text-xs" onClick={() => action(b.id, "no-show")}>{t("booking.noShowButton", "No-show")}</Button>
          <Button variant="ghost" className="text-xs text-red-400" onClick={async () => {
              // Dulu: menekan "Cancel" di prompt bawaan browser TETAP membatalkan booking (tanpa alasan).
              const r = await showPrompt(t("booking.cancelBookingPrompt", "Alasan pembatalan?"), { tone: "danger", multiline: true, confirmLabel: t("booking.cancelButton", "Batal"), cancelLabel: t("booking.keepBooking", "Jangan batalkan") });
              if (r === null) return;
              action(b.id, "cancel", { reason: r || undefined });
            }}>{t("booking.cancelButton", "Batal")}</Button>
        </>
      )}
      {b.status === "no_show" && isAdmin && (
        <Button variant="ghost" className="text-xs text-amber-400" onClick={async () => { if (await showConfirm(t("booking.undoNoShowConfirm", "Batalkan status no-show untuk booking {code}? Status akan kembali ke \"Confirmed\".").replace("{code}", b.bookingCode ?? ""))) action(b.id, "undo-no-show"); }}>
          {t("booking.undoNoShowButton", "Batalkan No-show")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("booking.pageTitle", "Booking / Reservasi")}</h1>
        <p className="text-sm text-neutral-500">{t("booking.pageSubtitle", "DP opsional, deteksi bentrok otomatis (termasuk booking \"konsol apa saja\"), waiting list auto-promote, dan auto-release bila belum check-in.")}</p>
      </div>

      <Card className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-neutral-500">{t("booking.lookupLabel", "Cari Kode Booking (check-in cepat)")}</label>
          <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder="BK-00001" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupAndCheckIn()} />
        </div>
        <Button onClick={lookupAndCheckIn}>{t("booking.lookupButton", "Cari & Check-in")}</Button>
      </Card>

      <div ref={formRef}>
      <Card>
        <h2 className="font-medium mb-3">{t("booking.newBookingTitle", "Booking Baru")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input ref={nameRef} className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("booking.customerNamePlaceholder", "Nama pelanggan")}
            value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("booking.phonePlaceholder", "No. HP")}
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            value={form.rentalUnitId} onChange={(e) => setForm({ ...form, rentalUnitId: e.target.value })}>
            <option value="">{t("booking.anyUnitOption", "Unit apa saja (pilih jenis konsol)")}</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {!form.rentalUnitId && (
            <select className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
              value={form.consoleType} onChange={(e) => setForm({ ...form, consoleType: e.target.value })}>
              <option value="any">{t("booking.anyConsoleOption", "Konsol apa saja")}</option>
              <option value="ps3">PS3</option><option value="ps4">PS4</option><option value="ps5">PS5</option>
            </select>
          )}
          <input type="datetime-local" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} />
          <input type="datetime-local" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
            value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} />
          <input type="number" className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("booking.dpPlaceholder", "DP (opsional)")}
            value={form.dpAmount || ""} onChange={(e) => setForm({ ...form, dpAmount: Number(e.target.value) })} />
        </div>
        <Button className="mt-2" onClick={submit}>{t("booking.createButton", "Buat Booking")}</Button>
      </Card>
      </div>

      {qrFor && (
        <Card className="space-y-2 border-emerald-500/40 text-center">
          <h2 className="font-medium">{t("booking.qrTitle", "QR Check-in — {code}").replace("{code}", qrFor.bookingCode)}</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrFor.qrDataUrl} alt={qrFor.bookingCode} className="mx-auto w-40 h-40" />
          <Button variant="ghost" onClick={() => setQrFor(null)}>{t("booking.closeButton", "Tutup")}</Button>
        </Card>
      )}

      {transferFor && (
        <Card className="space-y-2 border-amber-500/40">
          <h2 className="font-medium">{t("booking.transferUnitTitle", "Pindah Unit")}</h2>
          <select className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" value={transferFor.unitId} onChange={(e) => setTransferFor({ ...transferFor, unitId: e.target.value })}>
            <option value="">{t("booking.selectDestUnit", "Pilih unit tujuan")}</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.consoleType.toUpperCase()})</option>)}
          </select>
          <div className="flex gap-2">
            <Button onClick={submitTransfer}>{t("booking.transferSubmit", "Pindahkan")}</Button>
            <Button variant="ghost" onClick={() => setTransferFor(null)}>{t("booking.cancelButton", "Batal")}</Button>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 p-1 w-fit">
        <button type="button" onClick={() => setView("map")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${view === "map" ? "bg-cyan-500/15 text-cyan-300" : "text-neutral-400 hover:text-neutral-200"}`}>
          <CalendarRange size={15} /> {t("booking.map.tabMap", "Map Booking")}
        </button>
        <button type="button" onClick={() => setView("list")} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${view === "list" ? "bg-cyan-500/15 text-cyan-300" : "text-neutral-400 hover:text-neutral-200"}`}>
          <List size={15} /> {t("booking.map.tabList", "Daftar")}
        </button>
      </div>

      {view === "map" && (
        <Card>
          <BookingMap
            bookings={bookings}
            units={units}
            date={mapDate}
            setDate={setMapDate}
            statusLabel={(st) => STATUS_LABEL[st] ?? st}
            onSlotClick={onSlotClick}
            onBookingClick={(b) => setDetailId(b.id)}
          />
        </Card>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetailId(null)}>
          <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-emerald-400 text-sm">{detail.bookingCode ?? "—"}</div>
                <div className="font-semibold">{detail.customerName || t("booking.noName", "Tanpa nama")}</div>
                <div className="text-xs text-neutral-400">{detail.phone}</div>
              </div>
              <button type="button" onClick={() => setDetailId(null)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800" aria-label={t("booking.closeButton", "Tutup")}><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-neutral-800/60 p-2">
                <div className="text-neutral-500">{t("booking.map.detailUnit", "Unit")}</div>
                <div className="font-medium">{units.find((u) => u.id === detail.rentalUnitId)?.name ?? (detail.consoleType && detail.consoleType !== "any" ? `${t("booking.map.anyUnitOf", "Unit apa saja")} · ${detail.consoleType.toUpperCase()}` : t("booking.anyConsoleOption", "Konsol apa saja"))}</div>
              </div>
              <div className="rounded-lg bg-neutral-800/60 p-2">
                <div className="text-neutral-500">{t("booking.map.detailSource", "Sumber")}</div>
                <div className="font-medium">{SOURCE_LABEL[detail.source] ?? detail.source}</div>
              </div>
              <div className="rounded-lg bg-neutral-800/60 p-2 col-span-2">
                <div className="text-neutral-500">{t("booking.map.detailSchedule", "Jadwal")}</div>
                <div className="font-medium">{new Date(detail.scheduledStart).toLocaleString("id-ID", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} — {new Date(detail.scheduledEnd).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              {detail.dpAmount > 0 && (
                <div className="rounded-lg bg-neutral-800/60 p-2 col-span-2"><span className="text-neutral-500">DP</span> <span className="font-medium">{rupiah(detail.dpAmount)}</span></div>
              )}
              {detail.notes && <div className="rounded-lg bg-neutral-800/60 p-2 col-span-2 text-neutral-300">{detail.notes}</div>}
            </div>
            {renderActions(detail)}
          </div>
        </div>
      )}

      <div className={`space-y-2 ${view === "list" ? "" : "hidden"}`}>
        {bookings.map((b) => (
          <Card key={b.id} className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium flex items-center flex-wrap gap-2">
                {b.bookingCode && <span className="font-mono text-emerald-400">{b.bookingCode}</span>}
                <span>{b.customerName || t("booking.noName", "Tanpa nama")} · {b.phone}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SOURCE_CLASS[b.source] ?? SOURCE_CLASS.kasir}`}>{SOURCE_LABEL[b.source] ?? b.source}</span>
              </div>
              <div className="text-xs text-neutral-500">
                {new Date(b.scheduledStart).toLocaleString("id-ID")} — {new Date(b.scheduledEnd).toLocaleTimeString("id-ID")}
                {b.dpAmount > 0 && ` · ${t("booking.dpPrefix", "DP {amount}").replace("{amount}", rupiah(b.dpAmount))}`}
                {b.waitlistPosition && ` · ${t("booking.waitlistPrefix", "Antrian #{n}").replace("{n}", String(b.waitlistPosition))}`}
                {b.cancelReason && ` · ${b.cancelReason}`}
              </div>
            </div>
            {renderActions(b)}
          </Card>
        ))}
        {bookings.length === 0 && <p className="text-sm text-neutral-500">{t("booking.emptyState", "Belum ada booking.")}</p>}
      </div>
    </div>
  );
}
