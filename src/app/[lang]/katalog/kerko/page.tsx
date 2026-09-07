import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { SearchResults } from "@/katalog/SearchResults";

/**
 * The printed catalogue's own search.
 *
 * A catalogue route like every other one here, which is what makes it reachable
 * from both sites: `/katalog/kerko` on the shop's domain, and — because the
 * proxy folds catalogue paths to the root — plain `/kerko` on
 * shemo-katalog.com. It used to live at `/kerko` and 404 unless the host was
 * the catalogue, which meant the catalogue as served today, under /katalog on
 * the shop's domain, had no search of its own at all: its search button pointed
 * at /produktet and dropped the reader into the shop's listing, where the range
 * is a different one. The two sites are meant to be searched separately.
 *
 * What it searches is decided in SearchResults, not here: the printed products,
 * `catalog_hidden = false`, whether or not the shop shows them.
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
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const { kerko } = await searchParams;
  return <SearchResults query={kerko ?? ""} dict={dict} />;
}
