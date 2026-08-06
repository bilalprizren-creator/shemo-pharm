/**
 * Freeze the membership of the brand categories that must not change, and write
 * it to src/data/brand-pins.json for merge-audit.mjs to apply.
 *
 * The packshot audit reads brands off the package, which is the right rule for
 * consumer goods and the wrong one for two of the shelves this catalog sells:
 *
 *   Ersa Med   238 products live, 158 after the audit. The 83 that fall out are
 *              wheelchairs, seat cushions, compression tights and walking aids
 *              photographed on an anonymous limb with no mark anywhere on the
 *              frame. They are Ersa's range; the camera just cannot say so.
 *   Labella     61 products live, 0 after the audit. Across all 2049 packshots
 *              not one carries a Labella wordmark — the products named "Labella"
 *              turn out to be Curalene, Disney, Chupa Chups, Neutrogena. Correct
 *              as a reading of the photo, but it would delete a category the
 *              business still sells under, so the membership is kept.
 *
 * A pin only ever ADDS a brand link. The audit's own reading always wins as the
 * primary brand — the ESCAPE LX wheelchair carries a legible Comfort logo and
 * stays Comfort, with Ersa Med as a second link.
 *
 * Must run BEFORE scripts/apply-taxonomy.mjs: it derives the pins from the
 * category links still in src/data/products.json, which that script overwrites.
 * Re-running it after the migration would pin whatever the migration produced,
 * which is why it refuses to overwrite an existing file without --force.
 *
 * Usage:  node scripts/pin-brands.mjs [--force]
 */
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { ROOT, readJson, dataPath } from "./lib/db.mjs";

const FORCE = process.argv.includes("--force");

/**
 * Which brand keeps its shelf, and which category ids make up that shelf today.
 *
 * The extra ids are the categories taxonomy.json merges into the brand — a
 * Labella product sitting in `kozmetike-labella` (268) is in the Labella shelf
 * as far as the site is concerned, and would be lost by reading 226 alone.
 */
const PINS = [
  { brand: "ersa-med-ortopedi", categoryIds: [231] },
  { brand: "labella", categoryIds: [226, 261, 268] },
];

const products = readJson(dataPath("products.json"));
const categories = readJson(dataPath("categories.json"));
const taxonomy = readJson(dataPath("taxonomy.json"));

const brandSlugs = new Set(
  taxonomy.categories.filter((c) => c.kind === "brand").map((c) => c.slug)
);
const oldById = new Map(categories.map((c) => [c.id, c]));

const out = dataPath("brand-pins.json");
if (existsSync(out) && !FORCE) {
  console.error(
    `${path.relative(ROOT, out)} already exists.\n` +
      `It was written from the pre-migration category links; regenerating it now would\n` +
      `pin whatever apply-taxonomy.mjs has since produced. Pass --force if you are sure.`
  );
  process.exit(1);
}

const pins = [];
for (const pin of PINS) {
  if (!brandSlugs.has(pin.brand)) {
    console.error(`"${pin.brand}" is not a brand in taxonomy.json`);
    process.exit(1);
  }
  const missing = pin.categoryIds.filter((id) => !oldById.has(id));
  if (missing.length) {
    console.error(`${pin.brand}: category ${missing.join(", ")} is not in categories.json`);
    process.exit(1);
  }
  const ids = products
    .filter((p) => p.categoryIds.some((id) => pin.categoryIds.includes(id)))
    .map((p) => p.id)
    .sort((a, b) => a - b);
  if (!ids.length) {
    console.error(`${pin.brand}: no products found — refusing to write an empty pin`);
    process.exit(1);
  }
  pins.push({ brand: pin.brand, from: pin.categoryIds, ids });
  const parts = pin.categoryIds
    .map((id) => `${oldById.get(id).slug} ${products.filter((p) => p.categoryIds.includes(id)).length}`)
    .join(" + ");
  console.log(`${pin.brand.padEnd(20)} ${String(ids.length).padStart(4)} products   (${parts})`);
}

writeFileSync(
  out,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "category links in src/data/products.json before the taxonomy migration",
      why: "these brand shelves keep the membership the live site has, see the header of scripts/pin-brands.mjs",
      pins,
    },
    null,
    1
  )
);
console.log(`\nwrote ${path.relative(ROOT, out)}`);
