/**
 * How large each product photo should be drawn, so that a shelf of them reads
 * as one range rather than a mix of giants and dwarfs.
 *
 *   node scripts/measure-photos.mjs                      # write src/data/photo-fit.json
 *   node scripts/measure-photos.mjs --dry                # report only
 *   node scripts/measure-photos.mjs --proof <file.png>   # also render a before/after sheet
 *   npm run images:fit
 *
 * The problem. Every photo is framed the same way — the product's LONGEST side
 * is scaled to 86 % of a 1000 px square (scripts/lib/reframe.mjs,
 * scripts/cutout-images.mjs). That is the right rule for never cropping, and
 * the wrong one for how big a thing looks: a 200 ml bottle, 24 % wide, and a
 * vitamin carton, 86 % wide, come out equally tall, and the carton carries three
 * and a half times the visible mass. Down a grid the bottles look lost.
 *
 * The fix is a per-photo factor `s` the card applies as padding (see
 * photoPresentation() in src/components/product/PhotoWell.tsx), measured here
 * once rather than guessed in CSS, which cannot see the alpha channel:
 *
 *   g = √(w·h)                         the product's bounding box, as a share of
 *                                      the canvas: its geometric-mean "size"
 *   s = clamp((T / g)^ALPHA, MIN, MAX) T = the g of the range's 60th percentile
 *
 * ALPHA < 1 is deliberate. Full equalisation would shrink every carton to
 * bottle size; three quarters of the way keeps a bottle recognisably a bottle
 * and a carton a carton while closing most of the gap. The pivot sits above the
 * median so that more of the range grows than shrinks: a card full of cartons
 * should not look emptier than it did. MAX is bounded by geometry, not taste:
 * the card's inset is 7 % a side, so 1/(1 − 2·0.07) ≈ 1.163 already takes the
 * padding to zero, and the photo's own 7 % margin is then all that is left.
 * The padding approach means a photo can never be cropped or distorted,
 * whatever this file says — photoPresentation() floors the padding at zero, so
 * the worst a bad factor can do is draw a product too small.
 *
 * The numbers were chosen off the --proof sheet (2026-09-23): 0.6 / 0.84–1.12
 * around the median left the 200 ml bottles visibly smaller than the cartons
 * beside them; these draw them the full height of the well.
 *
 * Only photos that need a factor are written (|s − 1| ≥ 0.02), keyed by file
 * name without extension, which is also what thumbnailFor() keeps. Picture
 * photos (`-scene.webp`) are drawn edge to edge and never get one.
 *
 * Measured on the 560 px thumbnails (public/products/thumb/), which every
 * source has (tests/thumbnails.test.ts); at 560 px a bounding box is accurate to
 * 0.2 %, and it is a fifth of the pixels.
 *
 * Re-run after any batch of new or recut photos; a photo with no entry is drawn
 * at 1, which is exactly how it was drawn before this existed.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { dataPath, readJson, ROOT } from "./lib/db.mjs";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const proofAt = argv.indexOf("--proof");
const PROOF = proofAt >= 0 ? argv[proofAt + 1] : null;

/** A tuning flag's value, for trying numbers against --proof without editing. */
const flag = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? Number(argv[at + 1]) : fallback;
};

/** How far towards equal size (0 = untouched, 1 = equal geometric mean). */
const ALPHA = flag("alpha", 0.75);
/** Never shrink a photo below this share of its current size. */
const MIN = flag("min", 0.86);
/** Never enlarge past this — see the geometry note above. */
const MAX = flag("max", 1.16);
/** Which percentile of the range is left exactly as it is (0.5 = the median). */
const PIVOT = flag("pivot", 0.6);

/** Alpha at or below this is halo, not product. */
const ALPHA_FLOOR = 24;
/** min(r,g,b) at or above this is background on an opaque photo (reframe.mjs). */
const WHITE_MIN = 240;

const THUMB_DIR = path.join(ROOT, "public/products/thumb");
const OUT = dataPath("photo-fit.json");

const isScene = (p) => /-scene\.webp$/i.test(p);
const isCutOut = (p) => /-cutout(-v\d+)?\.webp$/i.test(p);
/** The key the site looks a photo up by: file name, no directory, no extension. */
const fitKey = (src) => path.posix.basename(src).replace(/\.(webp|png|jpe?g)$/i, "");

/**
 * The product's bounding box as a share of the canvas.
 *
 * One byte per pixel — the alpha channel of a cut-out, or an ink mask of an
 * opaque photo — and each row is walked in from both ends only as far as its
 * first inked pixel.
 */
async function measure(file, cutOut) {
  let ink, W, H;
  if (cutOut) {
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer({ resolveWithObject: true });
    ink = data;
    ({ width: W, height: H } = info);
  } else {
    const { data, info } = await sharp(file)
      .flatten({ background: "#ffffff" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    ({ width: W, height: H } = info);
    ink = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const min = Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
      ink[i] = min < WHITE_MIN ? 255 : 0;
    }
  }
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    const row = y * W;
    let first = -1;
    for (let x = 0; x < W; x++) {
      if (ink[row + x] > ALPHA_FLOOR) {
        first = x;
        break;
      }
    }
    if (first < 0) continue;
    if (y < y0) y0 = y;
    y1 = y;
    if (first < x0) x0 = first;
    for (let x = W - 1; x >= first; x--) {
      if (ink[row + x] > ALPHA_FLOOR) {
        if (x > x1) x1 = x;
        break;
      }
    }
  }
  if (x1 < 0) return null;
  // object-contain scales the canvas's longer side to the box, so that is the
  // unit the shares are taken in.
  const unit = Math.max(W, H);
  return { w: (x1 - x0 + 1) / unit, h: (y1 - y0 + 1) / unit };
}

function fitFor({ w, h }, target) {
  const g = Math.sqrt(w * h);
  const s = Math.pow(target / g, ALPHA);
  return Math.min(MAX, Math.max(MIN, s));
}

const products = readJson(dataPath("products.json"));
const sources = [...new Set(products.flatMap((p) => p.images ?? []))].filter(
  (src) => src.startsWith("/products/") && !src.slice(10).includes("/") && !isScene(src)
);

const measured = [];
let missing = 0;
// Eight at a time: decoding is what costs, and sharp decodes off the main thread.
const queue = [...sources];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let src = queue.shift(); src; src = queue.shift()) {
      const thumb = path.join(THUMB_DIR, `${fitKey(src)}.webp`);
      if (!existsSync(thumb)) {
        missing++;
        continue;
      }
      const box = await measure(thumb, isCutOut(src));
      if (box) measured.push({ src, key: fitKey(src), ...box });
    }
  })
);

const gs = measured.map((m) => Math.sqrt(m.w * m.h)).sort((a, b) => a - b);
const target = gs[Math.min(gs.length - 1, Math.floor(gs.length * PIVOT))];

const fit = {};
const histogram = new Map();
for (const m of measured) {
  const s = Math.round(fitFor(m, target) * 100) / 100;
  m.s = s;
  const bucket = s.toFixed(2);
  histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
  if (Math.abs(s - 1) >= 0.02) fit[m.key] = s;
}

console.log(`photos measured: ${measured.length} (${missing} without a thumbnail, scenes skipped)`);
console.log(`median size g:   ${target.toFixed(3)} of the canvas`);
console.log(`with a factor:   ${Object.keys(fit).length}`);
console.log(
  "factors:        ",
  [...histogram.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .filter((_, i, all) => i % Math.ceil(all.length / 12) === 0 || i === all.length - 1)
    .map(([k, n]) => `${k}×${n}`)
    .join("  ")
);

if (!DRY) {
  const sorted = Object.fromEntries(Object.entries(fit).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify(sorted, null, 0).replace(/,"/g, ',\n"') + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

if (PROOF) await renderProof(PROOF, measured);

/* ------------------------------------------------------------------ proof */

/**
 * A before/after sheet: the same products as a card draws them today (warm
 * ground, the old two-part shadow, every photo at the same inset) and as they
 * are drawn with the neutral ground, the tight shadow and this file's factors.
 * Rendered rather than screenshotted because the browser pane cannot always
 * paint a listing page, and because a sheet puts twenty-four cards side by side.
 */
async function renderProof(out, all) {
  const CELL = 240; // a card's image well, in CSS pixels at 1x
  const INSET = 0.07; // p-5 on a 280 px card
  const COLS = 8;
  const pick = [
    "7732", "7733", "7740", "7752", "7754", "7761", "7780", "9408",
    "7159", "4108", "1049", "5052", "0002", "0018", "0012", "0300",
    "1501", "3208", "2024", "7207", "8840", "2090", "3060", "7815",
  ];
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const byKey = new Map(all.map((m) => [m.key, m]));
  const cells = [];
  for (const sku of pick) {
    const p = bySku.get(sku);
    const src = p?.images?.[0];
    if (!src || isScene(src)) continue;
    cells.push({ sku, src, m: byKey.get(fitKey(src)) ?? { s: 1 } });
  }

  async function card(src, { s, before }) {
    const thumb = path.join(THUMB_DIR, `${fitKey(src)}.webp`);
    const pad = before ? INSET : Math.max(0, (1 - s * (1 - 2 * INSET)) / 2);
    const box = Math.round(CELL * (1 - 2 * pad));
    const photo = await sharp(thumb).resize(box, box, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    const left = Math.round((CELL - box) / 2);
    // CSS drop-shadow(x y r colour) is a Gaussian of σ = r/2 over the alpha.
    const shadows = before
      ? [
          { dy: 14, r: 24, rgb: [45, 40, 30], a: 0.1 },
          { dy: 3, r: 5, rgb: [45, 40, 30], a: 0.22 },
        ]
      : [
          { dy: 1, r: 2, rgb: [16, 24, 40], a: 0.16 },
          { dy: 3, r: 6, rgb: [16, 24, 40], a: 0.07 },
        ];
    // Composed on a canvas with a margin all round, so a shadow may spill past
    // the photo's box, then cut back to the well — which is what the card's
    // overflow-hidden does.
    const M = 40;
    const layers = [];
    if (isCutOut(src)) {
      const alpha = await sharp(photo).extractChannel(3).toBuffer();
      for (const sh of shadows) {
        const blurred = await sharp(alpha)
          .extend({ top: M, bottom: M, left: M, right: M, background: { r: 0, g: 0, b: 0 } })
          .blur(Math.max(0.3, sh.r / 2))
          .extractChannel(0)
          .raw()
          .toBuffer({ resolveWithObject: true });
        const { width, height } = blurred.info;
        const rgba = Buffer.alloc(width * height * 4);
        for (let i = 0; i < width * height; i++) {
          rgba[i * 4] = sh.rgb[0];
          rgba[i * 4 + 1] = sh.rgb[1];
          rgba[i * 4 + 2] = sh.rgb[2];
          rgba[i * 4 + 3] = Math.round(blurred.data[i] * sh.a);
        }
        layers.push({
          input: await sharp(rgba, { raw: { width, height, channels: 4 } }).png().toBuffer(),
          left: left,
          top: left + sh.dy,
        });
      }
    }
    layers.push({ input: photo, left: left + M, top: left + M });
    const size = CELL + 2 * M;
    const ground = before
      ? `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f7f5f0"/></linearGradient></defs><rect x="${M}" y="${M}" width="${CELL}" height="${CELL}" fill="url(#g)"/>`
      : `<rect x="${M}" y="${M}" width="${CELL}" height="${CELL}" fill="#ffffff"/>`;
    const composed = await sharp(
      Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${ground}</svg>`)
    )
      .composite(layers)
      .png()
      .toBuffer();
    return sharp(composed).extract({ left: M, top: M, width: CELL, height: CELL }).png().toBuffer();
  }

  const GAP = 12;
  const rows = Math.ceil(cells.length / COLS);
  const width = COLS * CELL + (COLS + 1) * GAP;
  const height = rows * 2 * CELL + (rows * 2 + 1) * GAP + rows * 8;
  const comps = [];
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = GAP + col * (CELL + GAP);
    const yBefore = GAP + row * (2 * CELL + 2 * GAP + 8);
    comps.push({ input: await card(c.src, { s: 1, before: true }), left: x, top: yBefore });
    comps.push({ input: await card(c.src, { s: c.m.s ?? 1, before: false }), left: x, top: yBefore + CELL + GAP });
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="18"><text x="4" y="13" font-family="Arial" font-size="12" fill="#606062">${c.sku} · s=${(c.m.s ?? 1).toFixed(2)}</text></svg>`
    );
    comps.push({ input: label, left: x, top: yBefore + CELL - 18 });
  }
  const page = sharp({ create: { width, height, channels: 3, background: "#f7f8fa" } }).composite(comps);
  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.png().toFile(out);
  console.log(`proof: ${out} (top row of each pair: as drawn before; bottom: with the factors)`);
}
