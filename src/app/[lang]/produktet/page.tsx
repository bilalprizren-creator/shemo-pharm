import type { Metadata } from "next";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import {
  CatalogView,
  listingMetadata,
  type CatalogSearchParams,
} from "@/components/catalog/CatalogView";

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const sp = await searchParams;
  return listingMetadata({
    dict,
    path: "/produktet",
    name: dict.catalog.title,
    description: dict.catalog.metaDescription,
    searchParams: sp,
  });
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
