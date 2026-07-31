/**
 * Separate BRANDS from PRODUCT TYPES in the category tree.
 *
 * The taxonomy came straight out of WooCommerce and mixes two different things:
 * 12 of the 22 roots are brands (Cansin, Krauterhof, Ersa Med, Chicco, Haribo,
 * Pampers, Solgar, Autan, Mr. White, Bio Tree Baby, ATC Natyral, Orbit), while
 * orthopedics is scattered over three roots, `aparatura` and `paisje-medicinale`
 * are the same subject, and "other" exists in five spellings. Products cannot be
 * browsed by what they are.
 *
 * After this script:
 *   - `kind = 'type'`  the product-type tree the site navigates (11 roots)
 *   - `kind = 'brand'` a parallel, flat brand list that only /markat reads
 *
 * Three invariants, in order of importance:
 *
 * 1. NOTHING IS DELETED. `product_categories` is `ON DELETE CASCADE`, so
 *    dropping a brand category would silently destroy the product<->brand links
 *    /markat needs. Every one of the 90 rows survives; only `parent`,
 *    `display_name`, `kind` and `sort` change.
 *
 * 2. NO SLUG CHANGES, so every existing /kategorite/<slug> URL keeps working and
 *    no redirects are needed. New roots are existing categories PROMOTED to root
 *    and renamed — e.g. `ortopedi` (id 328) was absurdly nested under the
 *    supplement brand Swiss Energy and becomes the orthopedics root, keeping its
 *    slug and its 27 products.
 *
 * 3. BRAND MEMBERSHIP IS PRESERVED BY ADDING LINKS. A brand often owns its
 *    products only through a child: `cansin` has 95 direct but 100 in its
 *    subtree, because the wound-care children (fllastera, fasha, gaza,
 *    leukoplasta, pelhure) are real product types that move to the
 *    "Fasho dhe fllastera" root. Re-parenting alone would lose those products
 *    for the brand, so for every category that leaves a brand subtree we INSERT
 *    direct product->brand links first. Additive only; no link is ever removed.
 *
 * Names were checked against the actual products in each category, not guessed.
 * Four were plainly wrong and are corrected here (see NAME NOTES below).
 *
 * Usage:  node scripts/restructure-categories.mjs [--commit]
 *   Without --commit it only reports (dry run). Re-runnable and idempotent.
 *
 * Requires DATABASE_URL — read from .env.local automatically.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMIT = process.argv.includes("--commit");

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

/*
 * NAME NOTES — corrections the product data forced, all verified by reading the
 * product names inside the category:
 *
 *   244 hollaopke  "Hollaopke për vena të hapura (CCL1)", "(CCL2)", "për
 *                  shtatzana" — CCL is the compression class, `vena` = veins.
 *                  These are medical compression stockings, NOT thin socks.
 *                  -> "Çorape kompresioni"
 *   357 pampers    contains "Adult Pants-Brek A30 (DR.COMFORT) L/M/XL" and
 *                  "Pampers për të rritur" — adult incontinence, not baby
 *                  nappies, and mostly not even Pampers. -> type, not brand.
 *   356 orbit      contains "Jake bonbona mints", "Jake vitamin-candy" — Jake
 *                  sweets, no Orbit product at all. -> type "Bonbona".
 *   344 mr-white   contains "Barbie Brush me Vibrim", "Disney Mickey … Paste
 *                  Mint 75ml 3+" — children's oral care. Stays a brand, but its
 *                  products belong under Dentare, not under whitening.
 *   261 labelle    single product "Labella amino acid, vaseline, aloe vera" —
 *                  a duplicate of 226 labella. Kept as a brand-internal leaf.
 *
 * Also worth knowing: 351 tampon (Carefree, O.B.) is a genuine product type,
 * and 188 shemo is the house brand (Aparat inhalimi SHEMO, Compressor Nebulizer
 * Shemo) — a brand, whose products are devices.
 */

/**
 * The whole restructure, one row per category id.
 *
 *   kind    'type' | 'brand'
 *   parent  new parent id, 0 = root
 *   name    display_name to set (null = keep the raw catalog name)
 *   sort    ordering hint within the level (roots use 10, 20, 30 …)
 *   linkTo  only for categories LEAVING a brand subtree: the brand id whose
 *           product links must be preserved (invariant 3)
 *   typeTo  only for brand-internal categories: the type category its products
 *           should also be linked to, so they stay browsable by what they are
 */
const PLAN = {
  // ---------------------------------------------------------------- TYPE ROOTS
  248: { kind: "type", parent: 0, name: "Barnat", sort: 10 },
  204: { kind: "type", parent: 0, name: "Suplemente", sort: 20 },
  221: { kind: "type", parent: 0, name: "Kozmetikë dhe kujdes personal", sort: 30 },
  // Promoted out of Swiss Energy (a supplement brand!) to head orthopedics.
  328: { kind: "type", parent: 0, name: "Ortopedi", sort: 40 },
  220: { kind: "type", parent: 0, name: "Pajisje mjekësore", sort: 50 },
  250: { kind: "type", parent: 0, name: "Higjienë dhe antiseptikë", sort: 60 },
  200: { kind: "type", parent: 0, name: "Fasho dhe fllastera", sort: 70 },
  219: { kind: "type", parent: 0, name: "Vajra dhe çajra", sort: 80 },
  15:  { kind: "type", parent: 0, name: "Prezervativë", sort: 90 },
  // Promoted out of Swiss Energy; the baby/child brands feed it via links.
  // Its 9 products are children's supplements (Appetito, Ferro C, Immunity
  // lollipops), so they stay reachable under Suplemente as well — a child's
  // vitamin belongs in both trees. Unlike 328, which held 27 orthopedic items
  // with no Swiss Energy product among them and was simply misfiled.
  209: { kind: "type", parent: 0, name: "Për fëmijë", sort: 100, linkTo: 204 },
  356: { kind: "type", parent: 0, name: "Bonbona", sort: 110 },

  // ------------------------------------------------------------------- Barnat
  347: { kind: "type", parent: 248, name: "Shurupa", sort: 10 },
  349: { kind: "type", parent: 248, name: "Pika", sort: 20 },
  348: { kind: "type", parent: 248, name: "Supositore", sort: 30 },

  // --------------------------------------------------------------- Suplemente
  212: { kind: "type", parent: 204, name: "Suplemente", sort: 10 },
  206: { kind: "type", parent: 204, name: "Eferveta", sort: 20, linkTo: 205 },
  210: { kind: "type", parent: 204, name: "Kapsula", sort: 30, linkTo: 205 },
  208: { kind: "type", parent: 204, name: "Omega 3", sort: 40, linkTo: 205 },
  207: { kind: "type", parent: 204, name: "Bonbona vitaminash", sort: 50, linkTo: 205 },
  213: { kind: "type", parent: 204, name: "Soda bikarboni", sort: 60 },
  265: { kind: "type", parent: 204, name: "Të tjera — Suplemente", sort: 90 },

  // ------------------------------------------------- Kozmetikë (product types)
  228: { kind: "type", parent: 221, name: "Higjienike", sort: 10 },
  225: { kind: "type", parent: 221, name: "Dentare", sort: 20 },
  222: { kind: "type", parent: 221, name: "Shampo", sort: 30 },
  229: { kind: "type", parent: 221, name: "Krema", sort: 40 },
  227: { kind: "type", parent: 221, name: "Antibakterial", sort: 50 },
  230: { kind: "type", parent: 221, name: "Të tjera — Kozmetikë", sort: 90 },

  // ---------------------------------------------------------------- Ortopedi
  238: { kind: "type", parent: 328, name: "Këmbë", sort: 10, linkTo: 231 },
  242: { kind: "type", parent: 238, name: "Gjuri", sort: 10, linkTo: 231 },
  243: { kind: "type", parent: 238, name: "Çorape", sort: 20, linkTo: 231 },
  241: { kind: "type", parent: 238, name: "Nyje", sort: 30, linkTo: 231 },
  240: { kind: "type", parent: 238, name: "Gishtat e këmbës", sort: 40, linkTo: 231 },
  // CCL1/CCL2 compression classes — see NAME NOTES.
  244: { kind: "type", parent: 238, name: "Çorape kompresioni", sort: 50, linkTo: 231 },
  239: { kind: "type", parent: 238, name: "Shtroje", sort: 60, linkTo: 231 },
  234: { kind: "type", parent: 328, name: "Dorë", sort: 20, linkTo: 231 },
  237: { kind: "type", parent: 234, name: "Krah", sort: 10, linkTo: 231 },
  235: { kind: "type", parent: 234, name: "Gishtat e dorës", sort: 20, linkTo: 231 },
  236: { kind: "type", parent: 234, name: "Dorë — të tjera", sort: 90, linkTo: 231 },
  233: { kind: "type", parent: 328, name: "Shoka dhe korseta", sort: 30, linkTo: 231 },
  232: { kind: "type", parent: 328, name: "Qafore", sort: 40, linkTo: 231 },
  245: { kind: "type", parent: 328, name: "Karrige dhe ndihmëse për ecje", sort: 50, linkTo: 231 },
  247: { kind: "type", parent: 328, name: "Mbathje ortopedike", sort: 60 },
  246: { kind: "type", parent: 328, name: "Të tjera — Ortopedi", sort: 90, linkTo: 231 },

  // -------------------------------------------------------- Pajisje mjekësore
  // The Aparatura/Paisje Medicinale overlap is resolved by nesting, not deleting.
  187: { kind: "type", parent: 220, name: "Aparatura", sort: 10 },
  194: { kind: "type", parent: 187, name: "Diabetike", sort: 10 },
  195: { kind: "type", parent: 187, name: "Të tjera — Aparatura", sort: 90 },

  // ---------------------------------------------------------------- Higjienë
  351: { kind: "type", parent: 250, name: "Tampona dhe higjienë intime", sort: 10 },
  // Adult incontinence, not baby nappies — see NAME NOTES.
  357: { kind: "type", parent: 250, name: "Pelena për të rritur", sort: 20 },

  // ------------------------------------------------------ Fasho dhe fllastera
  197: { kind: "type", parent: 200, name: "Fllastera", sort: 10, linkTo: 196 },
  199: { kind: "type", parent: 200, name: "Gaza", sort: 20, linkTo: 196 },
  198: { kind: "type", parent: 200, name: "Leukoplasta", sort: 30, linkTo: 196 },
  256: { kind: "type", parent: 200, name: "Pëlhurë", sort: 40, linkTo: 196 },

  // --------------------------------------------------------- Vajra dhe çajra
  218: { kind: "type", parent: 219, name: "Vajra natyrale", sort: 10, linkTo: 214 },
  215: { kind: "type", parent: 219, name: "Çajra mjekësore", sort: 20, linkTo: 214 },
  216: { kind: "type", parent: 219, name: "Çajra me filtër", sort: 30, linkTo: 214 },

  // ------------------------------------------------------------ Prezervativë
  266: { kind: "type", parent: 15, name: "Të tjera — Prezervativë", sort: 90 },

  // -------------------------------------------------------------------- BRANDS
  // Flat at root level: brands are a parallel taxonomy, not part of the type
  // tree. `typeTo` keeps their products browsable by product type as well.
  196: { kind: "brand", parent: 0, name: "Cansin", sort: 0, typeTo: 200 },
  231: { kind: "brand", parent: 0, name: "Ersa Med", sort: 0, typeTo: 328 },
  251: { kind: "brand", parent: 0, name: "Kräuterhof", sort: 0, typeTo: 221 },
  214: { kind: "brand", parent: 0, name: "ATC Natyral", sort: 0, typeTo: 219 },
  205: { kind: "brand", parent: 0, name: "Swiss Energy", sort: 0, typeTo: 204 },
  224: { kind: "brand", parent: 0, name: "Froika", sort: 0, typeTo: 221 },
  226: { kind: "brand", parent: 0, name: "Labella", sort: 0, typeTo: 221 },
  346: { kind: "brand", parent: 0, name: "Senti 2", sort: 0, typeTo: 220 },
  189: { kind: "brand", parent: 0, name: "Dr. Frei", sort: 0, typeTo: 187 },
  188: { kind: "brand", parent: 0, name: "Shemo", sort: 0, typeTo: 187 },
  191: { kind: "brand", parent: 0, name: "Comfort", sort: 0, typeTo: 187 },
  193: { kind: "brand", parent: 0, name: "Freely", sort: 0, typeTo: 187 },
  252: { kind: "brand", parent: 0, name: "Bioblas", sort: 0, typeTo: 222 },
  253: { kind: "brand", parent: 0, name: "Restorex", sort: 0, typeTo: 222 },
  211: { kind: "brand", parent: 0, name: "Kruger / Heliusan", sort: 0, typeTo: 204 },
  202: { kind: "brand", parent: 0, name: "Dolphi", sort: 0, typeTo: 15 },
  201: { kind: "brand", parent: 0, name: "Love Plus", sort: 0, typeTo: 15 },
  254: { kind: "brand", parent: 0, name: "TIO Medikal", sort: 0, typeTo: 247 },
  249: { kind: "brand", parent: 0, name: "Dr. Luigi", sort: 0, typeTo: 247 },
  // Children's oral care despite the name — see NAME NOTES.
  344: { kind: "brand", parent: 0, name: "Mr. White", sort: 0, typeTo: 225 },
  343: { kind: "brand", parent: 0, name: "Bio Tree Baby", sort: 0, typeTo: 209 },
  353: { kind: "brand", parent: 0, name: "Chicco", sort: 0, typeTo: 209 },
  355: { kind: "brand", parent: 0, name: "Solgar", sort: 0, typeTo: 204 },
  352: { kind: "brand", parent: 0, name: "Autan", sort: 0, typeTo: 250 },
  354: { kind: "brand", parent: 0, name: "Haribo", sort: 0, typeTo: 356 },

  // Brand-internal leaves: they stay inside their brand's subtree (so they never
  // appear in the type navigation), and their products are linked to the right
  // type category instead. This is how the duplicate names disappear from the
  // UI without deleting a single row.
  268: { kind: "brand", parent: 226, name: "Labella — Kozmetikë", sort: 0, typeTo: 221 },
  264: { kind: "brand", parent: 205, name: "Swiss Energy — Kozmetikë", sort: 0, typeTo: 221 },
  262: { kind: "brand", parent: 205, name: "Swiss Energy — Krem", sort: 0, typeTo: 229 },
  260: { kind: "brand", parent: 251, name: "Kräuterhof — Krem", sort: 0, typeTo: 229 },
  259: { kind: "brand", parent: 251, name: "Kräuterhof — Balsam", sort: 0, typeTo: 229 },
  257: { kind: "brand", parent: 251, name: "Kräuterhof — Serum", sort: 0, typeTo: 221 },
  258: { kind: "brand", parent: 251, name: "Kräuterhof — Shampo", sort: 0, typeTo: 222 },
  // Duplicate of 226 Labella — see NAME NOTES.
  261: { kind: "brand", parent: 226, name: "Labella — Vaseline", sort: 0, typeTo: 221 },
  300: { kind: "brand", parent: 214, name: "ATC Natyral — të tjera", sort: 0, typeTo: 219 },
};

// --- Load current state -----------------------------------------------------
const categories = JSON.parse(readFileSync(path.join(ROOT, "src/data/categories.json"), "utf8"));
const products = JSON.parse(readFileSync(path.join(ROOT, "src/data/products.json"), "utf8"));
const byId = new Map(categories.map((c) => [c.id, c]));

// --- Safety: never write a partial restructure -------------------------------
const unmapped = categories.filter((c) => !PLAN[c.id]);
const unknown = Object.keys(PLAN).map(Number).filter((id) => !byId.has(id));
if (unmapped.length || unknown.length) {
  if (unmapped.length) {
    console.error(`ABORT: ${unmapped.length} category/ies not in PLAN — nothing written:`);
    for (const c of unmapped) console.error(`  ${c.id}  ${c.slug}  ("${c.name}")`);
  }
  if (unknown.length) {
    console.error(`ABORT: PLAN references ${unknown.length} unknown id(s): ${unknown.join(", ")}`);
  }
  process.exit(1);
}
// A bad parent id or a cycle would break the tree everywhere.
for (const [idStr, row] of Object.entries(PLAN)) {
  const id = Number(idStr);
  if (row.parent !== 0 && !byId.has(row.parent)) {
    console.error(`ABORT: id ${id} points at unknown parent ${row.parent}`);
    process.exit(1);
  }
  let walker = row.parent;
  for (let hops = 0; walker !== 0; hops++) {
    if (walker === id || hops > 12) {
      console.error(`ABORT: parent cycle detected at id ${id}`);
      process.exit(1);
    }
    walker = PLAN[walker]?.parent ?? 0;
  }
}

// --- Apply the plan in memory ------------------------------------------------
const childrenOf = new Map();
for (const [idStr, row] of Object.entries(PLAN)) {
  const list = childrenOf.get(row.parent) ?? [];
  list.push(Number(idStr));
  childrenOf.set(row.parent, list);
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

// Invariant 3: preserve brand membership by ADDING links, never removing any.
const existingLinks = new Set();
for (const p of products) for (const id of p.categoryIds ?? []) existingLinks.add(`${p.id}:${id}`);
const newLinks = [];
const addLink = (product, categoryId) => {
  const key = `${product.id}:${categoryId}`;
  if (existingLinks.has(key)) return;
  existingLinks.add(key);
  product.categoryIds = [...(product.categoryIds ?? []), categoryId];
  newLinks.push({ product_id: product.id, category_id: categoryId });
};
for (const [idStr, row] of Object.entries(PLAN)) {
  const id = Number(idStr);
  const target = row.linkTo ?? row.typeTo;
  if (!target) continue;
  const scope = withDescendants(id);
  for (const p of products) {
    if ((p.categoryIds ?? []).some((cid) => scope.has(cid))) addLink(p, target);
  }
}

// Structure + labels
const changes = [];
for (const c of categories) {
  const row = PLAN[c.id];
  const before = { parent: c.parent, name: c.displayName ?? null, kind: c.kind ?? "type", sort: c.sort ?? 0 };
  c.parent = row.parent;
  c.displayName = row.name;
  c.kind = row.kind;
  c.sort = row.sort;
  if (before.parent !== c.parent || before.name !== c.displayName || before.kind !== c.kind) {
    changes.push({ slug: c.slug, from: before, to: { parent: c.parent, name: c.displayName, kind: c.kind } });
  }
}

// Counts, descendant-aware — same definition as fix-categories.mjs and as the
// recountCategories() CTE in src/lib/admin-actions.ts.
const countChanges = [];
for (const c of categories) {
  const scope = withDescendants(c.id);
  let n = 0;
  for (const p of products) if ((p.categoryIds ?? []).some((id) => scope.has(id))) n++;
  if (n !== c.count) countChanges.push({ slug: c.slug, from: c.count, to: n });
  c.count = n;
}

// --- Report ------------------------------------------------------------------
const types = categories.filter((c) => c.kind === "type");
const brands = categories.filter((c) => c.kind === "brand");
console.log(`${COMMIT ? "COMMIT" : "DRY RUN"} — ${categories.length} categories`);
console.log(`  types:  ${types.length} (${types.filter((c) => c.parent === 0).length} roots)`);
console.log(`  brands: ${brands.length} (${brands.filter((c) => c.parent === 0).length} at root)`);
console.log(`  structure/label changes: ${changes.length}`);
console.log(`  count changes: ${countChanges.length}`);
console.log(`  NEW product->category links: ${newLinks.length}\n`);

console.log("New type tree:");
const render = (parent, indent) => {
  for (const c of categories
    .filter((x) => x.parent === parent && x.kind === "type")
    .sort((a, b) => a.sort - b.sort)) {
    console.log(`  ${String(c.count).padStart(5)}  ${"  ".repeat(indent)}${c.displayName}  [${c.slug}]`);
    render(c.id, indent + 1);
  }
};
render(0, 0);

console.log("\nBrands (flat, /markat only):");
for (const c of brands.filter((x) => x.parent === 0).sort((a, b) => b.count - a.count)) {
  console.log(`  ${String(c.count).padStart(5)}  ${c.displayName}  [${c.slug}]`);
}

if (!COMMIT) {
  console.log("\nDry run — nothing written. Re-run with --commit to apply.");
  process.exit(0);
}

// --- Write: source JSON, then the DB ----------------------------------------
writeFileSync(path.join(ROOT, "src/data/categories.json"), JSON.stringify(categories, null, 1));
writeFileSync(path.join(ROOT, "src/data/products.json"), JSON.stringify(products, null, 1));
console.log("\nWrote src/data/categories.json + src/data/products.json");

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL missing — JSON written, database untouched.");
  process.exit(0);
}
const sql = neon(process.env.DATABASE_URL);

await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'type'`;
await sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort integer NOT NULL DEFAULT 0`;

// Links first, so no product is ever briefly unreachable in the new tree.
for (const l of newLinks) {
  await sql`
    INSERT INTO product_categories (product_id, category_id)
    VALUES (${l.product_id}, ${l.category_id}) ON CONFLICT DO NOTHING
  `;
}
for (const c of categories) {
  await sql`
    UPDATE categories
    SET parent = ${c.parent}, display_name = ${c.displayName},
        kind = ${c.kind}, sort = ${c.sort}, count = ${c.count}
    WHERE id = ${c.id}
  `;
}
console.log(`Database updated: ${newLinks.length} links added, ${categories.length} categories rewritten.`);
