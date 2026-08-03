/**
 * Move every product photo off the old WordPress site and onto Vercel Blob,
 * normalising the framing on the way.
 *
 * Why this is a launch blocker: all 2049 products point at
 * `shemopharm.com/wp-content/uploads/**` — the host that still serves the OLD
 * WordPress site. The moment shemopharm.com is pointed at Vercel, /wp-content
 * disappears and every product image on the new site 404s.
 *
 * Why the pictures are also reframed: the sources measure anywhere from 386x398
 * to 1030x1030 with aspect ratios between 1:1 and 2:1, each with a different
 * amount of baked-in whitespace, so inside the square product cards one product
 * looks huge and the next tiny. Same fix the brand logos already get in
 * scripts/trim-logos.mjs, and the same sharp pipeline:
 *   1. flatten onto white, 2. whiten the near-white matte, 3. crop to the
 *   bounding box of the actual product, 4. scale it to a fixed share of the
 *   canvas, 5. centre it on a 1000x1000 white square.
 * Cropping to the bounding box never eats into the product itself.
 *
 * TWO PASSES ON PURPOSE. The first pass only reads, transforms and uploads, and
 * writes a manifest plus a list of outliers to eyeball. Nothing in the database
 * or in src/data changes until the second pass is run explicitly, so a bad crop
 * can be caught before it reaches the site.
 *
 *   node scripts/migrate-images.mjs                 # pass 1, all products
 *   node scripts/migrate-images.mjs --limit 25      # pass 1, small sample
 *   node scripts/migrate-images.mjs --commit        # pass 2, write DB + JSON
 *
 * Pass 1 is resumable: products already in the manifest are skipped, so an
 * interrupted run continues where it stopped. Requires BLOB_READ_WRITE_TOKEN
 * (and DATABASE_URL for pass 2) — read from .env.local automatically.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { put } from "@vercel/blob";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "scripts/.image-manifest.json");
const COMMIT = process.argv.includes("--commit");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

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

const CANVAS = 1000; // final square, comfortably above the 540px PDP slot at 2x
const FILL = 0.86; // share of the canvas the product occupies — the uniform margin
const WHITE_MIN = 240; // min(r,g,b) at or above this counts as background
const QUALITY = 82;
const CONCURRENCY = 6; // polite to the old WP origin, still ~6x faster than serial

/** Crop to the product's bounding box, then centre it on a white square. */
async function reframe(input) {
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= WHITE_MIN) {
        data[i] = data[i + 1] = data[i + 2] = 255; // normalise off-white to crisp white
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // An all-white source has no product to find — keep it whole rather than crop
  // it to nothing, and let the report flag it.
  const blank = maxX < 0;
  const cropW = blank ? w : maxX - minX + 1;
  const cropH = blank ? h : maxY - minY + 1;

  const target = Math.round(CANVAS * FILL);
  const scale = target / Math.max(cropW, cropH);
  const markPct = Math.round(((cropW * cropH) / (w * h)) * 100);

  const mark = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: blank ? 0 : minX, top: blank ? 0 : minY, width: cropW, height: cropH })
    .resize({
      width: Math.max(1, Math.round(cropW * scale)),
      height: Math.max(1, Math.round(cropH * scale)),
      fit: "fill",
      kernel: "lanczos3",
    })
    // Encode losslessly before compositing: a pipeline fed raw pixels also
    // returns raw pixels, which composite() cannot read without dimensions.
    .png()
    .toBuffer();

  const webp = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .flatten({ background: "#ffffff" })
    .webp({ quality: QUALITY })
    .toBuffer();

  // Tiny inline preview so cards can fade in instead of popping.
  const blur = await sharp(webp).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

  return {
    webp,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    source: `${w}x${h}`,
    markPct,
    scale: Number(scale.toFixed(2)),
    blank,
  };
}

const products = JSON.parse(readFileSync(path.join(ROOT, "src/data/products.json"), "utf8"));

/* ---------------------------------------------------------------- PASS TWO */
if (COMMIT) {
  if (!existsSync(MANIFEST)) {
    console.error("ABORT: no manifest — run pass 1 first (node scripts/migrate-images.mjs).");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const byId = new Map(manifest.entries.map((e) => [e.id, e]));

  const missing = products.filter((p) => !byId.has(p.id));
  if (missing.length) {
    console.error(`ABORT: ${missing.length} product(s) missing from the manifest — nothing written.`);
    for (const p of missing.slice(0, 10)) console.error(`  ${p.id}  ${p.slug}`);
    process.exit(1);
  }

  for (const p of products) {
    const e = byId.get(p.id);
    p.images = [e.url];
  }
  writeFileSync(path.join(ROOT, "src/data/products.json"), JSON.stringify(products, null, 1));
  console.log(`Wrote src/data/products.json — ${products.length} products repointed.`);

  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL missing — JSON written, database untouched.");
    process.exit(0);
  }
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS blur_data_url text`;
  for (const p of products) {
    const e = byId.get(p.id);
    await sql`
      UPDATE products
      SET images = ${JSON.stringify([e.url])}::jsonb,
          image_override = NULL,
          blur_data_url = ${e.blurDataURL}
      WHERE id = ${p.id}
    `;
  }
  console.log(`Database updated: ${products.length} products now served from Vercel Blob.`);
  process.exit(0);
}

/* ---------------------------------------------------------------- PASS ONE */
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("ABORT: BLOB_READ_WRITE_TOKEN missing. Run, in the project folder:");
  console.error("  npx vercel blob create-store shemo-pharm-fotot --access public --yes");
  process.exit(1);
}

const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : { startedAt: new Date().toISOString(), entries: [] };
const done = new Map(manifest.entries.map((e) => [e.id, e]));

const todo = products.filter((p) => !done.has(p.id) && (p.images ?? []).length).slice(0, LIMIT);
console.log(`${products.length} products, ${done.size} already migrated, ${todo.length} to do.\n`);

const failures = [];
let processed = 0;
const save = () => {
  manifest.entries = [...done.values()];
  manifest.updatedAt = new Date().toISOString();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
};

async function migrate(p) {
  const src = p.imageOverride ?? p.images[0];
  const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  const out = await reframe(input);

  const name = `${p.sku || p.id}-${p.slug}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 90);
  const blob = await put(`products/${name}.webp`, out.webp, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  done.set(p.id, {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    from: src,
    url: blob.url,
    blurDataURL: out.blurDataURL,
    source: out.source,
    markPct: out.markPct,
    scale: out.scale,
    blank: out.blank,
    bytesBefore: input.length,
    bytesAfter: out.webp.length,
  });
}

const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try {
        await migrate(p);
      } catch (err) {
        failures.push({ id: p.id, slug: p.slug, error: err.message });
      }
      if (++processed % 50 === 0) {
        save();
        console.log(`  ${processed}/${todo.length} …`);
      }
    }
  })
);
save();

/* ------------------------------------------------------------------ REPORT */
const all = [...done.values()];
const before = all.reduce((s, e) => s + e.bytesBefore, 0);
const after = all.reduce((s, e) => s + e.bytesAfter, 0);
console.log(`\nDone: ${all.length} migrated, ${failures.length} failed.`);
console.log(
  `Size: ${(before / 1048576).toFixed(0)} MB -> ${(after / 1048576).toFixed(0)} MB ` +
    `(${Math.round((1 - after / before) * 100)}% smaller)`
);
if (failures.length) {
  console.log("\nFAILED — these keep their old URL until fixed:");
  for (const f of failures.slice(0, 20)) console.log(`  ${f.slug}: ${f.error}`);
}

// Anything the automatic crop may have got wrong, so it can be checked by eye
// rather than trusted. These are not errors — they are the ones worth opening.
const suspect = all.filter((e) => e.blank || e.markPct < 8 || e.markPct > 99 || e.scale > 1.8);
console.log(`\nWorth a look by eye: ${suspect.length} of ${all.length}`);
for (const e of suspect.slice(0, 25)) {
  const why = e.blank
    ? "no product found (all white)"
    : e.markPct < 8
      ? `product fills only ${e.markPct}% — crop may be wrong`
      : e.markPct > 99
        ? "no margin found — may be cut off at the edge"
        : `enlarged ${e.scale}x — source too small`;
  console.log(`  ${e.source.padEnd(11)} ${why.padEnd(42)} ${e.slug.slice(0, 40)}`);
  console.log(`     ${e.url}`);
}
console.log(`\nManifest: ${path.relative(ROOT, MANIFEST)}`);
console.log("Nothing written to the database yet — review, then run with --commit.");
