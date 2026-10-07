import { BlogClusterPage, blogClusterMetadata } from "@/components/blog/BlogPages";

// Cluster hub "Billing & Operasional" — English counterpart: /en/blog/billing-and-operations.
export const metadata = blogClusterMetadata("billing", "id");

export default function BillingDanOperasionalClusterPage() {
  return <BlogClusterPage clusterKey="billing" lang="id" />;
}
