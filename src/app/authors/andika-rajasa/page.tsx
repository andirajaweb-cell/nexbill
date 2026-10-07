import { AuthorProfile, authorMetadata } from "@/components/blog/BlogPages";

// E-E-A-T author page (docs/SEO-ARCHITECTURE.md §9) — English counterpart: /en/authors/andika-rajasa.
export const metadata = authorMetadata("andika-rajasa", "id");

export default function AndikaRajasaAuthorPage() {
  return <AuthorProfile slug="andika-rajasa" lang="id" />;
}
