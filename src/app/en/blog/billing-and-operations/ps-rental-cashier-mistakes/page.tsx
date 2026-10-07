import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// English edition of /blog/billing-dan-operasional/kesalahan-kasir-rental-ps. Title, dek, dates,
// URL and hreflang pair: blog-data.ts ("cashierMistakes").
export const metadata = blogArticleMetadata("cashierMistakes", "en");

export default function Page() {
  return (
    <BlogArticle lang="en" articleKey="cashierMistakes" relatedPillars={["billing", "software"]} relatedArticles={["closeShift", "breakEven"]}>
      <p>
        If the cash at your PS rental is often short at the end of the day, suspicion usually falls on staff first — yet in many cases the cause is a bad operational habit, not bad intent. Here are the five most common mistakes I&apos;ve come across, both at my own outlet and from fellow rental owners.
      </p>

      <h2>1. Rounding Rental Time by Hand</h2>
      <p>
        Cashiers who write start and end times on paper or in a notebook tend to round — &quot;about 2 hours, roughly&quot; — when the real time might be 2 hours 20 minutes. Rounding down looks trivial per session, but it adds up to a real revenue leak over a month.
      </p>

      <h2>2. Forgetting to Record Extensions</h2>
      <p>
        Customers who ask for extra time mid-session are often only mentioned to the cashier verbally, with no written update. If the cashier is busy or the shift changes before the session ends, that extra time is easy to miss at final billing.
      </p>

      <h2>3. Applying Member or Package Discounts Inconsistently</h2>
      <p>
        Without clear rules recorded in a system, discounts depend on the cashier&apos;s memory and mood that day. Some customers get a member discount even though their membership has lapsed; others should get a package deal but are charged the regular rate — both are costly, one to the outlet and one to the customer.
      </p>

      <h2>4. Mixing Till Cash with Personal Money or IOUs</h2>
      <p>
        A common practice at small rentals: the cashier &quot;borrows&quot; from the till for something urgent (buying a water refill, giving change to a neighbour) intending to pay it back later. Without disciplined records, these small IOUs pile up and are hard to trace at month-end reconciliation.
      </p>

      <h2>5. No Documented Cash Handover Between Shifts</h2>
      <p>
        When shift changes are done with only a verbal handover (&quot;there&apos;s this much in the till&quot;), there&apos;s no clear point to trace which shift a discrepancy started in. Once a shortfall is found at the end of the day, it&apos;s impossible to tell whether it happened on the morning or the evening shift.
      </p>

      <h2>The Common Thread: Manual Records at Critical Points</h2>
      <p>
        All five mistakes share the same pattern — they happen at points that still depend on manual records or human memory: session time, extensions, discount rules, cash flow and shift handovers. A billing and cashier system that records automatically at each of these points doesn&apos;t remove the need for honest staff, but it removes the room for the unintentional mistakes that have always been the most common source of leaks.
      </p>
    </BlogArticle>
  );
}
