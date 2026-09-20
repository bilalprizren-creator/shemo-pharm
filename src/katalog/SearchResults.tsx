import { canSeePrices, getSession } from "@/lib/auth";
import {
  catalogSectionSlug,
  getAllProductsInCatalogOrder,
  getCatalogSections,
  toCardProducts,
} from "@/lib/catalog";
import { langHref } from "@/lib/i18n";
import { getSiteMode, sitePath } from "@/lib/site-mode";
import type { Dictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { InstantSearch, type IndexProduct, type IndexSection } from "@/katalog/InstantSearch";

/**
 * Search across the printed catalogue.
 *
 * Deliberately narrower than the shop's /produktet: no filters and no sorting,
 * just "which page of the catalogue is this on". Each hit carries its printed
 * section, because that is the answer a partner holding the paper edition
 * actually wants — and a query that names a section brings back the section
 * itself, above the grid.
 *
 * Everything the catalogue shows is searched — the same range /te-gjitha
 * lists, `catalog_hidden = false` whether or not a printed section holds it.
 * It used to be the printed products only, on the reasoning that the code
 * somebody types comes off a printed page; but a product switched to "në
 * katalog" in the admin panel and never placed in a section (330 of them at
 * the time of writing) was then findable nowhere on this site except on the
 * last pages of /te-gjitha, and the switch looked broken. A hit without a
 * section says so under its card instead of pretending to a page number.
 *
 * The searching itself happens in the browser, as the reader types — see
 * InstantSearch.tsx for why and how. What this server half does is build what
 * the browser needs and cannot make for itself: every catalogue product as a
 * card (prices only for a session that may see them, the same gate as every
 * other page), which section prints it, and the links, which depend on the
 * host and the language. The index costs one toCardProducts over the whole
 * range per request — a map lookup and a price format per product — and the
 * page still renders the results for the URL it was opened with, so it works
 * with scripting off exactly as the submit-and-wait form before it did.
 */
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
  // The page is reachable on both domains, so "back to the catalogue"
  // cannot be a bare "/" — on the shop's domain that is the shop's homepage,
  // and a reader who searched the catalogue would land somewhere else entirely.
  const mode = await getSiteMode();
  const href = (p: string) => langHref(dict.lang, sitePath(mode, p));

  // Printed order first, then the unplaced ones by name — the order /te-gjitha
  // runs in, and the order the hits keep. 0 stands for "no section": the
  // browser side has no section to look up and labels the card instead.
  const all = await getAllProductsInCatalogOrder();
  const cards = await toCardProducts(
    all.map((entry) => entry.product),
    showPrices
  );
  const index: IndexProduct[] = cards.map((card, i) => ({
    ...card,
    sectionId: all[i].section?.id ?? 0,
  }));
  const links: IndexSection[] = sections.map((s) => ({
    id: s.id,
    catalogNo: s.catalogNo,
    name: s.name,
    sort: s.sort,
    href: href(`/katalog/${catalogSectionSlug(s)}`),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs
        items={[
          { label: dict.printedCatalog.title, href: sitePath(mode, "/katalog") },
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
        of its own the page would arrive with nothing to type into.
      */}
      <InstantSearch
        index={index}
        sections={links}
        searchHref={href("/katalog/kerko")}
        contentsHref={href("/katalog")}
        initialQuery={query.trim()}
        initialPage={page}
        dict={dict}
      />
    </div>
  );
}
