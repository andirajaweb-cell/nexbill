import { BlogClusterPage, blogClusterMetadata } from "@/components/blog/BlogPages";

// Cluster hub "Billing & Operations" — Indonesian counterpart: /blog/billing-dan-operasional.
export const metadata = blogClusterMetadata("billing", "en");

export default function BillingAndOperationsClusterPage() {
  return <BlogClusterPage clusterKey="billing" lang="en" />;
}
