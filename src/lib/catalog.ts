import "server-only";
import { cache } from "react";
import { sql } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import type { CardProduct, Category, CategoryNode, Product } from "@/lib/types";

/**
 * Catalog access layer. Products and categories live in Postgres (see
 * src/lib/db.ts); this module loads them once per request and runs the same
 * in-memory query/sort/selection logic the site has always used. Public
 * pages read the session cookie (for price gating) and are therefore
 * dynamically rendered, so each request sees fresh catalog data and admin
 * edits appear immediately — no cross-request cache to invalidate.
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
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  display_name: string | null;
}

async function fetchCatalog(): Promise<CatalogData> {
  const productRows = (await sql`
    SELECT p.id, p.name, p.slug, p.sku, p.price_cents, p.regular_cents,
           p.on_sale, p.currency, p.images, p.in_stock, p.description,
           p.short_description, p.display_name, p.image_override, p.featured,
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
    SELECT id, name, slug, parent, count, display_name FROM categories
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
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    categoryIds: Array.isArray(r.category_ids) ? (r.category_ids as number[]) : [],
    inStock: r.in_stock,
    description: r.description ?? "",
    shortDescription: r.short_description ?? "",
    displayName: r.display_name,
    imageOverride: r.image_override,
    featured: r.featured,
  }));

  const categories: Category[] = categoryRows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    parent: r.parent,
    count: r.count,
    displayName: r.display_name,
  }));

  return { products, categories };
}

/** Per-request memoization: one DB round trip per render, shared by all callers. */
const loadCatalog = cache(fetchCatalog);

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

export async function getTopCategories(): Promise<Category[]> {
  const { categories } = await loadCatalog();
  return categories
    .filter((c) => c.parent === 0 && c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const { categories } = await loadCatalog();
  const byParent = new Map<number, Category[]>();
  for (const c of categories) {
    const list = byParent.get(c.parent) ?? [];
    list.push(c);
    byParent.set(c.parent, list);
  }
  const build = (parent: number): CategoryNode[] =>
    (byParent.get(parent) ?? [])
      .sort((a, b) => b.count - a.count)
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
      list.sort((a, b) => b.name.localeCompare(a.name, "sq"));
      break;
    case "te-rejat":
      list.sort((a, b) => b.id - a.id);
      break;
    default:
      list.sort((a, b) => a.name.localeCompare(b.name, "sq"));
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
      return ka - kb || a.name.localeCompare(b.name, "sq");
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
 * Curated homepage category cards mapped to real catalog slugs. Titles and
 * blurbs live in the dictionaries (home.categoryCards[slug]) so both locales
 * are covered; the icon key maps to a lucide icon in the CategoryGrid.
 */
export const HOME_CATEGORIES: { slug: string; icon: string }[] = [
  { slug: "paisje-medicinale", icon: "stethoscope" },
  { slug: "aparatura", icon: "activity" },
  { slug: "ersa-med-ortopedi", icon: "footprints" },
  { slug: "suplements-effervescent", icon: "pill" },
  { slug: "kozmetike", icon: "sparkles" },
  { slug: "barnat", icon: "cross" },
  { slug: "alkool-dhe-antiseptik", icon: "droplets" },
  { slug: "atc-natyral", icon: "leaf" },
];
