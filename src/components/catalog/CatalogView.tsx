import Link from "next/link";
import { Search, X } from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  categoryDisplayName,
  getAllCategories,
  getCategoryTree,
  getProducts,
  toCardProducts,
  type ProductSort,
} from "@/lib/catalog";
import { langHref, fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { CategoryFilter } from "./CategoryFilter";
import { EmptyState } from "./EmptyState";
import { MobileFilters } from "./MobileFilters";
import { Pagination } from "./Pagination";
import { SortSelect } from "./SortSelect";

export interface CatalogSearchParams {
  kerko?: string;
  faqja?: string;
  renditja?: string;
}

const VALID_SORTS: ProductSort[] = ["emri-asc", "emri-desc", "te-rejat"];

/**
 * Shared product-listing view for /produktet and /kategorite/[slug]:
 * header + breadcrumbs, filter sidebar (desktop) / sheet (mobile),
 * search-within-results, sorting, grid, pagination.
 */
export async function CatalogView({
  title,
  subtitle,
  basePath,
  categorySlug,
  crumbs,
  searchParams,
  dict,
}: {
  title: string;
  subtitle?: string;
  /** Unprefixed path — the language prefix is added here. */
  basePath: string;
  categorySlug?: string;
  crumbs: Crumb[];
  searchParams: CatalogSearchParams;
  dict: Dictionary;
}) {
  const session = await getSession();
  const showPrices = canSeePrices(session);
  const localBase = langHref(dict.lang, basePath);
  const productsBase = langHref(dict.lang, "/produktet");

  const query = searchParams.kerko?.trim() || undefined;
  const sort = VALID_SORTS.includes(searchParams.renditja as ProductSort)
    ? (searchParams.renditja as ProductSort)
    : "emri-asc";
  const page = Math.max(1, Number(searchParams.faqja) || 1);

  const result = await getProducts({ categorySlug, query, sort, page, perPage: 24 });
  const cards = await toCardProducts(result.items, showPrices);

  const tree = await getCategoryTree();
  const displayName = Object.fromEntries(
    (await getAllCategories()).map((c) => [c.slug, categoryDisplayName(c)])
  );

  // Preserved across pagination links
  const params = new URLSearchParams();
  if (query) params.set("kerko", query);
  if (sort !== "emri-asc") params.set("renditja", sort);

  const filterPanel = (
    <CategoryFilter
      tree={tree}
      activeSlug={categorySlug}
      displayName={displayName}
      dict={dict}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={crumbs} dict={dict} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-ink-500">{subtitle}</p>}
        </div>
        <p className="text-sm text-ink-400" aria-live="polite">
          {fmt(dict.catalog.productsCount, { n: result.total })}
        </p>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label={dict.catalog.filters}>
          <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto rounded-2xl border border-ink-900/8 bg-white p-3">
            <h2 className="px-3 pb-2 pt-1 text-sm font-bold uppercase tracking-wide text-ink-900">
              {dict.catalog.categoriesHeading}
            </h2>
            {filterPanel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <form action={localBase} method="get" role="search" className="relative min-w-0 flex-1 basis-56">
              <Search
                aria-hidden
                className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              />
              <input
                type="search"
                name="kerko"
                defaultValue={query ?? ""}
                placeholder={dict.catalog.searchInResults}
                aria-label={dict.search.label}
                className="h-10 w-full rounded-lg border border-ink-900/10 bg-white pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 [&::-webkit-search-cancel-button]:hidden"
              />
              {sort !== "emri-asc" && <input type="hidden" name="renditja" value={sort} />}
            </form>
            <MobileFilters
              labels={{ filters: dict.catalog.filters, close: dict.catalog.closeFilters }}
            >
              {filterPanel}
            </MobileFilters>
            <SortSelect
              labels={{
                label: dict.catalog.sortLabel,
                az: dict.catalog.sortAZ,
                za: dict.catalog.sortZA,
                newest: dict.catalog.sortNewest,
              }}
            />
          </div>

          {(query || categorySlug) && (
            <div className="mb-5 flex flex-wrap items-center gap-2" aria-label={dict.catalog.activeFilters}>
              {query && (
                <Link
                  href={localBase}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium text-brand-800 hover:bg-brand-100"
                >
                  {fmt(dict.catalog.searchChip, { q: query })}
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">{dict.catalog.removeFilter}</span>
                </Link>
              )}
              {categorySlug && (
                <Link
                  href={productsBase}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium text-accent-800 hover:bg-accent-100"
                >
                  {fmt(dict.catalog.categoryChip, {
                    name: displayName[categorySlug] ?? categorySlug,
                  })}
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">{dict.catalog.removeFilter}</span>
                </Link>
              )}
              <Link
                href={productsBase}
                className="text-[13px] font-medium text-ink-400 underline-offset-2 hover:text-ink-700 hover:underline"
              >
                {dict.catalog.clearFilters}
              </Link>
            </div>
          )}

          {cards.length === 0 ? (
            <EmptyState
              title={dict.catalog.emptyTitle}
              text={
                query
                  ? fmt(dict.catalog.emptyTextQuery, { q: query })
                  : dict.catalog.emptyTextCategory
              }
              actionLabel={dict.catalog.emptyAction}
              actionHref={productsBase}
            />
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {cards.map((p, i) => (
                  <li key={p.id}>
                    <ProductCard product={p} dict={dict} priority={i < 4} />
                  </li>
                ))}
              </ul>
              <Pagination
                basePath={localBase}
                params={params}
                page={result.page}
                totalPages={result.totalPages}
                dict={dict}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
