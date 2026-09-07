import Link from "next/link";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  catalogSectionSlug,
  getCatalogSections,
  searchProducts,
  toCardProducts,
} from "@/lib/catalog";
import { langHref, fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { EmptyState } from "@/components/catalog/EmptyState";

/**
 * Search across the printed catalogue.
 *
 * Deliberately narrower than the shop's /produktet: no filters, no sorting, no
 * pagination — just "which page of the catalogue is this code on". Each hit
 * carries its printed section, because that is the answer a partner holding the
 * paper edition actually wants.
 *
 * Only products that appear in the printed catalogue are searched. The 311 the
 * shop carries but the catalogue never printed would be noise here: the code
 * somebody types comes off a printed page.
 */
export async function SearchResults({
  query,
  dict,
}: {
  query: string;
  dict: Dictionary;
}) {
  const sections = await getCatalogSections();
  const session = await getSession();
  const showPrices = canSeePrices(session);

  const sectionOf = new Map(
    sections.flatMap((s) => s.products.map((p) => [p.id, s] as const))
  );
  const printed = sections.flatMap((s) => s.products);

  const trimmed = query.trim();
  const hits = trimmed ? searchProducts(printed, trimmed) : [];
  const cards = await toCardProducts(hits, showPrices);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: dict.printedCatalog.title, href: "/" },
          { label: dict.printedCatalog.searchTitle },
        ]}
        dict={dict}
      />

      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {dict.printedCatalog.searchTitle}
      </h1>

      {!trimmed ? (
        <p className="mt-3 text-ink-500">{dict.printedCatalog.searchPrompt}</p>
      ) : (
        <p className="mt-3 text-sm text-ink-400" aria-live="polite">
          {fmt(dict.catalog.productsCount, { n: hits.length })}
        </p>
      )}

      {trimmed && hits.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title={fmt(dict.printedCatalog.searchEmpty, { q: trimmed })}
            text={dict.printedCatalog.searchPrompt}
            actionLabel={dict.printedCatalog.contents}
            actionHref={langHref(dict.lang, "/")}
          />
        </div>
      )}

      {hits.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {cards.map((product, i) => {
            const section = sectionOf.get(product.id);
            return (
              <li key={product.id} className="flex flex-col">
                <ProductCard product={product} dict={dict} mode="katalog" priority={i < 5} />
                {section && (
                  <Link
                    href={langHref(dict.lang, `/${catalogSectionSlug(section)}`)}
                    className="mt-1.5 truncate text-xs font-medium text-brand-600 transition-colors hover:text-brand-800"
                  >
                    {fmt(dict.printedCatalog.inSection, {
                      no: section.catalogNo,
                      name: section.name,
                    })}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
