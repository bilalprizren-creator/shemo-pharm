export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  priceCents: number;
  regularCents: number;
  onSale: boolean;
  currency: string;
  images: string[];
  categoryIds: number[];
  inStock: boolean;
  description: string;
  shortDescription: string;
  /** Admin overrides (from the DB). Null when not set. */
  displayName: string | null;
  imageOverride: string | null;
  featured: boolean;
  /** Last edit, for the sitemap. Null on rows the import never touched again. */
  updatedAt: Date | null;
  /** Where the product sits in the printed catalogue. Null when it is not in
   *  it at all — 311 of the 2 049 products have never been printed. */
  catalogSectionId: number | null;
  catalogSort: number;
}

/**
 * A numbered section of the printed catalogue — "1.1 SHEMO", "5.5 Rabir".
 *
 * Deliberately not a Category: only 14 of the 63 printed sections name anything
 * in the site taxonomy. The rest are manufacturers (Belupo, HEMOFARM, Denk
 * Pharma), wholesalers (Rabir, NT41), or print-only catch-alls, and none of
 * those belong in the customer-facing filters. See scripts/add-catalog-order.mjs.
 */
export interface CatalogSection {
  id: number;
  /** The number as printed. Not unique — "8.1" names two sections — and not
   *  sortable: the printed run is 6.4, 6.1, 6.3, 6.5. Use `sort`. */
  catalogNo: string;
  name: string;
  sort: number;
}

/** Product data that is safe to send to any visitor — never contains prices. */
export interface PublicProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  image: string | null;
  categoryName: string | null;
  inStock: boolean;
}

/** Everything a product card needs. `price`/`oldPrice` are formatted strings
 *  that are only populated server-side for approved sessions — otherwise null.
 *  `discountPct` carries no absolute price and may render publicly; it is
 *  only non-null when the export contains a real sale price. */
export interface CardProduct extends PublicProduct {
  price: string | null;
  oldPrice: string | null;
  discountPct: number | null;
}

/**
 * `type` categories form the product tree the site navigates; `brand` ones are
 * a parallel, flat list that only /markat reads. The WooCommerce export mixed
 * both into one tree — see scripts/restructure-categories.mjs.
 */
export type CategoryKind = "type" | "brand";

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  /** Admin override for the display name (from the DB). Null when not set. */
  displayName: string | null;
  kind: CategoryKind;
  /** Manual ordering within a level; ties fall back to count. */
  sort: number;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}
