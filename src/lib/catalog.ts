import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { isAllowedImageSrc } from "@/lib/images";
import { CATALOG_TAG } from "@/lib/catalog-tag";
import type { CardProduct, Category, CategoryNode, Product } from "@/lib/types";

/**
 * Catalog access layer. Products and categories live in Postgres (see
 * src/lib/db.ts); this module loads them and runs the same in-memory
 * query/sort/selection logic the site has always used.
 *
 * Two caches sit in front of the one query, and they do different jobs:
 *
 *   unstable_cache  keeps the result across requests, so a page view no
 *                   longer costs a 690 KB round trip to Neon. Public pages
 *                   are dynamic (they read the session cookie for price
 *                   gating), so without this every single visit re-read the
 *                   whole catalog.
 *   cache()         de-duplicates within one render — the header, the
 *                   sidebar and the grid all ask for the catalog.
 *
 * Admin mutations invalidate CATALOG_TAG (see revalidateCatalog in
 * admin-actions.ts), so an edit is visible on the public site immediately
 * rather than after the revalidate window.
 */

interface CatalogData {
  products: Product[];
  categories: Category[];
}

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  sku: string | null;
  price_cents: number;
  regular_cents: number;
  on_sale: boolean;
  currency: string;
  images: unknown;
  category_ids: unknown;
  in_stock: boolean;
  description: string | null;
  short_description: string | null;
  display_name: string | null;
  image_override: string | null;
  featured: boolean;
  updated_at: string | Date | null;
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  display_name: string | null;
  kind: string;
  sort: number;
}

async function fetchCatalog(): Promise<CatalogData> {
  const productRows = (await sql`
    SELECT p.id, p.name, p.slug, p.sku, p.price_cents, p.regular_cents,
           p.on_sale, p.currency, p.images, p.in_stock, p.description,
           p.short_description, p.display_name, p.image_override, p.featured,
           p.updated_at,
           COALESCE(
             array_agg(pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL),
             '{}'::int[]
           ) AS category_ids
    FROM products p
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    WHERE p.hidden = false
    GROUP BY p.id
    ORDER BY p.id
  `) as ProductRow[];

  const categoryRows = (await sql`
    SELECT id, name, slug, parent, count, display_name, kind, sort FROM categories
  `) as CategoryRow[];

  const products: Product[] = productRows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    sku: r.sku ?? "",
    priceCents: r.price_cents,
    regularCents: r.regular_cents,
    onSale: r.on_sale,
    currency: r.currency,
    // next/image throws for hosts that are not configured, which would take
    // the whole page down — drop anything unexpected and fall back to the
    // placeholder instead. The admin form rejects such URLs up front.
    images: Array.isArray(r.images)
      ? (r.images as string[]).filter(isAllowedImageSrc)
      : [],
    categoryIds: Array.isArray(r.category_ids) ? (r.category_ids as number[]) : [],
    inStock: r.in_stock,
    description: r.description ?? "",
    shortDescription: r.short_description ?? "",
    displayName: r.display_name,
    imageOverride:
      r.image_override && isAllowedImageSrc(r.image_override)
        ? r.image_override
        : null,
    featured: r.featured,
    updatedAt: r.updated_at ? new Date(r.updated_at) : null,
  }));

  const categories: Category[] = categoryRows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    parent: r.parent,
    count: r.count,
    displayName: r.display_name,
    kind: r.kind === "brand" ? "brand" : "type",
    sort: r.sort ?? 0,
  }));

  return { products, categories };
}

/**
 * Cross-request cache. Measured: seven page views across five routes now cost
 * one database read instead of seven.
 *
 * The sixty-second `revalidate` is a backstop, not the mechanism. Edits made
 * in the admin panel invalidate CATALOG_TAG and appear at once; this covers
 * the two cases that cannot: a migration script writing straight to Neon
 * (which this project does regularly), and the possibility of the tag not
 * reaching every serverless instance. One catalog read per minute is nothing
 * next to one per request, so the ceiling is set low enough that nobody is
 * ever left staring at stale data for long.
 *
 * The whole catalog serializes to roughly 690 KB, comfortably inside the
 * 2 MB-per-entry limit of the platform data cache. The description columns
 * are nearly all empty, which is why the figure is that small; should real
 * product copy ever be filled in, this needs re-measuring.
 */
const cachedCatalog = unstable_cache(fetchCatalog, ["catalog-v1"], {
  tags: [CATALOG_TAG],
  revalidate: 60,
});

/** Per-render memoization on top, so one render makes at most one lookup. */
const loadCatalog = cache(cachedCatalog);

/**
 * Albanian display-name override for a category — the admin-editable
 * display_name column, falling back to the raw catalog name.
 */
export function categoryDisplayName(cat: Category): string {
  return cat.displayName ?? cat.name;
}

export async function getAllCategories(): Promise<Category[]> {
  return (await loadCatalog()).categories;
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  return (await loadCatalog()).categories.find((c) => c.slug === slug);
}

/** Curated order first, then size — so the nav stops reshuffling with stock. */
function byCuratedOrder(a: Category, b: Category): number {
  return a.sort - b.sort || b.count - a.count;
}

/**
 * The product-type roots the site navigates. Brands are deliberately excluded:
 * they are a parallel taxonomy shown on /markat, not a way to browse by what a
 * product is. Their pages stay reachable — getCategoryBySlug resolves every
 * slug, so /kategorite/cansin still lists Cansin's products.
 */
export async function getTopCategories(): Promise<Category[]> {
  const { categories } = await loadCatalog();
  return categories
    .filter((c) => c.parent === 0 && c.count > 0 && c.kind === "type")
    .sort(byCuratedOrder);
}

/** Every partner brand that has products, largest first. Used by /markat. */
export async function getBrandCategories(): Promise<Category[]> {
  const { categories } = await loadCatalog();
  return categories
    .filter((c) => c.kind === "brand" && c.parent === 0 && c.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** "Kräuterhof" -> "krauterhof", "TIO Medikal" -> "tio-medikal". */
function brandKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/ë/g, "e")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Partner logos whose name is not the name of a brand category, and where they
 * should point instead. Every entry was measured against the catalog rather
 * than guessed:
 *
 *   Support Line  the packshot audit found one retail box printing "supportline"
 *                 and "ersamed®" side by side, and every Support-Line product in
 *                 the catalog sits in the Ersa Med range. It is Ersa's own line,
 *                 not a separate supplier.
 *   Comfort Plus  the brand category reads "Comfort" — the DR.COMFORT incontinence
 *                 pants and the DM-series devices. A name search finds tampons and
 *                 a lubricant instead, because "comfort" is a marketing word.
 *   Foot Guard    only the pumice stone spells the brand out in its name, but the
 *                 audit read "Kokona Foot Guard" off the cream, the powder and the
 *                 spray too, so the whole foot range answers to "Foot".
 */
const BRAND_LINK_OVERRIDES: Record<string, { category?: string; query?: string }> = {
  "Support Line": { category: "ersa-med-ortopedi" },
  "Comfort Plus": { category: "comfort" },
  "Foot Guard": { query: "Foot" },
};

/**
 * A brand name matched as whole words against the catalog.
 *
 * `searchProducts` matches substrings, which is right for a search box and wrong
 * for deciding whether a logo has anywhere to go: "Alg" is inside "Deksalgin",
 * "algodon" and "valgus", so the substring test claims five products for a brand
 * that has none. The link is only offered when the name stands as its own word.
 */
function brandMatches(products: Product[], name: string): Product[] {
  const tests = name
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (token) =>
        new RegExp(
          `(^|[^\\p{L}\\p{N}])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`,
          "iu"
        )
    );
  return products.filter((p) => tests.every((re) => re.test(`${p.name} ${p.sku}`)));
}

export interface BrandLink {
  name: string;
  /** null when nothing in the catalog answers to this brand — render it unlinked. */
  href: string | null;
  /** Products the destination lists, so the card can say so. */
  count: number;
}

/**
 * Where each partner logo on /markat leads. A logo either reaches a brand
 * category, or a product search that actually returns something, or nothing at
 * all — and "nothing at all" is returned honestly rather than dressed up as a
 * link to an empty result page.
 */
export async function getBrandLinks(names: readonly string[]): Promise<BrandLink[]> {
  const { products, categories } = await loadCatalog();
  const byKey = new Map<string, Category>();
  for (const c of categories) {
    if (c.kind !== "brand" || c.count === 0) continue;
    byKey.set(c.slug, c);
    byKey.set(brandKey(categoryDisplayName(c)), c);
  }

  return names.map((name) => {
    const override = BRAND_LINK_OVERRIDES[name];
    const cat = byKey.get(override?.category ?? brandKey(name));
    if (cat) return { name, href: `/kategorite/${cat.slug}`, count: cat.count };

    const query = override?.query ?? name;
    const hits = brandMatches(products, query);
    if (!hits.length) return { name, href: null, count: 0 };
    return {
      name,
      href: `/produktet?kerko=${encodeURIComponent(query)}`,
      count: searchProducts(products, query).length,
    };
  });
}

/**
 * Brand categories no partner logo already covers. Without these, twenty
 * brands — Ersa Med's 241 products among them — are reachable only by typing
 * the URL, because /kategorite lists product types only.
 */
export async function getUnbrandedCategories(names: readonly string[]): Promise<Category[]> {
  const links = await getBrandLinks(names);
  const covered = new Set(
    links
      .map((l) => l.href?.match(/^\/kategorite\/(.+)$/)?.[1])
      .filter((slug): slug is string => Boolean(slug))
  );
  return (await getBrandCategories()).filter((c) => !covered.has(c.slug));
}

/** The type tree, for the sidebar filter and /kategorite. Brands are omitted. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const { categories } = await loadCatalog();
  const byParent = new Map<number, Category[]>();
  for (const c of categories) {
    if (c.kind !== "type") continue;
    const list = byParent.get(c.parent) ?? [];
    list.push(c);
    byParent.set(c.parent, list);
  }
  const build = (parent: number): CategoryNode[] =>
    (byParent.get(parent) ?? [])
      .sort(byCuratedOrder)
      .map((c) => ({ ...c, children: build(c.id) }));
  return build(0);
}

/** A category id plus every descendant id — products are tagged on leaves. */
function categoryIdWithDescendants(id: number, categories: Category[]): Set<number> {
  const ids = new Set<number>([id]);
  let added = true;
  while (added) {
    added = false;
    for (const c of categories) {
      if (ids.has(c.parent) && !ids.has(c.id)) {
        ids.add(c.id);
        added = true;
      }
    }
  }
  return ids;
}

export type ProductSort = "emri-asc" | "emri-desc" | "te-rejat";

export interface ProductQuery {
  categorySlug?: string;
  query?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  inStockOnly?: boolean;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * One collator for the whole module.
 *
 * `a.name.localeCompare(b.name, "sq")` builds a fresh collator on every
 * comparison, and the unfiltered listing sorts all 2 049 products before it
 * slices out a page of 24 — so that is tens of thousands of throwaway
 * collators per request. A reused Intl.Collator does the same job an order of
 * magnitude faster. `numeric` so "Vitamin C 10" sorts before "Vitamin C 100".
 */
const byName = new Intl.Collator("sq", { numeric: true });

export function searchProducts(list: Product[], query: string): Product[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return list;
  return list.filter((p) => {
    const haystack = `${p.name} ${p.sku}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
}

export async function getProducts({
  categorySlug,
  query,
  sort = "emri-asc",
  page = 1,
  perPage = 24,
  inStockOnly = false,
}: ProductQuery = {}): Promise<ProductPage> {
  const { products, categories } = await loadCatalog();
  let list = products;

  if (categorySlug) {
    const cat = categories.find((c) => c.slug === categorySlug);
    if (!cat) return { items: [], total: 0, page: 1, totalPages: 0 };
    const ids = categoryIdWithDescendants(cat.id, categories);
    list = list.filter((p) => p.categoryIds.some((id) => ids.has(id)));
  }

  if (inStockOnly) list = list.filter((p) => p.inStock);
  if (query) list = searchProducts(list, query);

  list = [...list];
  switch (sort) {
    case "emri-desc":
      list.sort((a, b) => byName.compare(b.name, a.name));
      break;
    case "te-rejat":
      list.sort((a, b) => b.id - a.id);
      break;
    default:
      list.sort((a, b) => byName.compare(a.name, b.name));
  }

  const total = list.length;
  const totalPages = Math.ceil(total / perPage);
  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const items = list.slice((safePage - 1) * perPage, safePage * perPage);
  return { items, total, page: safePage, totalPages };
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return (await loadCatalog()).products.find((p) => p.slug === slug);
}

export async function getProductCount(): Promise<number> {
  return (await loadCatalog()).products.length;
}

export async function primaryCategory(product: Product): Promise<Category | undefined> {
  const { categories } = await loadCatalog();
  return categories.find((c) => product.categoryIds.includes(c.id));
}

export async function getRelatedProducts(product: Product, limit = 8): Promise<Product[]> {
  const { products } = await loadCatalog();
  const related = products.filter(
    (p) =>
      p.id !== product.id &&
      p.images.length > 0 &&
      p.categoryIds.some((id) => product.categoryIds.includes(id))
  );
  return related.slice(0, limit);
}

/**
 * Deterministic homepage selection: products with images, spread across
 * the given category so rows do not repeat the same items.
 */
export async function getShowcaseProducts(
  categorySlug?: string,
  limit = 8
): Promise<Product[]> {
  const { items } = await getProducts({ categorySlug, perPage: 200 });
  const withImages = items.filter((p) => p.images.length > 0);
  if (withImages.length <= limit) return withImages.slice(0, limit);
  const step = Math.floor(withImages.length / limit);
  return Array.from({ length: limit }, (_, i) => withImages[i * step]);
}

/**
 * Curated display order for the homepage picks. The set of featured products
 * now comes from the DB (products.featured); this only keeps the original
 * left-to-right order for the seeded SHEMO devices. Admin-added featured
 * products sort after these, then by name.
 */
const FEATURED_ORDER = [
  "tensiometer-digjital-krahu-shemo-shm-500-0018",
  "pulseoximeter-shm-300-0002",
  "compressor-nebulizer-shm-100-0012",
  "a-z-vitamine-lutein-q10-60-tab-7159",
];

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const { products } = await loadCatalog();
  const featured = products
    .filter((p) => p.featured)
    .sort((a, b) => {
      const ra = FEATURED_ORDER.indexOf(a.slug);
      const rb = FEATURED_ORDER.indexOf(b.slug);
      const ka = ra === -1 ? Number.MAX_SAFE_INTEGER : ra;
      const kb = rb === -1 ? Number.MAX_SAFE_INTEGER : rb;
      return ka - kb || byName.compare(a.name, b.name);
    });
  if (featured.length >= limit) return featured.slice(0, limit);
  const fill = (await getShowcaseProducts(undefined, limit * 2)).filter(
    (p) => !featured.some((f) => f.id === p.id)
  );
  return [...featured, ...fill].slice(0, limit);
}

/** The product's image: admin override first, then the first catalog image. */
export function productImage(product: Product): string | null {
  return product.imageOverride ?? product.images[0] ?? null;
}

/** The product's display name: admin override first, then the catalog name. */
export function productDisplayName(product: Product): string {
  return product.displayName ?? product.name;
}

function buildCard(
  product: Product,
  showPrices: boolean,
  categoryName: string | null
): CardProduct {
  const hasDiscount = product.regularCents > product.priceCents;
  return {
    id: product.id,
    name: productDisplayName(product),
    slug: product.slug,
    sku: product.sku,
    image: productImage(product),
    categoryName,
    inStock: product.inStock,
    price: showPrices ? formatPrice(product.priceCents) : null,
    oldPrice: showPrices && hasDiscount ? formatPrice(product.regularCents) : null,
    discountPct: hasDiscount
      ? Math.round((1 - product.priceCents / product.regularCents) * 100)
      : null,
  };
}

/**
 * Shapes products for the card components. Prices are attached here and
 * nowhere else — pass showPrices only after checking the session server-side.
 */
export async function toCardProducts(
  list: Product[],
  showPrices: boolean
): Promise<CardProduct[]> {
  const { categories } = await loadCatalog();
  const byId = new Map(categories.map((c) => [c.id, c]));
  return list.map((product) => {
    let cat: Category | undefined;
    for (const id of product.categoryIds) {
      const found = byId.get(id);
      if (found) {
        cat = found;
        break;
      }
    }
    return buildCard(product, showPrices, cat ? categoryDisplayName(cat) : null);
  });
}

export async function toCardProduct(
  product: Product,
  showPrices: boolean
): Promise<CardProduct> {
  return (await toCardProducts([product], showPrices))[0];
}

/** Products with a genuine sale price (regular > current). */
export async function getDiscountedProducts(limit = 24): Promise<Product[]> {
  const { products } = await loadCatalog();
  return products.filter((p) => p.regularCents > p.priceCents).slice(0, limit);
}

/**
 * Whether marking things out of stock is in use at all.
 *
 * All 2 049 products are currently flagged in stock, which makes a "in stock
 * only" filter a control that can never change a result — worse than no
 * control, because it invites a click and answers with nothing. The admin
 * product list can flip the flag per product; the moment one is flipped, the
 * filter appears.
 */
export async function hasOutOfStockProducts(): Promise<boolean> {
  const { products } = await loadCatalog();
  return products.some((p) => !p.inStock);
}

/**
 * Whether /oferta has anything to show.
 *
 * The offers page has been live and empty: no product carries a struck-through
 * price and the curated list in src/data/offers.json is empty, so the menu
 * promised a section that turned out to be a "nothing here yet" box. Rather
 * than write filler discounts, the link is hidden while the page would be
 * empty — and comes back on its own the moment someone sets a higher regular
 * price in the admin panel or adds a slug to the curated list.
 *
 * Both sources are checked, in the same order the page itself uses them.
 */
export async function hasOffers(curatedSlugs: readonly string[] = []): Promise<boolean> {
  const { products } = await loadCatalog();
  if (products.some((p) => p.regularCents > p.priceCents)) return true;
  if (curatedSlugs.length === 0) return false;
  const wanted = new Set(curatedSlugs);
  return products.some((p) => wanted.has(p.slug));
}

/**
 * The product whose photo fronts each category in the nav. Hand-picked from
 * the clean white-background packshots: the nav used to show whichever
 * product happened to sort first, which is how Ortopedi ended up fronted by
 * an incontinence brief and Kozmetikë by an unlabelled carton. Categories
 * missing here keep that first-product behaviour.
 */
const CATEGORY_FACE: Record<string, string> = {
  barnat: "rivoksar-15mg-x-28-tab-9892",
  suplemente: "magnesium-citrate-60-tablets-9911",
  kozmetike: "vaseline-body-lotion-cocoa-radiant-400-ml-6053",
  ortopedi: "splint-per-mobilizim-dore-ref0-602-djathte-majte-s-m-l-xl-xxl",
  "paisje-medicinale": "tensiometer-digjital-krahu-shemo-shm-500-0018",
  "alkool-dhe-antiseptik": "baticonol-jod-10",
  fasha: "fllaster-me-aloe-vera-no-231",
  vajra: "coconut-oil-106ml-91003",
};

/**
 * The photo that represents a category. Falls back to the alphabetically
 * first product in the category that has one, so a face product that is
 * hidden, renamed or left without a photo degrades to the old behaviour
 * instead of an empty circle.
 *
 * The fallback picks that product with a single linear pass rather than by
 * sorting the category. The header calls this once per top-level category on
 * every request, and sorting a few hundred names eleven times over to read
 * one image off the front is work nobody asked for.
 */
export async function getCategoryImage(categorySlug: string): Promise<string | null> {
  const { products, categories } = await loadCatalog();
  const face = products.find((p) => p.slug === CATEGORY_FACE[categorySlug]);
  const image = face && productImage(face);
  if (image) return image;

  const cat = categories.find((c) => c.slug === categorySlug);
  if (!cat) return null;
  const ids = categoryIdWithDescendants(cat.id, categories);

  let best: Product | undefined;
  for (const p of products) {
    if (p.images.length === 0) continue;
    if (!p.categoryIds.some((id) => ids.has(id))) continue;
    if (!best || byName.compare(p.name, best.name) < 0) best = p;
  }
  return best ? productImage(best) : null;
}

/**
 * Curated homepage category cards mapped to real catalog slugs. Titles and
 * blurbs live in the dictionaries (home.categoryCards[slug]) so both locales
 * are covered; the icon key maps to a lucide icon in the CategoryGrid.
 */
export const HOME_CATEGORIES: { slug: string; icon: string }[] = [
  { slug: "barnat", icon: "cross" },
  { slug: "suplemente", icon: "pill" },
  { slug: "kozmetike", icon: "sparkles" },
  { slug: "ortopedi", icon: "footprints" },
  { slug: "paisje-medicinale", icon: "stethoscope" },
  { slug: "alkool-dhe-antiseptik", icon: "droplets" },
  { slug: "fasha", icon: "activity" },
  { slug: "vajra", icon: "leaf" },
];
