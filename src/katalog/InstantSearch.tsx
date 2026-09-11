"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { searchCatalogSections, searchProducts } from "@/lib/catalog-search";
import type { CardProduct, CatalogSection } from "@/lib/types";
import type { Dictionary } from "@/lib/dictionaries";
import { fmt } from "@/lib/i18n";
import { ProductCard } from "@/components/product/ProductCard";
import { EmptyState } from "@/components/catalog/EmptyState";

/**
 * The printed catalogue's search, answering as the reader types.
 *
 * Modelled on the Jara Pharmacy site, where the products are in the browser
 * and every keystroke filters them: a partner types "41" and the cards are
 * there before the next digit. Here the same thing is done with an index of
 * every printed product — ~1 700 cards, about 80 KB compressed, less than the
 * thumbnails of one page of results — handed over by SearchResults.tsx and
 * filtered locally by the very functions the server matches with
 * (src/lib/catalog-search.ts), so what the page showed on arrival and what it
 * shows after a keystroke can never disagree.
 *
 * The form underneath is a real <form method="get">: the server still renders
 * the results for `?kerko=` and `?faqja=`, so with scripting off the page works
 * exactly as it did when it was a submit-and-wait form. With scripting on,
 * Enter does nothing — the results are already there — and the URL is kept up
 * to date with history.replaceState, so a search can still be copied, shared
 * and returned to. That write is debounced: browsers rate-limit history calls,
 * and a fast typist with corrections could trip the limit inside ten seconds.
 *
 * No debounce on the filtering itself. Matching 1 700 names is under a
 * millisecond; the only cost is rendering the cards, and useDeferredValue lets
 * the field keep up with the fingers while the grid follows.
 */

/**
 * Forty-eight at a time, the same as /te-gjitha.
 *
 * It used to be all of them, on the reasoning that somebody types an article
 * code and gets one hit. Somebody also types a single letter: "a" matches 1 527
 * of the 1 733 printed products, which rendered a 6.1 MB page carrying 3 059
 * image references — roughly 25 MB of photographs once the browser fetched
 * them. One keystroke away, on a phone, in a pharmacy. "Show more" adds the
 * next forty-eight; `?faqja=n` on arrival shows the first n pages at once, so
 * a shared or reloaded URL lands on the same amount.
 */
export const PER_PAGE = 48;

/** One printed product as the card shows it, plus where the paper prints it. */
export type IndexProduct = CardProduct & { sectionId: number };

/**
 * A printed section with its link already built. The link depends on the host
 * (sitePath strips /katalog on shemo-katalog.com) and the language prefix,
 * both of which are the server's to know; a function cannot cross into a
 * client component, but sixty-one strings can.
 */
export type IndexSection = CatalogSection & { href: string };

/** Debounce for the URL write only — the results never wait for it. */
const URL_DELAY_MS = 300;

export function InstantSearch({
  index,
  sections,
  searchHref,
  contentsHref,
  initialQuery,
  initialPage,
  dict,
}: {
  /** Every printed product, in printed order — the order the hits keep. */
  index: IndexProduct[];
  sections: IndexSection[];
  /** This page's own path, language prefix included: the form's action and the URL that is kept current. */
  searchHref: string;
  /** The contents page, for the empty state's way out. */
  contentsHref: string;
  /** `?kerko=` as the page was opened. */
  initialQuery: string;
  /** `?faqja=` as the page was opened; pages one to n are shown at once. */
  initialPage: number;
  dict: Dictionary;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [visible, setVisible] = useState(Math.max(1, initialPage) * PER_PAGE);
  const deferred = useDeferredValue(query);
  const trimmed = deferred.trim();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The sections as searchCatalogSections wants them — with something to
  // measure — and the way back from a product to the section that prints it.
  // Grouped here from the index rather than shipped twice: the ids are already
  // on the products.
  const { searchable, sectionOf } = useMemo(() => {
    const ids = new Map<number, number[]>();
    for (const p of index) {
      const list = ids.get(p.sectionId);
      if (list) list.push(p.id);
      else ids.set(p.sectionId, [p.id]);
    }
    return {
      searchable: sections.map((s) => ({ ...s, products: ids.get(s.id) ?? [] })),
      sectionOf: new Map(sections.map((s) => [s.id, s])),
    };
  }, [index, sections]);

  const hits = useMemo(() => (trimmed ? searchProducts(index, trimmed) : []), [index, trimmed]);
  // A manufacturer's name is what the printed catalogue is organised by, and
  // usually not what its products are called — so the section is the answer
  // even when barely any product matches. Shown above the grid, never instead
  // of it: "bioblas" matches both a section and sixteen products.
  const matchedSections = useMemo(
    () => (trimmed ? searchCatalogSections(searchable, trimmed) : []),
    [searchable, trimmed]
  );
  const shown = hits.slice(0, visible);
  const pagesShown = Math.max(1, Math.ceil(visible / PER_PAGE));

  const hrefFor = (q: string, page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("kerko", q);
    if (page > 1) params.set("faqja", String(page));
    const qs = params.toString();
    return qs ? `${searchHref}?${qs}` : searchHref;
  };

  const scheduleUrl = (q: string, page: number) => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      // replaceState, not the router: nothing on the server needs to run, and
      // the App Router picks the change up for useSearchParams on its own.
      window.history.replaceState(null, "", hrefFor(q, page));
    }, URL_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
    },
    []
  );

  const update = (value: string) => {
    setQuery(value);
    // A new query starts at the first page, the way a new search always has.
    setVisible(PER_PAGE);
    scheduleUrl(value.trim(), 1);
  };

  const showMore = () => {
    const next = visible + PER_PAGE;
    setVisible(next);
    scheduleUrl(trimmed, Math.ceil(next / PER_PAGE));
  };

  return (
    <>
      <form
        action={searchHref}
        method="get"
        role="search"
        className="mt-5 flex max-w-xl items-center gap-3"
        // With scripting the results are already on the page; a submit would
        // only reload what is there. Without it, the browser never gets here.
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
          />
          <input
            ref={inputRef}
            type="search"
            name="kerko"
            value={query}
            onChange={(e) => update(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && query !== "") {
                e.preventDefault();
                update("");
              }
            }}
            // Focused on arrival only when there is nothing typed yet: that is
            // the reader who pressed "search the catalogue" and wants to type.
            // A shared link with a query in it opens on its results instead.
            autoFocus={initialQuery === ""}
            placeholder={dict.printedCatalog.searchPlaceholder}
            aria-label={dict.search.label}
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-ink-900/10 bg-white pl-10 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 [&::-webkit-search-cancel-button]:hidden"
          />
          {/* Hidden when there is nothing to clear, so the control never offers
              an action that would do nothing. */}
          {query !== "" && (
            <button
              type="button"
              onClick={() => {
                update("");
                inputRef.current?.focus();
              }}
              aria-label={dict.catalog.searchClear}
              className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-900/5 hover:text-ink-700"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        {/* The count sits with the field it describes and is announced as it
            changes — the deferred value keeps it from chattering per key. */}
        <p aria-live="polite" className="shrink-0 text-sm text-ink-400">
          {trimmed ? fmt(dict.catalog.productsCount, { n: hits.length }) : ""}
        </p>
      </form>

      {!trimmed && <p className="mt-3 text-ink-500">{dict.printedCatalog.searchPrompt}</p>}

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
                  href={s.href}
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
            actionHref={contentsHref}
          />
        </div>
      )}

      {shown.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((product, i) => {
            const section = sectionOf.get(product.sectionId);
            return (
              <li key={product.id} className="flex flex-col">
                <ProductCard product={product} dict={dict} mode="katalog" priority={i < 5} />
                {section && (
                  <Link
                    href={section.href}
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

      {hits.length > shown.length && (
        <div className="mt-10 flex flex-col items-center gap-2">
          {/* A real link to the next page of the same search, for the reader
              without scripting; with it, the click just reveals the next
              forty-eight in place and the URL follows. */}
          <a
            href={hrefFor(trimmed, pagesShown + 1)}
            onClick={(e) => {
              e.preventDefault();
              showMore();
            }}
            className="inline-flex h-11 items-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {dict.printedCatalog.showMore}
          </a>
          <p className="text-sm text-ink-400">
            {fmt(dict.printedCatalog.showingOf, { shown: shown.length, total: hits.length })}
          </p>
        </div>
      )}
    </>
  );
}
