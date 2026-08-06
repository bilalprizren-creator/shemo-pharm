/**
 * Fold the per-batch results of the packshot audit into one reviewed file,
 * src/data/catalog-assignments.json, and refuse anything that would poison the
 * catalog.
 *
 * Why the audit exists at all: the categories came out of WooCommerce as
 * shelf buckets, only 22 of 2049 products carry a description, and the upstream
 * REST API now answers 401. The product photo is the only remaining evidence of
 * what a product is, so every product was classified from its own packshot
 * against the closed vocabulary in src/data/taxonomy.json.
 *
 * Usage:  node scripts/merge-audit.mjs <batch-output-dir> [--write]
 *   Without --write it only reports. --write updates the assignments file.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { ROOT, readJson, dataPath } from "./lib/db.mjs";
import { assertTree, index, withDescendants } from "./lib/taxonomy.mjs";

const dir = process.argv[2];
const WRITE = process.argv.includes("--write");
if (!dir) {
  console.error("usage: node scripts/merge-audit.mjs <batch-output-dir> [--write]");
  process.exit(1);
}

const taxonomy = readJson(dataPath("taxonomy.json"));
const products = readJson(dataPath("products.json"));
assertTree(taxonomy.categories);

const bySlug = new Map(taxonomy.categories.map((c) => [c.slug, c]));
const { childrenOf } = index(taxonomy.categories);
const typeSlugs = new Set(taxonomy.categories.filter((c) => c.kind === "type").map((c) => c.slug));
const brandSlugs = new Set(taxonomy.categories.filter((c) => c.kind === "brand").map((c) => c.slug));
const productById = new Map(products.map((p) => [p.id, p]));

/**
 * Brands that are readable from a manufacturer article code rather than a logo.
 *
 * The audit classifies brands from the photo alone, which is right for consumer
 * packaging but blind for the orthopedic range: Ersa Med supports are shot as a
 * beige stocking or a brace on an anonymous leg, so 238 Ersa products yielded
 * zero brand assignments. The article code in the product name is the evidence
 * the photo cannot carry.
 *
 * Measured against the catalog rather than assumed — and the measurement
 * contradicts RULES.md, which tells the auditor Ersa uses `S####` codes:
 *
 *   SL- / SLP-####   51 products, 50 of them in the old Ersa bucket   <- the real one
 *   ERSA             48 products, 44 in the old Ersa bucket
 *   REF-###          41 products, 41 in the old Ersa bucket
 *   ERS-###          16 products, 16 in the old Ersa bucket           <- walking aids, collars
 *   ELS-##            4 products,  4 in the old Ersa bucket
 *   S####            11 products,  0 in the old Ersa bucket           <- not Ersa at all
 *   Art. ###         14 products,  1 in the old Ersa bucket           <- med Textile, not Ersa
 *   NT / WZ in sku    8 products,  8 in the old TIO bucket
 *
 * `S####` and `Art. ###` are deliberately absent below — both look like house
 * codes and neither is one. Codes only ever fill a brand the audit left null;
 * a mark the auditor actually saw always wins.
 *
 * The audit also established that the "supportline" wordmark is Ersa Med's own
 * product line, not a third party: one retail box carries "supportline" and
 * "ersamed®" side by side, and all 16 Support-Line products the auditors met sit
 * in the old Ersa bucket. Those reach the brand through their REF-/SL- codes here.
 */
const BRAND_CODES = [
  {
    brand: "ersa-med-ortopedi",
    test: (p) =>
      /ERSA/i.test(p.name) ||
      /\bSLP?-\d{3,4}\b/.test(p.name) ||
      /\b(ERS|REF|ELS)-?\d{2,4}\b/i.test(`${p.sku || ""} ${p.name}`),
  },
  { brand: "tio-medical", test: (p) => /^(NT|WZ)[-_ ]?\d/i.test(p.sku || "") },
  {
    brand: "shemo",
    test: (p) => /SHEMO/i.test(p.name) || /\bSHM[-_ ]?\d/i.test(`${p.sku || ""} ${p.name}`),
  },
];

const rows = new Map();
const problems = [];
const files = readdirSync(dir).filter((f) => /^batch-[\w-]+\.json$/.test(f)).sort();

for (const file of files) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  } catch (err) {
    problems.push(`${file}: not valid JSON (${err.message})`);
    continue;
  }
  if (!Array.isArray(parsed)) {
    problems.push(`${file}: expected an array`);
    continue;
  }
  for (const row of parsed) {
    if (!productById.has(row.id)) {
      problems.push(`${file}: id ${row.id} is not a product`);
      continue;
    }
    if (rows.has(row.id)) {
      problems.push(`${file}: id ${row.id} already classified in ${rows.get(row.id)._file}`);
      continue;
    }
    if (!typeSlugs.has(row.type)) {
      problems.push(`${file}: id ${row.id} has unknown type "${row.type}"`);
      continue;
    }
    const also = (row.alsoTypes ?? []).filter((slug) => {
      if (!typeSlugs.has(slug)) {
        problems.push(`${file}: id ${row.id} has unknown alsoType "${slug}"`);
        return false;
      }
      return slug !== row.type;
    });
    if (row.brand != null && !brandSlugs.has(row.brand)) {
      problems.push(`${file}: id ${row.id} has unknown brand "${row.brand}"`);
      continue;
    }
    rows.set(row.id, {
      id: row.id,
      sku: productById.get(row.id).sku || null,
      type: row.type,
      alsoTypes: also,
      brand: row.brand ?? null,
      brandSource: row.brand ? "photo" : null,
      confidence: row.confidence === "low" ? "low" : "high",
      note: (row.note ?? "").slice(0, 120),
      _file: file,
    });
  }
}

// Fill the brands no photo could show. Runs after every batch is loaded so the
// result is a pure function of the audit plus the code table — re-merging can
// never accumulate a brand that the current rules no longer support.
let coded = 0;
for (const row of rows.values()) {
  if (row.brand) continue;
  const match = BRAND_CODES.find((b) => b.test(productById.get(row.id)));
  if (!match) continue;
  if (!brandSlugs.has(match.brand)) {
    problems.push(`code rule produced unknown brand "${match.brand}"`);
    continue;
  }
  row.brand = match.brand;
  row.brandSource = "code";
  coded++;
}

/**
 * Brands whose entire range is, by RULES.md's own definition, for children.
 *
 * A children's toothbrush is typed `dentare`, which hangs under Kozmetikë, so it
 * reaches the "Për fëmijë" branch only through an explicit alsoType. Left to
 * per-batch judgement this split 16 tagged against 7 untagged across seven
 * batches — the same Disney toothbrush reachable or not depending on which batch
 * it landed in. Brands whose products are already typed inside the per-femije
 * subtree (Chicco, Bio Tree Baby) need nothing: they are there via their type.
 */
const KIDS_BRANDS = new Set(["mr-white"]);
const kidsSubtree = new Set(
  withDescendants(bySlug.get("per-femije").id, childrenOf).map((id) =>
    taxonomy.categories.find((c) => c.id === id).slug
  )
);

let kidsTagged = 0;
for (const row of rows.values()) {
  if (!KIDS_BRANDS.has(row.brand)) continue;
  if (kidsSubtree.has(row.type) || row.alsoTypes.includes("per-femije")) continue;
  if (row.alsoTypes.length >= 2) row.alsoTypes.pop();
  row.alsoTypes.push("per-femije");
  kidsTagged++;
}

// Agents write their output file every ~15 products so a crash mid-batch does not
// lose the work. The cost is that a half-written file is indistinguishable from a
// finished one — same shape, just fewer rows, and its absent products surface only
// in the "not yet done" tally. Comparing each result against its own input catches
// that; below it is fatal whenever we are actually writing.
const incomplete = [];
for (const file of files) {
  const input = path.join(dir, "..", "batches", file);
  if (!existsSync(input)) continue;
  const expected = readJson(input).length;
  const got = JSON.parse(readFileSync(path.join(dir, file), "utf8")).length;
  if (got !== expected) incomplete.push(`${file}: ${got} of ${expected} rows`);
}
if (incomplete.length) {
  console.log(`\nINCOMPLETE batch files (an agent is probably still running):`);
  for (const line of incomplete) console.log(`  ${line}`);
}

const missing = products.filter((p) => !rows.has(p.id));
const low = [...rows.values()].filter((r) => r.confidence === "low");
const onRoot = [...rows.values()].filter((r) => bySlug.get(r.type)?.parent === 0 && (childrenOf.get(bySlug.get(r.type).id) ?? []).length > 0);

console.log(`batch files:   ${files.length}`);
console.log(`classified:    ${rows.size} of ${products.length}`);
console.log(`not yet done:  ${missing.length}`);
console.log(`low confidence:${low.length}`);
console.log(`on a bare root that has leaves: ${onRoot.length}`);
console.log(`per-femije added for a kids brand:  ${kidsTagged}`);
console.log(`problems:      ${problems.length}`);
if (problems.length) console.log("  " + problems.slice(0, 40).join("\n  "));

// Where the audit landed, so a thin leaf is visible before anything is applied.
const perType = new Map();
for (const r of rows.values()) perType.set(r.type, (perType.get(r.type) ?? 0) + 1);
console.log("\nprimary type distribution:");
for (const [slug, n] of [...perType].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${slug}`);
}
const unusedLeaves = [...typeSlugs].filter((s) => !perType.has(s));
if (unusedLeaves.length) console.log(`\nleaves nothing landed in: ${unusedLeaves.join(", ")}`);

const perBrand = new Map();
for (const r of rows.values()) if (r.brand) perBrand.set(r.brand, (perBrand.get(r.brand) ?? 0) + 1);
const branded = [...perBrand.values()].reduce((a, b) => a + b, 0);
console.log(`\nbranded: ${branded} (${coded} from an article code), brandless: ${rows.size - branded}`);
for (const [slug, n] of [...perBrand].sort((a, b) => b[1] - a[1])) {
  const fromCode = [...rows.values()].filter((r) => r.brand === slug && r.brandSource === "code").length;
  console.log(`  ${String(n).padStart(4)}  ${slug}${fromCode ? `  (${fromCode} by code)` : ""}`);
}

if (!WRITE) {
  console.log("\n(dry run — pass --write to update src/data/catalog-assignments.json)");
  process.exit(problems.length ? 1 : 0);
}
if (problems.length) {
  console.error("\nrefusing to write while there are problems");
  process.exit(1);
}
if (incomplete.length) {
  console.error(`\nrefusing to write — ${incomplete.length} batch file(s) are still partial`);
  process.exit(1);
}

const out = dataPath("catalog-assignments.json");
const previous = existsSync(out) ? readJson(out) : null;
const merged = new Map(previous ? previous.assignments.map((a) => [a.id, a]) : []);
for (const row of rows.values()) {
  const { _file, ...clean } = row;
  merged.set(row.id, clean);
}

writeFileSync(
  out,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "packshot audit against src/data/taxonomy.json",
      assignments: [...merged.values()].sort((a, b) => a.id - b.id),
    },
    null,
    1
  )
);
console.log(`\nwrote ${merged.size} assignments to ${path.relative(ROOT, out)}`);
