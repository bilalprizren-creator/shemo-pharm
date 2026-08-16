import Link from "next/link";
import type { TypeFacet } from "@/lib/catalog";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * The filter panel shown on a brand shelf, in place of the product-type tree.
 *
 * The tree was worse than useless there: a brand is not in it, so nothing was
 * marked as current — not even "all products" — and a visitor on
 * /kategorite/swiss-energy got no indication from the sidebar of where they
 * were. This says where they are and offers the one narrowing the data
 * supports: the product types this brand actually sells.
 *
 * Plain links, like CategoryFilter, so the whole thing works without
 * JavaScript and every state is a URL somebody can share.
 */
export function BrandTypeFilter({
  brandName,
  brandHref,
  allProductsHref,
  types,
  activeType,
  hrefForType,
  dict,
}: {
  brandName: string;
  /** The unfiltered brand shelf — "all products of this brand". */
  brandHref: string;
  /** The whole catalog, the way out of this brand. */
  allProductsHref: string;
  types: TypeFacet[];
  /** Slug of the type currently narrowed to, if any. */
  activeType?: string;
  hrefForType: (slug: string) => string;
  dict: Dictionary;
}) {
  return (
    // A one-type brand gets no rows, and then the panel does not filter by
    // type — it only says which shelf this is and how to leave it.
    <nav aria-label={types.length > 0 ? dict.catalog.filterByType : brandName}>
      <p className="px-3 pb-1 pt-1 text-sm font-bold text-ink-900">{brandName}</p>

      <ul className="space-y-0.5">
        <li>
          <Link
            href={brandHref}
            aria-current={!activeType ? "page" : undefined}
            className={`flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition-colors ${
              !activeType
                ? "bg-brand-600 font-semibold text-white"
                : "text-ink-700 hover:bg-brand-50 hover:text-brand-800"
            }`}
          >
            {dict.catalog.allOfBrand}
          </Link>
        </li>

        {types.map((t) => {
          const isActive = t.slug === activeType;
          return (
            <li key={t.slug}>
              <Link
                href={isActive ? brandHref : hrefForType(t.slug)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-brand-600 font-semibold text-white"
                    : "text-ink-700 hover:bg-brand-50 hover:text-brand-800"
                }`}
              >
                <span className="line-clamp-2 min-w-0 break-words leading-snug">
                  {t.name}
                </span>
                {/* Same fixed, right-aligned, tabular column as the category
                    tree, so the two panels line their numbers up identically. */}
                <span
                  className={`w-8 shrink-0 text-right text-xs tabular-nums ${
                    isActive ? "text-white/80" : "text-ink-400"
                  }`}
                >
                  {t.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href={allProductsHref}
        className="mt-2 flex min-h-10 items-center rounded-lg px-3 py-2 text-sm text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-800"
      >
        {dict.catalog.allProducts}
      </Link>
    </nav>
  );
}
