import { BlogIndex, blogIndexMetadata } from "@/components/blog/BlogPages";

// Blog index — Indonesian. English counterpart: /en/blog (same component, see BlogPages.tsx).
export const metadata = blogIndexMetadata("id");

export default function BlogIndexPage() {
  return <BlogIndex lang="id" />;
}
