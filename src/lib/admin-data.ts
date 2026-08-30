import "server-only";
import { assertAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import type {
  CatalogSectionOption,
  CategoryOption,
} from "@/components/admin/ProductForm";

/**
 * Reads for the admin panel.
 *
 * Every function here re-checks authorization itself. It used to trust its
 * callers — all of which do call requireAdmin() first, so nothing was reachable
 * — but `server-only` is a bundling guarantee, not an authorization one, and
 * getAdminProduct in particular returns products the public catalogue hides. The
 * check is free (getSession is memoized per request), so the convention auth.ts
 * documents is worth actually following rather than assuming.
 */

/**
 * Printed-catalogue sections as options for the product form, in printed order.
 *
 * Read straight from the table rather than through getCatalogSections(), which
 * drops sections that have no products — exactly the ones somebody opening this
 * form may be trying to refill.
 */
export async function getAdminCatalogSectionOptions(): Promise<CatalogSectionOption[]> {
  await assertAdmin();
  const rows = (await sql`
    SELECT id, catalog_no, name FROM catalog_sections ORDER BY sort
  `) as { id: number; catalog_no: string; name: string }[];
  return rows.map((r) => ({ id: r.id, label: `${r.catalog_no} — ${r.name}` }));
}

/** Category tree flattened to indented options for the product form. */
export async function getAdminCategoryOptions(): Promise<CategoryOption[]> {
  await assertAdmin();
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
  await assertAdmin();
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

/** URL values for the two list filters. "" is the absent filter, not a state. */
export type StockFilter = "" | "ne-stok" | "pa-stok";
export type VisibilityFilter = "" | "e-dukshme" | "e-fshehur";

/** One row of the admin product table — deliberately less than AdminProduct. */
export interface AdminProductListItem {
  id: number;
  name: string;
  sku: string;
  priceCents: number;
  inStock: boolean;
  featured: boolean;
  hidden: boolean;
}

/**
 * The product table, searched and filtered.
 *
 * Both filters arrive as `boolean | null`, null meaning "not filtering", because
 * the neon HTTP driver is a plain tagged template with no way to compose SQL
 * fragments — every condition has to be in the statement and switched off by a
 * parameter. The `::boolean` casts are what let a NULL parameter have a type at
 * all, and the parentheses around the search clause are load-bearing: without
 * them the trailing ANDs would bind tighter than the ORs and quietly filter the
 * search away.
 *
 * `total` is the count *after* filtering, which is what the page reports.
 */
export async function listAdminProducts(opts: {
  query: string;
  stock: StockFilter;
  visibility: VisibilityFilter;
  page: number;
  perPage: number;
}): Promise<{ rows: AdminProductListItem[]; total: number }> {
  await assertAdmin();
  const like = `%${opts.query}%`;
  const offset = (opts.page - 1) * opts.perPage;
  const inStock = opts.stock === "" ? null : opts.stock === "ne-stok";
  const hidden = opts.visibility === "" ? null : opts.visibility === "e-fshehur";

  const rows = (await sql`
    SELECT id, name, sku, price_cents, in_stock, featured, hidden,
           count(*) OVER ()::int AS total
    FROM products
    WHERE (${opts.query} = '' OR name ILIKE ${like} OR sku ILIKE ${like})
      AND (${inStock}::boolean IS NULL OR in_stock = ${inStock}::boolean)
      AND (${hidden}::boolean IS NULL OR hidden = ${hidden}::boolean)
    ORDER BY name ASC
    LIMIT ${opts.perPage} OFFSET ${offset}
  `) as Array<{
    id: number;
    name: string;
    sku: string;
    price_cents: number;
    in_stock: boolean;
    featured: boolean;
    hidden: boolean;
    total: number;
  }>;

  // count(*) OVER () can only report a total when at least one row came back, so
  // a page past the end answers "0" for a filter that in fact matches plenty —
  // a stale bookmark or a hand-edited faqja is enough to produce it. The second
  // query runs only in that case and never on a page that has rows.
  let total = rows[0]?.total ?? 0;
  if (rows.length === 0 && opts.page > 1) {
    const counted = (await sql`
      SELECT count(*)::int AS total
      FROM products
      WHERE (${opts.query} = '' OR name ILIKE ${like} OR sku ILIKE ${like})
        AND (${inStock}::boolean IS NULL OR in_stock = ${inStock}::boolean)
        AND (${hidden}::boolean IS NULL OR hidden = ${hidden}::boolean)
    `) as { total: number }[];
    total = counted[0]?.total ?? 0;
  }

  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      sku: r.sku,
      priceCents: r.price_cents,
      inStock: r.in_stock,
      featured: r.featured,
      hidden: r.hidden,
    })),
    total,
  };
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
  /** Printed-catalogue placement; null for the 311 products never printed. */
  catalogSectionId: number | null;
  catalogSort: number;
}

export async function getAdminProduct(id: number): Promise<AdminProduct | null> {
  // The one read here that returns rows the public catalogue deliberately hides.
  await assertAdmin();
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
    catalog_section_id: number | null;
    catalog_sort: number | null;
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
    catalogSectionId: r.catalog_section_id,
    catalogSort: r.catalog_sort ?? 0,
  };
}
