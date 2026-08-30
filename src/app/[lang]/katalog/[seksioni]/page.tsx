import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang, langHref, fmt, type Lang } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import { getDictionary } from "@/lib/dictionaries";
import { getCatalogSectionBySlug } from "@/lib/catalog";
import { SectionView } from "@/katalog/SectionView";

interface Props {
  params: Promise<{ lang: string; seksioni: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, seksioni } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const section = await getCatalogSectionBySlug(seksioni);
  if (!section) return {};
  const self = sitePath(await getSiteMode(), `/katalog/${seksioni}`);

  const title = `${section.catalogNo} ${section.name}`;
  return {
    title,
    description: fmt(dict.printedCatalog.sectionMetaDescription, {
      name: section.name,
      no: section.catalogNo,
      count: section.products.length,
    }),
    alternates: {
      canonical: langHref(dict.lang, self),
      languages: { sq: self, en: `/en${self}` },
    },
  };
}

export default async function CatalogSectionPage({ params }: Props) {
  const { lang, seksioni } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const section = await getCatalogSectionBySlug(seksioni);
  if (!section) notFound();
  return <SectionView section={section} dict={dict} />;
}
