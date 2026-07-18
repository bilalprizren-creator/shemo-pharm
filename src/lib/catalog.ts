import "server-only";
import rawProducts from "@/data/products.json";
import rawCategories from "@/data/categories.json";
import { formatPrice } from "@/lib/format";
import type { CardProduct, Category, CategoryNode, Product } from "@/lib/types";

const products = rawProducts as Product[];
const categories = rawCategories as Category[];

/**
 * Albanian display-name corrections for category names coming from the old
 * site (spelling/terminology only — brand names stay untouched).
 */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  "paisje-medicinale": "Pajisje mjekësore",
  "suplements-effervescent": "Suplemente & Efervescente",
  "alkool-dhe-antiseptik": "Alkool dhe antiseptikë",
  "mbathje-ortopedike": "Mbathje ortopedike",
  "cajra-mjekesore": "Çajra mjekësore",
  "cajra-me-filter": "Çajra me filtër",
  prezervativ: "Prezervativë",
  "te-tjera": "Të tjera",
  "te-ndryshme": "Të ndryshme",
  "te-ndryshme-atc-natyral": "Të ndryshme",
  "te-ndryshme-prezervativ": "Të ndryshme",
  "te-ndryshme-suplements-effervescent": "Të ndryshme",
  "te-tjera-ersa-med-ortoped": "Të tjera",
};

export function categoryDisplayName(cat: Category): string {
  return CATEGORY_DISPLAY_NAMES[cat.slug] ?? cat.name;
}

export function getAllCategories(): Category[] {
  return categories;
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getTopCategories(): Category[] {
  return categories
    .filter((c) => c.parent === 0 && c.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function getCategoryTree(): CategoryNode[] {
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
function categoryIdWithDescendants(id: number): Set<number> {
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

export function getProducts({
  categorySlug,
  query,
  sort = "emri-asc",
  page = 1,
  perPage = 24,
  inStockOnly = false,
}: ProductQuery = {}): ProductPage {
  let list = products;

  if (categorySlug) {
    const cat = getCategoryBySlug(categorySlug);
    if (!cat) return { items: [], total: 0, page: 1, totalPages: 0 };
    const ids = categoryIdWithDescendants(cat.id);
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

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductCount(): number {
  return products.length;
}

export function primaryCategory(product: Product): Category | undefined {
  return categories.find((c) => product.categoryIds.includes(c.id));
}

export function getRelatedProducts(product: Product, limit = 8): Product[] {
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
export function getShowcaseProducts(categorySlug?: string, limit = 8): Product[] {
  const { items } = getProducts({ categorySlug, perPage: 200 });
  const withImages = items.filter((p) => p.images.length > 0);
  if (withImages.length <= limit) return withImages.slice(0, limit);
  const step = Math.floor(withImages.length / limit);
  return Array.from({ length: limit }, (_, i) => withImages[i * step]);
}

/**
 * Curated homepage picks — SHEMO's own branded devices, which have clean,
 * standardized local renders (see LOCAL_IMAGES). Falls back to the showcase
 * sampler if a slug is ever missing so the row is never short.
 */
export const FEATURED_SLUGS = [
  // Row 1 — SHEMO-branded devices
  "tensiometer-digjital-krahu-shemo-shm-500-0018",
  "pulseoximeter-shm-300-0002",
  "compressor-nebulizer-shm-100-0012",
  "mesh-nebulizer-shm-200-0013",
  // Row 2 — vitamins & supplements
  "a-z-vitamine-lutein-q10-60-tab-7159",
  "calcium-vitamin-c-a20-eff",
  "gummy-monsters-multivitamins-a60-7601",
  "alpherol-vitamin-e-400iu-30-softgel-1007",
];

export function getFeaturedProducts(limit = 4): Product[] {
  const curated = FEATURED_SLUGS.map((s) => getProductBySlug(s)).filter(
    (p): p is Product => Boolean(p)
  );
  if (curated.length >= limit) return curated.slice(0, limit);
  const fill = getShowcaseProducts(undefined, limit * 2).filter(
    (p) => !curated.some((c) => c.id === p.id)
  );
  return [...curated, ...fill].slice(0, limit);
}

/**
 * Standardized local product renders (square, white background) that override
 * the remote WordPress image for the curated set. Keyed by SKU — the Jara
 * render filenames encode the same SKU. Any product not listed keeps its
 * remote image.
 */
const LOCAL_IMAGES: Record<string, string> = {
  "0018": "/products/0018-tensiometer-shm-500.png",
  "0002": "/products/0002-pulseoximeter-shm-300.png",
  "0012": "/products/0012-compressor-nebulizer-shm-100.png",
  "0013": "/products/0013-mesh-nebulizer-shm-200.png",
  "7159": "/products/7159-az-vitamine.png",
  "3204": "/products/3204-calcium-vitamin-c.png",
  "7601": "/products/7601-gummy-monsters-multivitamin.png",
  "1007": "/products/1007-alpherol-vitamin-e.png",
};

export function productImage(product: Product): string | null {
  return LOCAL_IMAGES[product.sku] ?? product.images[0] ?? null;
}

/**
 * Shapes a product for the card components. Prices are attached here and
 * nowhere else — pass showPrices only after checking the session server-side.
 */
export function toCardProduct(product: Product, showPrices: boolean): CardProduct {
  const cat = primaryCategory(product);
  const hasDiscount = product.regularCents > product.priceCents;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    image: productImage(product),
    categoryName: cat ? categoryDisplayName(cat) : null,
    inStock: product.inStock,
    price: showPrices ? formatPrice(product.priceCents) : null,
    oldPrice: showPrices && hasDiscount ? formatPrice(product.regularCents) : null,
    discountPct: hasDiscount
      ? Math.round((1 - product.priceCents / product.regularCents) * 100)
      : null,
  };
}

/** Products with a genuine sale price (regular > current). */
export function getDiscountedProducts(limit = 24): Product[] {
  return products
    .filter((p) => p.regularCents > p.priceCents)
    .slice(0, limit);
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
