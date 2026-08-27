"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray } from "@/lib/api/fetch-json";
import { useAuth } from "@/lib/auth/client";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-booking";

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

interface RentalUnit { id: string; name: string; consoleType: string }

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

  const load = () => {
    fetchJsonArray("/api/bookings").then(setBookings);
    fetchJsonArray("/api/rental-units").then(setUnits);
  };
  useEffect(() => { load(); }, []);

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
    const reason = prompt(t("booking.transferReasonPrompt", "Alasan pindah unit? (opsional)")) ?? undefined;
    await action(transferFor.id, "transfer", { rentalUnitId: transferFor.unitId, reason });
    setTransferFor(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("booking.pageTitle", "Booking / Reservasi")}</h1>
        <p className="text-sm text-neutral-500">{t("booking.pageSubtitle", "DP opsional, deteksi bentrok otomatis (termasuk booking \"konsol apa saja\"), waiting list auto-promote, reminder WhatsApp H-24/H-2/15 menit, dan auto-release bila belum check-in.")}</p>
      </div>

      <Card className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-neutral-500">{t("booking.lookupLabel", "Cari Kode Booking (check-in cepat)")}</label>
          <input className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder="BK-00001" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupAndCheckIn()} />
        </div>
        <Button onClick={lookupAndCheckIn}>{t("booking.lookupButton", "Cari & Check-in")}</Button>
      </Card>

      <Card>
        <h2 className="font-medium mb-3">{t("booking.newBookingTitle", "Booking Baru")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input className="rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm" placeholder={t("booking.customerNamePlaceholder", "Nama pelanggan")}
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

      <div className="space-y-2">
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
                  <Button variant="ghost" className="text-xs text-red-400" onClick={() => { const r = prompt(t("booking.cancelBookingPrompt", "Alasan pembatalan?")) ?? undefined; action(b.id, "cancel", { reason: r }); }}>{t("booking.cancelButton", "Batal")}</Button>
                </>
              )}
              {b.status === "no_show" && isAdmin && (
                <Button variant="ghost" className="text-xs text-amber-400" onClick={async () => { if (await showConfirm(t("booking.undoNoShowConfirm", "Batalkan status no-show untuk booking {code}? Status akan kembali ke \"Confirmed\".").replace("{code}", b.bookingCode ?? ""))) action(b.id, "undo-no-show"); }}>
                  {t("booking.undoNoShowButton", "Batalkan No-show")}
                </Button>
              )}
            </div>
          </Card>
        ))}
        {bookings.length === 0 && <p className="text-sm text-neutral-500">{t("booking.emptyState", "Belum ada booking.")}</p>}
      </div>
    </div>
  );
}
