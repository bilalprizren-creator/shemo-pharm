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
 * Shapes a product for the card components. Prices are attached here and
 * nowhere else — pass showPrices only after checking the session server-side.
 */
export function toCardProduct(product: Product, showPrices: boolean): CardProduct {
  const cat = primaryCategory(product);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    image: product.images[0] ?? null,
    categoryName: cat ? categoryDisplayName(cat) : null,
    inStock: product.inStock,
    price: showPrices ? formatPrice(product.priceCents) : null,
  };
}

/** Curated homepage category cards mapped to real catalog slugs. */
export const HOME_CATEGORIES: {
  slug: string;
  title: string;
  blurb: string;
  icon: string;
}[] = [
  {
    slug: "paisje-medicinale",
    title: "Pajisje mjekësore",
    blurb: "Pajisje dhe materiale për përdorim profesional",
    icon: "stethoscope",
  },
  {
    slug: "aparatura",
    title: "Aparatura",
    blurb: "Aparate matëse dhe teknologji mjekësore",
    icon: "activity",
  },
  {
    slug: "ersa-med-ortopedi",
    title: "Produkte ortopedike",
    blurb: "Mbështetëse, banda dhe zgjidhje ortopedike",
    icon: "footprints",
  },
  {
    slug: "suplements-effervescent",
    title: "Suplemente",
    blurb: "Vitamina, minerale dhe suplemente ushqimore",
    icon: "pill",
  },
  {
    slug: "kozmetike",
    title: "Kozmetikë dhe kujdes personal",
    blurb: "Produkte për kujdesin e lëkurës dhe higjienën",
    icon: "sparkles",
  },
  {
    slug: "barnat",
    title: "Barnat",
    blurb: "Produkte farmaceutike nga brende të njohura",
    icon: "cross",
  },
  {
    slug: "alkool-dhe-antiseptik",
    title: "Higjienë dhe antiseptikë",
    blurb: "Dezinfektues dhe produkte antiseptike",
    icon: "droplets",
  },
  {
    slug: "atc-natyral",
    title: "Produkte natyrale",
    blurb: "Çajra mjekësore dhe produkte bimore",
    icon: "leaf",
  },
];
