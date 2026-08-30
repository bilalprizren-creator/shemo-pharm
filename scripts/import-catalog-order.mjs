/**
 * One-off import: lift the printed catalogue's sectioning and order out of the
 * old hand-written site and into the database.
 *
 *   node scripts/import-catalog-order.mjs                 # dry run, writes a report
 *   node scripts/import-catalog-order.mjs --write         # applies it
 *   node scripts/import-catalog-order.mjs --html <file>   # parse a local copy
 *   DATABASE_TARGET=production node scripts/import-catalog-order.mjs --write
 *
 * Run scripts/add-catalog-order.mjs first.
 *
 * Reading the old site's HTML is scripts/lib/catalog-html.mjs; this file is the
 * matching and the writing. Nothing is written without --write, and a dry run
 * still produces the full report, which is the thing to read before applying:
 * 176 printed products match nothing in the database, and 311 database products
 * were never printed.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { connect, describeTarget, ROOT } from "./lib/db.mjs";
import { parseCatalog, skuCandidates } from "./lib/catalog-html.mjs";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const htmlAt = argv.indexOf("--html");
const SOURCE = "https://shemo-katalog.com/";

const html =
  htmlAt !== -1
    ? readFileSync(argv[htmlAt + 1], "utf8")
    : await fetch(SOURCE).then((r) => {
        if (!r.ok) throw new Error(`${SOURCE} returned ${r.status}`);
        return r.text();
      });

const sections = parseCatalog(html);
const printed = sections.flatMap((s) => s.products);
if (!sections.length) throw new Error("parsed nothing -- the source layout changed");
console.log(`parsed ${sections.length} sections, ${printed.length} printed cells`);

const sql = connect();

const rows = await sql`SELECT id, sku, name FROM products WHERE sku <> ''`;
// Counted for the report only: a product with no code can never be matched to a
// printed cell, so it belongs with the never-printed rather than being dropped.
const [{ blank: blankSku }] = await sql`
  SELECT count(*) FILTER (WHERE sku = '')::int AS blank FROM products
`;
const bySku = new Map();
for (const r of rows) {
  const key = r.sku.trim().toLowerCase();
  if (!bySku.has(key)) bySku.set(key, []);
  bySku.get(key).push(r);
}

const placements = []; // { productId, sectionIndex, sort }
const ambiguous = []; // printed in more than one section
const orphans = []; // printed, but nowhere in the database
const claimed = new Map(); // productId -> the section that already took it

sections.forEach((section, sectionIndex) => {
  const where = `${section.no} ${section.name}`;
  section.products.forEach((cell, order) => {
    const matches = skuCandidates(cell.sku).flatMap((c) => bySku.get(c.toLowerCase()) ?? []);

    if (!matches.length) {
      orphans.push({ ...cell, section: where });
      return;
    }
    for (const product of matches) {
      // A product printed in two sections keeps its first appearance: the
      // catalogue is a sequence, and one product cannot hold two positions.
      if (claimed.has(product.id)) {
        ambiguous.push({
          sku: cell.sku,
          product: product.name,
          keptIn: claimed.get(product.id),
          alsoIn: where,
        });
        continue;
      }
      claimed.set(product.id, where);
      placements.push({ productId: product.id, sectionIndex, sort: order });
    }
  });
});

const report = [
  `# Catalogue order import -- ${new Date().toISOString().slice(0, 10)}`,
  ``,
  `Source: ${htmlAt !== -1 ? argv[htmlAt + 1] : SOURCE}`,
  `Target: ${describeTarget()}`,
  `Mode:   ${WRITE ? "WRITE" : "dry run"}`,
  ``,
  `## Totals`,
  ``,
  `| | |`,
  `|---|---|`,
  `| Sections parsed | ${sections.length} |`,
  `| Printed cells | ${printed.length} |`,
  `| Products placed | ${placements.length} |`,
  `| Printed twice (later placement dropped) | ${ambiguous.length} |`,
  `| Printed but not in the database | ${orphans.length} |`,
  `| In the database but never printed | ${rows.length + blankSku - placements.length} |`,
  ``,
  `## Sections, in printed order`,
  ``,
  `| # | No. | Section | Cells | Placed | Orphans |`,
  `|---|---|---|---|---|---|`,
  ...sections.map((s, i) => {
    const placed = placements.filter((p) => p.sectionIndex === i).length;
    const gone = orphans.filter((o) => o.section === `${s.no} ${s.name}`).length;
    return `| ${i + 1} | ${s.no} | ${s.name} | ${s.products.length} | ${placed} | ${gone} |`;
  }),
  ``,
  `## Printed but not in the database (${orphans.length})`,
  ``,
  `Neither the code nor the name matches any row in \`products\`. These disappear`,
  `from a catalogue regenerated out of the database until somebody decides what`,
  `they are -- discontinued, or missing from the shop.`,
  ``,
  `| Code | Name | Section | Image on the old site |`,
  `|---|---|---|---|`,
  ...orphans.map((o) => `| ${o.sku} | ${o.name} | ${o.section} | ${o.image} |`),
  ``,
  `## Printed in more than one section (${ambiguous.length})`,
  ``,
  ...(ambiguous.length
    ? [
        `| Code | Product | Kept in | Also printed in |`,
        `|---|---|---|---|`,
        ...ambiguous.map((a) => `| ${a.sku} | ${a.product} | ${a.keptIn} | ${a.alsoIn} |`),
      ]
    : [`None.`]),
  ``,
].join("\n");

const reportPath = path.join(ROOT, "audit", "catalog-order-import.md");
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, report);

console.log(`\nsections    ${sections.length}`);
console.log(`placed      ${placements.length} products`);
console.log(`printed 2x  ${ambiguous.length}`);
console.log(`orphans     ${orphans.length}`);
console.log(`report      audit/catalog-order-import.md`);

if (!WRITE) {
  console.log(`\n(dry run -- pass --write to apply)`);
  process.exit(0);
}

// Sections first, so the placements below have ids to point at. ON CONFLICT
// keeps each row's id stable across re-runs, which keeps products attached.
const ids = [];
for (const [i, s] of sections.entries()) {
  const [row] = await sql`
    INSERT INTO catalog_sections (catalog_no, name, sort)
    VALUES (${s.no}, ${s.name}, ${i})
    ON CONFLICT (catalog_no, name) DO UPDATE SET sort = EXCLUDED.sort
    RETURNING id
  `;
  ids.push(row.id);
}

// Clear first: a product dropped from the printed catalogue between runs must
// lose its placement rather than keep a stale one.
await sql`UPDATE products SET catalog_section_id = NULL, catalog_sort = 0`;

await sql`
  UPDATE products AS p
  SET catalog_section_id = v.section_id, catalog_sort = v.sort
  FROM (
    SELECT unnest(${placements.map((p) => p.productId)}::int[]) AS id,
           unnest(${placements.map((p) => ids[p.sectionIndex])}::int[]) AS section_id,
           unnest(${placements.map((p) => p.sort)}::int[]) AS sort
  ) AS v
  WHERE p.id = v.id
`;

const [check] = await sql`
  SELECT count(*)::int AS placed FROM products WHERE catalog_section_id IS NOT NULL
`;
console.log(`\nwrote ${ids.length} sections, ${check.placed} products placed`);
