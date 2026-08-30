import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { catalogSectionSlug, getCatalogSections } from "@/lib/catalog";
import { PrintSheets } from "@/katalog/PrintSheets";

interface Props {
  params: Promise<{ lang: string }>;
  /** `seksioni` is a section slug and limits the run to that one section, so a
   *  rep can print six sheets instead of a hundred and sixty-three. */
  searchParams: Promise<{ seksioni?: string }>;
}

export const metadata: Metadata = {
  // A print rendering of a page that is already indexed; indexing it too would
  // put two URLs with identical content in front of the crawler.
  robots: { index: false, follow: false },
};

export default async function PrintCatalogPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const { seksioni } = await searchParams;

  const all = await getCatalogSections();
  // An unknown slug prints the whole catalogue rather than an empty sheet: this
  // route is reached from a print button, and a blank print dialog reads as a
  // broken feature where too many pages reads as a wrong click.
  const one = seksioni ? all.filter((s) => catalogSectionSlug(s) === seksioni) : [];

  return <PrintSheets sections={one.length ? one : all} dict={dict} />;
}
