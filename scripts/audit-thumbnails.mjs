/**
 * Render every product packshot down to 512px for the category audit.
 *
 * The catalog carries almost no text — 22 of 2049 products have a description
 * and the upstream WooCommerce API is behind a 401 — so the photo is the only
 * evidence of what a product actually is. Reading 2049 originals at 1000x1000
 * costs about four times what 512px costs, and on a cut-out packshot the brand
 * mark and the product type are the two largest things in the frame, so they
 * survive the downscale. Anything the auditor cannot read at 512px is looked up
 * in the original.
 *
 * Defaults to audit/thumbs, which is gitignored: 30 MB of derived files has no
 * business in the repository when public/products/ can rebuild it in a minute.
 * That path is also what audit/batches/*.json point at, so regenerating here is
 * all a fresh machine needs to resume the audit.
 *
 * Usage:  node scripts/audit-thumbnails.mjs [outdir] [--force]
 */
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { ROOT, readJson, dataPath } from "./lib/db.mjs";

const force = process.argv.includes("--force");
const outDir = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? path.join(ROOT, "audit", "thumbs");
mkdirSync(outDir, { recursive: true });
console.log(`writing to ${path.relative(ROOT, outDir) || outDir}`);

const products = readJson(dataPath("products.json"));

let made = 0;
let skipped = 0;
const failed = [];
const index = [];

for (const product of products) {
  const src = product.images?.[0];
  if (!src) {
    failed.push({ id: product.id, sku: product.sku, reason: "no image" });
    continue;
  }
  const from = path.join(ROOT, "public", src.replace(/^\//, ""));
  const to = path.join(outDir, `${product.id}.webp`);
  index.push({ id: product.id, sku: product.sku, name: product.name, file: `${product.id}.webp` });

  if (existsSync(to) && !force) {
    skipped++;
    continue;
  }
  try {
    await sharp(from)
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(to);
    made++;
  } catch (err) {
    failed.push({ id: product.id, sku: product.sku, reason: err.message });
  }
}

// Keyed by product id, not SKU: 10 products have no SKU at all.
writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 1));

console.log(`rendered: ${made}   already there: ${skipped}   failed: ${failed.length}`);
if (failed.length) console.log(JSON.stringify(failed.slice(0, 20), null, 1));
console.log(`index.json lists ${index.length} products`);
