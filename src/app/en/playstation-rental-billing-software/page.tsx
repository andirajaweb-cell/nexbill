import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// EN counterpart of /billing-rental-ps (docs/SEO-ARCHITECTURE.md §2-3, §7) — primary keyword
// "PlayStation rental billing software". Not a literal translation: same verified facts, written
// natively for an English-first searcher (MY/SG/PH B2B software search commonly stays in English).
export const metadata: Metadata = {
  title: "PlayStation Rental Billing Software — NEXBILL",
  description:
    "Billing software for PlayStation rentals that calculates charges automatically down to the second — hourly, saver-package, and member rates, no manual math. Free 30-day trial.",
  alternates: {
    canonical: `${SITE_URL}/en/playstation-rental-billing-software`,
    languages: {
      "en-US": `${SITE_URL}/en/playstation-rental-billing-software`,
      "id-ID": `${SITE_URL}/billing-rental-ps`,
    },
  },
};

const FAQ = [
  {
    q: "How does NEXBILL calculate a PS rental bill?",
    a: "The moment staff tap start, the system times the session down to the second and converts it straight into a bill at whatever rate applies — hourly, saver package, or member pricing — with no stopwatch or manual calculator involved.",
  },
  {
    q: "Can billing differ for regular, saver-package, and member rates?",
    a: "Yes. All three rate types are configured up front per unit or package, and the system automatically applies the right one as the session runs — so rates never get mixed up from manual calculation.",
  },
  {
    q: "What happens if there's a cash discrepancy at shift close?",
    a: "At shift close, staff count physical cash by denomination and the system automatically reconciles it against the total transactions logged that shift — any discrepancy shows up immediately in the report, not days later.",
  },
  {
    q: "Which payment methods are accepted?",
    a: "Cash, QRIS, e-wallets, and debit/credit cards — all rolled into one bill for rental, food & drink, and accessory charges, with no manual splitting of receipts.",
  },
];

export default function PlaystationRentalBillingSoftwarePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="en"
        breadcrumbHome="Home"
        breadcrumbCurrent="PlayStation Rental Billing Software"
        kicker="PlayStation Rental Billing Software"
        h1="PlayStation Rental Billing Software, Accurate to the Second"
        lede="NEXBILL calculates PlayStation rental charges automatically from the first second to the last — hourly rates, saver packages, and member pricing are never hand-calculated again, so your rental cash stops quietly leaking every shift."
        ctaLabel="Start Free for 30 Days"
        ctaSecondaryLabel="See Pricing"
        painSection={{
          kicker: "Why Manual Billing Costs You",
          title: "This is where cash leakage usually happens",
          sub: "Not theft — just manual, repetitive calculation, every single day.",
        }}
        painPoints={[
          { word: "CASH LEAKS", title: "Invisible cash leakage", desc: "Small duration-counting discrepancies between shifts — multiplied by dozens of transactions a day, that can add up to millions in losses a month without anyone noticing." },
          { word: "RATE ERRORS", title: "Miscalculated rental rates", desc: "Hourly rates, saver packages, and member pricing easily get mixed up when calculated by hand — customers complain, or the outlet loses money from undercharging." },
          { word: "DEPOSIT LEAKS", title: "Customer deposits go untracked", desc: "Deposits noted on paper or just remembered by staff — easy to forget to return, or worse, quietly used to cover a cash shortfall." },
          { word: "HIDDEN PROFIT", title: "Owners don't know real profit", desc: "Busy doesn't mean profitable — without a clean report of costs versus revenue, owners often don't realize they're losing money until it's too late." },
        ]}
        featureSection={{
          kicker: "Billing System",
          title: "Four features that close billing gaps immediately",
          sub: "From a per-second precision timer to a shift report that reconciles itself.",
        }}
        features={[
          { title: "Per-Second Precision Rental Timer", desc: "Tap start, and the system automatically calculates duration and billing down to the second — accurate for hourly rates, saver packages, or member pricing, with no stopwatch or manual calculator needed." },
          { title: "POS with Multiple Payment Methods", desc: "Rental, food & drink, and accessory transactions become one bill. Accept cash, QRIS, e-wallets, and cards — no more manually splitting up receipts." },
          { title: "Shift Management & Financial Reports", desc: "Close a shift by counting cash by denomination, automatically reconciled by the system. Profit & loss and cash flow stay tidy with no manual Excel recaps." },
          { title: "Membership & Customer CRM", desc: "A membership system with balance/points, visit history, and a customer trust score (fraud database) — spot problem customers before they cost your outlet." },
        ]}
        quote="Since switching to NEXBILL, closing a shift takes 5 minutes — it used to take an hour."
        quoteAuthor="— Gaming Corner Outlet, Jakarta"
        pricing={{
          title: "One price, every billing feature",
          sub: "No hidden fees — the only cost beyond your subscription is an optional Smart Plug unit for automatic TV/console control.",
          priceOld: "Rp399,000",
          priceNow: "Rp249,000",
          period: "/month",
          feats: [
            "Every feature — POS, booking, financial reports & accounting",
            "Automatic TV control (Android system & smart plug)",
            "Unlimited consoles, users, & outlets included",
            "Free new feature updates forever",
          ],
          cta: "Start Subscription",
        }}
        faqTitle="FAQ: PlayStation rental billing software"
        faq={FAQ}
        relatedTitle="Explore NEXBILL from another angle"
        related={[
          { label: "See NEXBILL as a rental app →", href: "/en/playstation-rental-app" },
          { label: "Full management software with unit control →", href: "/en/playstation-rental-management-software" },
          { label: "End-to-end system for multi-branch outlets →", href: "/en/ps-rental-system" },
        ]}
      />
    </>
  );
}
