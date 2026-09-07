import type { Metadata } from "next";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import { AllProducts } from "@/katalog/AllProducts";

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ faqja?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const page = Math.max(1, Number((await searchParams).faqja) || 1);
  const self = sitePath(await getSiteMode(), "/katalog/te-gjitha");
  // Each page of the run is canonical to itself; without the number every page
  // but the first would claim to be a page it is not, and its products stop
  // being discovered. Same rule as listingMetadata() applies to /produktet.
  const suffix = page > 1 ? `?faqja=${page}` : "";

  return {
    title: page > 1 ? `${dict.printedCatalog.allTitle} — ${page}` : dict.printedCatalog.allTitle,
    description: dict.printedCatalog.allMetaDescription,
    alternates: {
      canonical: `${langHref(dict.lang, self)}${suffix}`,
      languages: { sq: `${self}${suffix}`, en: `/en${self}${suffix}` },
    },
  };
}

export default async function AllProductsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const page = Math.max(1, Number((await searchParams).faqja) || 1);
  return <AllProducts page={page} dict={dict} />;
}
