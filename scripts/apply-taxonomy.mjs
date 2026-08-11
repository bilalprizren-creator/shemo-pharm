/**
 * Rewrite the category tree and every product's category links from the two
 * reviewed sources of truth:
 *
 *   src/data/taxonomy.json             the tree — one row per category
 *   src/data/catalog-assignments.json  one verdict per product, from the audit
 *
 * This replaces the hand-maintained tables that used to be scattered across
 * scripts (PLAN in restructure-categories.mjs, ASSIGN in fix-categories.mjs,
 * CATEGORY_DISPLAY_NAMES in seed-db.mjs). Those built the tree by *adding*
 * links and never removing any, on the rule that nothing may be deleted — which
 * is exactly why a Slovenian hand cream was still filed under the supplement
 * brand Swiss Energy, and why every Swiss Energy product, creams and knee
 * braces included, was linked to "Suplemente" by a blanket typeTo rule.
 *
 * Here a product's links are derived, not accumulated: whatever the audit says
 * the product is, plus that leaf's ancestors, plus its brand. Nothing survives
 * from the old assignment.
 *
 * Both stores are written, because they drift otherwise: src/data/*.json is the
 * seed snapshot, Postgres is what the site actually reads.
 *
 * Usage:
 *   node scripts/apply-taxonomy.mjs                 dry run, prints the diff
 *   node scripts/apply-taxonomy.mjs --commit        write JSON and Postgres
 *   node scripts/apply-taxonomy.mjs --json-only     write JSON, leave the DB
 *   node scripts/apply-taxonomy.mjs --rollback <f>  restore a snapshot file
 *
 * Requires DATABASE_URL unless --json-only.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { connect, readJson, dataPath } from "./lib/db.mjs";
import {
  assertTree,
  index,
  countProducts,
  orderedCategoryIds,
} from "./lib/taxonomy.mjs";

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const JSON_ONLY = argv.includes("--json-only");
const rollbackAt = argv.indexOf("--rollback");

if (rollbackAt !== -1) {
  await rollback(argv[rollbackAt + 1]);
  process.exit(0);
}

// --- Load and validate ------------------------------------------------------

const taxonomy = readJson(dataPath("taxonomy.json"));
const assignmentsFile = readJson(dataPath("catalog-assignments.json"));
const products = readJson(dataPath("products.json"));
const oldCategories = readJson(dataPath("categories.json"));

assertTree(taxonomy.categories);

const bySlug = new Map(taxonomy.categories.map((c) => [c.slug, c]));
const { byId } = index(taxonomy.categories);
const assignments = new Map(assignmentsFile.assignments.map((a) => [a.id, a]));

const fatal = [];
const mergedIds = new Set(taxonomy.merges.map((m) => m.from));
for (const old of oldCategories) {
  if (!byId.has(old.id) && !mergedIds.has(old.id)) {
    fatal.push(`category ${old.id} (${old.slug}) is in categories.json but neither kept nor merged`);
  }
}
for (const m of taxonomy.merges) {
  if (!byId.has(m.into)) fatal.push(`merge ${m.from} -> ${m.into}: target does not exist`);
  if (byId.has(m.from)) fatal.push(`merge ${m.from}: id is still in the taxonomy`);
}
for (const p of products) {
  const a = assignments.get(p.id);
  if (!a) {
    fatal.push(`product ${p.id} (${p.sku || "no sku"}) has no assignment`);
    continue;
  }
  if (!bySlug.has(a.type)) fatal.push(`product ${p.id}: unknown type "${a.type}"`);
  if (a.brand && bySlug.get(a.brand)?.kind !== "brand") {
    fatal.push(`product ${p.id}: "${a.brand}" is not a brand`);
  }
  if (bySlug.get(a.type)?.kind !== "type") {
    fatal.push(`product ${p.id}: "${a.type}" is not a product type`);
  }
}
if (fatal.length) {
  console.error(`refusing to run — ${fatal.length} problem(s):`);
  console.error("  " + fatal.slice(0, 30).join("\n  "));
  if (fatal.length > 30) console.error(`  ... and ${fatal.length - 30} more`);
  process.exit(1);
}

// --- Derive the new state ---------------------------------------------------

const nextProducts = products.map((p) => ({
  ...p,
  categoryIds: orderedCategoryIds(assignments.get(p.id), bySlug, byId),
}));

const counts = countProducts(taxonomy.categories, nextProducts);
const nextCategories = taxonomy.categories.map((c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  parent: c.parent,
  count: counts.get(c.id) ?? 0,
  displayName: c.name,
  kind: c.kind,
  sort: c.sort,
}));

// --- Report -----------------------------------------------------------------

const oldById = new Map(oldCategories.map((c) => [c.id, c]));
const oldLinks = products.reduce((n, p) => n + p.categoryIds.length, 0);
const newLinks = nextProducts.reduce((n, p) => n + p.categoryIds.length, 0);

console.log(`categories: ${oldCategories.length} -> ${nextCategories.length}`);
console.log(`  new:      ${nextCategories.filter((c) => !oldById.has(c.id)).length}`);
console.log(`  merged:   ${taxonomy.merges.length}`);
console.log(`  renamed:  ${taxonomy.categories.filter((c) => c.oldSlug).length}`);
console.log(`links:      ${oldLinks} -> ${newLinks}`);

const empty = nextCategories.filter((c) => c.count === 0);
if (empty.length) {
  console.log(`\nEMPTY after the rewrite (count = 0 hides a category from the nav):`);
  for (const c of empty) console.log(`  ${String(c.id).padStart(4)}  ${c.slug}`);
}

console.log("\ncount changes over 25:");
for (const c of nextCategories) {
  const before = oldById.get(c.id)?.count ?? 0;
  if (Math.abs(c.count - before) > 25) {
    console.log(`  ${c.slug.padEnd(38)} ${String(before).padStart(4)} -> ${String(c.count).padStart(4)}`);
  }
}

const moved = nextProducts.filter((p, i) => p.categoryIds[0] !== products[i].categoryIds[0]);
console.log(`\nproducts whose primary category changed: ${moved.length} of ${products.length}`);
console.log("first 15:");
for (const p of moved.slice(0, 15)) {
  const before = oldById.get(products.find((x) => x.id === p.id).categoryIds[0])?.slug ?? "—";
  console.log(`  ${(p.sku || "—").padEnd(6)} ${p.name.slice(0, 44).padEnd(46)} ${before} -> ${byId.get(p.categoryIds[0]).slug}`);
}

if (!COMMIT && !JSON_ONLY) {
  console.log("\n(dry run — pass --commit to write JSON and Postgres)");
  process.exit(0);
}

// --- Write JSON -------------------------------------------------------------

writeFileSync(dataPath("categories.json"), JSON.stringify(nextCategories, null, 1));
writeFileSync(dataPath("products.json"), JSON.stringify(nextProducts, null, 1));
console.log("\nwrote src/data/categories.json and src/data/products.json");

if (JSON_ONLY) {
  console.log("(--json-only — Postgres left untouched)");
  process.exit(0);
}

// --- Write Postgres ---------------------------------------------------------

const sql = connect();

// Merged categories go first: product_categories is ON DELETE CASCADE, so this
// also clears their links, and it frees the slugs the renames need (slug is
// UNIQUE — 204 cannot take "suplemente" while 212 still holds it).
if (mergedIds.size) {
  await sql`DELETE FROM categories WHERE id = ANY(${[...mergedIds]})`;
  console.log(`deleted ${mergedIds.size} merged categories`);
}

await sql`
  INSERT INTO categories (id, name, slug, parent, count, display_name, kind, sort)
  SELECT * FROM unnest(
    ${nextCategories.map((c) => c.id)}::int[],
    ${nextCategories.map((c) => c.name)}::text[],
    ${nextCategories.map((c) => c.slug)}::text[],
    ${nextCategories.map((c) => c.parent)}::int[],
    ${nextCategories.map((c) => c.count)}::int[],
    ${nextCategories.map((c) => c.displayName)}::text[],
    ${nextCategories.map((c) => c.kind)}::text[],
    ${nextCategories.map((c) => c.sort)}::int[]
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, slug = EXCLUDED.slug, parent = EXCLUDED.parent,
    count = EXCLUDED.count, display_name = EXCLUDED.display_name,
    kind = EXCLUDED.kind, sort = EXCLUDED.sort
`;
console.log(`upserted ${nextCategories.length} categories`);

// One transaction: between the delete and the insert the catalog has no
// categories at all, and every page gates on count > 0.
const pids = [];
const cids = [];
for (const p of nextProducts) {
  for (const id of p.categoryIds) {
    pids.push(p.id);
    cids.push(id);
  }
}
await sql.transaction([
  sql`DELETE FROM product_categories`,
  sql`
    INSERT INTO product_categories (product_id, category_id)
    SELECT * FROM unnest(${pids}::int[], ${cids}::int[])
    ON CONFLICT DO NOTHING
  `,
]);
console.log(`rebuilt ${pids.length} product links`);

// Recomputed in SQL rather than trusting the numbers computed above, so the
// stored count is the one admin-actions.ts would produce on the next save.
await sql`
  WITH RECURSIVE subtree AS (
    SELECT id AS root, id AS node, 0 AS depth FROM categories
    UNION ALL
    SELECT s.root, c.id, s.depth + 1
    FROM subtree s JOIN categories c ON c.parent = s.node
    WHERE s.depth < 10
  ), tallied AS (
    SELECT s.root AS id, count(DISTINCT p.id)::int AS n
    FROM subtree s
    LEFT JOIN product_categories pc ON pc.category_id = s.node
    LEFT JOIN products p ON p.id = pc.product_id AND p.hidden = false
    GROUP BY s.root
  )
  UPDATE categories c SET count = t.n
  FROM tallied t
  WHERE c.id = t.id AND c.count IS DISTINCT FROM t.n
`;

const drift = await sql`
  SELECT id, slug, count FROM categories ORDER BY id
`;
const disagree = drift.filter((row) => row.count !== (counts.get(row.id) ?? 0));
console.log(
  disagree.length
    ? `NOTE: ${disagree.length} counts differ between the JSON and the SQL recount (hidden products): ${disagree
        .slice(0, 8)
        .map((d) => `${d.slug} ${d.count}`)
        .join(", ")}`
    : "counts agree between JSON and SQL"
);
console.log("done");

// --- Rollback ---------------------------------------------------------------

async function rollback(file) {
  if (!file) {
    console.error("usage: node scripts/apply-taxonomy.mjs --rollback <snapshot.json>");
    process.exit(1);
  }
  const snap = readJson(path.resolve(file));
  const sqlr = connect();
  console.log(`restoring ${snap.categories.length} categories and ${snap.links.length} links`);
  console.log(`snapshot taken ${snap.takenAt}`);

  const keep = snap.categories.map((c) => c.id);
  await sqlr`DELETE FROM categories WHERE NOT (id = ANY(${keep}))`;
  await sqlr`
    INSERT INTO categories (id, name, slug, parent, count, display_name, kind, sort)
    SELECT * FROM unnest(
      ${snap.categories.map((c) => c.id)}::int[],
      ${snap.categories.map((c) => c.name)}::text[],
      ${snap.categories.map((c) => c.slug)}::text[],
      ${snap.categories.map((c) => c.parent)}::int[],
      ${snap.categories.map((c) => c.count)}::int[],
      ${snap.categories.map((c) => c.display_name)}::text[],
      ${snap.categories.map((c) => c.kind)}::text[],
      ${snap.categories.map((c) => c.sort)}::int[]
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, slug = EXCLUDED.slug, parent = EXCLUDED.parent,
      count = EXCLUDED.count, display_name = EXCLUDED.display_name,
      kind = EXCLUDED.kind, sort = EXCLUDED.sort
  `;
  await sqlr.transaction([
    sqlr`DELETE FROM product_categories`,
    sqlr`
      INSERT INTO product_categories (product_id, category_id)
      SELECT * FROM unnest(
        ${snap.links.map((l) => l.product_id)}::int[],
        ${snap.links.map((l) => l.category_id)}::int[]
      )
      ON CONFLICT DO NOTHING
    `,
  ]);
  console.log("restored — src/data/*.json is NOT touched, restore it with git if needed");
}
