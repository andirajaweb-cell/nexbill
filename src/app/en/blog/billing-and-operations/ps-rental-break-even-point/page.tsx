import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// English edition of /blog/billing-dan-operasional/bep-rental-ps. Title, dek, dates, URL and
// hreflang pair: blog-data.ts ("breakEven").
export const metadata = blogArticleMetadata("breakEven", "en");

export default function Page() {
  return (
    <BlogArticle lang="en" articleKey="breakEven" relatedPillars={["system", "billing"]} relatedArticles={["pricing", "cashierMistakes"]}>
      <p>
        The break-even point (BEP) is where total revenue exactly equals total costs — not yet a profit, but no longer a loss. For a PS rental business, knowing your break-even point matters at two moments: before opening an outlet (to judge whether the business plan makes sense) and once it&apos;s running (to know the minimum rental hours you need to hit every month).
      </p>

      <h2>The Basic Break-Even Formula, Adapted for PS Rentals</h2>
      <p>
        The classic formula is <strong>Fixed Costs ÷ (Rate per Hour − Variable Cost per Hour)</strong>. The result is the number of rental hours you need to sell each month to break even.
      </p>
      <ul>
        <li><strong>Fixed costs</strong> — expenses that stay the same every month whether it&apos;s busy or quiet: rent, permanent staff wages, PS/TV instalments, internet, system subscriptions.</li>
        <li><strong>Variable cost per hour</strong> — costs that only appear when a unit is actually rented: extra electricity per session, estimated maintenance cost per hour of use.</li>
      </ul>

      <h2>A Worked Example</h2>
      <p>
        <em>The figures below are an illustration to make the calculation clear — not data from any particular outlet.</em>
      </p>
      <p>
        Say a small outlet&apos;s monthly fixed costs (rent, one cashier&apos;s wage, unit instalments) come to about Rp6,000,000. The rental rate is Rp6,000/hour, and the variable cost per hour (electricity + maintenance) is about Rp1,500/hour. Then:
      </p>
      <p>
        Break-even = Rp6,000,000 ÷ (Rp6,000 − Rp1,500) = Rp6,000,000 ÷ Rp4,500 ≈ <strong>1,334 rental hours per month</strong>.
      </p>
      <p>
        If the outlet has 5 units and is open 12 hours a day (5 × 12 × 30 = 1,800 hours of maximum capacity per month), the minimum utilisation needed to break even is about 74% of total capacity. That&apos;s the realistic benchmark: is that target achievable for your location and target market?
      </p>

      <h2>Why the Break-Even Point Often Misses the Original Plan</h2>
      <p>
        In practice, the break-even point calculated on paper often misses for three reasons:
      </p>
      <ul>
        <li><strong>Uneven unit utilisation</strong> — the favourite units (usually a PS5 with a good TV) are always full while others sit idle, so real average utilisation is lower than assumed.</li>
        <li><strong>Leaks from manual billing</strong> — if rental time is calculated by hand and often comes out wrong (rounded down for speed, for example), actual revenue can be lower than what should have been charged.</li>
        <li><strong>Underestimated fixed costs</strong> — maintenance and replacing lost or damaged accessories are often left out at the start, even though they&apos;re real and recurring.</li>
      </ul>

      <h2>How to Reach Break-Even Faster Without Raising Prices</h2>
      <p>
        There are two routes that don&apos;t involve raising prices: increasing utilisation (online booking so empty slots fill more easily, off-peak promotions) and closing revenue leaks (per-second billing instead of cashier estimates). Of the two, closing leaks usually shows results faster — because it isn&apos;t new revenue you have to go and find, it&apos;s revenue that already exists but hasn&apos;t been fully charged.
      </p>
    </BlogArticle>
  );
}
