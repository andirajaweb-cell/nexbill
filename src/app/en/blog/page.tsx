import { BlogIndex, blogIndexMetadata } from "@/components/blog/BlogPages";

// Blog index — English. Indonesian counterpart: /blog (same component, see BlogPages.tsx).
export const metadata = blogIndexMetadata("en");

export default function EnBlogIndexPage() {
  return <BlogIndex lang="en" />;
}
