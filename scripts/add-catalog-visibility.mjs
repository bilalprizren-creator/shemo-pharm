/**
 * Migration: visibility for each of the two sites, separately.
 *
 *   node scripts/add-catalog-visibility.mjs
 *   DATABASE_TARGET=production node scripts/add-catalog-visibility.mjs
 *
 * Until now `products.hidden` decided both sites at once: hiding a product in
 * /admin took it out of the shop *and* out of the printed catalogue on
 * shemo-katalog.com. Those are different decisions — a discontinued article can
 * be worth leaving in the catalogue a partner is holding on paper, and a shop
 * listing can be worth keeping for something the print run has no room for.
 *
 * `catalog_hidden` is the second flag. `hidden` keeps its meaning (the shop),
 * so nothing that reads it needs to change.
 *
 * Safe to re-run: the column is added IF NOT EXISTS and the one-time backfill
 * runs only on the run that creates it. That guard is the point — a second
 * unconditional `SET catalog_hidden = hidden` would undo every deliberate
 * "hidden in the shop, still printed" made in the panel since.
 */
import { connect } from "./lib/db.mjs";

const sql = connect();

const existing = await sql`
  SELECT 1 AS hit
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'catalog_hidden'
`;
const isNew = existing.length === 0;

await sql`
  ALTER TABLE products
  ADD COLUMN IF NOT EXISTS catalog_hidden BOOLEAN NOT NULL DEFAULT false
`;

if (isNew) {
  // What the old single flag meant, written down: everything hidden today was
  // hidden on both sites, so the two flags start out agreeing and the migration
  // changes nothing anybody can see.
  const carried = await sql`
    UPDATE products SET catalog_hidden = true WHERE hidden = true RETURNING id
  `;
  console.log(`catalog_hidden added; carried ${carried.length} hidden products over`);
} else {
  console.log("catalog_hidden was already there — backfill skipped");
}

const [counts] = await sql`
  SELECT count(*)::int                                          AS total,
         (count(*) FILTER (WHERE hidden))::int                   AS hidden_in_shop,
         (count(*) FILTER (WHERE catalog_hidden))::int           AS hidden_in_catalog,
         (count(*) FILTER (WHERE hidden <> catalog_hidden))::int AS differing
  FROM products
`;
console.log(
  `${counts.total} products · ${counts.hidden_in_shop} hidden in the shop · ` +
    `${counts.hidden_in_catalog} hidden in the catalogue · ${counts.differing} differ`
);
