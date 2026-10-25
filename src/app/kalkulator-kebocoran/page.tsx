"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEFAULT_PRICING } from "@/lib/subscription/pricing";
import {
  computeLeakage,
  DEFAULT_LEAKAGE_INPUT,
  leakageFromParams,
  leakageMultiple,
  leakageToParams,
  LEAKAGE_LIMITS,
  starterMonthlyCost,
  type LeakageInput,
} from "@/lib/leakage/calc";

/**
 * Kalkulator kebocoran untuk demo penjualan (nexbill.id/kalkulator-kebocoran): pemilik outlet
 * mengisi angkanya sendiri, hasilnya kebocoran per bulan dari selisih kas, menit tak tertagih, dan
 * listrik TV tanpa sesi, dibandingkan dengan biaya langganan. Tidak menjanjikan persentase
 * penghematan dan tidak menyebut pesaing. Isian tersimpan di URL supaya hasil demo bisa dibagikan.
 */

type Lang = "id" | "en" | "ms" | "th" | "vi" | "fil";
const LANGS: { code: Lang; label: string }[] = [
  { code: "id", label: "ID" },
  { code: "en", label: "EN" },
  { code: "ms", label: "MS" },
  { code: "th", label: "TH" },
  { code: "vi", label: "VI" },
  { code: "fil", label: "FIL" },
];

type TxtKey = "title" | "subtitle" | "sectionCash" | "cashShort" | "shifts" | "days" | "sectionBilling" | "units" | "sessions" | "minutes" | "minutesHint" | "rate" | "sectionPower" | "idleTvs" | "idleHours" | "watts" | "kwhPrice" | "kwhHint" | "results" | "perMonth" | "perYear" | "minutesNote" | "kwhNote" | "compareTitle" | "starterCost" | "proCost" | "multiple" | "howTitle" | "howCash" | "howBilling" | "howPower" | "disclaimer" | "shareWa" | "copyLink" | "copied" | "reset" | "cta" | "waText";
const TXT: Record<Lang, Record<TxtKey, string>> = {
  id: {
    title: "Kalkulator Kebocoran Rental PS",
    subtitle: "Isi angka outlet Anda. Hasilnya: perkiraan uang yang hilang tiap bulan dari selisih kas, menit main yang tidak tertagih, dan listrik TV yang menyala tanpa sesi.",
    sectionCash: "Selisih kas",
    cashShort: "Rata-rata kas kurang per shift (Rp)",
    shifts: "Shift per hari",
    days: "Hari buka per bulan",
    sectionBilling: "Menit tak tertagih",
    units: "Jumlah unit PS / TV",
    sessions: "Sesi per unit per hari",
    minutes: "Menit tidak tertagih per sesi",
    minutesHint: "Lupa mulai/stop timer, dibulatkan ke bawah, atau \"bonus\" dari staf.",
    rate: "Tarif per jam (Rp)",
    sectionPower: "Listrik TV tanpa sesi",
    idleTvs: "TV + konsol yang tetap menyala",
    idleHours: "Jam menyala tanpa sesi per hari",
    watts: "Daya TV + konsol (watt)",
    kwhPrice: "Tarif listrik per kWh (Rp)",
    kwhHint: "Bawaan Rp1.444,70 (PLN R-1 1.300–2.200 VA & B-2, Okt 2026). Sesuaikan dengan tagihan Anda.",
    results: "Perkiraan kebocoran",
    perMonth: "per bulan",
    perYear: "{amount} per tahun",
    minutesNote: "{n} menit tak tertagih per bulan",
    kwhNote: "{n} kWh per bulan",
    compareTitle: "Dibanding biaya NEXBILL",
    starterCost: "Starter untuk {n} unit",
    proCost: "Pro per outlet",
    multiple: "Kebocoran per bulan ≈ {x}× biaya Starter.",
    howTitle: "Cara NEXBILL membantu menutupnya",
    howCash: "Tutup shift dengan hitung uang fisik per pecahan; selisih tercatat per kasir, dan shift berisiko ditandai otomatis (Pro).",
    howBilling: "Timer per menit dari sistem, sesi berhenti otomatis saat waktu habis, dan setiap sesi tercatat dengan nama staf.",
    howPower: "TV dan konsol mati otomatis saat sesi selesai — Android TV lewat aplikasi NEXBILL TV/relay, TV lain lewat smart plug.",
    disclaimer: "Angka di atas adalah perkiraan dari isian Anda, bukan janji penghematan. Hasil nyata bergantung pada cara outlet memakai sistemnya.",
    shareWa: "Kirim hasil via WhatsApp",
    copyLink: "Salin link hasil",
    copied: "Link disalin",
    reset: "Pakai contoh",
    cta: "Coba NEXBILL gratis 30 hari",
    waText: "Perkiraan kebocoran rental PS saya: {total}/bulan ({year}/tahun).\n- Selisih kas: {cash}\n- Menit tak tertagih: {billing}\n- Listrik TV tanpa sesi: {power}\nHitung sendiri: {url}",
  },
  en: {
    title: "PS Rental Leakage Calculator",
    subtitle: "Enter your outlet's numbers. You'll see an estimate of money lost each month to cash shortfalls, unbilled play minutes, and TVs left on with no session.",
    sectionCash: "Cash shortfall",
    cashShort: "Average cash short per shift (Rp)",
    shifts: "Shifts per day",
    days: "Days open per month",
    sectionBilling: "Unbilled minutes",
    units: "Number of PS / TV units",
    sessions: "Sessions per unit per day",
    minutes: "Unbilled minutes per session",
    minutesHint: "Timer started late or stopped early, rounded down, or a \"bonus\" from staff.",
    rate: "Hourly rate (Rp)",
    sectionPower: "TV power with no session",
    idleTvs: "TVs + consoles left on",
    idleHours: "Hours on with no session per day",
    watts: "TV + console power draw (watts)",
    kwhPrice: "Electricity price per kWh (Rp)",
    kwhHint: "Default Rp1,444.70 (PLN R-1 1,300–2,200 VA & B-2, Oct 2026). Adjust to your own bill.",
    results: "Estimated leakage",
    perMonth: "per month",
    perYear: "{amount} per year",
    minutesNote: "{n} unbilled minutes per month",
    kwhNote: "{n} kWh per month",
    compareTitle: "Compared with NEXBILL's cost",
    starterCost: "Starter for {n} units",
    proCost: "Pro per outlet",
    multiple: "Monthly leakage ≈ {x}× the Starter cost.",
    howTitle: "How NEXBILL helps close it",
    howCash: "Shift close with a physical count by denomination; differences are recorded per cashier, and risky shifts are flagged automatically (Pro).",
    howBilling: "Per-minute timer from the system, sessions stop automatically when time is up, and every session is recorded with the staff name.",
    howPower: "TVs and consoles switch off automatically when a session ends — Android TVs via the NEXBILL TV app/relay, other TVs via a smart plug.",
    disclaimer: "These figures are estimates from your inputs, not a promise of savings. Actual results depend on how the outlet uses the system.",
    shareWa: "Send result via WhatsApp",
    copyLink: "Copy result link",
    copied: "Link copied",
    reset: "Use example",
    cta: "Try NEXBILL free for 30 days",
    waText: "My PS rental leakage estimate: {total}/month ({year}/year).\n- Cash shortfall: {cash}\n- Unbilled minutes: {billing}\n- TV power with no session: {power}\nCalculate yours: {url}",
  },
  ms: {
    title: "Kalkulator Ketirisan Sewa PS",
    subtitle: "Isi angka outlet anda. Hasilnya: anggaran wang yang hilang setiap bulan daripada kekurangan tunai, minit main yang tidak dicaj, dan TV yang menyala tanpa sesi.",
    sectionCash: "Kekurangan tunai",
    cashShort: "Purata tunai kurang setiap syif (Rp)",
    shifts: "Syif sehari",
    days: "Hari buka sebulan",
    sectionBilling: "Minit tidak dicaj",
    units: "Bilangan unit PS / TV",
    sessions: "Sesi setiap unit sehari",
    minutes: "Minit tidak dicaj setiap sesi",
    minutesHint: "Lupa mula/henti pemasa, dibundarkan ke bawah, atau \"bonus\" daripada staf.",
    rate: "Kadar sejam (Rp)",
    sectionPower: "Elektrik TV tanpa sesi",
    idleTvs: "TV + konsol yang terus menyala",
    idleHours: "Jam menyala tanpa sesi sehari",
    watts: "Kuasa TV + konsol (watt)",
    kwhPrice: "Tarif elektrik setiap kWh (Rp)",
    kwhHint: "Lalai Rp1.444,70 (PLN R-1 1.300–2.200 VA & B-2, Okt 2026). Sesuaikan dengan bil anda.",
    results: "Anggaran ketirisan",
    perMonth: "sebulan",
    perYear: "{amount} setahun",
    minutesNote: "{n} minit tidak dicaj sebulan",
    kwhNote: "{n} kWh sebulan",
    compareTitle: "Berbanding kos NEXBILL",
    starterCost: "Starter untuk {n} unit",
    proCost: "Pro setiap outlet",
    multiple: "Ketirisan sebulan ≈ {x}× kos Starter.",
    howTitle: "Cara NEXBILL membantu menutupnya",
    howCash: "Tutup syif dengan kiraan wang fizikal mengikut nilai; perbezaan direkod setiap juruwang, dan syif berisiko ditanda automatik (Pro).",
    howBilling: "Pemasa setiap minit daripada sistem, sesi berhenti automatik apabila masa tamat, dan setiap sesi direkod dengan nama staf.",
    howPower: "TV dan konsol mati automatik apabila sesi tamat — Android TV melalui aplikasi NEXBILL TV/relay, TV lain melalui palam pintar.",
    disclaimer: "Angka di atas ialah anggaran daripada isian anda, bukan janji penjimatan. Hasil sebenar bergantung pada cara outlet menggunakan sistem.",
    shareWa: "Hantar hasil melalui WhatsApp",
    copyLink: "Salin pautan hasil",
    copied: "Pautan disalin",
    reset: "Guna contoh",
    cta: "Cuba NEXBILL percuma 30 hari",
    waText: "Anggaran ketirisan sewa PS saya: {total}/bulan ({year}/tahun).\n- Kekurangan tunai: {cash}\n- Minit tidak dicaj: {billing}\n- Elektrik TV tanpa sesi: {power}\nKira sendiri: {url}",
  },
  th: {
    title: "เครื่องคิดเลขเงินรั่วไหลร้านเช่า PS",
    subtitle: "กรอกตัวเลขของร้าน แล้วดูประมาณการเงินที่หายไปแต่ละเดือนจากเงินสดขาด นาทีเล่นที่ไม่ได้คิดเงิน และทีวีที่เปิดทิ้งไว้โดยไม่มีเซสชัน",
    sectionCash: "เงินสดขาด",
    cashShort: "เงินสดขาดเฉลี่ยต่อกะ (Rp)",
    shifts: "กะต่อวัน",
    days: "วันเปิดต่อเดือน",
    sectionBilling: "นาทีที่ไม่ได้คิดเงิน",
    units: "จำนวนเครื่อง PS / ทีวี",
    sessions: "เซสชันต่อเครื่องต่อวัน",
    minutes: "นาทีที่ไม่ได้คิดเงินต่อเซสชัน",
    minutesHint: "ลืมเริ่ม/หยุดจับเวลา ปัดเศษลง หรือพนักงาน \"แถม\" ให้",
    rate: "ค่าเช่าต่อชั่วโมง (Rp)",
    sectionPower: "ค่าไฟทีวีที่ไม่มีเซสชัน",
    idleTvs: "ทีวี + เครื่องเกมที่เปิดทิ้งไว้",
    idleHours: "ชั่วโมงที่เปิดโดยไม่มีเซสชันต่อวัน",
    watts: "กำลังไฟทีวี + เครื่องเกม (วัตต์)",
    kwhPrice: "ค่าไฟต่อหน่วย kWh (Rp)",
    kwhHint: "ค่าเริ่มต้น Rp1,444.70 (PLN R-1 1,300–2,200 VA และ B-2, ต.ค. 2026) ปรับตามบิลของคุณ",
    results: "ประมาณการเงินรั่วไหล",
    perMonth: "ต่อเดือน",
    perYear: "{amount} ต่อปี",
    minutesNote: "{n} นาทีที่ไม่ได้คิดเงินต่อเดือน",
    kwhNote: "{n} kWh ต่อเดือน",
    compareTitle: "เทียบกับค่าใช้จ่าย NEXBILL",
    starterCost: "Starter สำหรับ {n} เครื่อง",
    proCost: "Pro ต่อร้าน",
    multiple: "เงินรั่วไหลต่อเดือน ≈ {x} เท่าของค่า Starter",
    howTitle: "NEXBILL ช่วยอุดรอยรั่วอย่างไร",
    howCash: "ปิดกะด้วยการนับเงินจริงตามชนิดธนบัตร ส่วนต่างบันทึกตามแคชเชียร์ และกะเสี่ยงถูกแจ้งอัตโนมัติ (Pro)",
    howBilling: "จับเวลารายนาทีจากระบบ เซสชันหยุดอัตโนมัติเมื่อหมดเวลา และทุกเซสชันบันทึกชื่อพนักงาน",
    howPower: "ทีวีและเครื่องเกมปิดอัตโนมัติเมื่อจบเซสชัน — Android TV ผ่านแอป NEXBILL TV/รีเลย์ ทีวีอื่นผ่านสมาร์ทปลั๊ก",
    disclaimer: "ตัวเลขข้างต้นเป็นการประมาณจากข้อมูลที่คุณกรอก ไม่ใช่คำสัญญาว่าจะประหยัดได้ ผลจริงขึ้นกับวิธีที่ร้านใช้ระบบ",
    shareWa: "ส่งผลทาง WhatsApp",
    copyLink: "คัดลอกลิงก์ผลลัพธ์",
    copied: "คัดลอกแล้ว",
    reset: "ใช้ตัวอย่าง",
    cta: "ทดลองใช้ NEXBILL ฟรี 30 วัน",
    waText: "ประมาณการเงินรั่วไหลร้านเช่า PS ของฉัน: {total}/เดือน ({year}/ปี)\n- เงินสดขาด: {cash}\n- นาทีที่ไม่ได้คิดเงิน: {billing}\n- ค่าไฟทีวีที่ไม่มีเซสชัน: {power}\nคำนวณเอง: {url}",
  },
  vi: {
    title: "Máy tính thất thoát tiệm cho thuê PS",
    subtitle: "Nhập số liệu của tiệm. Kết quả: ước tính tiền mất mỗi tháng do thiếu tiền mặt, phút chơi không tính tiền và TV bật khi không có phiên.",
    sectionCash: "Thiếu tiền mặt",
    cashShort: "Thiếu tiền mặt trung bình mỗi ca (Rp)",
    shifts: "Ca mỗi ngày",
    days: "Ngày mở cửa mỗi tháng",
    sectionBilling: "Phút không tính tiền",
    units: "Số máy PS / TV",
    sessions: "Phiên mỗi máy mỗi ngày",
    minutes: "Phút không tính tiền mỗi phiên",
    minutesHint: "Quên bật/tắt đồng hồ, làm tròn xuống, hoặc nhân viên \"tặng thêm\".",
    rate: "Giá mỗi giờ (Rp)",
    sectionPower: "Điện TV khi không có phiên",
    idleTvs: "TV + máy chơi game vẫn bật",
    idleHours: "Số giờ bật không có phiên mỗi ngày",
    watts: "Công suất TV + máy (watt)",
    kwhPrice: "Giá điện mỗi kWh (Rp)",
    kwhHint: "Mặc định Rp1.444,70 (PLN R-1 1.300–2.200 VA & B-2, 10/2026). Điều chỉnh theo hóa đơn của bạn.",
    results: "Ước tính thất thoát",
    perMonth: "mỗi tháng",
    perYear: "{amount} mỗi năm",
    minutesNote: "{n} phút không tính tiền mỗi tháng",
    kwhNote: "{n} kWh mỗi tháng",
    compareTitle: "So với chi phí NEXBILL",
    starterCost: "Starter cho {n} máy",
    proCost: "Pro mỗi tiệm",
    multiple: "Thất thoát mỗi tháng ≈ {x} lần chi phí Starter.",
    howTitle: "NEXBILL giúp bịt thất thoát thế nào",
    howCash: "Chốt ca bằng đếm tiền thực theo mệnh giá; chênh lệch ghi theo từng thu ngân, ca rủi ro được đánh dấu tự động (Pro).",
    howBilling: "Đồng hồ tính theo phút từ hệ thống, phiên tự dừng khi hết giờ, mỗi phiên ghi tên nhân viên.",
    howPower: "TV và máy tự tắt khi hết phiên — Android TV qua ứng dụng NEXBILL TV/relay, TV khác qua ổ cắm thông minh.",
    disclaimer: "Các số trên là ước tính từ dữ liệu bạn nhập, không phải cam kết tiết kiệm. Kết quả thực tế phụ thuộc cách tiệm sử dụng hệ thống.",
    shareWa: "Gửi kết quả qua WhatsApp",
    copyLink: "Sao chép liên kết kết quả",
    copied: "Đã sao chép",
    reset: "Dùng ví dụ",
    cta: "Dùng thử NEXBILL miễn phí 30 ngày",
    waText: "Ước tính thất thoát tiệm PS của tôi: {total}/tháng ({year}/năm).\n- Thiếu tiền mặt: {cash}\n- Phút không tính tiền: {billing}\n- Điện TV không có phiên: {power}\nTự tính: {url}",
  },
  fil: {
    title: "Leakage Calculator ng PS Rental",
    subtitle: "Ilagay ang mga numero ng outlet ninyo. Makikita ang tantiya ng perang nawawala bawat buwan dahil sa kulang na cash, minutong hindi nasingil, at TV na nakabukas kahit walang session.",
    sectionCash: "Kulang na cash",
    cashShort: "Karaniwang kulang na cash bawat shift (Rp)",
    shifts: "Shift bawat araw",
    days: "Araw na bukas bawat buwan",
    sectionBilling: "Minutong hindi nasingil",
    units: "Bilang ng PS / TV unit",
    sessions: "Session bawat unit bawat araw",
    minutes: "Minutong hindi nasingil bawat session",
    minutesHint: "Nakalimutang simulan/ihinto ang timer, binilog pababa, o \"bonus\" ng staff.",
    rate: "Singil bawat oras (Rp)",
    sectionPower: "Kuryente ng TV na walang session",
    idleTvs: "TV + console na nakabukas",
    idleHours: "Oras na nakabukas nang walang session bawat araw",
    watts: "Konsumo ng TV + console (watt)",
    kwhPrice: "Presyo ng kuryente bawat kWh (Rp)",
    kwhHint: "Default Rp1,444.70 (PLN R-1 1,300–2,200 VA at B-2, Okt 2026). Iayon sa sariling bill.",
    results: "Tantiyang leakage",
    perMonth: "bawat buwan",
    perYear: "{amount} bawat taon",
    minutesNote: "{n} minutong hindi nasingil bawat buwan",
    kwhNote: "{n} kWh bawat buwan",
    compareTitle: "Kumpara sa gastos ng NEXBILL",
    starterCost: "Starter para sa {n} unit",
    proCost: "Pro bawat outlet",
    multiple: "Leakage bawat buwan ≈ {x}× ng gastos ng Starter.",
    howTitle: "Paano tumutulong ang NEXBILL",
    howCash: "Pagsara ng shift na may aktwal na bilang ng pera ayon sa denominasyon; nakatala ang diperensya bawat kahera, at awtomatikong minamarkahan ang risky na shift (Pro).",
    howBilling: "Per-minutong timer mula sa sistema, kusang humihinto ang session pag ubos na ang oras, at nakatala ang bawat session kasama ang pangalan ng staff.",
    howPower: "Kusang namamatay ang TV at console pag tapos ang session — Android TV sa pamamagitan ng NEXBILL TV app/relay, ibang TV sa smart plug.",
    disclaimer: "Mga tantiya lang ito mula sa inilagay ninyo, hindi pangakong makakatipid. Nakadepende ang totoong resulta sa paggamit ng outlet sa sistema.",
    shareWa: "Ipadala ang resulta sa WhatsApp",
    copyLink: "Kopyahin ang link ng resulta",
    copied: "Nakopya na",
    reset: "Gamitin ang halimbawa",
    cta: "Subukan ang NEXBILL nang libre sa loob ng 30 araw",
    waText: "Tantiyang leakage ng PS rental ko: {total}/buwan ({year}/taon).\n- Kulang na cash: {cash}\n- Minutong hindi nasingil: {billing}\n- Kuryente ng TV na walang session: {power}\nKalkulahin: {url}",
  },
};

const rupiah = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

function pickLang(param: string | null): Lang {
  const all = LANGS.map((l) => l.code) as string[];
  if (param && all.includes(param)) return param as Lang;
  if (typeof navigator !== "undefined") {
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("tl") || nav.startsWith("fil")) return "fil";
    const two = nav.slice(0, 2);
    if (all.includes(two)) return two as Lang;
  }
  return "id";
}

/** Kolom angka yang boleh dikosongkan sementara saat mengetik (tidak memaksa "0" kembali). */
function NumField({ label, hint, value, onChange, min, max, step }: { label: string; hint?: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number }) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <label className="block space-y-1">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        type="text"
        inputMode={step && step < 1 ? "decimal" : "numeric"}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-base tabular-nums text-white outline-none focus:border-cyan-400/60"
        value={text}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setFocused(false);
          setText(String(value));
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.,]/g, "").replace(",", ".");
          setText(raw);
          const n = Number(raw);
          if (raw !== "" && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      {hint && <span className="block text-[11px] leading-snug text-slate-500">{hint}</span>}
    </label>
  );
}

export default function LeakageCalculatorPage() {
  // useSearchParams() wajib di dalam Suspense (Next.js App Router).
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#050914]" />}>
      <LeakageCalculator />
    </Suspense>
  );
}

function LeakageCalculator() {
  const search = useSearchParams();
  const [lang, setLang] = useState<Lang>("id");
  const [input, setInput] = useState<LeakageInput>(DEFAULT_LEAKAGE_INPUT);
  const [copied, setCopied] = useState(false);
  const [pricing, setPricing] = useState<{ perUnit: number; minUnits: number; pro: number }>({ perUnit: DEFAULT_PRICING.starterPerUnit, minUnits: DEFAULT_PRICING.starterMinUnits, pro: DEFAULT_PRICING.proFlat });
  const t = TXT[lang];

  useEffect(() => {
    setLang(pickLang(search.get("lang")));
    if (search.get("unit")) setInput(leakageFromParams(new URLSearchParams(search.toString())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Harga terkini dari Platform Admin (Rupiah); bila gagal, harga bawaan tetap dipakai.
  useEffect(() => {
    fetch("/api/public/pricing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { plans?: { code: string; tier?: string; minUnits?: number; byLang?: Record<string, { priceCurrent: number; currency: string }> }[] } | null) => {
        const starter = d?.plans?.find((p) => p.tier === "starter" || p.code === "starter");
        const pro = d?.plans?.find((p) => p.tier === "pro" || p.code === "pro");
        const s = starter?.byLang?.id;
        const p = pro?.byLang?.id;
        setPricing((cur) => ({
          perUnit: s && s.currency === "IDR" && s.priceCurrent > 0 ? s.priceCurrent : cur.perUnit,
          minUnits: starter?.minUnits ?? cur.minUnits,
          pro: p && p.currency === "IDR" && p.priceCurrent > 0 ? p.priceCurrent : cur.pro,
        }));
      })
      .catch(() => {});
  }, []);

  const result = useMemo(() => computeLeakage(input), [input]);
  const starterCost = starterMonthlyCost(input.units, pricing.perUnit, pricing.minUnits);
  const multiple = leakageMultiple(result.totalPerMonth, starterCost);
  const shareUrl = useMemo(() => {
    const p = leakageToParams(input);
    if (lang !== "id") p.set("lang", lang);
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nexbill.id";
    return `${origin}/kalkulator-kebocoran?${p.toString()}`;
  }, [input, lang]);

  const set = (key: keyof LeakageInput) => (n: number) => setInput((cur) => ({ ...cur, [key]: n }));
  const field = (key: keyof LeakageInput, label: string, hint?: string, step?: number) => (
    <NumField label={label} hint={hint} value={input[key]} onChange={set(key)} min={LEAKAGE_LIMITS[key].min} max={LEAKAGE_LIMITS[key].max} step={step} />
  );

  const rows = [
    { key: "cash", label: t.sectionCash, amount: result.cashPerMonth, note: null as string | null, color: "bg-rose-400" },
    { key: "billing", label: t.sectionBilling, amount: result.unbilledPerMonth, note: t.minutesNote.replace("{n}", result.unbilledMinutesPerMonth.toLocaleString("id-ID")), color: "bg-amber-400" },
    { key: "power", label: t.sectionPower, amount: result.powerPerMonth, note: t.kwhNote.replace("{n}", result.kwhPerMonth.toLocaleString("id-ID")), color: "bg-sky-400" },
  ];
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount));

  const waText = t.waText
    .replace("{total}", rupiah(result.totalPerMonth))
    .replace("{year}", rupiah(result.totalPerYear))
    .replace("{cash}", rupiah(result.cashPerMonth))
    .replace("{billing}", rupiah(result.unbilledPerMonth))
    .replace("{power}", rupiah(result.powerPerMonth))
    .replace("{url}", shareUrl);

  const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5";

  return (
    <main className="min-h-screen bg-[#050914] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <Link href="/" className="text-sm font-bold tracking-wide text-cyan-300">NEXBILL</Link>
            <h1 className="mt-1 text-2xl font-bold md:text-4xl">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-400 md:text-base">{t.subtitle}</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-white/10 p-1 text-xs">
            {LANGS.map((l) => (
              <button key={l.code} type="button" onClick={() => setLang(l.code)} className={`rounded-md px-2 py-1 ${lang === l.code ? "bg-cyan-500/20 text-cyan-200" : "text-slate-400 hover:text-white"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <section className={card}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-rose-400" />{t.sectionCash}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {field("cashShortPerShift", t.cashShort)}
                {field("shiftsPerDay", t.shifts)}
                {field("daysOpenPerMonth", t.days)}
              </div>
            </section>
            <section className={card}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />{t.sectionBilling}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {field("units", t.units)}
                {field("sessionsPerUnitPerDay", t.sessions)}
                {field("unbilledMinutesPerSession", t.minutes, t.minutesHint)}
                {field("ratePerHour", t.rate)}
              </div>
            </section>
            <section className={card}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" />{t.sectionPower}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {field("idleTvs", t.idleTvs)}
                {field("idleHoursPerDay", t.idleHours, undefined, 0.5)}
                {field("wattsPerTv", t.watts)}
                {field("pricePerKwh", t.kwhPrice, t.kwhHint, 0.01)}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <section className={`${card} border-cyan-400/30`}>
              <div className="text-sm text-slate-400">{t.results}</div>
              <div className="mt-1 text-4xl font-black tabular-nums text-white md:text-5xl">{rupiah(result.totalPerMonth)}</div>
              <div className="text-sm text-slate-400">{t.perMonth} · {t.perYear.replace("{amount}", rupiah(result.totalPerYear))}</div>
              <div className="mt-4 space-y-3">
                {rows.map((r) => (
                  <div key={r.key}>
                    <div className="flex justify-between text-sm">
                      <span>{r.label}</span>
                      <span className="font-semibold tabular-nums">{rupiah(r.amount)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.amount / maxAmount) * 100}%` }} />
                    </div>
                    {r.note && <div className="mt-0.5 text-[11px] text-slate-500">{r.note}</div>}
                  </div>
                ))}
              </div>
            </section>

            <section className={card}>
              <div className="mb-2 text-sm font-semibold">{t.compareTitle}</div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">{t.starterCost.replace("{n}", String(Math.max(Math.ceil(input.units), pricing.minUnits)))}</span><span className="tabular-nums">{rupiah(starterCost)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">{t.proCost}</span><span className="tabular-nums">{rupiah(pricing.pro)}</span></div>
              {multiple !== null && multiple > 0 && <p className="mt-2 text-sm text-emerald-300">{t.multiple.replace("{x}", multiple.toLocaleString("id-ID"))}</p>}
            </section>

            <section className={card}>
              <div className="mb-2 text-sm font-semibold">{t.howTitle}</div>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />{t.howCash}</li>
                <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />{t.howBilling}</li>
                <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-400" />{t.howPower}</li>
              </ul>
            </section>

            <div className="flex flex-wrap gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">{t.shareWa}</a>
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                onClick={() => navigator.clipboard?.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
              >
                {copied ? t.copied : t.copyLink}
              </button>
              <button type="button" className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white" onClick={() => setInput(DEFAULT_LEAKAGE_INPUT)}>{t.reset}</button>
            </div>
            <a href="https://dashboard.nexbill.id/daftar" className="block rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-center font-semibold text-white">{t.cta}</a>
            <p className="text-[11px] leading-snug text-slate-500">{t.disclaimer}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
