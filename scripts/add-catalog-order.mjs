/**
 * Migration: the printed catalogue's own sectioning and order.
 *
 *   node scripts/add-catalog-order.mjs
 *   DATABASE_TARGET=production node scripts/add-catalog-order.mjs
 *
 * Safe to re-run (IF NOT EXISTS throughout).
 *
 * shemo-katalog.com was a hand-written HTML file laying the range out as 174
 * printed A4 pages in 63 numbered sections — "1.1 SHEMO", "5.5 Rabir",
 * "41.1 HEMOFARM". Reps and customers order by those numbers, so the sequence is
 * real information the database never held: it lived only in the order of the
 * <div>s in that file.
 *
 * Why a table of its own rather than a column on `categories`, which was the
 * first plan: the printed sections are not the site's taxonomy and mostly cannot
 * become it. Measured against the 111 live categories, only 14 of the 63 section
 * names match anything. The other 49 are pharmaceutical manufacturers (Belupo,
 * Galenika, HEMOFARM, STADA, Denk Pharma), wholesalers (Rabir, NT41, Orbita), or
 * print-only catch-alls ("Suplemente te ndryshme", "Kozmetika te ndryshme").
 * Forcing those into `categories` would put 49 supplier names into the customer-
 * facing brand and type filters to serve a layout concern.
 *
 * Two further facts the numbering itself will not support:
 *   - catalog_no is NOT unique. "8.1" names both Corega and "Eferveta me brende
 *     te ndryshme"; "8.4" names both Dermosept and "Aqua dhe Dermosept".
 *   - catalog_no does NOT sort. The printed order runs 6.4, 6.1, 6.3, 6.5 — the
 *     number is a label somebody typed, not a position.
 * Hence `sort`, taken from the order the sections appear in the document, is what
 * orders both the sections and the products inside them.
 */
import { connect } from "./lib/db.mjs";

const sql = connect();

// Undo the first attempt at this migration, which hung the section number off
// `categories` before the 14/63 match rate was measured. Harmless if absent.
await sql`ALTER TABLE categories DROP COLUMN IF EXISTS catalog_no`;
await sql`DROP INDEX IF EXISTS categories_catalog_no_idx`;

await sql`
  CREATE TABLE IF NOT EXISTS catalog_sections (
    id         SERIAL PRIMARY KEY,
    catalog_no TEXT NOT NULL,
    name       TEXT NOT NULL,
    sort       INT  NOT NULL DEFAULT 0
  )
`;

// The importer re-runs; without this it would append 63 duplicate sections each
// time. (catalog_no, name) is what identifies a section, since neither alone does.
await sql`
  CREATE UNIQUE INDEX IF NOT EXISTS catalog_sections_no_name_idx
  ON catalog_sections (catalog_no, name)
`;

await sql`
  ALTER TABLE products
  ADD COLUMN IF NOT EXISTS catalog_section_id INT
    REFERENCES catalog_sections(id) ON DELETE SET NULL
`;
// 0 for everything unplaced, which sorts such products to the front of their
// section rather than dropping them out of the printed catalogue silently.
await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_sort INT NOT NULL DEFAULT 0`;

// Every catalogue render walks products section by section.
await sql`
  CREATE INDEX IF NOT EXISTS products_catalog_section_idx
  ON products (catalog_section_id, catalog_sort)
  WHERE catalog_section_id IS NOT NULL
`;

const [s] = await sql`SELECT count(*)::int AS n FROM catalog_sections`;
const [p] = await sql`
  SELECT count(*)::int AS total,
         count(catalog_section_id)::int AS placed
  FROM products
`;
console.log(`catalog_sections: ${s.n} rows`);
console.log(`products: ${p.placed}/${p.total} assigned to a printed section`);
