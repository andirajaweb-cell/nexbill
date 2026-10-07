import { BlogArticle, blogArticleMetadata } from "@/components/blog/BlogArticle";

// English edition of /blog/billing-dan-operasional/cara-tutup-shift-kasir-rental-ps. Title, dek,
// dates, URL and hreflang pair: blog-data.ts ("closeShift").
export const metadata = blogArticleMetadata("closeShift", "en");

export default function Page() {
  return (
    <BlogArticle lang="en" articleKey="closeShift" relatedPillars={["app", "billing"]} relatedArticles={["cashierMistakes", "multiBranch"]}>
      <p>
        A clean shift close isn&apos;t about counting the money in the till more carefully — it&apos;s about following exactly the same sequence of steps every time, so that when there&apos;s a discrepancy you know which step it most likely came from instead of guessing from scratch.
      </p>

      <h2>Step 1: Close All Active Sessions First</h2>
      <p>
        Before counting cash, make sure no rental session is still running in the system when the unit is actually empty. A &quot;hanging&quot; session like this leaves the shift&apos;s revenue report incomplete — the transaction only gets recorded in the next shift, even though it happened in this one.
      </p>

      <h2>Step 2: Print or Open the Shift Transaction Summary</h2>
      <p>
        Pull up the summary of all transactions during the shift: total rental revenue, number of transactions and a breakdown by payment method (cash, QRIS, bank transfer). This summary is your reference figure — not a manual count, but what should be there according to the system.
      </p>

      <h2>Step 3: Count the Physical Cash in the Till</h2>
      <p>
        Count the physical cash, setting aside the shift&apos;s opening float (the cash that was already there before the shift started). What&apos;s left should equal the total cash transactions in the system summary from Step 2.
      </p>

      <h2>Step 4: Reconcile Cash and Non-Cash Separately</h2>
      <p>
        Don&apos;t lump cash and non-cash checks into one big number. Reconcile each payment method on its own — total QRIS in the system against incoming payments, total transfers against the receiving account. Combined into one figure, a shortfall in one method can be quietly &quot;covered&quot; by a surplus in another.
      </p>

      <h2>Step 5: Record Discrepancies As They Are — Don&apos;t Adjust Them</h2>
      <p>
        If there&apos;s a discrepancy — however small — record the exact amount on the shift handover form; don&apos;t hide it by adding or removing money by hand so it &quot;fits&quot;. Discrepancies recorded honestly can be traced for patterns over time; hidden ones keep coming back without anyone ever finding the root cause.
      </p>

      <h2>Step 6: Hand Over to the Next Shift with a Signature</h2>
      <p>
        Finish by handing the opening float over to the next shift&apos;s cashier, recorded and signed by both (on paper or digitally). This clear handover point is what lets any future discrepancy be narrowed down to a specific shift, instead of being smeared vaguely across the whole day.
      </p>

      <h2>Why This Checklist Has to Be Enforced Consistently, Not Just Written Once</h2>
      <p>
        A shift-closing checklist that looks good on paper doesn&apos;t help much if everyone does it differently. A cashier system that requires each of these steps — closing active sessions, separating the summary by payment method, recording the handover — before the shift can be closed makes the process consistent without relying on each staff member&apos;s discipline.
      </p>
    </BlogArticle>
  );
}
