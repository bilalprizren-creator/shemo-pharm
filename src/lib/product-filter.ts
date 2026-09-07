/**
 * The product table's filter vocabulary, written down once.
 *
 * The same filter is read in three places and has to mean the same thing in
 * all of them: the URL /admin/produktet is opened with, the fields the bulk bar
 * posts back, and the SQL that decides which products a bulk write touches
 * (admin-data.ts matchingProductIds). Two of those decide what an editor is
 * shown and the third decides what an editor changes — if they ever disagreed,
 * the panel would quietly edit products it never listed.
 *
 * Its own module for the same two reasons as catalog-order.ts: it is pure, so
 * it can be tested without a database, and admin-actions.ts is a `"use server"`
 * file where every export becomes a POST-reachable endpoint.
 */

/** URL values for the list filters. "" is the absent filter, not a state. */
export type StockFilter = "" | "ne-stok" | "pa-stok";
export type VisibilityFilter = "" | "e-dukshme" | "e-fshehur";
/** Whether the product has a place in the printed catalogue at all. */
export type SectionFilter = "" | "me-seksion" | "pa-seksion";

/**
 * Everything the product table can be narrowed by.
 *
 * `visibility` is the shop and `catalogVisibility` is shemo-katalog.com. They
 * are two columns and two questions: a product hidden from one and shown in the
 * other is the normal state on a site pair that deliberately sells one part of
 * the range and prints another.
 */
export interface ProductFilter {
  query: string;
  stock: StockFilter;
  visibility: VisibilityFilter;
  catalogVisibility: VisibilityFilter;
  section: SectionFilter;
  /** One printed section, by id. Narrower than `section`, and independent of it. */
  sectionId: number | null;
  /** A shop category or brand, matched with its descendants. */
  categoryId: number | null;
}

/** No filter at all — the whole range. */
export const NO_PRODUCT_FILTER: ProductFilter = {
  query: "",
  stock: "",
  visibility: "",
  catalogVisibility: "",
  section: "",
  sectionId: null,
  categoryId: null,
};

/**
 * The dropdown vocabularies. First entry is the absent filter and doubles as
 * the fallback for anything else a URL or a crafted POST carries.
 */
export const STOCK_OPTIONS = [
  { value: "", label: "Të gjitha" },
  { value: "ne-stok", label: "Në stok" },
  { value: "pa-stok", label: "Pa stok" },
] as const satisfies readonly { value: StockFilter; label: string }[];

export const VISIBILITY_OPTIONS = [
  { value: "", label: "Të gjitha" },
  { value: "e-dukshme", label: "E dukshme" },
  { value: "e-fshehur", label: "E fshehur" },
] as const satisfies readonly { value: VisibilityFilter; label: string }[];

// Placement in the printed catalogue, which is not the same question as
// visibility there: "pa seksion" products appear on shemo-katalog.com only
// under /te-gjitha, never in a numbered section.
export const SECTION_OPTIONS = [
  { value: "", label: "Të gjitha" },
  { value: "me-seksion", label: "Me seksion" },
  { value: "pa-seksion", label: "Pa seksion" },
] as const satisfies readonly { value: SectionFilter; label: string }[];

/** The query-string key each field travels under, in the URL and in the form. */
export const FILTER_KEYS = {
  query: "kerko",
  stock: "stoku",
  visibility: "dukshmeria",
  catalogVisibility: "katalogu",
  section: "seksioni",
  sectionId: "seksioniId",
  categoryId: "kategoria",
} as const;

/** Anything that answers to a key: searchParams, URLSearchParams, FormData. */
export type FilterSource =
  | Record<string, string | string[] | undefined>
  | { get(key: string): unknown };

function read(source: FilterSource, key: string): string {
  const raw =
    typeof (source as { get?: unknown }).get === "function"
      ? (source as { get(k: string): unknown }).get(key)
      : (source as Record<string, string | string[] | undefined>)[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value : "";
}

function pick<T extends string>(
  raw: string,
  options: readonly { readonly value: T }[]
): T {
  return options.find((o) => o.value === raw)?.value ?? options[0]!.value;
}

/**
 * A filter that names a row by id.
 *
 * `allowed`, when given, is the set of ids that actually exist — the pages pass
 * it so a stale bookmark falls back to "no filter" rather than to a filter
 * nothing can match. The bulk actions do not: an id that exists is the only one
 * that can select anything, so an invented one is already inert there, and a
 * round trip to check would buy nothing.
 */
function pickId(raw: string, allowed?: ReadonlySet<number>): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return allowed && !allowed.has(n) ? null : n;
}

export function parseProductFilter(
  source: FilterSource,
  allowed: {
    sectionIds?: ReadonlySet<number>;
    categoryIds?: ReadonlySet<number>;
  } = {}
): ProductFilter {
  return {
    query: read(source, FILTER_KEYS.query).trim(),
    stock: pick(read(source, FILTER_KEYS.stock), STOCK_OPTIONS),
    visibility: pick(read(source, FILTER_KEYS.visibility), VISIBILITY_OPTIONS),
    catalogVisibility: pick(
      read(source, FILTER_KEYS.catalogVisibility),
      VISIBILITY_OPTIONS
    ),
    section: pick(read(source, FILTER_KEYS.section), SECTION_OPTIONS),
    sectionId: pickId(read(source, FILTER_KEYS.sectionId), allowed.sectionIds),
    categoryId: pickId(read(source, FILTER_KEYS.categoryId), allowed.categoryIds),
  };
}

/** Whether anything is actually being narrowed — the "Pastro filtrat" test. */
export function isFiltering(f: ProductFilter): boolean {
  return (
    f.query !== "" ||
    f.stock !== "" ||
    f.visibility !== "" ||
    f.catalogVisibility !== "" ||
    f.section !== "" ||
    f.sectionId !== null ||
    f.categoryId !== null
  );
}

/**
 * The filter as query-string parameters, absent fields left out so a clean
 * table lives at a clean URL.
 */
export function productFilterParams(f: ProductFilter): URLSearchParams {
  const params = new URLSearchParams();
  if (f.query) params.set(FILTER_KEYS.query, f.query);
  if (f.stock) params.set(FILTER_KEYS.stock, f.stock);
  if (f.visibility) params.set(FILTER_KEYS.visibility, f.visibility);
  if (f.catalogVisibility) params.set(FILTER_KEYS.catalogVisibility, f.catalogVisibility);
  if (f.section) params.set(FILTER_KEYS.section, f.section);
  if (f.sectionId) params.set(FILTER_KEYS.sectionId, String(f.sectionId));
  if (f.categoryId) params.set(FILTER_KEYS.categoryId, String(f.categoryId));
  return params;
}

/** The same fields as strings, for the hidden inputs the bulk bar posts back. */
export function productFilterFields(f: ProductFilter): Record<string, string> {
  return {
    [FILTER_KEYS.query]: f.query,
    [FILTER_KEYS.stock]: f.stock,
    [FILTER_KEYS.visibility]: f.visibility,
    [FILTER_KEYS.catalogVisibility]: f.catalogVisibility,
    [FILTER_KEYS.section]: f.section,
    [FILTER_KEYS.sectionId]: f.sectionId === null ? "" : String(f.sectionId),
    [FILTER_KEYS.categoryId]: f.categoryId === null ? "" : String(f.categoryId),
  };
}
