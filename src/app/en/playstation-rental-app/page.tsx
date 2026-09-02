import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// EN counterpart of /aplikasi-rental-ps — primary keyword "PlayStation rental app". Angle:
// simplicity, one app replacing scattered tools.
export const metadata: Metadata = {
  title: "PlayStation Rental App — NEXBILL",
  description:
    "A PlayStation rental app to manage POS, PS4/PS5 units, online booking, and multiple branches from your phone. One app, no spreadsheets. Free 30-day trial.",
  alternates: {
    canonical: `${SITE_URL}/en/playstation-rental-app`,
    languages: {
      "en-US": `${SITE_URL}/en/playstation-rental-app`,
      "id-ID": `${SITE_URL}/aplikasi-rental-ps`,
    },
  },
};

const FAQ = [
  {
    q: "Do I need to install this app, or can I use it from a browser?",
    a: "It runs straight from your phone, tablet, or POS computer — no complicated install. Staff just log in with their own account.",
  },
  {
    q: "Is this app hard for new staff to learn?",
    a: "Initial setup usually takes only 30–60 minutes remotely, and the daily workflow is simple: staff tap start/stop on each unit, and the system handles the rest automatically.",
  },
  {
    q: "Can customers book online without a separate app?",
    a: "Yes. Customers check open slots and book themselves through your outlet's page, with automatic WhatsApp confirmations and reminders — all from the same app your staff use at the counter.",
  },
  {
    q: "Can I monitor multiple branches from one app?",
    a: "Yes. Owners can track revenue, staff, and performance per outlet or combined, in real time, straight from a phone — no separate app per branch.",
  },
];

export default function PlaystationRentalAppPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="en"
        breadcrumbHome="Home"
        breadcrumbCurrent="PlayStation Rental App"
        kicker="PlayStation Rental App"
        h1="A PlayStation Rental App That Runs From Your Phone"
        lede="One app replaces paper logs, WhatsApp groups, and scattered spreadsheets — staff tap start/stop from a phone or tablet, TVs and consoles switch on automatically, customers book themselves online, and owners watch every branch in real time from their hand."
        ctaLabel="Start Free for 30 Days"
        ctaSecondaryLabel="See Pricing"
        painSection={{
          kicker: "What One App Solves",
          title: "Operations that fall apart because they're scattered everywhere",
          sub: "Unit notes on paper, schedules in a WhatsApp group, accessory stock only in a staffer's memory — one app pulls it all together.",
        }}
        painPoints={[
          { word: "UNIT CHAOS", title: "Messy PS/TV unit management", desc: "Every unit (PS4, PS5) is in different condition. Without per-unit tracking, customers easily complain about being handed the wrong unit." },
          { word: "MANUAL TV", title: "Still turning TVs on/off by hand", desc: "Staff have to walk to every unit to manually switch the TV and console on or off each session — wasting time and risking sessions running past their limit." },
          { word: "LOST GEAR", title: "Controllers & gear lost or broken", desc: "Controllers, memory cards, even cables go missing or get damaged with no record of who rented last — the outlet eats the replacement cost with no one to hold accountable." },
          { word: "IDLE UNITS", title: "Idle units nobody notices", desc: "A console that rarely gets rented still costs power and upkeep while earning nothing — without per-unit usage data, it's hard to know which one to promote or sell." },
        ]}
        featureSection={{
          kicker: "All in One App",
          title: "Four things that usually take several separate apps",
          sub: "Now it's just one — accessible from a phone, tablet, or POS computer.",
        }}
        features={[
          { title: "PS4, PS5 & PS6 Unit Management", desc: "Every unit is tracked separately with its condition, TV type, and usage history. Online booking customers know exactly which generation of unit is free and its specs." },
          { title: "Automatic TV & Console Control", desc: "TVs and consoles turn on automatically when a session starts and off when time runs out — integrated with smart plugs, so staff never have to walk to each unit." },
          { title: "24/7 Online Booking", desc: "Customers check open slots and book themselves through your outlet's page anytime, complete with automatic WhatsApp confirmations and reminders." },
          { title: "Staff Access Rights & Audit Trail", desc: "Every staff member logs in with their own account and permissions — every transaction is recorded by user, so it's clear who's responsible if something doesn't add up." },
        ]}
        quote="Since switching to NEXBILL, closing a shift takes 5 minutes — it used to take an hour."
        quoteAuthor="— Gaming Corner Outlet, Jakarta"
        pricing={{
          title: "One price, one app, every feature",
          sub: "No hidden fees — the only cost beyond your subscription is an optional Smart Plug unit for automatic TV/console control.",
          priceOld: "Rp399,000",
          priceNow: "Rp249,000",
          period: "/month",
          feats: [
            "Unlimited consoles, users, & outlets included",
            "Every feature — POS, booking, financial reports & accounting",
            "Initial remote setup — free, no service fee",
            "Priority support via WhatsApp",
          ],
          cta: "Start Subscription",
        }}
        faqTitle="FAQ: PlayStation rental app"
        faq={FAQ}
        relatedTitle="Explore NEXBILL from another angle"
        related={[
          { label: "See the automatic billing side →", href: "/en/playstation-rental-billing-software" },
          { label: "The full management software version →", href: "/en/playstation-rental-management-software" },
          { label: "How this works for multi-branch outlets →", href: "/en/ps-rental-system" },
        ]}
      />
    </>
  );
}
