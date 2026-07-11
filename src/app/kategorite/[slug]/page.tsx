import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  categoryDisplayName,
  getAllCategories,
  getCategoryBySlug,
} from "@/lib/catalog";
import {
  CatalogView,
  type CatalogSearchParams,
} from "@/components/catalog/CatalogView";
import type { Crumb } from "@/components/catalog/Breadcrumbs";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogSearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};
  const name = categoryDisplayName(cat);
  return {
    title: name,
    description: `${name} — shfletoni ${cat.count} produkte nga katalogu i SHEMO PHARM, distributor me shumicë i produkteve dhe pajisjeve mjekësore në Kosovë.`,
    alternates: { canonical: `/kategorite/${slug}` },
  };
}

/** Breadcrumb trail: parent categories up to the root. */
function categoryCrumbs(slug: string): Crumb[] {
  const all = getAllCategories();
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
  return [{ label: "Kategoritë", href: "/kategorite" }, ...chain];
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const sp = await searchParams;
  return (
    <CatalogView
      title={categoryDisplayName(cat)}
      basePath={`/kategorite/${slug}`}
      categorySlug={slug}
      crumbs={categoryCrumbs(slug)}
      searchParams={sp}
    />
  );
}
