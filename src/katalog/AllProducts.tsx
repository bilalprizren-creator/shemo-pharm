import Link from "next/link";
import { redirect } from "next/navigation";
import { List, Printer, Search } from "lucide-react";
import { canSeePrices, getSession } from "@/lib/auth";
import {
  catalogSectionSlug,
  getAllProductsInCatalogOrder,
  toCardProducts,
} from "@/lib/catalog";
import { langHref, fmt } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import type { Dictionary } from "@/lib/dictionaries";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { Pagination } from "@/components/catalog/Pagination";
import { fullCatalogPdf } from "@/katalog/pdf";
import { PdfDownload } from "@/katalog/PdfDownload";

/**
 * Forty-eight per page. Measured on this catalogue: 155 cards weigh 203 KB
 * gzipped, so 48 lands near 65 KB — about what /produktet costs, at half the
 * clicking of the shop's 24.
 */
export const PER_PAGE = 48;

/**
 * Every product the company sells, in one sequence, page by page.
 *
 * The section view answers "what is on printed page 6.7". This answers "show me
 * everything, one after another" — and it is where the 311 products that never
 * made it into the printed catalogue finally become visible. Leaving them out is
 * what made the catalogue look like it held 1 733 products.
 *
 * A section heading appears whenever the section changes, because a page pulled
 * from the middle of 2 044 products is otherwise impossible to place.
 */
export async function AllProducts({
  page,
  dict,
}: {
  page: number;
  dict: Dictionary;
}) {
  const all = await getAllProductsInCatalogOrder();
  const mode = await getSiteMode();
  const href = (p: string) => langHref(dict.lang, sitePath(mode, p));
  // The printed run, which is not quite this list — 311 of these products have
  // never been printed and are not in the file. Same as the print link it
  // replaces, which went to the same 163 sheets.
  const pdf = fullCatalogPdf();

  const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const current = Math.min(Math.max(1, page), totalPages);
  const slice = all.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  // Same rule as the shop's listing: an out-of-range page number renders the
  // last real page, so it must not stay in the address bar declaring itself
  // canonical. See CatalogView for the full reasoning.
  if (page !== current) {
    redirect(`${href("/katalog/te-gjitha")}${current > 1 ? `?faqja=${current}` : ""}`);
  }

  const session = await getSession();
  const cards = await toCardProducts(
    slice.map((e) => e.product),
    canSeePrices(session)
  );

  // Group the page's products into runs that share a section, so each run gets
  // one heading instead of one per card.
  const runs: { key: string; heading: string | null; slug: string | null; from: number }[] = [];
  slice.forEach((entry, i) => {
    const key = entry.section ? String(entry.section.id) : "unprinted";
    if (runs.at(-1)?.key === key) return;
    runs.push({
      key,
      heading: entry.section ? `${entry.section.catalogNo} ${entry.section.name}` : null,
      slug: entry.section ? catalogSectionSlug(entry.section) : null,
      from: i,
    });
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: dict.printedCatalog.title, href: sitePath(mode, "/katalog") },
          { label: dict.printedCatalog.allTitle },
        ]}
        dict={dict}
      />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">
            {dict.printedCatalog.allTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-ink-500">{dict.printedCatalog.allSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={href("/katalog")}
            className="inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            <List className="size-4" aria-hidden />
            {dict.printedCatalog.contents}
          </Link>
          <Link
            href={href("/katalog/kerko")}
            className="inline-flex items-center gap-2 rounded-field border border-line bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            <Search className="size-4" aria-hidden />
            {dict.printedCatalog.searchInstead}
          </Link>
          {pdf ? (
            <PdfDownload pdf={pdf} dict={dict} />
          ) : (
            <Link
              href={href("/katalog/shtyp")}
              className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Printer className="size-4" aria-hidden />
              {dict.printedCatalog.print}
            </Link>
          )}
        </div>
      </div>

      {/* Not a live region: /te-gjitha is only ever a full document load, so
          there is no update for a screen reader to be told about. */}
      <p className="mt-6 text-sm text-ink-400">
        {fmt(dict.catalog.productsCount, { n: all.length })} ·{" "}
        {fmt(dict.printedCatalog.pageOf, { page: current, total: totalPages })}
      </p>

      <div className="mt-4">
        {runs.map((run, r) => {
          const until = runs[r + 1]?.from ?? slice.length;
          return (
            <section key={`${run.key}-${run.from}`} className="mt-6 first:mt-0">
              <h2 className="flex items-baseline gap-2 border-b border-line pb-2 text-sm font-bold text-ink-900">
                {run.heading ? (
                  <>
                    <Link
                      href={href(`/katalog/${run.slug}`)}
                      className="transition-colors hover:text-brand-700"
                    >
                      {run.heading}
                    </Link>
                  </>
                ) : (
                  <span className="text-ink-500">{dict.printedCatalog.notPrintedHeading}</span>
                )}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {cards.slice(run.from, until).map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    dict={dict}
                    mode={mode}
                    // Only the first row of the first run is above the fold.
                    priority={r === 0 && i < 5}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10">
        <Pagination
          basePath={href("/katalog/te-gjitha")}
          params={new URLSearchParams()}
          page={current}
          totalPages={totalPages}
          total={all.length}
          perPage={PER_PAGE}
          dict={dict}
        />
      </div>
    </div>
  );
}
