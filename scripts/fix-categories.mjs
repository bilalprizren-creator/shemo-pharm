/**
 * Fix product categorization.
 *
 * 1. Assign the 121 products that had NO category to the best-fitting EXISTING
 *    category (mapping below, keyed by SKU — reviewed by hand). Medicines go to
 *    Barnat (or its Pika/Shurupa/Supositore leaves by dosage form); supplements
 *    to Suplemente; skincare/oils to Kozmetikë/Vajra; lubricants to Prezervativ;
 *    a few devices/aids to their obvious category. No new categories are created.
 * 2. Recompute every category's `count` from real membership (a product counts
 *    for a category if any of its category ids is that category OR a descendant
 *    of it — matching how getProducts() browses a parent). This fixes stale
 *    WooCommerce counts (e.g. Prezervativ 160 -> 36) and reflects the new links.
 *
 * Writes the source JSON (src/data/*.json) AND the live Neon DB so a later
 * re-seed reproduces the same result. Idempotent / re-runnable.
 *
 * Usage: node scripts/fix-categories.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    val = val.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv(path.join(ROOT, ".env.local"));
loadEnv(path.join(ROOT, ".env"));

// SKU -> target category id. Category ids (from src/data/categories.json):
//   248 Barnat · 349 Pika · 347 Shurupa · 348 Supositore  (medicines)
//   212 Suplemente · 221 Kozmetikë · 219 Vajra · 222 Shampo · 225 Dentare
//   15 Prezervativ · 250 Alkool/Antiseptik · 194 Diabetike · 187 Aparatura · 231 Ersa Med
const ASSIGN = {
  "1501": 212, "1715": 248, "1515": 212, "1507": 248, "1521": 221,
  "1520": 248, "2836": 221, "1523": 212, "1525": 212, "1524": 212,
  "1527": 212, "9749": 248, "9754": 248, "9755": 248, "9746": 248,
  "9748": 248, "9757": 248, "1532": 212, "7473": 212, "7242": 212,
  "7241": 212, "7240": 212, "1541": 248, "1539": 248, "1540": 248,
  "9617": 225, "1543": 248, "1553": 212, "1555": 221, "1557": 248,
  "1566": 248, "1565": 248, "1569": 248, "1574": 248, "1576": 248,
  "1581": 248, "1583": 248, "1585": 248, "1589": 248, "1590": 348,
  "1591": 248, "2758": 212, "2757": 212, "1597": 248, "7471": 221,
  "1605": 248, "0403": 194, "6020": 212, "7472": 221, "1618": 347,
  "1615": 347, "1617": 248, "1623": 248, "1625": 248, "1626": 250,
  "1628": 248, "1629": 248, "9820": 248, "4981": 15, "7527": 222,
  "1741": 219, "1642": 221, "1643": 221, "1743": 219, "1744": 219,
  "1637": 219, "1645": 221, "2055": 221, "1649": 248, "4039": 15,
  "4043": 15, "4070": 15, "4063": 15, "4037": 15, "1650": 212,
  "1651": 248, "1657": 248, "1662": 248, "1664": 349, "1667": 248,
  "1668": 248, "1730": 349, "1731": 349, "1732": 248, "1674": 347,
  "1676": 248, "1681": 248, "1684": 347, "1682": 248, "1683": 347,
  "1690": 248, "7854": 248, "1692": 248, "1698": 248, "1705": 212,
  "1706": 212, "1707": 212, "1708": 212, "4809A": 231, "1710": 221,
  "9811": 248, "1738": 221, "1717": 349, "1720": 248, "1721": 248,
  "1722": 248, "1723": 248, "1724": 248, "7853": 349, "1638": 248,
  "1726": 248, "1727": 248, "1728": 248, "0411": 187, "9103": 219,
  "1747": 248, "1746": 248, "1753": 248, "1754": 347, "1760": 349,
  "9804": 248,
};

const products = JSON.parse(readFileSync(path.join(ROOT, "src/data/products.json"), "utf8"));
const categories = JSON.parse(readFileSync(path.join(ROOT, "src/data/categories.json"), "utf8"));
const byId = new Map(categories.map((c) => [c.id, c]));
const validIds = new Set(categories.map((c) => c.id));

// --- 1) Assign orphans ------------------------------------------------------
const newLinks = [];
const unassigned = [];
const perCat = new Map();
for (const p of products) {
  const valid = (p.categoryIds ?? []).filter((id) => validIds.has(id));
  if (valid.length > 0) continue; // already categorized
  const target = ASSIGN[p.sku];
  if (!target || !validIds.has(target)) {
    unassigned.push(`${p.sku} ${p.name}`);
    continue;
  }
  p.categoryIds = [target];
  newLinks.push({ product_id: p.id, category_id: target });
  perCat.set(target, (perCat.get(target) ?? 0) + 1);
}

// Safety: never write a partial fix. If any orphan is unmapped, abort first.
if (unassigned.length) {
  console.error(`ABORT: ${unassigned.length} orphan(s) not in ASSIGN map — nothing written:`);
  for (const s of unassigned) console.error("  " + s);
  process.exit(1);
}

// --- 2) Recompute counts (category or any descendant) -----------------------
const childrenOf = new Map();
for (const c of categories) {
  const list = childrenOf.get(c.parent) ?? [];
  list.push(c.id);
  childrenOf.set(c.parent, list);
}
function withDescendants(id) {
  const ids = new Set([id]);
  const stack = [id];
  while (stack.length) {
    for (const child of childrenOf.get(stack.pop()) ?? []) {
      if (!ids.has(child)) { ids.add(child); stack.push(child); }
    }
  }
  return ids;
}
const newCounts = new Map();
for (const c of categories) {
  const set = withDescendants(c.id);
  let n = 0;
  for (const p of products) {
    if ((p.categoryIds ?? []).some((id) => set.has(id))) n++;
  }
  newCounts.set(c.id, n);
}
const countChanges = [];
for (const c of categories) {
  const next = newCounts.get(c.id);
  if (next !== c.count) countChanges.push({ id: c.id, name: c.name, from: c.count, to: next });
  c.count = next;
}

// --- 3) Write source JSON (same format as export-catalog.mjs) ---------------
writeFileSync(path.join(ROOT, "src/data/products.json"), JSON.stringify(products, null, 1));
writeFileSync(path.join(ROOT, "src/data/categories.json"), JSON.stringify(categories, null, 1));

// --- 4) Report --------------------------------------------------------------
console.log(`Assigned ${newLinks.length} orphan products; ${unassigned.length} unassigned.`);
console.log("\nBy target category:");
for (const [id, n] of [...perCat.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${byId.get(id).name} (id ${id})`);
}
if (unassigned.length) {
  console.log("\nUNASSIGNED (need manual review):");
  for (const s of unassigned) console.log("  " + s);
}
console.log(`\nCount changes: ${countChanges.length} categories updated.`);
for (const c of countChanges.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)).slice(0, 12)) {
  console.log(`  ${c.name.padEnd(26)} ${c.from} -> ${c.to}`);
}

// --- 5) Write live DB -------------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.warn("\nDATABASE_URL not set — JSON updated, DB NOT touched.");
  process.exit(0);
}
const sql = neon(process.env.DATABASE_URL);

if (newLinks.length) {
  await sql`
    INSERT INTO product_categories (product_id, category_id)
    SELECT product_id, category_id
    FROM jsonb_to_recordset(${JSON.stringify(newLinks)}::jsonb)
      AS t(product_id int, category_id int)
    ON CONFLICT DO NOTHING
  `;
}
const countRows = categories.map((c) => ({ id: c.id, count: c.count }));
await sql`
  UPDATE categories AS c SET count = v.count
  FROM jsonb_to_recordset(${JSON.stringify(countRows)}::jsonb) AS v(id int, count int)
  WHERE c.id = v.id
`;

const [{ count: orphans }] = await sql`
  SELECT count(*)::int AS count FROM products p
  LEFT JOIN product_categories pc ON pc.product_id = p.id
  WHERE p.hidden = false AND pc.product_id IS NULL
`;
console.log(`\nDB updated. Remaining uncategorized in DB: ${orphans}`);
