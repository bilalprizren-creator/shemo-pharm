/**
 * Put an external photograph into the catalog as a product's original.
 *
 * Everything else that writes public/products/ is driven by a list the repo
 * already holds: migrate-images.mjs and localize-images.mjs walk
 * scripts/.image-manifest.json, segment-scenes.mjs reads public/products/
 * itself. None of them can be handed a file. So when a better photograph turns
 * up somewhere else — a manufacturer's packshot, a supplier's press kit, the
 * output of an image-retrieval job — there is no way in, and the product keeps
 * whatever the WordPress export happened to carry.
 *
 * This is that way in, and only that: it reframes the file onto the same white
 * square as every other original and overwrites <stem>.webp. It does not cut
 * anything out, does not touch the database, does not touch products.json.
 * cutout-images.mjs is the next step and already knows what to do with a
 * packshot on white.
 *
 *   node scripts/ingest-photo.mjs 7066 "C:/photos/bioblas.png"          # look
 *   node scripts/ingest-photo.mjs --write 7066 "…" 7011 "…"             # write
 *
 * Three things it refuses, all of them lessons from the pipeline beside it:
 *
 *   1. A code whose original is not already on disk. The name of an original is
 *      not ours to invent: thumbnail-images.mjs derives public/products/thumb/
 *      and print/ from it arithmetically, and tests/thumbnails.test.ts counts
 *      the three directories against each other.
 *   2. A code that *serves* its original — where images[0] is the very file we
 *      would overwrite. Those bytes are behind a URL with
 *      max-age=86400, stale-while-revalidate=2592000 (next.config.ts), so a
 *      viewer would keep the old photo for a day and possibly a month. Products
 *      serving a -scene.webp or a -cutout.webp are safe, because the file we
 *      write is not the one anybody is fetching; cutout-images.mjs then mints a
 *      fresh versioned name for the cut, which is the same trick from the other
 *      end.
 *   3. An all-white source, which reframe reports as blank — there is no
 *      product in it to find, and the crop would be the whole empty frame.
 *
 * A source smaller than 860px in its long edge has to be scaled up to reach the
 * 86% fill the grid is built on. That is not automatically wrong — a bottle
 * occupying a tenth of a staged photograph has fewer real pixels than a small
 * packshot — but it is never invisible, so the scale is printed and anything
 * above 1 is called out. Look at it on the contact sheet before believing it.
 */
import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { ROOT, dataPath, readJson } from "./lib/db.mjs";
import { skuKeys } from "./lib/catalog-html.mjs";
import { reframe } from "./lib/reframe.mjs";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const pairs = argv.filter((a) => a !== "--write");

if (pairs.length === 0 || pairs.length % 2 !== 0) {
  console.error("usage: node scripts/ingest-photo.mjs [--write] <code> <file> [<code> <file> ...]");
  process.exit(1);
}

const OUT = path.join(ROOT, "public/products");
const products = readJson(dataPath("products.json"));

const byCode = new Map();
for (const p of products) for (const k of skuKeys(p.sku)) if (!byCode.has(k)) byCode.set(k, p);
const lookup = (code) => skuKeys(code).map((k) => byCode.get(k)).find(Boolean) ?? null;

let refused = 0;
let written = 0;

for (let i = 0; i < pairs.length; i += 2) {
  const code = pairs[i];
  const file = pairs[i + 1];

  const product = lookup(code);
  if (!product) {
    console.log(`${code}: REFUSED — no product carries this code`);
    refused++;
    continue;
  }
  if (!existsSync(file)) {
    console.log(`${code}: REFUSED — ${file} does not exist`);
    refused++;
    continue;
  }

  const served = product.images[0] ?? "";
  const stem = path.basename(served, ".webp").replace(/-(scene|cutout(-v\d+)?)$/, "");
  const target = path.join(OUT, `${stem}.webp`);

  if (!existsSync(target)) {
    console.log(`${code}: REFUSED — no original at /products/${stem}.webp`);
    refused++;
    continue;
  }
  if (served === `/products/${stem}.webp`) {
    console.log(
      `${code}: REFUSED — the original is what it serves; overwriting it would sit behind a day of cache`
    );
    refused++;
    continue;
  }

  const r = await reframe(file);
  if (r.blank) {
    console.log(`${code}: REFUSED — ${path.basename(file)} is blank white, no product to frame`);
    refused++;
    continue;
  }

  const warn = r.scale > 1 ? `  <-- SCALED UP ${r.scale}x` : "";
  console.log(
    `${code}: ${path.basename(file)} ${r.source} -> ${stem}.webp ` +
      `(product ${r.markPct}% of frame, scale ${r.scale})${warn}`
  );
  console.log(`      serves ${served}`);

  if (WRITE) {
    writeFileSync(target, r.webp);
    written++;
  }
}

console.log(
  WRITE
    ? `\n${written} original(s) rewritten, ${refused} refused. Next: node scripts/cutout-images.mjs --only <codes>`
    : `\n${pairs.length / 2 - refused} would be rewritten, ${refused} refused. Re-run with --write.`
);
