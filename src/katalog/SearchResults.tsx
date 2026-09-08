import Link from "next/link";
import { Search } from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  catalogSectionSlug,
  getCatalogSections,
  searchCatalogSections,
  searchProducts,
  toCardProducts,
} from "@/lib/catalog";
import { langHref, fmt } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { EmptyState } from "@/components/catalog/EmptyState";
import { Pagination } from "@/components/catalog/Pagination";

/**
 * Search across the printed catalogue.
 *
 * Deliberately narrower than the shop's /produktet: no filters and no sorting,
 * just "which page of the catalogue is this on". Each hit carries its printed
 * section, because that is the answer a partner holding the paper edition
 * actually wants — and a query that names a section brings back the section
 * itself, above the grid.
 *
 * Only products that appear in the printed catalogue are searched. The 311 the
 * shop carries but the catalogue never printed would be noise here: the code
 * somebody types comes off a printed page.
 */

/**
 * Forty-eight per page, the same as /te-gjitha.
 *
 * It used to be all of them, on the reasoning that somebody types an article
 * code and gets one hit. Somebody also types a single letter: "a" matches 1 527
 * of the 1 733 printed products, which rendered a 6.1 MB page carrying 3 059
 * image references — roughly 25 MB of photographs once the browser fetched
 * them. One keystroke away, on a phone, in a pharmacy. The shop's own listing
 * has paged since it was written; this is the same fix in the same shape.
 */
const PER_PAGE = 48;

export async function SearchResults({
  query,
  page,
  dict,
}: {
  query: string;
  page: number;
  dict: Dictionary;
}) {
  const sections = await getCatalogSections();
  const session = await getSession();
  const showPrices = canSeePrices(session);
  // The page is reachable on both domains now, so "back to the catalogue"
  // cannot be a bare "/" — on the shop's domain that is the shop's homepage,
  // and a reader who searched the catalogue would land somewhere else entirely.
  const mode = await getSiteMode();
  const href = (p: string) => langHref(dict.lang, sitePath(mode, p));

  const sectionOf = new Map(
    sections.flatMap((s) => s.products.map((p) => [p.id, s] as const))
  );
  const printed = sections.flatMap((s) => s.products);

  const trimmed = query.trim();
  const hits = trimmed ? searchProducts(printed, trimmed) : [];
  // A manufacturer's name is what the printed catalogue is organised by, and
  // usually not what its products are called — so the section is the answer
  // even when barely any product matches. Shown above the grid, never instead
  // of it: "bioblas" matches both a section and sixteen products.
  const matchedSections = trimmed ? searchCatalogSections(sections, trimmed) : [];
  const totalPages = Math.max(1, Math.ceil(hits.length / PER_PAGE));
  // Clamped rather than 404: a hand-edited number or a bookmark kept after the
  // range shrank should land on a real page of results, not on an error.
  const current = Math.min(Math.max(1, page), totalPages);
  // Only this page's cards are built. toCardProducts formats prices and reads
  // the blur placeholders, so doing it for 1 527 hits to show 48 was work
  // thrown away as well as bytes.
  const cards = await toCardProducts(
    hits.slice((current - 1) * PER_PAGE, current * PER_PAGE),
    showPrices
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: dict.printedCatalog.title, href: href("/katalog") },
          { label: dict.printedCatalog.searchTitle },
        ]}
        dict={dict}
      />

      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {dict.printedCatalog.searchTitle}
      </h1>

      {/*
        The page's own search box, not only the header's.

        KatalogHeader carries one, but it is only mounted on the catalogue's own
        domain — under /katalog on the shop's domain this page runs inside the
        shop's chrome, whose search goes to the shop's listing. Without a field
        of its own the page arrived with nothing to type into: a heading, a
        sentence telling you to type a code, and the footer.

        A plain GET form, like the header's, because the catalogue has to work
        with scripting off the way the paper edition it replaces always did. It
        posts to this same route, so a refined query replaces the results rather
        than leaving the catalogue.
      */}
      <form
        action={href("/katalog/kerko")}
        role="search"
        className="mt-5 flex max-w-xl items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 focus-within:border-brand-300"
      >
        <Search className="size-4 shrink-0 text-ink-400" aria-hidden />
        <input
          type="search"
          name="kerko"
          defaultValue={query}
          autoFocus={!trimmed}
          placeholder={dict.printedCatalog.searchPlaceholder}
          aria-label={dict.search.label}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          {dict.search.button}
        </button>
      </form>

      {!trimmed ? (
        <p className="mt-3 text-ink-500">{dict.printedCatalog.searchPrompt}</p>
      ) : (
        <p className="mt-3 text-sm text-ink-400" aria-live="polite">
          {fmt(dict.catalog.productsCount, { n: hits.length })}
          {totalPages > 1 && (
            <> · {fmt(dict.printedCatalog.pageOf, { page: current, total: totalPages })}</>
          )}
        </p>
      )}

      {matchedSections.length > 0 && (
        <section className="mt-6" aria-labelledby="seksionet-perputhen">
          <h2
            id="seksionet-perputhen"
            className="text-xs font-semibold uppercase tracking-wide text-ink-400"
          >
            {dict.printedCatalog.matchingSections}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {matchedSections.map((s) => (
              <li key={s.id}>
                <Link
                  href={href(`/katalog/${catalogSectionSlug(s)}`)}
                  className="inline-flex items-baseline gap-1.5 rounded-field border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-800 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  <span className="font-mono text-xs text-ink-400">{s.catalogNo}</span>
                  {s.name}
                  <span className="text-xs text-ink-400">
                    {fmt(dict.catalog.productsCount, { n: s.products.length })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trimmed && hits.length === 0 && matchedSections.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title={fmt(dict.printedCatalog.searchEmpty, { q: trimmed })}
            text={dict.printedCatalog.searchPrompt}
            actionLabel={dict.printedCatalog.contents}
            actionHref={href("/katalog")}
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
                    href={href(`/katalog/${catalogSectionSlug(section)}`)}
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

      {hits.length > 0 && (
        <div className="mt-10">
          {/* The query rides along in the params, so page two is still a page
              of the same search rather than an empty one. */}
          <Pagination
            basePath={href("/katalog/kerko")}
            params={new URLSearchParams({ kerko: trimmed })}
            page={current}
            totalPages={totalPages}
            dict={dict}
          />
        </div>
      )}
    </div>
  );
}
