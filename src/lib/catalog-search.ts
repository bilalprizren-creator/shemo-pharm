/**
 * Matching for the printed catalogue's search — the part that runs in the
 * browser as well as on the server.
 *
 * Its own module for the reason catalog-order.ts and product-filter.ts are:
 * catalog.ts is `server-only`, and the catalogue's search page filters in the
 * browser as the reader types (src/katalog/InstantSearch.tsx). The page still
 * renders the results for the URL's query on the server, so the two have to
 * agree on what a query matches — one function, imported from both sides, is
 * how they do. catalog.ts re-exports everything here, so its callers did not
 * move.
 *
 * Nothing here reads a database or formats a price: the types are structural
 * (`name`/`sku`, `catalogNo`/`name`/`products.length`) so the same functions
 * take the server's Product rows and the browser's card index alike.
 */
import type { CatalogSection } from "@/lib/types";

/** What `searchProducts` needs of a product: its name and its article code. */
export interface SearchableProduct {
  name: string;
  sku: string;
}

/**
 * What `searchCatalogSections` needs of a section. `products` is only ever
 * measured, so an array of ids serves as well as an array of products.
 */
export interface SearchableSection {
  catalogNo: string;
  name: string;
  products: ArrayLike<unknown>;
}

export function searchProducts<T extends SearchableProduct>(list: T[], query: string): T[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return list;
  return list.filter((p) => {
    const haystack = `${p.name} ${p.sku}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

/**
 * Printed sections whose number or name matches the query.
 *
 * The printed catalogue is organised by manufacturer and distributor — 6.7
 * Cansin, 38 Denk Pharma, 23 Froika — and searching it could not find any of
 * them, because a product is matched on its own name and article code and most
 * are not named after the house that makes them. "denk" answered with nothing
 * at all while section 38 sat in the contents; "cansin" answered with three
 * products while its section held ninety-odd. The one thing the paper edition
 * is arranged by was the one thing its search could not see.
 *
 * Matched the same way as products, token by token, so "denk pharma" and
 * "pharma denk" both land. The catalogue number is in the haystack too: a
 * partner reading "6.7" off a page can type it.
 *
 * Ranked and capped, because a substring match on its own is not a
 * recommendation: "a" appears somewhere in 45 of the 61 sections and "e" in 42,
 * so an uncapped list buried the one useful answer under most of the contents
 * page. A section whose number or name *begins* with what was typed comes
 * first, then one where a word inside it does, then the rest — and only the
 * first few are worth showing at all.
 */
export function searchCatalogSections<T extends SearchableSection>(
  sections: T[],
  query: string,
  limit = 6
): T[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  /** 0 starts the whole field, 1 starts a word in it, 2 sits inside a word. */
  const rank = (haystack: string, token: string): number => {
    if (haystack.startsWith(token)) return 0;
    // \b is unreliable across the Albanian alphabet, so the boundary is spelled
    // out: a space or one of the separators the numbering uses.
    return new RegExp(`(^|[\\s.\\-–—/])${escapeRegExp(token)}`).test(haystack)
      ? 1
      : 2;
  };

  return sections
    .flatMap((s) => {
      const haystack = `${s.catalogNo} ${s.name}`.toLowerCase();
      if (!tokens.every((t) => haystack.includes(t))) return [];
      // The worst-placed token decides, so "denk pharma" is not flattered by
      // one of its two words happening to start the name.
      const score = Math.max(...tokens.map((t) => rank(haystack, t)));
      return [{ s, score }];
    })
    .sort((a, b) => a.score - b.score || b.s.products.length - a.s.products.length)
    .slice(0, limit)
    .map((x) => x.s);
}

/** Escapes a user's query for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * URL segment for a printed section: "6.7 Cansin" becomes "6-7-cansin".
 *
 * Derived rather than stored, because it needs no uniqueness rule of its own —
 * catalog_sections already has a unique index on (catalog_no, name), and this
 * is a pure function of that pair. Both halves are required: "8.1" alone names
 * two sections, and so does the number-less name in a couple of cases.
 */
export function catalogSectionSlug(section: CatalogSection): string {
  return `${section.catalogNo}-${section.name}`
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ë/g, "e")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
