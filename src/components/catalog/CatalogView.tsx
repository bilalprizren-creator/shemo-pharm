import type { Metadata } from "next";
import Link from "next/link";
import { Check, Search, X } from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  categoryDisplayName,
  getAllCategories,
  getBrandTypeBreakdown,
  getCategoryTree,
  getProducts,
  hasOutOfStockProducts,
  toCardProducts,
  type ProductSort,
} from "@/lib/catalog";
import { langHref, fmt, type Lang } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { BrandTypeFilter } from "./BrandTypeFilter";
import { CategoryFilter } from "./CategoryFilter";
import { EmptyState } from "./EmptyState";
import { MobileFilters } from "./MobileFilters";
import { Pagination } from "./Pagination";
import { SortSelect } from "./SortSelect";

export interface CatalogSearchParams {
  kerko?: string;
  faqja?: string;
  renditja?: string;
  /** "1" = only products in stock. Any other value means no filter. */
  stok?: string;
  /** Product-type slug a brand shelf is narrowed to. */
  lloji?: string;
}

const VALID_SORTS: ProductSort[] = ["emri-asc", "emri-desc", "te-rejat"];

/**
 * Canonical URL and robots directive for a paginated listing.
 *
 * Two things were wrong before. Every page of /produktet declared itself
 * canonical to /produktet, so 85 of the 86 pages claimed to be a page they
 * are not — which is how the products on them stop being discovered. And
 * internal search results were indexable, which fills an index with URLs
 * nobody linked to.
 *
 * So: a plain listing, with or without a page number, is canonical to itself.
 * Anything carrying a search term, a non-default sort, the stock filter or a
 * product-type narrowing is a view of that listing rather than a page of its
 * own — it points at the plain equivalent and is marked noindex, follow, so
 * the crawler still walks through to the products.
 */
export function listingMetadata({
  lang,
  path,
  searchParams,
}: {
  lang: Lang;
  /** Unprefixed, e.g. "/produktet" or "/kategorite/barnat". */
  path: string;
  searchParams: CatalogSearchParams;
}): Pick<Metadata, "alternates" | "robots"> {
  const page = Math.max(1, Number(searchParams.faqja) || 1);
  const isView =
    Boolean(searchParams.kerko?.trim()) ||
    (searchParams.renditja !== undefined && searchParams.renditja !== "emri-asc") ||
    searchParams.stok === "1" ||
    Boolean(searchParams.lloji?.trim());

  const suffix = !isView && page > 1 ? `?faqja=${page}` : "";
  return {
    alternates: {
      canonical: `${langHref(lang, path)}${suffix}`,
      languages: {
        sq: `${path}${suffix}`,
        en: `/en${path}${suffix}`,
      },
    },
    ...(isView ? { robots: { index: false, follow: true } } : {}),
  };
}

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
  categoryKind,
  crumbs,
  searchParams,
  dict,
}: {
  title: string;
  subtitle?: string;
  /** Unprefixed path — the language prefix is added here. */
  basePath: string;
  categorySlug?: string;
  /**
   * "brand" swaps the product-type tree in the sidebar for the brand's own
   * type breakdown. Undefined on /produktet and on product-type shelves.
   */
  categoryKind?: "type" | "brand";
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
  const inStockOnly = searchParams.stok === "1";
  // Only meaningful on a brand shelf; ignored everywhere else so the parameter
  // cannot be used to narrow a page that offers no way to widen it again.
  const isBrand = categoryKind === "brand" && Boolean(categorySlug);
  const typeSlug = isBrand ? searchParams.lloji?.trim() || undefined : undefined;

  const result = await getProducts({
    categorySlug,
    typeSlug,
    query,
    sort,
    page,
    perPage: 24,
    inStockOnly,
  });
  const cards = await toCardProducts(result.items, showPrices);

  const tree = await getCategoryTree();
  const displayName = Object.fromEntries(
    (await getAllCategories()).map((c) => [c.slug, categoryDisplayName(c)])
  );

  // The types this brand spreads across. Empty for one-type brands like
  // Kräuterhof, and then nothing is offered — there is nothing to narrow.
  const brandTypes = isBrand ? await getBrandTypeBreakdown(categorySlug!) : [];
  const showTypeFilter = brandTypes.length > 1;
  const activeType = showTypeFilter
    ? brandTypes.find((t) => t.slug === typeSlug)
    : undefined;

  // Preserved across pagination links
  const params = new URLSearchParams();
  if (query) params.set("kerko", query);
  if (sort !== "emri-asc") params.set("renditja", sort);
  if (inStockOnly) params.set("stok", "1");
  if (activeType) params.set("lloji", activeType.slug);

  /**
   * This same listing with one thing changed and the page number dropped.
   * Removing a filter has to leave the other filters standing — clearing the
   * search should not silently also clear "in stock", which is what happens
   * when every chip just links back to the bare path.
   */
  const listingHref = (
    change: { query?: string; stok?: boolean; lloji?: string } = {}
  ) => {
    const nextQuery = "query" in change ? change.query : query;
    const nextStock = "stok" in change ? change.stok : inStockOnly;
    const nextType = "lloji" in change ? change.lloji : activeType?.slug;
    const next = new URLSearchParams();
    if (nextQuery) next.set("kerko", nextQuery);
    if (sort !== "emri-asc") next.set("renditja", sort);
    if (nextStock) next.set("stok", "1");
    if (nextType) next.set("lloji", nextType);
    const qs = next.toString();
    return `${localBase}${qs ? `?${qs}` : ""}`;
  };
  const stockToggleHref = listingHref({ stok: !inStockOnly });
  // Shown once anything is actually out of stock — plus whenever the filter is
  // already on, so it can always be switched back off.
  const showStockFilter = inStockOnly || (await hasOutOfStockProducts());

  /**
   * One panel, rendered twice — desktop sidebar and mobile sheet — so a brand
   * shelf gets its type breakdown on both without a second control.
   *
   * On a brand page the product-type tree was not merely unhelpful, it marked
   * nothing at all as current: a brand does not appear in that tree and
   * "all products" is not the page either.
   */
  const filterPanel = showTypeFilter ? (
    <BrandTypeFilter
      brandName={title}
      brandHref={listingHref({ lloji: undefined })}
      allProductsHref={productsBase}
      types={brandTypes}
      activeType={activeType?.slug}
      hrefForType={(slug) => listingHref({ lloji: slug })}
      dict={dict}
    />
  ) : (
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
        {/* min-w-0: without it the grid item grows to its widest category
            name and the panel scrolls sideways */}
        <aside className="hidden min-w-0 lg:block" aria-label={dict.catalog.filters}>
          <div className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto rounded-2xl border border-ink-900/8 bg-white p-3">
            <h2 className="px-3 pb-2 pt-1 text-sm font-bold uppercase tracking-wide text-ink-900">
              {showTypeFilter
                ? dict.catalog.typesHeading
                : dict.catalog.categoriesHeading}
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
              {inStockOnly && <input type="hidden" name="stok" value="1" />}
              {activeType && <input type="hidden" name="lloji" value={activeType.slug} />}
            </form>
            <MobileFilters
              labels={{ filters: dict.catalog.filters, close: dict.catalog.closeFilters }}
            >
              {filterPanel}
            </MobileFilters>
            {/* A link, not a checkbox: the state lives in the URL so it
                survives sorting, paging and the back button, and the control
                needs no JavaScript to work. */}
            {showStockFilter && (
              <Link
                href={stockToggleHref}
                role="switch"
                aria-checked={inStockOnly}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                  inStockOnly
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-ink-900/10 bg-white text-ink-900 hover:border-brand-400"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex size-4 items-center justify-center rounded border ${
                    inStockOnly
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-900/25 bg-white"
                  }`}
                >
                  {inStockOnly && <Check className="size-3" strokeWidth={3} />}
                </span>
                {dict.catalog.inStockOnly}
              </Link>
            )}
            <SortSelect
              labels={{
                label: dict.catalog.sortLabel,
                az: dict.catalog.sortAZ,
                za: dict.catalog.sortZA,
                newest: dict.catalog.sortNewest,
              }}
            />
          </div>

          {(query || categorySlug || inStockOnly || activeType) && (
            <div className="mb-5 flex flex-wrap items-center gap-2" aria-label={dict.catalog.activeFilters}>
              {query && (
                <Link
                  href={listingHref({ query: undefined })}
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
              {activeType && (
                <Link
                  href={listingHref({ lloji: undefined })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium text-accent-800 hover:bg-accent-100"
                >
                  {fmt(dict.catalog.typeChip, { name: activeType.name })}
                  <X className="size-3.5" aria-hidden />
                  <span className="sr-only">{dict.catalog.removeFilter}</span>
                </Link>
              )}
              {inStockOnly && (
                <Link
                  href={stockToggleHref}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1.5 pl-3.5 pr-2.5 text-[13px] font-medium text-brand-800 hover:bg-brand-100"
                >
                  {dict.catalog.inStockChip}
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
