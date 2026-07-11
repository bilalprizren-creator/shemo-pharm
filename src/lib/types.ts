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

/** Everything a product card needs. `price` is a formatted string that is
 *  only populated server-side for approved sessions — otherwise null. */
export interface CardProduct extends PublicProduct {
  price: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}
