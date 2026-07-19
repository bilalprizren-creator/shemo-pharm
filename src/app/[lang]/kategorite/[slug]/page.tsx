import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  categoryDisplayName,
  getAllCategories,
  getCategoryBySlug,
} from "@/lib/catalog";
import { isLang, langHref, fmt, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import {
  CatalogView,
  type CatalogSearchParams,
} from "@/components/catalog/CatalogView";
import type { Crumb } from "@/components/catalog/Breadcrumbs";

interface Props {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const cat = await getCategoryBySlug(slug);
  if (!cat) return {};
  const name = categoryDisplayName(cat);
  return {
    title: name,
    description: fmt(dict.categoriesPage.categoryMetaDescription, {
      name,
      count: cat.count,
    }),
    alternates: {
      canonical: langHref(dict.lang, `/kategorite/${slug}`),
      languages: {
        sq: `/kategorite/${slug}`,
        en: `/en/kategorite/${slug}`,
      },
    },
  };
}

/** Breadcrumb trail: parent categories up to the root. */
async function categoryCrumbs(slug: string, categoriesLabel: string): Promise<Crumb[]> {
  const all = await getAllCategories();
  const chain: Crumb[] = [];
  let current = all.find((c) => c.slug === slug);
  while (current) {
    chain.unshift({
      label: categoryDisplayName(current),
      href: current.slug === slug ? undefined : `/kategorite/${current.slug}`,
    });
    const parentId: number = current.parent;
    current = parentId ? all.find((c) => c.id === parentId) : undefined;
  }
  return [{ label: categoriesLabel, href: "/kategorite" }, ...chain];
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const sp = await searchParams;
  const crumbs = await categoryCrumbs(slug, dict.categoriesPage.title);
  return (
    <CatalogView
      title={categoryDisplayName(cat)}
      basePath={`/kategorite/${slug}`}
      categorySlug={slug}
      crumbs={crumbs}
      searchParams={sp}
      dict={dict}
    />
  );
}
