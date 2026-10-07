import { AuthorProfile, authorMetadata } from "@/components/blog/BlogPages";

// E-E-A-T author page — English. Indonesian counterpart: /authors/andika-rajasa.
export const metadata = authorMetadata("andika-rajasa", "en");

export default function EnAndikaRajasaAuthorPage() {
  return <AuthorProfile slug="andika-rajasa" lang="en" />;
}
