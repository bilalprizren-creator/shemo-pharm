import "server-only";
import { sql } from "@/lib/db";
import type { CategoryOption } from "@/components/admin/ProductForm";

/** Category tree flattened to indented options for the product form. */
export async function getAdminCategoryOptions(): Promise<CategoryOption[]> {
  const rows = (await sql`
    SELECT id, name, slug, parent, display_name FROM categories ORDER BY name
  `) as { id: number; name: string; slug: string; parent: number; display_name: string | null }[];

  const byParent = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byParent.get(r.parent) ?? [];
    list.push(r);
    byParent.set(r.parent, list);
  }

  const options: CategoryOption[] = [];
  const walk = (parent: number, depth: number) => {
    for (const r of byParent.get(parent) ?? []) {
      options.push({ id: r.id, label: r.display_name ?? r.name, depth });
      walk(r.id, depth + 1);
    }
  };
  walk(0, 0);
  return options;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  displayName: string | null;
  parent: number;
  kind: "type" | "brand";
  sort: number;
  count: number;
  /** Nesting level, so the table can indent the tree. */
  depth: number;
}

/**
 * Every category, product types depth-first in the order the site shows them,
 * then the flat brand list. Brands are a parallel taxonomy — they have no
 * tree — so mixing them into the same indentation would imply a hierarchy
 * that is not there.
 */
export async function getAdminCategories(): Promise<AdminCategory[]> {
  const rows = (await sql`
    SELECT id, name, slug, parent, count, display_name, kind, sort
    FROM categories
  `) as {
    id: number;
    name: string;
    slug: string;
    parent: number;
    count: number;
    display_name: string | null;
    kind: string;
    sort: number | null;
  }[];

  const all: AdminCategory[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    displayName: r.display_name,
    parent: r.parent,
    kind: r.kind === "brand" ? "brand" : "type",
    sort: r.sort ?? 0,
    count: r.count,
    depth: 0,
  }));

  const byParent = new Map<number, AdminCategory[]>();
  for (const c of all) {
    if (c.kind !== "type") continue;
    const list = byParent.get(c.parent) ?? [];
    list.push(c);
    byParent.set(c.parent, list);
  }
  const order = (a: AdminCategory, b: AdminCategory) =>
    a.sort - b.sort || b.count - a.count;

  const types: AdminCategory[] = [];
  const walk = (parent: number, depth: number) => {
    for (const c of (byParent.get(parent) ?? []).sort(order)) {
      types.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(0, 0);

  const brands = all
    .filter((c) => c.kind === "brand")
    .sort((a, b) => b.count - a.count);

  return [...types, ...brands];
}

export interface AdminProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  priceCents: number;
  regularCents: number;
  inStock: boolean;
  featured: boolean;
  hidden: boolean;
  displayName: string | null;
  imageOverride: string | null;
  images: string[];
  shortDescription: string;
  description: string;
  categoryIds: number[];
}

export async function getAdminProduct(id: number): Promise<AdminProduct | null> {
  const rows = (await sql`
    SELECT p.*, COALESCE(
             array_agg(pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL),
             '{}'::int[]
           ) AS category_ids
    FROM products p
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    WHERE p.id = ${id}
    GROUP BY p.id
  `) as Array<{
    id: number;
    name: string;
    slug: string;
    sku: string;
    price_cents: number;
    regular_cents: number;
    in_stock: boolean;
    featured: boolean;
    hidden: boolean;
    display_name: string | null;
    image_override: string | null;
    images: unknown;
    short_description: string;
    description: string;
    category_ids: number[];
  }>;
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    sku: r.sku,
    priceCents: r.price_cents,
    regularCents: r.regular_cents,
    inStock: r.in_stock,
    featured: r.featured,
    hidden: r.hidden,
    displayName: r.display_name,
    imageOverride: r.image_override,
    images: Array.isArray(r.images) ? (r.images as string[]) : [],
    shortDescription: r.short_description,
    description: r.description,
    categoryIds: r.category_ids ?? [],
  };
}
