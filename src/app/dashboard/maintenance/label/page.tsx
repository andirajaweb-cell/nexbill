"use client";
/* eslint-disable @next/next/no-img-element */
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { DATE_LOCALE, useDashboardLang } from "@/lib/i18n/dashboard-lang";
import { clampText, isLabelSize, LABEL_PAGE, LABEL_SIZES, maintenanceTicketNumber, parseLabelIds, type LabelSize } from "@/lib/maintenance/label";
import "@/lib/i18n/dict-maintenance";
import "@/lib/i18n/dict-maintenance-label";

/**
 * Label tiket maintenance siap cetak (2026-11-22): ditempel di TV/konsol/stik yang sedang
 * diperbaiki supaya siapa pun tahu barang apa, kerusakannya apa, dan nomor tiketnya. Ukuran:
 * rol thermal 58/80 mm (printer struk), stiker label 100×50 mm, atau A6. QR mengarah ke tiket di
 * dashboard. ?ids=a,b (maks. 50) &size=… &autoprint=1 (dari tombol "Simpan & Cetak Label").
 */
export default function MaintenanceLabelPage() {
  return (
    <Suspense fallback={null}>
      <LabelInner />
    </Suspense>
  );
}

interface Ticket {
  id: string;
  fixedAssetId: string;
  maintenanceDate: string;
  status: string;
  description: string;
  cost: number;
  damageLabel: string | null;
  damageType: string | null;
  damageSeverity: string | null;
}
interface Asset {
  id: string;
  name: string;
  category: string;
  rentalUnitId: string | null;
  acquisitionDate: string;
  notes: string | null;
}

const SIZE_KEY = "nexbill.maintenance.labelSize";

function LabelInner() {
  const { t, lang } = useDashboardLang();
  const params = useSearchParams();
  const ids = useMemo(() => parseLabelIds(params.get("ids")), [params]);
  const autoprint = params.get("autoprint") === "1";

  const sizeFromUrl = params.get("size");
  const [size, setSize] = useState<LabelSize>(isLabelSize(sizeFromUrl) ? sizeFromUrl : "thermal58");
  // Ukuran terakhir yang dipakai di komputer ini (printer label biasanya tetap) — dibaca setelah mount.
  useEffect(() => {
    if (isLabelSize(sizeFromUrl)) return;
    try {
      const saved = window.localStorage.getItem(SIZE_KEY);
      if (isLabelSize(saved)) setSize(saved);
    } catch {
      /* storage diblokir */
    }
  }, [sizeFromUrl]);
  const [showCost, setShowCost] = useState(false);
  const [showParts, setShowParts] = useState(true);
  const [data, setData] = useState<{ tickets: Ticket[]; assets: Asset[]; partsUsed: { maintenanceLogId: string; productName: string | null; qty: number }[] } | null>(null);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [outlet, setOutlet] = useState<{ name: string; phone: string | null } | null>(null);
  const [qr, setQr] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchJsonObject<{ tickets: Ticket[]; assets: Asset[]; partsUsed: { maintenanceLogId: string; productName: string | null; qty: number }[] }>("/api/maintenance").then((d) =>
      setData(d ?? { tickets: [], assets: [], partsUsed: [] })
    );
    void fetchJsonArray<{ id: string; name: string }>("/api/rental-units").then(setUnits);
    void fetchJsonObject<{ name: string; phone: string | null }>("/api/outlets/default").then((o) => o && setOutlet(o));
  }, []);

  const tickets = useMemo(() => (data ? ids.map((id) => data.tickets.find((x) => x.id === id)).filter((x): x is Ticket => !!x) : []), [data, ids]);

  // QR → halaman Maintenance di dashboard yang langsung menyorot tiket ini.
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const tk of tickets) {
        const url = `${window.location.origin}/dashboard/maintenance?ticket=${encodeURIComponent(tk.id)}`;
        out[tk.id] = await QRCode.toDataURL(url, { margin: 0, width: 240, errorCorrectionLevel: "M" });
      }
      if (alive) setQr(out);
    })();
    return () => {
      alive = false;
    };
  }, [tickets]);

  const ready = !!data && tickets.length > 0 && tickets.every((tk) => qr[tk.id]);
  useEffect(() => {
    if (autoprint && ready) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [autoprint, ready]);

  const chooseSize = (s: LabelSize) => {
    setSize(s);
    try {
      window.localStorage.setItem(SIZE_KEY, s);
    } catch {
      /* storage diblokir */
    }
  };

  const CATEGORY: Record<string, string> = {
    playstation: t("maintenance.category.playstation", "PlayStation / Konsol"),
    tv: t("maintenance.category.tv", "TV"),
    controller: t("maintenance.category.controller", "Controller / Aksesoris"),
    furniture: t("maintenance.category.furniture", "Furniture"),
    vehicle: t("maintenance.category.vehicle", "Kendaraan"),
    other: t("maintenance.category.other", "Lainnya"),
  };
  const STATUS: Record<string, string> = {
    queued: t("maintenance.status.queued", "Masuk Maintenance"),
    in_progress: t("maintenance.status.inProgress", "Proses"),
    done: t("maintenance.status.done", "Selesai"),
  };
  const DTYPE: Record<string, string> = {
    fisik: t("maintenance.damageType.fisik", "Fisik"),
    elektronik: t("maintenance.damageType.elektronik", "Elektronik"),
    konektor_port: t("maintenance.damageType.konektorPort", "Konektor / Port"),
    software_firmware: t("maintenance.damageType.softwareFirmware", "Software / Firmware"),
    baterai_power: t("maintenance.damageType.bateraiPower", "Baterai / Power"),
    lainnya: t("maintenance.damageType.lainnya", "Lainnya"),
  };
  const SEVERITY: Record<string, string> = {
    rusak_ringan: t("maintenance.damageSeverity.ringan", "Rusak Ringan"),
    rusak_berat: t("maintenance.damageSeverity.berat", "Rusak Berat"),
    tidak_bisa_diperbaiki: t("maintenance.damageSeverity.unrepairable", "Tidak Bisa Diperbaiki"),
  };
  const SIZE_LABEL: Record<LabelSize, string> = {
    thermal58: t("mtLabel.size.thermal58", "Struk 58 mm"),
    thermal80: t("mtLabel.size.thermal80", "Struk 80 mm"),
    label100x50: t("mtLabel.size.label100x50", "Stiker 100×50 mm"),
    a6: t("mtLabel.size.a6", "A6"),
  };

  const page = LABEL_PAGE[size];
  const compact = page.compact;
  const locale = DATE_LOCALE[lang];
  const fmtDate = (iso: string) => new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          aside, header, footer, nav, .no-print, .sticky { display: none !important; }
          main { padding: 0 !important; }
          html, body { background: #fff !important; }
          @page { ${page.page ? `size: ${page.page};` : ""} margin: ${page.page ? "0" : "2mm"}; }
          .mt-label { break-after: page; page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          .mt-label:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>

      <div className="no-print space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("mtLabel.title", "Cetak Label Maintenance")}</h1>
            <p className="text-sm text-neutral-500">{t("mtLabel.desc", "Tempel label di barang yang sedang diperbaiki: nomor tiket, detail aset, dan keluhan/diagnosis. Scan QR-nya untuk membuka tiket di dashboard.")}</p>
          </div>
          <Button onClick={() => window.print()} disabled={!ready}>
            <span className="inline-flex items-center gap-1.5">
              <Printer size={15} /> {t("mtLabel.print", "Cetak")}
            </span>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <span>{t("mtLabel.sizeLabel", "Ukuran:")}</span>
          {LABEL_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => chooseSize(s)}
              className={`rounded-full border px-3 py-1 transition ${size === s ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-neutral-400 hover:text-neutral-100"}`}
            >
              {SIZE_LABEL[s]}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5">
            <input type="checkbox" checked={showCost} onChange={(e) => setShowCost(e.target.checked)} /> {t("mtLabel.showCost", "Tampilkan biaya")}
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showParts} onChange={(e) => setShowParts(e.target.checked)} /> {t("mtLabel.showParts", "Tampilkan sparepart")}
          </label>
        </div>
        <p className="text-[11px] text-neutral-500">{t("mtLabel.printHint", "Di jendela cetak pilih printer yang sesuai, ukuran kertas sama dengan pilihan di atas, margin \"Tidak ada\", dan matikan \"Header dan footer\".")}</p>
      </div>

      {!data ? (
        <p className="text-sm text-neutral-500">{t("mtLabel.loading", "Memuat tiket...")}</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-neutral-500">{t("mtLabel.notFound", "Tiket tidak ditemukan. Buka label dari halaman Maintenance.")}</p>
      ) : (
        <div className="flex flex-wrap items-start gap-4 print:block">
          {tickets.map((tk) => {
            const asset = data.assets.find((a) => a.id === tk.fixedAssetId);
            const unit = asset?.rentalUnitId ? units.find((u) => u.id === asset.rentalUnitId) : undefined;
            const parts = data.partsUsed.filter((p) => p.maintenanceLogId === tk.id);
            const no = maintenanceTicketNumber(tk);
            return (
              <div
                key={tk.id}
                className="mt-label bg-white text-black shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
                style={{ width: `${page.widthMm}mm`, padding: compact ? "2.5mm 3mm" : "3mm", fontFamily: "Arial, Helvetica, sans-serif", lineHeight: 1.25 }}
              >
                {compact ? (
                  <div style={{ display: "flex", gap: "3mm", alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{outlet?.name ?? "NEXBILL"} · {t("mtLabel.heading", "Tiket Maintenance")}</div>
                      <div style={{ fontSize: "12pt", fontWeight: 800, margin: "0.5mm 0" }}>{no}</div>
                      <div style={{ fontSize: "9pt", fontWeight: 700 }}>{clampText(asset?.name ?? t("maintenance.deletedAsset", "(aset terhapus)"), 34)}</div>
                      <div style={{ fontSize: "7pt" }}>
                        {CATEGORY[asset?.category ?? ""] ?? "-"}
                        {unit ? ` · ${unit.name}` : ""}
                      </div>
                      <div style={{ fontSize: "8pt", marginTop: "1mm", borderTop: "0.3mm solid #000", paddingTop: "0.8mm" }}>
                        <b>{t("mtLabel.complaint", "Keluhan")}:</b> {clampText([tk.damageLabel, tk.description].filter(Boolean).join(" — "), 70)}
                      </div>
                      <div style={{ fontSize: "7pt", marginTop: "0.5mm" }}>
                        {t("mtLabel.dateIn", "Masuk")}: {fmtDate(tk.maintenanceDate)}
                        {tk.damageSeverity ? ` · ${SEVERITY[tk.damageSeverity] ?? tk.damageSeverity}` : ""}
                      </div>
                    </div>
                    {qr[tk.id] && <img src={qr[tk.id]} alt="" style={{ width: "20mm", height: "20mm" }} />}
                  </div>
                ) : (
                  <>
                    <div style={{ textAlign: "center", borderBottom: "0.4mm solid #000", paddingBottom: "1.5mm" }}>
                      <div style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{outlet?.name ?? "NEXBILL"}</div>
                      {outlet?.phone && <div style={{ fontSize: "7pt" }}>{outlet.phone}</div>}
                      <div style={{ fontSize: "9pt", fontWeight: 700, marginTop: "1mm" }}>{t("mtLabel.heading", "Tiket Maintenance")}</div>
                      <div style={{ fontSize: "14pt", fontWeight: 800, letterSpacing: "0.02em" }}>{no}</div>
                      <div style={{ fontSize: "7.5pt" }}>
                        {t("mtLabel.dateIn", "Masuk")}: {fmtDate(tk.maintenanceDate)} · {STATUS[tk.status] ?? tk.status}
                      </div>
                    </div>

                    <div style={{ marginTop: "2mm" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase" }}>{t("mtLabel.asset", "Detail aset")}</div>
                      <div style={{ fontSize: "10pt", fontWeight: 700 }}>{asset?.name ?? t("maintenance.deletedAsset", "(aset terhapus)")}</div>
                      <table style={{ width: "100%", fontSize: "8pt", borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ width: "38%", verticalAlign: "top" }}>{t("mtLabel.category", "Kategori")}</td>
                            <td>{CATEGORY[asset?.category ?? ""] ?? "-"}</td>
                          </tr>
                          {unit && (
                            <tr>
                              <td style={{ verticalAlign: "top" }}>{t("mtLabel.unit", "Unit PS")}</td>
                              <td>{unit.name}</td>
                            </tr>
                          )}
                          <tr>
                            <td style={{ verticalAlign: "top" }}>{t("mtLabel.assetId", "Kode aset")}</td>
                            <td style={{ fontFamily: "monospace" }}>{tk.fixedAssetId.slice(0, 8).toUpperCase()}</td>
                          </tr>
                          {asset?.acquisitionDate && (
                            <tr>
                              <td style={{ verticalAlign: "top" }}>{t("mtLabel.acquired", "Dibeli")}</td>
                              <td>{new Date(asset.acquisitionDate).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</td>
                            </tr>
                          )}
                          {asset?.notes && (
                            <tr>
                              <td style={{ verticalAlign: "top" }}>{t("mtLabel.notes", "Catatan")}</td>
                              <td>{clampText(asset.notes, 80)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: "2mm", borderTop: "0.3mm dashed #000", paddingTop: "1.5mm" }}>
                      <div style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase" }}>{t("mtLabel.diagnosis", "Keluhan / diagnosis")}</div>
                      {tk.damageLabel && <div style={{ fontSize: "10pt", fontWeight: 700 }}>{tk.damageLabel}</div>}
                      <div style={{ fontSize: "9pt", whiteSpace: "pre-wrap" }}>{tk.description}</div>
                      <div style={{ fontSize: "8pt", marginTop: "1mm" }}>
                        {tk.damageType && <span>{t("mtLabel.type", "Jenis")}: {DTYPE[tk.damageType] ?? tk.damageType}</span>}
                        {tk.damageType && tk.damageSeverity && " · "}
                        {tk.damageSeverity && <b>{SEVERITY[tk.damageSeverity] ?? tk.damageSeverity}</b>}
                      </div>
                    </div>

                    {showParts && parts.length > 0 && (
                      <div style={{ marginTop: "1.5mm", fontSize: "8pt" }}>
                        <b>{t("mtLabel.parts", "Sparepart")}:</b> {parts.map((p) => `${p.productName ?? "-"} ×${p.qty}`).join(", ")}
                      </div>
                    )}
                    {showCost && tk.cost > 0 && (
                      <div style={{ marginTop: "1mm", fontSize: "8pt" }}>
                        <b>{t("mtLabel.cost", "Biaya")}:</b> Rp{Math.round(tk.cost).toLocaleString("id-ID")}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "3mm", marginTop: "2.5mm" }}>
                      <div style={{ fontSize: "7.5pt", flex: 1 }}>
                        <div>{t("mtLabel.technician", "Teknisi")}: ____________</div>
                        <div style={{ marginTop: "2mm" }}>{t("mtLabel.doneDate", "Selesai")}: ____/____/______</div>
                      </div>
                      {qr[tk.id] && <img src={qr[tk.id]} alt="" style={{ width: size === "thermal58" ? "18mm" : "22mm", height: size === "thermal58" ? "18mm" : "22mm" }} />}
                    </div>
                    <div style={{ fontSize: "6.5pt", textAlign: "center", marginTop: "1.5mm" }}>{t("mtLabel.footer", "Jangan disewakan sebelum tiket selesai.")}</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
