import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSiteMode } from "@/lib/site-mode";
import { SearchResults } from "@/katalog/SearchResults";

/**
 * Catalogue search. Reachable only on the catalogue domain, where the proxy
 * maps it in from /kerko — the shop has its own search inside /produktet, and
 * two search pages on one site would be one too many.
 */
interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ kerko?: string }>;
}

export const metadata: Metadata = {
  // Internal search results: crawlable through to the products, never indexed
  // as pages of their own.
  robots: { index: false, follow: true },
};

export default async function KatalogSearchPage({ params, searchParams }: Props) {
  if ((await getSiteMode()) !== "katalog") notFound();
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const { kerko } = await searchParams;
  return <SearchResults query={kerko ?? ""} dict={dict} />;
}
