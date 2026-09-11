/**
 * Put the printed catalogue's Ivy Bear range into the database.
 *
 *   npm run add:ivy-bear                                   # dry run, development
 *   npm run add:ivy-bear -- --write                        # apply, development
 *   DATABASE_TARGET=production npm run add:ivy-bear -- --write
 *
 * Section 7.3 of the printed catalogue (shemo-katalog.com) lists nine Ivy Bear
 * products, and the database holds none of them: the WooCommerce export the
 * range was seeded from never carried them, which is why the section has been
 * a numbered heading over nothing since the printed order was imported
 * (audit/catalog-order-import.md: 7.3 Ivy Bear, 9 printed, 0 found). The Jara
 * Pharmacy project imported the same section from the same site on 2026-07-09
 * and holds a tenth product, 4151, which the site has since dropped.
 *
 * This creates the ten — rows, category links, the printed placement and the
 * original photograph — from the table written down below, not read off the
 * site: the site can change under us, and every id in the table was chosen
 * because it is free on BOTH databases (max product id 19714, max category id
 * 432 on each, measured 2026-09-11; neither table has a sequence). Fixed ids
 * are what let the development run and the production run produce the same
 * rows, so that src/data/products.json can mirror both.
 *
 * What the owner decided, and why the rows look the way they do:
 *
 *   - There is no price anywhere — not on the site, not in Jara, and the old
 *     shop's API is closed — so price_cents is 0 and the products are hidden on
 *     BOTH sites (`hidden` is the shop, `catalog_hidden` is shemo-katalog.com)
 *     until they are priced in /admin/produktet. A partner with a login would
 *     otherwise read 0,00 EUR. tests/product-data.test.ts pins exactly these
 *     codes as the only ones allowed to be unpriced.
 *   - Visibility lives only in the database. products.json does not carry
 *     `hidden`, and seed-db.mjs does not write it, so a seed into an EMPTY
 *     database would create these visible at 0,00 EUR. Every existing database
 *     is unaffected — the seed's upsert leaves `hidden` alone.
 *   - 4151 comes along, last in the section, on the same terms: cheaper to
 *     delete in the admin than to find again.
 *
 * Photographs. Jara's shemo-<code>-*-original.png are byte for byte the files
 * shemo-katalog.com serves — same pixels, same alpha, checked on all nine — so
 * there is nothing better to fetch. Each is reframed onto the white 1000px
 * square every other original sits on (scripts/lib/reframe.mjs, the same call
 * migrate-images.mjs made) and saved under the name that script would have
 * chosen, `<sku>-<slug>.webp`. ingest-photo.mjs cannot do this: it refuses a
 * code with no original on disk, on purpose, and this is the one place where
 * the original is being invented together with the product. The cut-out is
 * NOT made here — that is `cutout-images.mjs --only <codes>`, which finds the
 * Jara file by code and takes its alpha, as it did for 1 400 other products.
 *
 * The photo path a row gets is whatever products.json holds for the code once
 * the code is in there, else the original. So the order is: this script on
 * development, then cutout-images.mjs --write (which moves the path to the
 * cut-out in the development database and in products.json), then this script
 * on production — which lands straight on the cut-out.
 *
 * Idempotent on both databases and in both JSON files: what is there already
 * is reported and left alone, and an id, slug or code held by something ELSE
 * stops the run before anything is written.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { connect, dataPath, describeTarget, readJson, ROOT } from "./lib/db.mjs";
import { skuKeys } from "./lib/catalog-html.mjs";
import { reframe } from "./lib/reframe.mjs";

const WRITE = process.argv.includes("--write");

const JARA = "C:/calude code/Jara pharmcay/public/products";
const OUT = path.join(ROOT, "public/products");

const SECTION = { no: "7.3", name: "Ivy Bear" };

/**
 * A brand of its own, like Swiss Energy (205), Haribo (354) and Solgar (355)
 * beside it. Its count stays 0 until a product is visible — recountCategories()
 * in src/lib/admin-actions.ts counts `hidden = false` only — and /markat lists
 * a brand only above 0, so the brand surfaces exactly when the products do.
 */
const BRAND = { id: 433, name: "Ivy Bear", slug: "ivy-bear", kind: "brand" };

/**
 * The type categories, by the ids both databases were seeded with. Checked
 * against the slug before use — an id that has moved would file ten products
 * under the wrong shelf without a word. The pattern is the Swiss Energy
 * gummies (7612): the leaf, its root, and the children's shelf where it fits.
 */
const TYPES = [
  { id: 204, slug: "suplemente" },
  { id: 207, slug: "bonbona" }, // "Bonbona dhe karamele vitaminash"
  { id: 209, slug: "per-femije" },
];
const EVERY = [204, 207];
const KIDS = [209];

/** Printed order on shemo-katalog.com, 2026-09-11; 4151 from Jara, last. */
const PRODUCTS = [
  { id: 19715, sku: "4139", name: "Ivy Bear Women's Hair 60gummies" },
  { id: 19716, sku: "4141", name: "Ivy Bear Men's Hair 60gummies" },
  { id: 19717, sku: "4142", name: "Ivy Bear Boost Immune 60gummies" },
  { id: 19718, sku: "4150", name: "Ivy Bear SuperPower Kids 60gummies", kids: true },
  { id: 19719, sku: "4149", name: "Ivy Bear Boost Tan 60gummies" },
  { id: 19720, sku: "4148", name: "Ivy Bear Restfull Sleep 60gummies" },
  { id: 19721, sku: "4171", name: "IvyBear Vibrant Skin 60 gummies" },
  { id: 19722, sku: "4170", name: "Ivy Bear Boost Energy 60 Gummies" },
  { id: 19723, sku: "4138", name: "Ivy Bear Protein Boost 70gummies" },
  { id: 19724, sku: "4151", name: "Ivy Bear Women's Hair Professional 60gummies" },
];

/** Same rule as slugify() in src/lib/admin-actions.ts. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ë/g, "e")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** The name migrate-images.mjs gave every original: `<sku>-<slug>`, sanitised. */
const originalName = (p) => `${p.sku}-${p.slug}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 90);

// Every other product URL ends in its code (immunity-boost-60-gummies-7612), so
// these do too. The name itself stays as printed: the "(code)" suffix on the
// WooCommerce-era names is an artefact productDisplayName() has to strip.
for (const p of PRODUCTS) {
  p.slug = `${slugify(p.name)}-${p.sku}`;
  p.file = `${originalName(p)}.webp`;
  p.categoryIds = [...EVERY, ...(p.kids ? KIDS : []), BRAND.id];
}
PRODUCTS.forEach((p, i) => (p.sort = i + 1));

/** Jara's files, keyed by code — the same reading cutout-images.mjs does. */
function jaraIndex() {
  if (!existsSync(JARA)) return new Map();
  const byCode = new Map();
  for (const f of readdirSync(JARA)) {
    if (!f.startsWith("shemo-")) continue;
    // Up to the next hyphen: a code holds digits, letters, commas and spaces,
    // never a hyphen, which is what separates it from the name.
    const code = /^shemo-([^-]+)-/.exec(f)?.[1];
    if (code && !byCode.has(code.toLowerCase())) byCode.set(code.toLowerCase(), f);
  }
  return byCode;
}

const refused = [];

/* --------------------------------------------------------------- photos */

const jara = jaraIndex();
const photos = []; // { p, source, exists, scale, markPct, webp }
for (const p of PRODUCTS) {
  const f = jara.get(p.sku.toLowerCase());
  if (!f) {
    refused.push(`${p.sku}: no shemo-${p.sku}-*.png in ${JARA}`);
    continue;
  }
  const source = path.join(JARA, f);
  // An alpha channel is not a transparent background: some of Jara's PNGs are
  // opaque edge to edge. The cut-out step trusts this file's alpha, so it has
  // to actually say something.
  if ((await sharp(source).stats()).isOpaque) {
    refused.push(`${p.sku}: ${f} is opaque — its alpha would be trusted and is empty`);
    continue;
  }
  const target = path.join(OUT, p.file);
  const exists = existsSync(target);
  const r = exists ? null : await reframe(source);
  if (r?.blank) {
    refused.push(`${p.sku}: ${f} reframes to a blank white square`);
    continue;
  }
  photos.push({ p, file: f, target, exists, r });
}

/* ------------------------------------------------------------- database */

const sql = connect();

const [section] = await sql`
  SELECT id FROM catalog_sections WHERE catalog_no = ${SECTION.no} AND name = ${SECTION.name}
`;
if (!section) refused.push(`no catalog section ${SECTION.no} ${SECTION.name} in this database`);

// The type shelves, verified by slug: the ids are WooCommerce's and both
// databases were seeded with them, but a restructure could move one.
const types = await sql`
  SELECT id, slug, kind FROM categories WHERE id = ANY(${TYPES.map((t) => t.id)}::int[])
`;
for (const t of TYPES) {
  const row = types.find((r) => r.id === t.id);
  if (!row) refused.push(`category ${t.id} (${t.slug}) does not exist`);
  else if (row.slug !== t.slug || row.kind !== "type") {
    refused.push(`category ${t.id} is "${row.slug}" (${row.kind}), expected "${t.slug}" (type)`);
  }
}

// The brand: absent, ours already, or something else in the way.
const brandRows = await sql`
  SELECT id, name, slug, kind FROM categories WHERE id = ${BRAND.id} OR slug = ${BRAND.slug}
`;
let brandPresent = false;
for (const r of brandRows) {
  if (r.id === BRAND.id && r.slug === BRAND.slug) brandPresent = true;
  else refused.push(`category id ${r.id} "${r.name}" (${r.slug}) is in the way of ${BRAND.id} ${BRAND.slug}`);
}

// The products: by id, by slug and by code, so that a row holding any of the
// three under another identity is a refusal and never a silent second copy.
const skuMatch = PRODUCTS.flatMap((p) => skuKeys(p.sku));
const existing = await sql`
  SELECT id, sku, slug, name FROM products
  WHERE id = ANY(${PRODUCTS.map((p) => p.id)}::int[])
     OR slug = ANY(${PRODUCTS.map((p) => p.slug)}::text[])
     OR lower(regexp_replace(sku, '\\s+', '', 'g')) = ANY(${skuMatch}::text[])
`;
const present = new Set();
for (const r of existing) {
  const mine = PRODUCTS.find((p) => p.id === r.id);
  const sameCode = mine && skuKeys(r.sku).some((k) => skuKeys(mine.sku).includes(k));
  if (mine && sameCode) present.add(mine.id);
  else refused.push(`product ${r.id} "${r.sku}" ${r.name} (${r.slug}) is in the way`);
}

/* ---------------------------------------------------------------- seed */

const productsFile = dataPath("products.json");
const categoriesFile = dataPath("categories.json");
const seed = readJson(productsFile);
const seedCategories = readJson(categoriesFile);

const seedById = new Map(seed.map((e) => [e.id, e]));
for (const e of seed) {
  const mine = PRODUCTS.find((p) => p.id === e.id || p.slug === e.slug);
  const sameCode = mine && skuKeys(e.sku).some((k) => skuKeys(mine.sku).includes(k));
  if (mine && !(e.id === mine.id && sameCode)) {
    refused.push(`products.json entry ${e.id} "${e.sku}" ${e.name} is in the way of ${mine.id}`);
  }
}
const seedBrand = seedCategories.find((c) => c.id === BRAND.id || c.slug === BRAND.slug);
if (seedBrand && !(seedBrand.id === BRAND.id && seedBrand.slug === BRAND.slug)) {
  refused.push(`categories.json entry ${seedBrand.id} ${seedBrand.slug} is in the way of ${BRAND.id}`);
}

const toInsert = PRODUCTS.filter((p) => !present.has(p.id));
const toSeed = PRODUCTS.filter((p) => !seedById.has(p.id));

/* -------------------------------------------------------------- report */

console.log(`\n${describeTarget()}\n`);
console.log(`section ${SECTION.no} ${SECTION.name}: id ${section?.id ?? "?"}`);
console.log(`brand ${BRAND.id} ${BRAND.slug}: ${brandPresent ? "present" : "to create"}`);
console.log(`products: ${toInsert.length} to insert, ${present.size} already there`);
for (const p of PRODUCTS) {
  const photo = photos.find((x) => x.p === p);
  const shot = !photo
    ? "no photo"
    : photo.exists
      ? `original on disk`
      : `${photo.file} ${photo.r.source} -> ${p.file} (product ${photo.r.markPct}% of frame, scale ${photo.r.scale})` +
        (photo.r.scale > 1 ? "  <-- SCALED UP" : "");
  const state = present.has(p.id) ? "present" : "insert ";
  console.log(`  ${state} ${p.id} ${p.sku} sort ${String(p.sort).padStart(2)}  ${p.name}`);
  console.log(`          [${p.categoryIds.join(", ")}]  ${shot}`);
}
console.log(`products.json: ${toSeed.length} entries to add; categories.json: ${seedBrand ? "brand present" : "brand to add"}`);

if (refused.length) {
  console.log(`\nREFUSED (${refused.length}) — nothing written:`);
  for (const r of refused) console.log(`  ${r}`);
  process.exit(1);
}
if (!WRITE) {
  console.log("\n(dry run; pass --write to apply)");
  process.exit(0);
}

/* --------------------------------------------------------------- write */

let originals = 0;
for (const photo of photos) {
  if (photo.exists) continue;
  writeFileSync(photo.target, photo.r.webp);
  originals++;
}
console.log(`\noriginals written: ${originals}`);

// Seed files first: the row's photo path is read from products.json, and a
// code already there (after cutout-images.mjs --write) carries its cut-out.
if (!seedBrand) {
  seedCategories.push({
    id: BRAND.id,
    name: BRAND.name,
    slug: BRAND.slug,
    parent: 0,
    count: 0,
    displayName: BRAND.name,
    kind: BRAND.kind,
    sort: 0,
  });
  writeFileSync(categoriesFile, JSON.stringify(seedCategories, null, 1));
  console.log(`categories.json: brand ${BRAND.slug} added`);
}
for (const p of toSeed) {
  const entry = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    priceCents: 0,
    regularCents: 0,
    onSale: false,
    currency: "EUR",
    images: [`/products/${p.file}`],
    categoryIds: p.categoryIds,
    inStock: true,
    description: "",
    shortDescription: "",
  };
  seed.push(entry);
  seedById.set(p.id, entry);
}
if (toSeed.length) {
  writeFileSync(productsFile, JSON.stringify(seed, null, 1));
  console.log(`products.json: ${toSeed.length} entries added`);
}

if (!brandPresent) {
  await sql`
    INSERT INTO categories (id, name, slug, parent, count, display_name, kind, sort)
    VALUES (${BRAND.id}, ${BRAND.name}, ${BRAND.slug}, 0, 0, ${BRAND.name}, ${BRAND.kind}, 0)
    ON CONFLICT (id) DO NOTHING
  `;
  console.log(`categories: ${BRAND.id} ${BRAND.slug} inserted`);
}

if (toInsert.length) {
  const rows = toInsert.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    images: seedById.get(p.id).images,
    catalog_section_id: section.id,
    catalog_sort: p.sort,
  }));
  const inserted = await sql`
    INSERT INTO products (
      id, name, slug, sku, price_cents, regular_cents, on_sale, currency, images,
      in_stock, description, short_description, display_name, image_override,
      featured, hidden, catalog_hidden, catalog_section_id, catalog_sort
    )
    SELECT id, name, slug, sku, 0, 0, false, 'EUR', images,
           true, '', '', NULL, NULL,
           false, true, true, catalog_section_id, catalog_sort
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS t(
      id int, name text, slug text, sku text, images jsonb,
      catalog_section_id int, catalog_sort int
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  console.log(`products: ${inserted.length} inserted, hidden on both sites, in section ${SECTION.no}`);

  const links = toInsert.flatMap((p) =>
    p.categoryIds.map((category_id) => ({ product_id: p.id, category_id }))
  );
  const linked = await sql`
    INSERT INTO product_categories (product_id, category_id)
    SELECT product_id, category_id
    FROM jsonb_to_recordset(${JSON.stringify(links)}::jsonb) AS t(product_id int, category_id int)
    ON CONFLICT DO NOTHING
    RETURNING product_id
  `;
  console.log(`product_categories: ${linked.length} links`);
}

const [after] = await sql`
  SELECT count(*)::int AS n,
         count(*) FILTER (WHERE hidden AND catalog_hidden)::int AS hidden,
         count(*) FILTER (WHERE images::text LIKE '%-cutout%')::int AS cut
  FROM products WHERE catalog_section_id = ${section.id}
`;
console.log(
  `\nsection ${SECTION.no} now holds ${after.n} products, ${after.hidden} hidden on both sites, ` +
    `${after.cut} on a cut-out`
);
if (after.cut < after.n) {
  console.log(
    `Next: node scripts/cutout-images.mjs --only "${PRODUCTS.map((p) => p.sku).join(",")}"` +
      ` (then --write), then npm run images:thumbs && npm run images:print`
  );
}
