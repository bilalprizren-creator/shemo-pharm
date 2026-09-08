import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  // An unknown slug used to fall back to the whole catalogue, on the reasoning
  // that a blank print dialog reads as a broken feature where too many pages
  // reads as a wrong click. It is the wrong trade at this size: the full run is
  // 163 sheets and 1 713 photographs, so a mistyped slug served the most
  // expensive page on the site to somebody who had asked for six sheets.
  //
  // The not-found page it shows instead answers 200 rather than 404, because
  // loading.tsx puts this render behind a Suspense boundary and the shell has
  // already been sent by the time this runs. That is true of every route here
  // with a loading.tsx — /produktet/<unknown> and /katalog/<unknown> both do
  // it — and is a separate thing to fix. Nothing is lost here either way: this
  // route is noindex.
  const sections = seksioni
    ? all.filter((s) => catalogSectionSlug(s) === seksioni)
    : all;
  if (!sections.length) notFound();

  return <PrintSheets sections={sections} dict={dict} />;
}
