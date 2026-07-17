import type { Metadata } from "next";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import {
  CatalogView,
  type CatalogSearchParams,
} from "@/components/catalog/CatalogView";

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.catalog.title,
    description: dict.catalog.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/produktet"),
      languages: { sq: "/produktet", en: "/en/produktet" },
    },
  };
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const sp = await searchParams;
  return (
    <CatalogView
      title={dict.catalog.title}
      subtitle={dict.catalog.subtitle}
      basePath="/produktet"
      crumbs={[{ label: dict.catalog.title }]}
      searchParams={sp}
      dict={dict}
    />
  );
}
