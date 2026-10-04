import Link from "next/link";
import { Breadcrumb } from "@/components/seo/Breadcrumb";
import { DEFAULT_PRICING } from "@/lib/subscription/pricing";

// Shared shell for NexBill's SEO pillar pages (docs/SEO-ARCHITECTURE.md §2-3). Deliberately NOT
// built on the homepage's SiteNavbar/SiteFooter/LanguageProvider system: those default to "id" on
// every server render (see landing-i18n.tsx's LanguageProvider — it only reads the saved language
// from localStorage after hydration), which would show an Indonesian navbar around English pillar
// content on first paint for a visitor landing here from Google. Pillar pages are fixed-language
// by design — that's the whole point of giving each language its own real URL instead of a
// client-side switcher — so this ships its own small, always-correct-language header/footer.
//
// FAQ uses native <details>/<summary> — expand/collapse with zero JavaScript, which keeps these
// pages server-rendered with no client bundle at all (good for Core Web Vitals) while staying
// fully accessible and crawlable (all Q&A text is in the initial HTML either way).

export interface PillarSectionCopy {
  kicker: string;
  title: string;
  sub: string;
}

export interface PillarPageProps {
  lang: "id" | "en";
  breadcrumbHome: string;
  breadcrumbCurrent: string;
  kicker: string;
  h1: string;
  lede: string;
  ctaLabel: string;
  ctaSecondaryLabel: string;
  painSection: PillarSectionCopy;
  painPoints: { word: string; title: string; desc: string }[];
  featureSection: PillarSectionCopy;
  features: { title: string; desc: string }[];
  quote: string;
  quoteAuthor: string;
  // Harga paket Starter & Pro dirender dari DEFAULT_PRICING (lib/subscription/pricing.ts) —
  // halaman pilar hanya memberi judul/sub/CTA, angka tidak ditulis ulang di tiap halaman.
  pricing: {
    title: string;
    sub: string;
    cta: string;
  };
  faqTitle: string;
  faq: { q: string; a: string }[];
  relatedTitle: string;
  related: { label: string; href: string }[];
}

const fmtRp = (lang: "id" | "en", n: number) => `Rp${n.toLocaleString(lang === "id" ? "id-ID" : "en-US")}`;

/** Kartu harga Starter & Pro (struktur harga 2026-10) per bahasa halaman pilar. */
function pillarPlans(lang: "id" | "en") {
  const P = DEFAULT_PRICING;
  if (lang === "id") {
    return [
      {
        name: "Starter",
        price: fmtRp(lang, P.starterPerUnit),
        period: "/unit/bulan",
        note: `Minimal ${P.starterMinUnits} unit (mulai ${fmtRp(lang, P.starterPerUnit * P.starterMinUnits)}/bulan) · tahunan bayar ${P.annualMonthsCharged} bulan, aktif 12 bulan`,
        feats: ["Billing & timer sewa presisi detik", "Kasir F&B, booking online & membership", "Kontrol TV otomatis (Android TV & smart plug)", "QR pelanggan per bilik", "AI tersedia sebagai Add-on"],
        highlight: false,
      },
      {
        name: "Pro",
        price: fmtRp(lang, P.proFlat),
        period: "/outlet/bulan",
        note: `Unit tak terbatas · cabang ke-2 dst hemat ${P.multiOutletDiscountPct}% · tahunan bayar ${P.annualMonthsCharged} bulan, aktif 12 bulan`,
        feats: ["Semua fitur Starter + unit PS tak terbatas", "Akuntansi & laporan keuangan lengkap", "Manajemen aset, PPOB & rental ke rumah", "Kontrol anti-fraud shift & AI Business Assistant", "Multi-cabang & update fitur baru gratis selamanya"],
        highlight: true,
      },
    ];
  }
  return [
    {
      name: "Starter",
      price: fmtRp(lang, P.starterPerUnit),
      period: "/unit/month",
      note: `Minimum ${P.starterMinUnits} units (from ${fmtRp(lang, P.starterPerUnit * P.starterMinUnits)}/month) · yearly: pay ${P.annualMonthsCharged} months, get 12`,
      feats: ["Rental billing & per-second timers", "F&B cashier, online booking & membership", "Automatic TV control (Android TV & smart plug)", "Customer QR per booth", "AI available as an add-on"],
      highlight: false,
    },
    {
      name: "Pro",
      price: fmtRp(lang, P.proFlat),
      period: "/outlet/month",
      note: `Unlimited units · additional branches save ${P.multiOutletDiscountPct}% · yearly: pay ${P.annualMonthsCharged} months, get 12`,
      feats: ["Everything in Starter + unlimited PS units", "Full accounting & financial reports", "Asset management, bill payments (PPOB) & home rental", "Shift anti-fraud controls & AI Business Assistant", "Multi-branch & free feature updates forever"],
      highlight: true,
    },
  ];
}

const NAV_LABELS = {
  id: { home: "Beranda", pricing: "Harga", faq: "FAQ", login: "Masuk", signup: "Daftar Gratis", backHome: "← Kembali ke NEXBILL.id" },
  en: { home: "Home", pricing: "Pricing", faq: "FAQ", login: "Log In", signup: "Start Free", backHome: "← Back to NEXBILL.id" },
} as const;

export function PillarNav({ lang }: { lang: "id" | "en" }) {
  const t = NAV_LABELS[lang];
  return (
    <header className="border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold tracking-wide text-white">
          NEX<span className="text-cyan-400">BILL</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-neutral-400">
          <Link href="/#harga" className="hover:text-white transition-colors hidden sm:inline">{t.pricing}</Link>
          <Link href="/#faq" className="hover:text-white transition-colors hidden sm:inline">{t.faq}</Link>
          <Link href="/login" className="hover:text-white transition-colors">{t.login}</Link>
          <Link href="/daftar" className="rounded-full bg-blue-500 px-4 py-1.5 text-white font-semibold hover:bg-blue-400 transition-colors">
            {t.signup}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PillarFooter({ lang }: { lang: "id" | "en" }) {
  const t = NAV_LABELS[lang];
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-neutral-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/" className="hover:text-cyan-400 transition-colors">{t.backHome}</Link>
        <div className="flex items-center gap-4">
          <Link href="/kebijakan-cookie" className="hover:text-cyan-400 transition-colors">Cookie</Link>
          <Link href="/syarat-ketentuan" className="hover:text-cyan-400 transition-colors">Terms</Link>
          <Link href="/kebijakan-privasi" className="hover:text-cyan-400 transition-colors">Privacy</Link>
          <span>© 2026 NEXBILL</span>
        </div>
      </div>
    </footer>
  );
}

export function PillarPage(props: PillarPageProps) {
  const t = NAV_LABELS[props.lang];

  return (
    <div className="min-h-screen bg-[#050810] text-[#eef2fb]">
      <PillarNav lang={props.lang} />

      <main className="max-w-6xl mx-auto px-4">
        {/* HERO */}
        <section className="pt-8 pb-16 max-w-3xl">
          <Breadcrumb items={[{ label: props.breadcrumbHome, href: "/" }, { label: props.breadcrumbCurrent }]} />
          <div className="mt-5 text-xs font-semibold tracking-widest text-cyan-400 uppercase">{props.kicker}</div>
          <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-black leading-tight">{props.h1}</h1>
          <p className="mt-5 text-base sm:text-lg text-neutral-400 leading-relaxed">{props.lede}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/daftar" className="rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 transition-colors">
              {props.ctaLabel}
            </Link>
            <Link href="/#harga" className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-neutral-200 hover:border-white/30 transition-colors">
              {props.ctaSecondaryLabel}
            </Link>
          </div>
        </section>

        {/* PAIN POINTS */}
        <section className="py-14 border-t border-white/5">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">{props.painSection.kicker}</div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold">{props.painSection.title}</h2>
            <p className="mt-3 text-neutral-400">{props.painSection.sub}</p>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {props.painPoints.map((p, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-[11px] font-bold tracking-wider text-red-400/80">{p.word}</div>
                <div className="mt-1.5 font-semibold text-white">{p.title}</div>
                <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-14 border-t border-white/5">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">{props.featureSection.kicker}</div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold">{props.featureSection.title}</h2>
            <p className="mt-3 text-neutral-400">{props.featureSection.sub}</p>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            {props.features.map((f, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="font-semibold text-white">{f.title}</div>
                <p className="mt-1.5 text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PROOF */}
        <section className="py-14 border-t border-white/5">
          <blockquote className="max-w-2xl">
            <p className="text-xl sm:text-2xl font-medium text-neutral-200 leading-snug">&ldquo;{props.quote}&rdquo;</p>
            <cite className="mt-4 block text-sm text-neutral-500 not-italic">{props.quoteAuthor}</cite>
          </blockquote>
        </section>

        {/* PRICING */}
        <section id="harga" className="py-14 border-t border-white/5">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold">{props.pricing.title}</h2>
            <p className="mt-3 text-neutral-400">{props.pricing.sub}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-3xl">
            {pillarPlans(props.lang).map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-6 bg-white/[0.03] ${plan.highlight ? "border-cyan-400/40" : "border-white/10"}`}>
                <div className="text-sm font-semibold uppercase tracking-wider text-neutral-400">{plan.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-neutral-500">{plan.period}</span>
                </div>
                <p className="mt-1 text-xs text-emerald-300/90">{plan.note}</p>
                <ul className="mt-5 space-y-2">
                  {plan.feats.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                      <span className="text-cyan-400 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/daftar"
                  className={`mt-6 block text-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${plan.highlight ? "bg-blue-500 text-white hover:bg-blue-400" : "border border-white/15 text-neutral-200 hover:bg-white/5"}`}
                >
                  {props.pricing.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ — native <details>/<summary>, no JS needed */}
        <section id="faq" className="py-14 border-t border-white/5">
          <h2 className="text-2xl sm:text-3xl font-bold max-w-2xl">{props.faqTitle}</h2>
          <div className="mt-8 max-w-2xl divide-y divide-white/5">
            {props.faq.map((item, i) => (
              <details key={i} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-white">
                  {item.q}
                  <span className="ml-4 text-neutral-500 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* RELATED PILLARS — internal linking, varied anchor text per page (t.related) */}
        <section className="py-14 border-t border-white/5">
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide">{props.relatedTitle}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {props.related.map((r, i) => (
              <li key={i}>
                <Link
                  href={r.href}
                  className="inline-block rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-300 hover:border-cyan-400/40 hover:text-cyan-300 transition-colors"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <PillarFooter lang={props.lang} />
    </div>
  );
}

// Builds FAQPage JSON-LD from the same faq array PillarPage renders — never diverges from visible
// copy (same principle as the homepage FAQ and the Breadcrumb component).
export function pillarFaqJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
