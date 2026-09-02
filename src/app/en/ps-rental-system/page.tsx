import type { Metadata } from "next";
import { SITE_URL } from "@/app/layout";
import { PillarPage, pillarFaqJsonLd } from "@/components/pillar/PillarPage";

// EN counterpart of /sistem-rental-ps — primary keyword "PS rental system". Angle: operational
// control / accountability — staff access rights, audit trail, multi-branch oversight.
export const metadata: Metadata = {
  title: "PS Rental System for Multi-Branch Operators — NEXBILL",
  description:
    "A PS rental system with staff access rights, an audit trail, and per-branch financial reports — full operational control for single or multi-branch PlayStation outlets.",
  alternates: {
    canonical: `${SITE_URL}/en/ps-rental-system`,
    languages: {
      "en-US": `${SITE_URL}/en/ps-rental-system`,
      "id-ID": `${SITE_URL}/sistem-rental-ps`,
    },
  },
};

const FAQ = [
  {
    q: "How does this system stop staff from misusing access?",
    a: "Every staff member logs in with their own account and permissions, and every transaction is recorded by user — if something doesn't add up, it's clear who's responsible, with no need to guess.",
  },
  {
    q: "How does the system track gear like controllers or memory cards?",
    a: "Every unit and its accessories are logged in the system, tied to the last rental transaction — if something goes missing or breaks, the last renter's history is right there.",
  },
  {
    q: "Can owners see actual profit, not just revenue?",
    a: "Yes. Profit & loss and cash flow reports are built automatically from real costs and income, so owners see actual profit instead of assuming a busy day means a profitable one.",
  },
  {
    q: "Can this system manage customer deposits?",
    a: "Yes — deposits are logged in the system instead of on paper or in a staffer's memory, so it's clear when they're due back and they can't quietly get used to cover a cash shortfall.",
  },
];

export default function PsRentalSystemPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pillarFaqJsonLd(FAQ)) }} />
      <PillarPage
        lang="en"
        breadcrumbHome="Home"
        breadcrumbCurrent="PS Rental System"
        kicker="PS Rental System"
        h1="A PS Rental System Built for Accountability"
        lede="NEXBILL gives owners full control over PS rental operations — every staff member has their own account and permissions, every transaction is logged by user, and every branch can be monitored separately or combined, so it's always clear who's responsible when something doesn't add up."
        ctaLabel="Start Free for 30 Days"
        ctaSecondaryLabel="See Pricing"
        painSection={{
          kicker: "Why You Need a System, Not Just a Tool",
          title: "Without a system, accountability gets blurry",
          sub: "When every staff member shares the same access and records live only in a notebook, it's hard to trace where a problem actually started.",
        }}
        painPoints={[
          { word: "LOST GEAR", title: "Controllers & gear lost or broken", desc: "Controllers, memory cards, even cables go missing or get damaged with no record of who rented last — the outlet eats the replacement cost with no one to hold accountable." },
          { word: "RATE ERRORS", title: "Miscalculated rental rates", desc: "Hourly rates, saver packages, and member pricing easily get mixed up when calculated by hand — customers complain, or the outlet loses money from undercharging." },
          { word: "HIDDEN PROFIT", title: "Owners don't know real profit", desc: "Busy doesn't mean profitable — without a clean report of costs versus revenue, owners often don't realize they're losing money until it's too late." },
          { word: "DEPOSIT LEAKS", title: "Customer deposits go untracked", desc: "Deposits noted on paper or just remembered by staff — easy to forget to return, or worse, quietly used to cover a cash shortfall." },
        ]}
        featureSection={{
          kicker: "Full Owner Control",
          title: "Four layers of control that make this system trustworthy",
          sub: "From staff access rights to multi-branch financial reports, everything is auditable.",
        }}
        features={[
          { title: "Staff Access Rights & Audit Trail", desc: "Every staff member logs in with their own account and permissions — every transaction is recorded by user, so it's clear who's responsible if something doesn't add up." },
          { title: "Multi-Outlet & Multi-Branch", desc: "Manage many branches from one owner account. Track revenue, staff, and performance per outlet or combined, in real time, straight from your phone." },
          { title: "Shift Management & Financial Reports", desc: "Close a shift by counting cash by denomination, automatically reconciled by the system. Profit & loss and cash flow stay tidy with no manual Excel recaps." },
          { title: "Membership & Customer CRM", desc: "A membership system with balance/points, visit history, and a customer trust score (fraud database) — spot problem customers before they cost your outlet." },
        ]}
        quote="Since switching to NEXBILL, closing a shift takes 5 minutes — it used to take an hour."
        quoteAuthor="— Gaming Corner Outlet, Jakarta"
        pricing={{
          title: "One price, full multi-branch control",
          sub: "No hidden fees — the only cost beyond your subscription is an optional Smart Plug unit for automatic TV/console control.",
          priceOld: "Rp399,000",
          priceNow: "Rp249,000",
          period: "/month",
          feats: [
            "Customer trust-score database (fraud) feature",
            "Unlimited consoles, users, & outlets included",
            "Priority support via WhatsApp",
            "Every feature — POS, booking, financial reports & accounting",
          ],
          cta: "Start Subscription",
        }}
        faqTitle="FAQ: PS rental system"
        faq={FAQ}
        relatedTitle="Explore NEXBILL from another angle"
        related={[
          { label: "See the per-second billing details →", href: "/en/playstation-rental-billing-software" },
          { label: "The everyday app version →", href: "/en/playstation-rental-app" },
          { label: "Full coverage across nine software modules →", href: "/en/playstation-rental-management-software" },
        ]}
      />
    </>
  );
}
