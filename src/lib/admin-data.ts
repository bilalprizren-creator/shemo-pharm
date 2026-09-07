import "server-only";
import { assertAdmin } from "@/lib/auth";
import { catalogSectionSlug } from "@/lib/catalog";
import { sql } from "@/lib/db";
import type { ProductFilter } from "@/lib/product-filter";
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

/** One row of the admin product table — deliberately less than AdminProduct. */
export interface AdminProductListItem {
  id: number;
  name: string;
  sku: string;
  priceCents: number;
  inStock: boolean;
  featured: boolean;
  /** Hidden from the shop. */
  hidden: boolean;
  /** Hidden from the printed catalogue — a separate decision, separate button. */
  catalogHidden: boolean;
}

/**
 * Every product the filter matches, in the order the table lists them.
 *
 * The single place the filter is expressed as SQL. Paging, the "N match"
 * count and the bulk writes all go through here, so they cannot drift apart.
 *
 * Each condition arrives as a nullable parameter, null meaning "not filtering",
 * because the neon HTTP driver is a plain tagged template with no way to
 * compose SQL fragments — every condition has to be in the statement and
 * switched off by a parameter. The `::boolean` and `::int` casts are what let a
 * NULL parameter have a type at all, and the parentheses around the search
 * clause are load-bearing: without them the trailing ANDs would bind tighter
 * than the ORs and quietly filter the search away.
 *
 * The category is matched with its descendants, the same way the site counts
 * one (catalog.ts categoryIdWithDescendants): "Kozmetikë" has to mean the 481
 * products under it, not the 280 tagged on the parent itself, or a bulk hide
 * from that filter would leave most of the branch behind. The depth guard is
 * insurance — a cycle in `parent` would otherwise recurse forever.
 *
 * Returning ids rather than a count keeps the whole range at ~2k integers,
 * which is small enough to hand back on every page load and simpler than a
 * second statement that has to repeat the same WHERE.
 */
export async function matchingProductIds(f: ProductFilter): Promise<number[]> {
  await assertAdmin();
  const like = `%${f.query}%`;
  const inStock = f.stock === "" ? null : f.stock === "ne-stok";
  const hidden = f.visibility === "" ? null : f.visibility === "e-fshehur";
  const catalogHidden =
    f.catalogVisibility === "" ? null : f.catalogVisibility === "e-fshehur";
  const placed = f.section === "" ? null : f.section === "me-seksion";

  const rows = (await sql`
    WITH RECURSIVE subtree AS (
      SELECT id AS node, 0 AS depth FROM categories WHERE id = ${f.categoryId}::int
      UNION ALL
      SELECT c.id, s.depth + 1
      FROM categories c JOIN subtree s ON c.parent = s.node
      WHERE s.depth < 10
    )
    SELECT p.id, p.name
    FROM products p
    WHERE (${f.query} = '' OR p.name ILIKE ${like} OR p.sku ILIKE ${like})
      AND (${inStock}::boolean IS NULL OR p.in_stock = ${inStock}::boolean)
      AND (${hidden}::boolean IS NULL OR p.hidden = ${hidden}::boolean)
      AND (${catalogHidden}::boolean IS NULL
           OR p.catalog_hidden = ${catalogHidden}::boolean)
      AND (${placed}::boolean IS NULL
           OR (p.catalog_section_id IS NOT NULL) = ${placed}::boolean)
      AND (${f.sectionId}::int IS NULL
           OR p.catalog_section_id = ${f.sectionId}::int)
      AND (${f.categoryId}::int IS NULL
           OR EXISTS (SELECT 1 FROM product_categories pc
                      JOIN subtree s ON s.node = pc.category_id
                      WHERE pc.product_id = p.id))
    ORDER BY p.name ASC, p.id
  `) as { id: number }[];

  return rows.map((r) => r.id);
}

/**
 * One page of the product table, and how many products the filter matches.
 *
 * Two statements rather than the `count(*) OVER ()` this used to do: that
 * window function can only report a total when at least one row comes back, so
 * a page past the end answered "0 match" for a filter matching plenty. Slicing
 * a list of ids has no such edge, and the ids are what the bulk bar needs anyway.
 */
export async function listAdminProducts(
  opts: ProductFilter & { page: number; perPage: number }
): Promise<{ rows: AdminProductListItem[]; total: number }> {
  const ids = await matchingProductIds(opts);
  const total = ids.length;
  const offset = (opts.page - 1) * opts.perPage;
  const slice = ids.slice(offset, offset + opts.perPage);
  if (slice.length === 0) return { rows: [], total };

  const rows = (await sql`
    SELECT id, name, sku, price_cents, in_stock, featured, hidden, catalog_hidden
    FROM products
    WHERE id = ANY(${slice}::int[])
  `) as Array<{
    id: number;
    name: string;
    sku: string;
    price_cents: number;
    in_stock: boolean;
    featured: boolean;
    hidden: boolean;
    catalog_hidden: boolean;
  }>;

  // ANY() answers in whatever order the planner likes, so the page order comes
  // back from the slice, which is the order matchingProductIds decided.
  const byId = new Map(rows.map((r) => [r.id, r]));
  return {
    rows: slice.flatMap((id) => {
      const r = byId.get(id);
      return r
        ? [
            {
              id: r.id,
              name: r.name,
              sku: r.sku,
              priceCents: r.price_cents,
              inStock: r.in_stock,
              featured: r.featured,
              hidden: r.hidden,
              catalogHidden: r.catalog_hidden,
            },
          ]
        : [];
    }),
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
  /** Hidden from the printed catalogue, independently of the shop. */
  catalogHidden: boolean;
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
    catalog_hidden: boolean;
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
    catalogHidden: r.catalog_hidden,
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

/* --------------------------- Printed catalogue ---------------------------- */

export interface AdminCatalogSection {
  id: number;
  catalogNo: string;
  name: string;
  sort: number;
  /** The URL segment the catalogue site serves this section at. */
  slug: string;
  /** Everything placed here, hidden products included. */
  productCount: number;
  /** What the catalogue site actually prints: `catalog_hidden = false`. Not the
   *  same set the shop lists — the two visibilities are separate flags. */
  visibleCount: number;
  /** Placed here and hidden from the shop, which the catalogue does not mind. */
  shopHiddenCount: number;
}

/**
 * Every printed section, in printed order, with what sits in each.
 *
 * Read straight from the table, so the empty sections are in it. The public
 * catalogue drops those (getCatalogSections) — 38 Denk Pharma and 7.3 Ivy Bear
 * are numbered headings over nothing — and this list is the only place where
 * somebody can see that they exist and refill them.
 *
 * Ordered by `sort`, never by `catalog_no`: the printed run is 6.4, 6.1, 6.3,
 * 6.5, and "8.1" names two different sections.
 */
export async function getAdminCatalogSections(): Promise<AdminCatalogSection[]> {
  await assertAdmin();
  const rows = (await sql`
    SELECT s.id, s.catalog_no, s.name, s.sort,
           count(p.id)::int AS product_count,
           (count(p.id) FILTER (WHERE p.catalog_hidden = false))::int AS visible_count,
           (count(p.id) FILTER (WHERE p.hidden))::int AS shop_hidden_count
    FROM catalog_sections s
    LEFT JOIN products p ON p.catalog_section_id = s.id
    GROUP BY s.id
    ORDER BY s.sort, s.id
  `) as {
    id: number;
    catalog_no: string;
    name: string;
    sort: number | null;
    product_count: number;
    visible_count: number;
    shop_hidden_count: number;
  }[];

  return rows.map((r) => ({
    id: r.id,
    catalogNo: r.catalog_no,
    name: r.name,
    sort: r.sort ?? 0,
    slug: catalogSectionSlug({
      id: r.id,
      catalogNo: r.catalog_no,
      name: r.name,
      sort: r.sort ?? 0,
    }),
    productCount: r.product_count,
    visibleCount: r.visible_count,
    shopHiddenCount: r.shop_hidden_count,
  }));
}

/** What each of the two sites currently shows, and what neither shows. */
export interface SiteVisibilityCounts {
  /** Every product in the database, shown or not. */
  total: number;
  /** Listed in the shop: `hidden = false`. */
  shop: number;
  /** Printed by shemo-katalog.com: `catalog_hidden = false`. */
  katalog: number;
  /** Hidden from both — in the database, on neither site. */
  nowhere: number;
}

/**
 * The two ranges side by side.
 *
 * The point of the panel is that the shop sells one part of the range and the
 * printed catalogue shows another, and until these four numbers were on a page
 * there was no way to see whether that was actually true — only to open each
 * site and count. `shop` and `katalog` are independent tallies of two columns,
 * so they do not add up to `total` and are not meant to: most products are in
 * both.
 *
 * `nowhere` is the one that is easy to create by accident and impossible to
 * notice: a product hidden from the shop one week and from the catalogue the
 * next is in the database and on neither site, and nothing else counts it.
 */
export async function getSiteVisibilityCounts(): Promise<SiteVisibilityCounts> {
  await assertAdmin();
  const rows = (await sql`
    SELECT count(*)::int                                            AS total,
           (count(*) FILTER (WHERE NOT hidden))::int                 AS shop,
           (count(*) FILTER (WHERE NOT catalog_hidden))::int         AS katalog,
           (count(*) FILTER (WHERE hidden AND catalog_hidden))::int  AS nowhere
    FROM products
  `) as SiteVisibilityCounts[];
  return rows[0] ?? { total: 0, shop: 0, katalog: 0, nowhere: 0 };
}

/**
 * How much of the range is in the printed catalogue at all.
 *
 * `unplaced` is the number the catalogue site had to grow a /te-gjitha page
 * for: products with no section are invisible everywhere else on that site.
 */
export async function getCatalogPlacementCounts(): Promise<{
  placed: number;
  unplaced: number;
}> {
  await assertAdmin();
  const rows = (await sql`
    SELECT (count(*) FILTER (WHERE catalog_section_id IS NOT NULL))::int AS placed,
           (count(*) FILTER (WHERE catalog_section_id IS NULL))::int     AS unplaced
    FROM products
  `) as { placed: number; unplaced: number }[];
  return rows[0] ?? { placed: 0, unplaced: 0 };
}

/** One row of a section's product list, in the order the section prints. */
export interface AdminCatalogSectionProduct {
  id: number;
  name: string;
  sku: string;
  catalogSort: number;
  /** Hidden from the shop. The catalogue prints it anyway. */
  hidden: boolean;
  /** Hidden from the catalogue: placed in this section but not printed. */
  catalogHidden: boolean;
}

export interface AdminCatalogSectionDetail extends AdminCatalogSection {
  products: AdminCatalogSectionProduct[];
}

/**
 * One section and its products, ordered the way the catalogue orders them —
 * `catalog_sort`, then id for the duplicates the import left behind.
 */
export async function getAdminCatalogSection(
  id: number
): Promise<AdminCatalogSectionDetail | null> {
  await assertAdmin();
  const sections = (await sql`
    SELECT id, catalog_no, name, sort FROM catalog_sections WHERE id = ${id}
  `) as { id: number; catalog_no: string; name: string; sort: number | null }[];
  const s = sections[0];
  if (!s) return null;

  const rows = (await sql`
    SELECT id, name, sku, catalog_sort, hidden, catalog_hidden
    FROM products
    WHERE catalog_section_id = ${id}
    ORDER BY catalog_sort, id
  `) as {
    id: number;
    name: string;
    sku: string | null;
    catalog_sort: number | null;
    hidden: boolean;
    catalog_hidden: boolean;
  }[];

  const products = rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku ?? "",
    catalogSort: r.catalog_sort ?? 0,
    hidden: r.hidden,
    catalogHidden: r.catalog_hidden,
  }));

  const section: AdminCatalogSection = {
    id: s.id,
    catalogNo: s.catalog_no,
    name: s.name,
    sort: s.sort ?? 0,
    slug: catalogSectionSlug({
      id: s.id,
      catalogNo: s.catalog_no,
      name: s.name,
      sort: s.sort ?? 0,
    }),
    productCount: products.length,
    visibleCount: products.filter((p) => !p.catalogHidden).length,
    shopHiddenCount: products.filter((p) => p.hidden).length,
  };

  return { ...section, products };
}

/** A candidate for placing into a section, with where it sits today. */
export interface AdminPlaceableProduct {
  id: number;
  name: string;
  sku: string;
  /** The section it is in now — a match may be a move, not an addition. */
  currentSection: string | null;
  currentSectionId: number | null;
}

/**
 * Products that could be added to `sectionId`, by name or article code.
 *
 * Products already in that section are left out — they are on the page above —
 * but products sitting in *another* section are not: a product belongs to one
 * printed section, so placing it here is a move, and the caller shows which
 * section it would be moved out of.
 */
export async function searchProductsToPlace(
  sectionId: number,
  query: string,
  limit = 20
): Promise<AdminPlaceableProduct[]> {
  await assertAdmin();
  if (!query.trim()) return [];
  const like = `%${query.trim()}%`;
  const rows = (await sql`
    SELECT p.id, p.name, p.sku, p.catalog_section_id, s.catalog_no,
           s.name AS section_name
    FROM products p
    LEFT JOIN catalog_sections s ON s.id = p.catalog_section_id
    WHERE (p.name ILIKE ${like} OR p.sku ILIKE ${like})
      AND p.catalog_section_id IS DISTINCT FROM ${sectionId}
    ORDER BY p.name
    LIMIT ${limit}
  `) as {
    id: number;
    name: string;
    sku: string | null;
    catalog_section_id: number | null;
    catalog_no: string | null;
    section_name: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sku: r.sku ?? "",
    currentSection: r.section_name ? `${r.catalog_no} — ${r.section_name}` : null,
    currentSectionId: r.catalog_section_id,
  }));
}
