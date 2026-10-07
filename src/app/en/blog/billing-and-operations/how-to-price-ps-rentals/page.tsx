import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// English edition of /blog/billing-dan-operasional/cara-hitung-tarif-sewa-ps. Title, dek, dates, URL
// and hreflang pair: blog-data.ts ("pricing").
export const metadata = blogArticleMetadata("pricing", "en");

export default function Page() {
  return (
    <BlogArticle lang="en" articleKey="pricing" relatedPillars={["billing", "app"]} relatedArticles={["breakEven", "ps4VsPs5"]}>
      <p>
        Many new PS rental owners set their rates the simplest way possible: check what the outlet next door charges, then charge the same or a little less. It looks safe, but it&apos;s actually risky — you don&apos;t know whether that outlet is profitable itself or is covering losses with a bigger customer base. A healthy rate has to be worked out from your own cost structure first, and only then compared with the market.
      </p>

      <h2>Method 1: Cost-Plus — Start from Your Costs, Then Add a Margin</h2>
      <p>
        The most basic approach is to work out what it costs you to run one unit for one hour, then add a profit margin on top. The cost per unit per hour usually includes:
      </p>
      <ul>
        <li><strong>Electricity</strong> — the power drawn by the TV + console during one hour of active use.</li>
        <li><strong>Share of rent</strong> — total monthly rent divided by opening hours and the number of units.</li>
        <li><strong>Share of staff wages</strong> — total monthly cashier wages divided by total working hours and the number of units they can handle.</li>
        <li><strong>Depreciation/maintenance</strong> — estimated servicing and controller/accessory replacement costs spread evenly over hours of use.</li>
      </ul>
      <p>
        Once you have the cost per unit per hour, add a margin — usually 30–50% above cost, depending on how competitive your local market is. Too thin a margin leaves the outlet exposed to losses the moment a quiet month comes along; too thick a margin makes you lose out to competitors.
      </p>

      <h2>Method 2: Market Benchmarking — But Don&apos;t Stop There</h2>
      <p>
        Surveying 3–5 nearby PS rentals in your class (number of units, type of TV, location) gives you a picture of the price range the market accepts. The problem is that a benchmark alone doesn&apos;t tell you whether that rate is <strong>profitable for you</strong> — every outlet&apos;s cost structure is different (rent in a busy location is higher, for example). The safest approach: use the benchmark as a sensible upper and lower bound, then make sure your cost-plus rate still falls inside that range.
      </p>

      <h2>Setting Package Deals and Member Prices</h2>
      <p>
        Package deals (for example, 3 hours for the price of 2.5) and member prices usually get a 10–20% discount off the regular rate — the aim is to encourage longer sessions or repeat visits, not to discount for no reason. The rule of thumb: a package or member discount must never push the effective rate below your cost-plus point. If your regular rate already has a thin margin, a big discount on packages can make even your busiest sessions unprofitable.
      </p>

      <h2>An Illustrative Calculation</h2>
      <p>
        <em>The figures below are only an illustration to make the reasoning easier to follow — adjust them to the real costs at your outlet.</em>
      </p>
      <p>
        Say you work out your cost per unit per hour (electricity + share of rent + share of wages + maintenance) at about Rp4,000/hour, and you want a 50% margin. A sensible regular rate is then around Rp6,000/hour. If outlets around you charge Rp6,000–Rp8,000/hour on average, this rate is competitive and still profitable. For a 3-hour package, a 15% discount on Rp18,000 (3 × Rp6,000) comes to about Rp15,300 — still above your cost point (3 × Rp4,000 = Rp12,000), so it&apos;s safe.
      </p>

      <h2>Why This Often Goes Wrong When Calculated by Hand Every Session</h2>
      <p>
        Setting the rates can be done once at the start — but applying them consistently to every session, with different combinations of regular, package and member rates, is where mistakes creep in when cashiers still calculate by hand. This is where an automated billing system earns its place: once the rates are set in the system, every session is charged exactly by those rules, regardless of whether the cashier remembers them.
      </p>
    </BlogArticle>
  );
}
