import type { Metadata } from "next";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import { getDictionary } from "@/lib/dictionaries";
import { SectionIndex } from "@/katalog/SectionIndex";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const self = sitePath(await getSiteMode(), "/katalog");
  return {
    title: dict.printedCatalog.title,
    description: dict.printedCatalog.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, self),
      languages: { sq: self, en: `/en${self === "/" ? "" : self}` },
    },
  };
}

export default async function PrintedCatalogPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return <SectionIndex dict={dict} />;
}
