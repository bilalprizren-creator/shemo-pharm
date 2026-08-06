/**
 * Dump `categories` and `product_categories` to a timestamped JSON file before
 * a taxonomy rewrite.
 *
 * `product_categories` is ON DELETE CASCADE: removing a category row destroys
 * its product links with no way back. The predecessor of this file
 * (scripts/.rollback-categories.json) was written by hand and nothing ever read
 * it. This one has a matching restore path:
 *
 *   node scripts/apply-taxonomy.mjs --rollback scripts/.rollback-<stamp>.json
 *
 * Usage:  node scripts/snapshot-categories.mjs [outfile]
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { connect, ROOT } from "./lib/db.mjs";

const sql = connect();

const stamp = new Date().toISOString().slice(0, 10);
const out = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "scripts", `.rollback-${stamp}.json`);

const categories = await sql`SELECT * FROM categories ORDER BY id`;
const links = await sql`
  SELECT product_id, category_id FROM product_categories
  ORDER BY product_id, category_id
`;

writeFileSync(
  out,
  JSON.stringify({ takenAt: new Date().toISOString(), categories, links }, null, 1)
);

console.log(`categories: ${categories.length}`);
console.log(`links:      ${links.length}`);
console.log(`written to  ${path.relative(ROOT, out)}`);
