"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { computeUnitView, formatDuration, type TvUnitView } from "@/lib/tv/view";
import { currencyForCountry, formatMoney } from "@/lib/currency/format";
import { CALL_REASONS, EXTEND_OPTIONS, type CallReason } from "@/lib/unit-qr/rules";

/**
 * Halaman HP pelanggan dari stiker QR di bilik: sisa waktu live, perkiraan tagihan, pesan F&B,
 * minta tambah waktu, dan panggil kasir. Semua permintaan masuk antrean kasir (Rental PS) —
 * halaman ini tidak pernah mengubah tagihan sendiri.
 *
 * Hanya mengimpor modul MURNI (view.ts, currency/format.ts, unit-qr/rules.ts) supaya tidak ada
 * kode server/db yang ikut ke bundle browser.
 */

type Lang = "id" | "en" | "ms" | "th" | "fil" | "vi";

interface UnitState {
  outletName: string;
  logoUrl: string | null;
  lang: string;
  country: string | null;
  bookingPath: string | null;
  unitName: string;
  consoleType: string;
  hourlyRate: number;
  view: TvUnitView;
  hasActiveSession: boolean;
  runningTotal: number | null;
  fnbItems: { description: string; qty: number; lineTotal: number }[];
  timeUp: { active: boolean; billTotal: number | null };
  orderEnabled: boolean;
  extendEnabled: boolean;
  requests: { id: string; type: string; status: string; createdAt: string; summary: string; rejectReason: string | null }[];
  serverTime: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
}

const T: Record<Lang, Record<string, string>> = {
  id: {
    loading: "Memuat...", notFound: "QR tidak dikenal atau sudah diganti. Minta QR terbaru ke kasir.", reconnecting: "Menyambungkan ulang...",
    playing: "Sedang bermain", paused: "Dijeda", available: "Tersedia", maintenance: "Sedang perbaikan",
    remaining: "Sisa waktu", elapsed: "Waktu berjalan", overtime: "Waktu habis", estimate: "Perkiraan tagihan", finalNote: "Total akhir dihitung kasir saat bayar.",
    warnTitle: "Waktu hampir habis!", warnBody: "Tambah waktu sekarang supaya permainan tidak terputus.",
    timeUpTitle: "Waktu bermain habis", timeUpBody: "Silakan selesaikan pembayaran di kasir.", billTotal: "Total tagihan",
    idleBody: "Unit ini sedang kosong. Hubungi kasir untuk mulai bermain.", book: "Booking untuk nanti",
    order: "Pesan Makanan", extend: "Tambah Waktu", call: "Panggil Kasir", yourOrders: "Pesanan di tagihan ini",
    sendOrder: "Kirim pesanan", items: "item", emptyMenu: "Menu belum tersedia.", cartEmpty: "Pilih menu dulu.",
    extendNote: "Perkiraan biaya", extendSend: "Minta tambah", extendHint: "Kasir akan mengonfirmasi tambahan waktunya.",
    reason_bill: "Minta bill / bayar", reason_controller: "Stik bermasalah", reason_help: "Butuh bantuan", reason_other: "Lainnya",
    notePlaceholder: "Catatan (opsional)", callSend: "Panggil kasir",
    sent: "Terkirim! Kasir akan segera menanggapi.", requests: "Permintaan kamu",
    st_pending: "Menunggu kasir", st_accepted: "Diterima", st_done: "Selesai", st_rejected: "Ditolak",
    t_order_fnb: "Pesanan", t_extend_time: "Tambah waktu", t_call_staff: "Panggil kasir",
    disabledOrder: "Pemesanan lewat QR tidak aktif di outlet ini.", needSession: "Mulai main dulu di kasir untuk memesan.",
    close: "Tutup", minutes: "menit", powered: "Didukung NEXBILL",
  },
  en: {
    loading: "Loading...", notFound: "Unknown or replaced QR code. Ask the cashier for the latest one.", reconnecting: "Reconnecting...",
    playing: "Playing", paused: "Paused", available: "Available", maintenance: "Under repair",
    remaining: "Time left", elapsed: "Time played", overtime: "Time is up", estimate: "Estimated bill", finalNote: "The final total is calculated by the cashier at payment.",
    warnTitle: "Almost out of time!", warnBody: "Add time now so your game isn't interrupted.",
    timeUpTitle: "Play time is over", timeUpBody: "Please complete your payment at the cashier.", billTotal: "Bill total",
    idleBody: "This unit is free. Ask the cashier to start playing.", book: "Book for later",
    order: "Order Food", extend: "Add Time", call: "Call Cashier", yourOrders: "Orders on this bill",
    sendOrder: "Send order", items: "items", emptyMenu: "No menu available yet.", cartEmpty: "Pick something first.",
    extendNote: "Estimated cost", extendSend: "Request", extendHint: "The cashier will confirm the extra time.",
    reason_bill: "Request bill / pay", reason_controller: "Controller problem", reason_help: "Need help", reason_other: "Other",
    notePlaceholder: "Note (optional)", callSend: "Call cashier",
    sent: "Sent! The cashier will respond shortly.", requests: "Your requests",
    st_pending: "Waiting for cashier", st_accepted: "Accepted", st_done: "Done", st_rejected: "Rejected",
    t_order_fnb: "Order", t_extend_time: "Add time", t_call_staff: "Call cashier",
    disabledOrder: "Ordering via QR is turned off at this outlet.", needSession: "Start playing at the cashier first to order.",
    close: "Close", minutes: "min", powered: "Powered by NEXBILL",
  },
  ms: {
    loading: "Memuatkan...", notFound: "QR tidak dikenali atau sudah ditukar. Minta QR terkini daripada juruwang.", reconnecting: "Menyambung semula...",
    playing: "Sedang bermain", paused: "Dijeda", available: "Tersedia", maintenance: "Sedang dibaiki",
    remaining: "Baki masa", elapsed: "Masa berjalan", overtime: "Masa tamat", estimate: "Anggaran bil", finalNote: "Jumlah akhir dikira juruwang semasa bayar.",
    warnTitle: "Masa hampir tamat!", warnBody: "Tambah masa sekarang supaya permainan tidak terputus.",
    timeUpTitle: "Masa bermain tamat", timeUpBody: "Sila selesaikan pembayaran di juruwang.", billTotal: "Jumlah bil",
    idleBody: "Unit ini kosong. Hubungi juruwang untuk mula bermain.", book: "Tempah untuk kemudian",
    order: "Pesan Makanan", extend: "Tambah Masa", call: "Panggil Juruwang", yourOrders: "Pesanan dalam bil ini",
    sendOrder: "Hantar pesanan", items: "item", emptyMenu: "Menu belum tersedia.", cartEmpty: "Pilih menu dahulu.",
    extendNote: "Anggaran kos", extendSend: "Minta tambah", extendHint: "Juruwang akan mengesahkan tambahan masa.",
    reason_bill: "Minta bil / bayar", reason_controller: "Alat kawalan bermasalah", reason_help: "Perlu bantuan", reason_other: "Lain-lain",
    notePlaceholder: "Catatan (pilihan)", callSend: "Panggil juruwang",
    sent: "Dihantar! Juruwang akan segera membalas.", requests: "Permintaan anda",
    st_pending: "Menunggu juruwang", st_accepted: "Diterima", st_done: "Selesai", st_rejected: "Ditolak",
    t_order_fnb: "Pesanan", t_extend_time: "Tambah masa", t_call_staff: "Panggil juruwang",
    disabledOrder: "Pesanan melalui QR tidak aktif di outlet ini.", needSession: "Mula bermain di juruwang dahulu untuk memesan.",
    close: "Tutup", minutes: "minit", powered: "Dikuasakan NEXBILL",
  },
  th: {
    loading: "กำลังโหลด...", notFound: "ไม่รู้จัก QR นี้หรือถูกเปลี่ยนแล้ว ขอ QR ใหม่จากแคชเชียร์", reconnecting: "กำลังเชื่อมต่อใหม่...",
    playing: "กำลังเล่น", paused: "หยุดชั่วคราว", available: "ว่าง", maintenance: "กำลังซ่อม",
    remaining: "เวลาที่เหลือ", elapsed: "เวลาที่เล่น", overtime: "หมดเวลา", estimate: "ยอดบิลโดยประมาณ", finalNote: "ยอดสุดท้ายคำนวณโดยแคชเชียร์ตอนชำระเงิน",
    warnTitle: "ใกล้หมดเวลาแล้ว!", warnBody: "เพิ่มเวลาตอนนี้เพื่อไม่ให้เกมสะดุด",
    timeUpTitle: "หมดเวลาเล่นแล้ว", timeUpBody: "กรุณาชำระเงินที่แคชเชียร์", billTotal: "ยอดบิลรวม",
    idleBody: "เครื่องนี้ว่างอยู่ ติดต่อแคชเชียร์เพื่อเริ่มเล่น", book: "จองไว้ภายหลัง",
    order: "สั่งอาหาร", extend: "เพิ่มเวลา", call: "เรียกแคชเชียร์", yourOrders: "รายการในบิลนี้",
    sendOrder: "ส่งออเดอร์", items: "รายการ", emptyMenu: "ยังไม่มีเมนู", cartEmpty: "เลือกเมนูก่อน",
    extendNote: "ค่าใช้จ่ายโดยประมาณ", extendSend: "ขอเพิ่ม", extendHint: "แคชเชียร์จะยืนยันเวลาที่เพิ่ม",
    reason_bill: "ขอบิล / ชำระเงิน", reason_controller: "จอยมีปัญหา", reason_help: "ต้องการความช่วยเหลือ", reason_other: "อื่นๆ",
    notePlaceholder: "หมายเหตุ (ไม่บังคับ)", callSend: "เรียกแคชเชียร์",
    sent: "ส่งแล้ว! แคชเชียร์จะตอบกลับเร็วๆ นี้", requests: "คำขอของคุณ",
    st_pending: "รอแคชเชียร์", st_accepted: "รับแล้ว", st_done: "เสร็จแล้ว", st_rejected: "ปฏิเสธ",
    t_order_fnb: "ออเดอร์", t_extend_time: "เพิ่มเวลา", t_call_staff: "เรียกแคชเชียร์",
    disabledOrder: "ร้านนี้ปิดการสั่งผ่าน QR", needSession: "เริ่มเล่นที่แคชเชียร์ก่อนจึงจะสั่งได้",
    close: "ปิด", minutes: "นาที", powered: "ขับเคลื่อนโดย NEXBILL",
  },
  fil: {
    loading: "Naglo-load...", notFound: "Hindi kilala o napalitan na ang QR. Humingi ng bago sa cashier.", reconnecting: "Kumokonekta ulit...",
    playing: "Naglalaro", paused: "Naka-pause", available: "Bakante", maintenance: "Inaayos",
    remaining: "Natitirang oras", elapsed: "Oras na nilaro", overtime: "Ubos na ang oras", estimate: "Tantiyang bill", finalNote: "Kinukuwenta ng cashier ang huling total sa pagbabayad.",
    warnTitle: "Malapit nang maubos ang oras!", warnBody: "Magdagdag ng oras ngayon para tuloy-tuloy ang laro.",
    timeUpTitle: "Tapos na ang oras ng laro", timeUpBody: "Pakitapos ang pagbabayad sa cashier.", billTotal: "Kabuuang bill",
    idleBody: "Bakante ang unit na ito. Kausapin ang cashier para magsimula.", book: "Mag-book para mamaya",
    order: "Mag-order ng Pagkain", extend: "Magdagdag ng Oras", call: "Tawagin ang Cashier", yourOrders: "Mga order sa bill na ito",
    sendOrder: "Ipadala ang order", items: "item", emptyMenu: "Wala pang menu.", cartEmpty: "Pumili muna.",
    extendNote: "Tantiyang gastos", extendSend: "Hilingin", extendHint: "Kukumpirmahin ng cashier ang dagdag na oras.",
    reason_bill: "Humingi ng bill / magbayad", reason_controller: "Problema sa controller", reason_help: "Kailangan ng tulong", reason_other: "Iba pa",
    notePlaceholder: "Tala (opsyonal)", callSend: "Tawagin ang cashier",
    sent: "Naipadala! Sasagot agad ang cashier.", requests: "Mga hiling mo",
    st_pending: "Hinihintay ang cashier", st_accepted: "Tinanggap", st_done: "Tapos", st_rejected: "Tinanggihan",
    t_order_fnb: "Order", t_extend_time: "Dagdag na oras", t_call_staff: "Tawag sa cashier",
    disabledOrder: "Naka-off ang pag-order sa QR sa outlet na ito.", needSession: "Magsimulang maglaro sa cashier para makapag-order.",
    close: "Isara", minutes: "minuto", powered: "Pinapagana ng NEXBILL",
  },
  vi: {
    loading: "Đang tải...", notFound: "Mã QR không hợp lệ hoặc đã được thay. Hãy xin mã mới ở quầy.", reconnecting: "Đang kết nối lại...",
    playing: "Đang chơi", paused: "Tạm dừng", available: "Trống", maintenance: "Đang sửa",
    remaining: "Thời gian còn lại", elapsed: "Đã chơi", overtime: "Hết giờ", estimate: "Tạm tính", finalNote: "Tổng cuối cùng do thu ngân tính khi thanh toán.",
    warnTitle: "Sắp hết giờ!", warnBody: "Thêm giờ ngay để không bị gián đoạn.",
    timeUpTitle: "Đã hết giờ chơi", timeUpBody: "Vui lòng thanh toán tại quầy.", billTotal: "Tổng hóa đơn",
    idleBody: "Máy này đang trống. Liên hệ thu ngân để bắt đầu chơi.", book: "Đặt chỗ cho lần sau",
    order: "Gọi món", extend: "Thêm giờ", call: "Gọi thu ngân", yourOrders: "Món trong hóa đơn này",
    sendOrder: "Gửi đơn", items: "món", emptyMenu: "Chưa có thực đơn.", cartEmpty: "Hãy chọn món trước.",
    extendNote: "Chi phí ước tính", extendSend: "Yêu cầu", extendHint: "Thu ngân sẽ xác nhận thời gian thêm.",
    reason_bill: "Xin hóa đơn / thanh toán", reason_controller: "Tay cầm bị lỗi", reason_help: "Cần hỗ trợ", reason_other: "Khác",
    notePlaceholder: "Ghi chú (tùy chọn)", callSend: "Gọi thu ngân",
    sent: "Đã gửi! Thu ngân sẽ phản hồi ngay.", requests: "Yêu cầu của bạn",
    st_pending: "Chờ thu ngân", st_accepted: "Đã nhận", st_done: "Xong", st_rejected: "Bị từ chối",
    t_order_fnb: "Gọi món", t_extend_time: "Thêm giờ", t_call_staff: "Gọi thu ngân",
    disabledOrder: "Cửa hàng đã tắt gọi món qua QR.", needSession: "Hãy bắt đầu chơi tại quầy để gọi món.",
    close: "Đóng", minutes: "phút", powered: "Vận hành bởi NEXBILL",
  },
};

const WARN_SECONDS = 5 * 60;

export default function UnitQrPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<UnitState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [panel, setPanel] = useState<"order" | "extend" | "call" | null>(null);
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<CallReason>("bill");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const lang: Lang = (["id", "en", "ms", "th", "fil", "vi"] as const).includes(state?.lang as Lang) ? (state!.lang as Lang) : "id";
  const t = (k: string) => T[lang][k] ?? T.id[k] ?? k;
  const currency = currencyForCountry(state?.country);
  const money = (n: number) => formatMoney(n, currency);

  const load = useCallback(async () => {
    // HP yang layarnya mati / tab di latar belakang tidak perlu terus mengambil data (hemat kuota
    // server dan baterai) — begitu dibuka lagi, interval berikutnya langsung menyegarkan.
    if (typeof document !== "undefined" && document.hidden) return;
    try {
      const res = await fetch(`/api/unit-qr/${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setOffline(true);
        return;
      }
      setState(await res.json());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const id = setInterval(load, 8000);
    const onVisible = () => {
      if (!document.hidden) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (panel !== "order" || menu) return;
    fetch(`/api/unit-qr/${encodeURIComponent(token)}/menu`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setMenu(Array.isArray(rows) ? rows : []))
      .catch(() => setMenu([]));
  }, [panel, menu, token]);

  // Hitung mundur di HP dari data polling terakhir (sama seperti layar TV), supaya tidak melompat 5 detik.
  const live: TvUnitView | null = useMemo(() => {
    if (!state) return null;
    const v = state.view;
    if (v.elapsedSeconds === null) return v;
    return computeUnitView(
      null,
      {
        status: v.status === "paused" ? "paused" : "running",
        startedAt: new Date(new Date(state.serverTime).getTime() - v.elapsedSeconds * 1000).toISOString(),
        accumulatedPauseMs: 0,
        pausedAt: null,
        plannedMinutes: v.remainingSeconds === null ? 0 : Math.round((v.elapsedSeconds + v.remainingSeconds) / 60),
        extendedMinutes: 0,
      },
      v.status === "paused" ? new Date(state.serverTime).getTime() : now,
    );
  }, [state, now]);

  const send = async (type: "order_fnb" | "extend_time" | "call_staff", payload: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/unit-qr/${encodeURIComponent(token)}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast({ ok: false, text: data.error ?? "Error" });
        return;
      }
      setToast({ ok: true, text: t("sent") });
      setPanel(null);
      setCart({});
      setNote("");
      void load();
    } catch {
      setToast({ ok: false, text: t("reconnecting") });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-center text-neutral-300">{t("notFound")}</div>;
  }
  if (!state || !live) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">{t("loading")}</div>;
  }

  const active = state.hasActiveSession;
  const warning = active && live.status === "occupied" && live.remainingSeconds !== null && live.remainingSeconds > 0 && live.remainingSeconds <= WARN_SECONDS;
  const cartLines = Object.entries(cart).filter(([, q]) => q > 0);
  const cartCount = cartLines.reduce((n, [, q]) => n + q, 0);
  const cartTotal = cartLines.reduce((sum, [id, q]) => sum + (menu?.find((m) => m.id === id)?.price ?? 0) * q, 0);
  const grouped = (menu ?? []).reduce<Record<string, MenuItem[]>>((acc, m) => {
    (acc[m.category] ||= []).push(m);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
      {/* Kepala */}
      <div className="flex items-center gap-3 py-2">
        {state.logoUrl ? (
          <img src={state.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-white/5" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-bold">N</div>
        )}
        <div className="min-w-0">
          <div className="text-sm text-neutral-400 truncate">{state.outletName}</div>
          <div className="text-lg font-bold truncate">
            {state.unitName} <span className="text-xs font-semibold uppercase text-cyan-300">{state.consoleType.replace("_", " ")}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      {state.timeUp.active ? (
        <div className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 text-center">
          <div className="text-2xl font-extrabold text-rose-300">{t("timeUpTitle")}</div>
          <div className="mt-1 text-sm text-neutral-300">{t("timeUpBody")}</div>
          {state.timeUp.billTotal !== null && (
            <div className="mt-3">
              <div className="text-xs text-neutral-400">{t("billTotal")}</div>
              <div className="text-3xl font-extrabold">{money(state.timeUp.billTotal)}</div>
            </div>
          )}
        </div>
      ) : active ? (
        <div className={`mt-3 rounded-2xl border p-5 text-center ${warning ? "border-amber-400/60 bg-amber-500/10" : "border-cyan-400/30 bg-cyan-500/5"}`}>
          <div className={`text-xs font-semibold uppercase tracking-widest ${live.status === "paused" ? "text-sky-300" : "text-emerald-300"}`}>
            {live.status === "paused" ? t("paused") : t("playing")}
          </div>
          <div className="mt-1 text-xs text-neutral-400">{live.remainingSeconds !== null ? (live.isOvertime ? t("overtime") : t("remaining")) : t("elapsed")}</div>
          <div className={`text-5xl font-extrabold tabular-nums ${warning ? "text-amber-300" : ""}`}>
            {formatDuration(live.remainingSeconds !== null ? live.remainingSeconds : live.elapsedSeconds)}
          </div>
          {warning && (
            <div className="mt-3 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
              <div className="font-bold">{t("warnTitle")}</div>
              <div>{t("warnBody")}</div>
            </div>
          )}
          {state.runningTotal !== null && (
            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="text-xs text-neutral-400">{t("estimate")}</div>
              <div className="text-2xl font-bold">{money(state.runningTotal)}</div>
              <div className="text-[11px] text-neutral-500">{t("finalNote")}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-5 text-center">
          <div className="text-2xl font-extrabold text-emerald-300">{live.status === "maintenance" ? t("maintenance") : t("available")}</div>
          <div className="mt-1 text-sm text-neutral-300">{t("idleBody")}</div>
          {state.bookingPath && (
            <a href={state.bookingPath} className="mt-3 inline-block rounded-lg border border-emerald-400/40 px-4 py-2 text-sm text-emerald-200">
              {t("book")}
            </a>
          )}
        </div>
      )}

      {/* Tombol aksi */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          onClick={() => setPanel(panel === "order" ? null : "order")}
          disabled={!active || !state.orderEnabled}
          className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-sm font-semibold disabled:opacity-40"
        >
          🍜<br />
          {t("order")}
        </button>
        <button
          onClick={() => setPanel(panel === "extend" ? null : "extend")}
          disabled={!active || !state.extendEnabled}
          className={`rounded-xl border px-2 py-3 text-sm font-semibold disabled:opacity-40 ${warning ? "border-amber-400/60 bg-amber-500/15" : "border-white/10 bg-white/5"}`}
        >
          ⏱️<br />
          {t("extend")}
        </button>
        <button onClick={() => setPanel(panel === "call" ? null : "call")} className="rounded-xl border border-white/10 bg-white/5 px-2 py-3 text-sm font-semibold">
          🙋<br />
          {t("call")}
        </button>
      </div>
      {!active && <p className="mt-2 text-center text-xs text-neutral-500">{t("needSession")}</p>}

      {/* Panel pesan F&B */}
      {panel === "order" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          {menu === null ? (
            <div className="py-6 text-center text-sm text-neutral-500">{t("loading")}</div>
          ) : menu.length === 0 ? (
            <div className="py-6 text-center text-sm text-neutral-500">{t("emptyMenu")}</div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{cat.replace(/_/g, " ")}</div>
                {items.map((m) => {
                  const q = cart[m.id] ?? 0;
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-2 border-b border-white/5 py-2 last:border-0">
                      <div className="min-w-0">
                        <div className="text-sm truncate">{m.name}</div>
                        <div className="text-xs text-neutral-400">{money(m.price)}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {q > 0 && (
                          <button onClick={() => setCart((c) => ({ ...c, [m.id]: Math.max(0, q - 1) }))} className="h-8 w-8 rounded-lg bg-white/10 text-lg">
                            −
                          </button>
                        )}
                        {q > 0 && <span className="w-5 text-center text-sm tabular-nums">{q}</span>}
                        <button onClick={() => setCart((c) => ({ ...c, [m.id]: Math.min(20, q + 1) }))} className="h-8 w-8 rounded-lg bg-cyan-500/20 text-lg text-cyan-200">
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {/* Panel tambah waktu */}
      {panel === "extend" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="grid grid-cols-2 gap-2">
            {EXTEND_OPTIONS.map((m) => (
              <button
                key={m}
                disabled={busy}
                onClick={() => send("extend_time", { minutes: m })}
                className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-3 text-left disabled:opacity-50"
              >
                <div className="text-lg font-bold">+{m} {t("minutes")}</div>
                <div className="text-[11px] text-neutral-400">
                  {t("extendNote")}: {money(Math.round((state.hourlyRate * m) / 60))}
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">{t("extendHint")}</p>
        </div>
      )}

      {/* Panel panggil kasir */}
      {panel === "call" && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {CALL_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-sm ${reason === r ? "border-cyan-400 bg-cyan-500/20 text-cyan-100" : "border-white/10 bg-white/5 text-neutral-300"}`}
              >
                {t(`reason_${r}`)}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 140))}
            placeholder={t("notePlaceholder")}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-base outline-none focus:border-cyan-400/50"
          />
          <button
            disabled={busy}
            onClick={() => send("call_staff", { reason, note })}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {t("callSend")}
          </button>
        </div>
      )}

      {/* Pesanan di tagihan */}
      {active && state.fnbItems.length > 0 && (
        <div className="mt-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("yourOrders")}</div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3">
            {state.fnbItems.map((i, idx) => (
              <div key={idx} className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
                <span>
                  {i.qty}× {i.description}
                </span>
                <span className="text-neutral-400">{money(i.lineTotal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status permintaan */}
      {state.requests.length > 0 && (
        <div className="mt-5">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("requests")}</div>
          <div className="space-y-2">
            {state.requests.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t(`t_${r.type}`)}</div>
                  <div className="text-xs text-neutral-400 truncate">{r.summary}</div>
                  {r.status === "rejected" && r.rejectReason && <div className="text-xs text-rose-300">{r.rejectReason}</div>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
                    r.status === "pending" ? "bg-amber-500/15 text-amber-300" : r.status === "rejected" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
                  }`}
                >
                  {t(`st_${r.status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-[11px] tracking-widest text-neutral-600">{t("powered").toUpperCase()}</div>

      {/* Bilah kirim pesanan */}
      {panel === "order" && cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#05070f] via-[#05070f] to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
          <button
            disabled={busy}
            onClick={() => send("order_fnb", { items: cartLines.map(([productId, qty]) => ({ productId, qty })) })}
            className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 font-semibold text-white disabled:opacity-50"
          >
            <span>
              {t("sendOrder")} ({cartCount} {t("items")})
            </span>
            <span>{money(cartTotal)}</span>
          </button>
        </div>
      )}

      {toast && (
        <div
          className={`fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm shadow-lg ${
            toast.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}
      {offline && <div className="fixed bottom-2 right-3 text-[11px] text-amber-400/70">{t("reconnecting")}</div>}
    </div>
  );
}
