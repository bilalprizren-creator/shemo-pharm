/**
 * Point a database at the photos src/data/products.json names.
 *
 *   node scripts/sync-image-paths.mjs                          # dry run, development
 *   node scripts/sync-image-paths.mjs --write                  # apply, development
 *   DATABASE_TARGET=production node scripts/sync-image-paths.mjs --write
 *
 * Why this exists: a product's photo path lives in `products.images`, not in
 * the code. scripts/cutout-images.mjs --write rewrote those paths for 2 011
 * products — 1 958 cut-outs, 53 pictures shown full bleed — but it was run
 * against the development database only, and then committed the same paths to
 * products.json. Deploying the code and the 2 163 new files under
 * public/products/ therefore changed nothing on the live site: production kept
 * pointing at the flattened originals, which still exist, so nothing broke and
 * nothing improved either.
 *
 * This replays exactly that: `images` becomes what products.json says, for the
 * rows where it differs, and nothing else on the row is touched. It is not a
 * re-seed — `npm run seed:db` would also overwrite names, prices, visibility
 * and the printed-catalogue placement, all of which production has edited
 * since the seed was taken.
 *
 * Idempotent: a second run finds nothing to change.
 */
import { connect, dataPath, readJson } from "./lib/db.mjs";

const WRITE = process.argv.includes("--write");
const sql = connect();

const seed = readJson(dataPath("products.json"));
const ids = seed.map((p) => p.id);
const imgs = seed.map((p) => JSON.stringify(p.images));

const differing = await sql`
  SELECT p.id, p.sku, p.images::text AS now, v.img AS next
  FROM products AS p
  JOIN (
    SELECT unnest(${ids}::int[]) AS id, unnest(${imgs}::text[]) AS img
  ) AS v ON v.id = p.id
  WHERE p.images::text IS DISTINCT FROM v.img::jsonb::text
  ORDER BY p.id
`;

const toCutout = differing.filter((r) => /-cutout/.test(r.next)).length;
console.log(
  `${seed.length} products in products.json · ${differing.length} differ in the database ` +
    `(${toCutout} → cut-out, ${differing.length - toCutout} → other)`
);
for (const r of differing.slice(0, 5)) console.log(`  ${r.sku}: ${r.now} → ${r.next}`);
if (differing.length > 5) console.log(`  … and ${differing.length - 5} more`);

if (!WRITE) {
  console.log(`\n(dry run; pass --write to apply)`);
  process.exit(0);
}
if (differing.length === 0) process.exit(0);

const changed = await sql`
  UPDATE products AS p
  SET images = v.img::jsonb, updated_at = now()
  FROM (
    SELECT unnest(${differing.map((r) => r.id)}::int[]) AS id,
           unnest(${differing.map((r) => r.next)}::text[]) AS img
  ) AS v
  WHERE p.id = v.id
  RETURNING p.id
`;
const [check] = await sql`
  SELECT count(*) FILTER (WHERE images::text LIKE '%-cutout%')::int AS cut, count(*)::int AS total
  FROM products
`;
console.log(`updated ${changed.length} rows · ${check.cut}/${check.total} now point at a cut-out`);
