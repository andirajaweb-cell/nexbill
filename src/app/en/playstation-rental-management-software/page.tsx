import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// EN counterpart of /software-rental-ps — primary keyword "PlayStation rental management
// software". Angle: comprehensive, integrated software stack (9 modules).
export const metadata: Metadata = {
  title: "PlayStation Rental Management Software — NEXBILL",
  description:
    "PlayStation rental management software with 9 integrated modules: automatic TV/console control, online booking, membership, and P&L reports. Not just a POS.",
  alternates: {
    canonical: `${SITE_URL}/en/playstation-rental-management-software`,
    languages: {
      "en-US": `${SITE_URL}/en/playstation-rental-management-software`,
      "id-ID": `${SITE_URL}/software-rental-ps`,
    },
  },
};

const FAQ = [
  {
    q: "What sets NEXBILL apart from a basic POS app?",
    a: "POS is just one of nine modules — NEXBILL also handles automatic TV/console control, online booking, membership management, staff access rights, and financial reporting, all connected within one software.",
  },
  {
    q: "Can this software control TVs and consoles automatically?",
    a: "Yes, with an optional smart plug — TVs and consoles turn on automatically when a session starts and off when time runs out, so staff never have to walk to each unit.",
  },
  {
    q: "Which TV types does this software support?",
    a: "It works with analog TVs, Smart OS TVs, and Android TV. Automatic on/off control needs an extra smart plug for non-Android TVs; Android TV units can already be controlled directly through the software with no extra hardware.",
  },
  {
    q: "Can this software scale as I open more branches?",
    a: "Yes — from a single outlet with one unit to a multi-branch operation with dozens of consoles, it's the same software, just at a different scale, managed from one owner account.",
  },
];

export default function PlaystationRentalManagementSoftwarePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="en"
        breadcrumbHome="Home"
        breadcrumbCurrent="PlayStation Rental Management Software"
        kicker="PlayStation Rental Management Software"
        h1="PlayStation Rental Management Software — Not Just a POS"
        lede="NEXBILL isn't a bolted-on cashier app — nine integrated modules cover the entire PlayStation rental operation, from automatic TV/console control and online booking to profit & loss reporting, in one software that scales with your outlet."
        ctaLabel="Start Free for 30 Days"
        ctaSecondaryLabel="See Pricing"
        painSection={{
          kicker: "Why Disconnected Software Fails",
          title: "A PS rental business needs more than just a POS",
          sub: "When unit control, booking, and financial reporting each live in a different app, the data never actually connects.",
        }}
        painPoints={[
          { word: "MANUAL TV", title: "Still turning TVs on/off by hand", desc: "Staff have to walk to every unit to manually switch the TV and console on or off each session — wasting time and risking sessions running past their limit." },
          { word: "IDLE UNITS", title: "Idle units nobody notices", desc: "A console that rarely gets rented still costs power and upkeep while earning nothing — without per-unit usage data, it's hard to know which one to promote or sell." },
          { word: "CASH LEAKS", title: "Invisible cash leakage", desc: "Small duration-counting discrepancies between shifts — multiplied by dozens of transactions a day, that can add up to millions in losses a month without anyone noticing." },
          { word: "UNIT CHAOS", title: "Messy PS/TV unit management", desc: "Every unit (PS4, PS5) is in different condition. Without per-unit tracking, customers easily complain about being handed the wrong unit." },
        ]}
        featureSection={{
          kicker: "One Software, Nine Modules",
          title: "Coverage that spans the entire operation",
          sub: "From the front counter to the owner's P&L report — no extra software needed.",
        }}
        features={[
          { title: "Automatic TV & Console Control", desc: "TVs and consoles turn on automatically when a session starts and off when time runs out — integrated with smart plugs, so staff never have to walk to each unit." },
          { title: "PS4, PS5 & PS6 Unit Management", desc: "Every unit is tracked separately with its condition, TV type, and usage history. Online booking customers know exactly which generation of unit is free and its specs." },
          { title: "Multi-Outlet & Multi-Branch", desc: "Manage many branches from one owner account. Track revenue, staff, and performance per outlet or combined, in real time, straight from your phone." },
          { title: "POS with Multiple Payment Methods", desc: "Rental, food & drink, and accessory transactions become one bill. Accept cash, QRIS, e-wallets, and cards — no more manually splitting up receipts." },
        ]}
        quote="Since switching to NEXBILL, closing a shift takes 5 minutes — it used to take an hour."
        quoteAuthor="— Gaming Corner Outlet, Jakarta"
        pricing={{
          title: "One price, one software, nine modules",
          sub: "No hidden fees — the only cost beyond your subscription is an optional Smart Plug unit for automatic TV/console control.",
          priceOld: "Rp399,000",
          priceNow: "Rp249,000",
          period: "/month",
          feats: [
            "Automatic TV control (Android system & smart plug)",
            "Customer trust-score database (fraud) feature",
            "Every feature — POS, booking, financial reports & accounting",
            "Free new feature updates forever",
          ],
          cta: "Start Subscription",
        }}
        faqTitle="FAQ: PlayStation rental management software"
        faq={FAQ}
        relatedTitle="Explore NEXBILL from another angle"
        related={[
          { label: "The POS & per-second billing side →", href: "/en/playstation-rental-billing-software" },
          { label: "The simplest version, as an app →", href: "/en/playstation-rental-app" },
          { label: "How this works for multi-branch outlets →", href: "/en/ps-rental-system" },
        ]}
      />
    </>
  );
}
