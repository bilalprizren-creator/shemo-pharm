/**
 * Give every product photo a transparent background.
 *
 *   node scripts/cutout-images.mjs                 # writes images + report, no DB
 *   node scripts/cutout-images.mjs --limit 40      # a sample, for eyeballing
 *   node scripts/cutout-images.mjs --write         # also updates the DB and products.json
 *   DATABASE_TARGET=production node scripts/cutout-images.mjs --write
 *
 * Why this is needed: scripts/migrate-images.mjs deliberately did
 * `.flatten({ background: "#ffffff" })`, so all 2 049 photos in public/products
 * are opaque 1000x1000 squares with a hard white background. On the white
 * product cards that is invisible; on any tinted surface — which the catalogue
 * site uses — each photo reads as a white box.
 *
 * Two sources, in order of trust:
 *
 *   1. The Jara Pharmacy project still holds 1 484 of these products as
 *      `shemo-<code>-*-original.png` WITH their original alpha channel — the
 *      background-removed files the old catalogue used. Where one exists, its
 *      alpha is authoritative and nothing is guessed.
 *
 *   2. Otherwise the white background is flood-filled from the border. Flood
 *      fill rather than "every white pixel becomes transparent": the latter
 *      eats the white of a white box, a gauze pad or a label, which is most of
 *      a pharmacy range. Reliable here because migrate-images.mjs already
 *      normalised off-white to pure white and centred every product at 86% of
 *      the canvas, so the border is uniformly 255 and no product touches it.
 *
 * New filenames rather than overwriting: next/image caches its variants for a
 * month keyed by the source URL (see minimumCacheTTL in next.config.ts), so a
 * photo replaced in place keeps serving the flattened version. `-cutout` in the
 * name is what makes the change visible to that cache.
 *
 * `blur_data_url` is left alone on purpose — it is written by migrate-images.mjs
 * and read by nothing in src/.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { connect, describeTarget, ROOT, dataPath } from "./lib/db.mjs";

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const PRUNE = argv.includes("--prune");
const limitAt = argv.indexOf("--limit");
const LIMIT = limitAt !== -1 ? Number(argv[limitAt + 1]) : Infinity;
const FORCE = argv.includes("--force");

const JARA = "C:/calude code/Jara pharmcay/public/products";
const OUT = path.join(ROOT, "public/products");

// Same constants migrate-images.mjs framed the originals with, so a re-cut
// photo lands in exactly the same place in the grid as the one it replaces.
const CANVAS = 1000;
const FILL = 0.86;
const WHITE_MIN = 240;
const QUALITY = 82;

/**
 * The safety net, and the reason this script can be trusted to run unattended.
 *
 * A white product on white — a surgical cap, an orthopaedic pillow, a syringe,
 * compression stockings — is indistinguishable from its background, and the
 * flood fill eats it, leaving a few coloured fragments floating in nothing.
 * Measured over the range, the two populations do not overlap at all:
 *
 *   destroyed  span 0-81%   ink 0.0-3.0%
 *   good       span 86%     ink 8.2-68.6%
 *
 * `span` works because migrate-images.mjs framed every product at exactly 86%
 * of the canvas, so anything narrower means the fill ate into the edges.
 * A photo failing either test keeps its original white background: a white box
 * on a tinted card is a blemish, a vanished product is a broken listing.
 */
const MIN_SPAN = 0.8; // opaque bounding box, as a share of the canvas
const MIN_INK = 0.06; // opaque pixels, as a share of the canvas

/**
 * One flood fill from the current transparent edge, clearing pixels within
 * `tolerance` of `colour`. Border-connected only, so interior white — inside a
 * box, a gauze pad, a label — is never reached.
 */
function fillFrom(buf, width, height, colour, tolerance) {
  const n = width * height;
  const seen = new Uint8Array(n);
  const matches = (i) =>
    buf[i * 4 + 3] !== 0 &&
    Math.abs(buf[i * 4] - colour[0]) <= tolerance &&
    Math.abs(buf[i * 4 + 1] - colour[1]) <= tolerance &&
    Math.abs(buf[i * 4 + 2] - colour[2]) <= tolerance;

  // Seed from the canvas border, plus every opaque pixel that already touches
  // transparency — that is the frontier a previous pass left behind.
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  for (let i = 0; i < n; i++) {
    if (buf[i * 4 + 3] !== 0) continue;
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < width - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - width);
    if (y < height - 1) stack.push(i + width);
  }

  let cleared = 0;
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !matches(i)) continue;
    seen[i] = 1;
    buf[i * 4 + 3] = 0;
    cleared++;
    const x = i % width;
    const y = (i / width) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < width - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - width);
    if (y < height - 1) stack.push(i + width);
  }
  return cleared;
}

/**
 * The colour that dominates the frontier between transparent and opaque, and
 * what share of the frontier it holds.
 *
 * This is what makes the second pass safe. A photo that was shot on grey rather
 * than white arrives here as a grey rectangle centred on white by
 * migrate-images.mjs, which read the grey as product: pass one removes the white
 * and stops dead at the rectangle's edge. If nearly the whole frontier is then
 * one flat colour, that colour is another layer of backdrop rather than the
 * product — a real product does not present a single flat colour around its
 * entire outline.
 */
function frontierColour(buf, width, height) {
  const n = width * height;
  const counts = new Map();
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (buf[i * 4 + 3] === 0) continue;
    const x = i % width;
    const y = (i / width) | 0;
    const touchesGap =
      (x > 0 && buf[(i - 1) * 4 + 3] === 0) ||
      (x < width - 1 && buf[(i + 1) * 4 + 3] === 0) ||
      (y > 0 && buf[(i - width) * 4 + 3] === 0) ||
      (y < height - 1 && buf[(i + width) * 4 + 3] === 0);
    if (!touchesGap) continue;
    total++;
    // Quantised to 8 levels per channel, so noise in a flat backdrop still
    // lands in one bucket.
    const key =
      ((buf[i * 4] >> 5) << 10) | ((buf[i * 4 + 1] >> 5) << 5) | (buf[i * 4 + 2] >> 5);
    const seenSoFar = counts.get(key);
    if (seenSoFar) {
      seenSoFar.n++;
      seenSoFar.r += buf[i * 4];
      seenSoFar.g += buf[i * 4 + 1];
      seenSoFar.b += buf[i * 4 + 2];
    } else {
      counts.set(key, { n: 1, r: buf[i * 4], g: buf[i * 4 + 1], b: buf[i * 4 + 2] });
    }
  }
  if (!total) return null;
  let best = null;
  for (const v of counts.values()) if (!best || v.n > best.n) best = v;
  return {
    colour: [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)],
    share: best.n / total,
  };
}

/**
 * Peel backdrop layers off the border until what is left is the product.
 *
 * Pass one always targets white, because that is what migrate-images.mjs put
 * there. Later passes target whatever flat colour still rings the product, and
 * stop as soon as the frontier stops being flat.
 */
function floodFillBackground(buf, width, height) {
  const n = width * height;
  let cleared = fillFrom(buf, width, height, [255, 255, 255], 255 - WHITE_MIN);

  const layers = [];
  for (let pass = 0; pass < 3; pass++) {
    const frontier = frontierColour(buf, width, height);
    // A product's own outline is not one flat colour all the way round; a
    // backdrop is. 0.75 is what separates the two on this catalogue.
    if (!frontier || frontier.share < 0.75) break;
    const gained = fillFrom(buf, width, height, frontier.colour, 26);
    if (gained < n * 0.005) break;
    cleared += gained;
    layers.push(`rgb(${frontier.colour.join(",")})`);
  }

  // Whatever still rings the product after three passes. A flat colour here is
  // a backdrop the fill could not reach — worth a human look, but not a reason
  // to throw the photo away.
  const left = frontierColour(buf, width, height);
  const backdropLeft = left && left.share >= 0.75 ? `rgb(${left.colour.join(",")})` : null;

  return { clearedPct: (cleared / n) * 100, layers, backdropLeft, ...measure(buf, width, height) };
}

/** Opaque bounding box and opaque area, both as a share of the canvas. */
function measure(buf, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let ink = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (buf[(y * width + x) * 4 + 3] <= 8) continue;
      ink++;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const span = maxX < 0 ? 0 : Math.max(maxX - minX + 1, maxY - minY + 1) / width;
  return { span, ink: ink / (width * height) };
}

/** Crop to what is actually opaque, then centre it on a transparent square. */
async function reframeTransparent(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const w = info.width;
  const h = info.height;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Alpha above a whisker counts as product; feathered edges do not drag
      // the bounding box out to the full canvas.
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const blank = maxX < 0;
  const cropW = blank ? w : maxX - minX + 1;
  const cropH = blank ? h : maxY - minY + 1;
  const scale = (CANVAS * FILL) / Math.max(cropW, cropH);

  const mark = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({
      left: blank ? 0 : minX,
      top: blank ? 0 : minY,
      width: cropW,
      height: cropH,
    })
    .resize({
      width: Math.max(1, Math.round(cropW * scale)),
      height: Math.max(1, Math.round(cropH * scale)),
      fit: "fill",
      kernel: "lanczos3",
    })
    // Lossless intermediate: a pipeline fed raw pixels also returns raw ones,
    // which composite() cannot read without being told their dimensions.
    .png()
    .toBuffer();

  return { mark, blank };
}

/** Jara's cut-outs, indexed by the product code in the filename. */
function jaraIndex() {
  if (!existsSync(JARA)) return new Map();
  const byCode = new Map();
  for (const f of readdirSync(JARA)) {
    if (!f.startsWith("shemo-")) continue;
    const code = /^shemo-(\d{3,5}[A-Za-z]?)-/.exec(f)?.[1];
    if (code && !byCode.has(code.toLowerCase())) byCode.set(code.toLowerCase(), f);
  }
  return byCode;
}

const sqlEarly = PRUNE ? connect() : null;

/**
 * Delete the flattened originals the database no longer points at.
 *
 * Everything still referenced is kept, which is what protects the 35 photos
 * whose cut-out was rejected and the 24 whose file was missing to begin with —
 * they are still on their original path and deleting those would blank the
 * product. Run only after --write, and only once the site has been looked at.
 */
if (PRUNE) {
  const rows = await sqlEarly`SELECT images, image_override FROM products`;
  const referenced = new Set();
  for (const r of rows) {
    for (const src of Array.isArray(r.images) ? r.images : []) {
      referenced.add(path.basename(src));
    }
    if (r.image_override) referenced.add(path.basename(r.image_override));
  }

  let removed = 0;
  let freed = 0;
  for (const file of readdirSync(OUT)) {
    if (referenced.has(file)) continue;
    // Never delete something with no replacement in place.
    const replacement = `${path.basename(file, path.extname(file))}-cutout.webp`;
    if (!referenced.has(replacement)) {
      console.log(`  kept (no cut-out references it): ${file}`);
      continue;
    }
    freed += statSync(path.join(OUT, file)).size;
    unlinkSync(path.join(OUT, file));
    removed++;
  }
  console.log(`\npruned ${removed} superseded photos, ${(freed / 1048576).toFixed(0)} MB freed`);
  process.exit(0);
}

const jara = jaraIndex();
console.log(`Jara cut-outs available: ${jara.size}`);
console.log(`target: ${describeTarget()}`);

const sql = connect();
const products = (await sql`
  SELECT id, sku, name, images FROM products ORDER BY id
`).filter((p) => Array.isArray(p.images) && p.images.length > 0);

const done = [];
const skipped = [];
const flagged = [];
const rejected = [];

let i = 0;
for (const p of products) {
  if (i >= LIMIT) break;
  const current = p.images[0];
  const stem = path.basename(current, path.extname(current));
  if (stem.endsWith("-cutout")) {
    skipped.push({ ...p, why: "already a cut-out" });
    continue;
  }
  const source = path.join(OUT, path.basename(current));
  if (!existsSync(source)) {
    skipped.push({ sku: p.sku, name: p.name, why: `missing file ${current}` });
    continue;
  }

  // Cutting 2 000 photos takes twelve minutes, and --write should not have to
  // pay that again for work already on disk. A file that is already there is
  // reused; --force recuts everything.
  const outPathEarly = path.join(OUT, `${stem}-cutout.webp`);
  if (!FORCE && existsSync(outPathEarly)) {
    done.push({
      id: p.id,
      sku: p.sku,
      name: p.name,
      from: current,
      to: `/products/${stem}-cutout.webp`,
      origin: "reused",
      clearedPct: null,
      layers: [],
      backdropLeft: null,
    });
    i++;
    continue;
  }

  const jaraFile = jara.get(p.sku.trim().toLowerCase());
  let origin;
  let clearedPct = null;
  let layers = [];
  let backdropLeft = null;
  let mark;

  // Having an alpha channel is not the same as having a transparent
  // background: a good number of Jara's PNGs carry alpha that is opaque
  // edge to edge, because those photos were never background-removed. Trusting
  // the filename alone leaves their backdrop baked in.
  const jaraUsable =
    jaraFile && !(await sharp(path.join(JARA, jaraFile)).stats()).isOpaque;

  if (jaraUsable) {
    origin = "jara";
    ({ mark } = await reframeTransparent(path.join(JARA, jaraFile)));
  } else {
    origin = jaraFile ? "floodfill (jara opaque)" : "floodfill";
    const meta = await sharp(source).metadata();
    const buf = await sharp(source).ensureAlpha().raw().toBuffer();
    let span;
    let ink;
    ({ clearedPct, layers, backdropLeft, span, ink } = floodFillBackground(
      buf,
      meta.width,
      meta.height
    ));

    // The safety net. A photo that failed it keeps the white background it has.
    if (span < MIN_SPAN || ink < MIN_INK) {
      rejected.push({
        sku: p.sku,
        name: p.name,
        kept: current,
        spanPct: span * 100,
        inkPct: ink * 100,
      });
      continue;
    }
    // Already framed by migrate-images.mjs — re-cropping would only shift it.
    mark = await sharp(buf, {
      raw: { width: meta.width, height: meta.height, channels: 4 },
    })
      .png()
      .toBuffer();
  }

  const outName = `${stem}-cutout.webp`;
  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(path.join(OUT, outName));

  const record = {
    id: p.id,
    sku: p.sku,
    name: p.name,
    from: current,
    to: `/products/${outName}`,
    origin,
    clearedPct,
    layers,
    backdropLeft,
  };
  done.push(record);
  // Kept, but a flat colour still rings the product: a studio backdrop the fill
  // could not reach, which shows as a coloured box on a tinted card.
  if (backdropLeft) flagged.push(record);

  i++;
  if (i % 200 === 0) console.log(`  ${i}/${Math.min(products.length, LIMIT)}…`);
}

const fromJara = done.filter((d) => d.origin === "jara").length;
const reused = done.filter((d) => d.origin === "reused").length;
console.log(`\ncut out    ${done.length}`);
console.log(`  from Jara alpha   ${fromJara}`);
console.log(`  flood-filled      ${done.length - fromJara - reused}`);
console.log(`  reused on disk    ${reused}`);
console.log(`  backdrop remains  ${flagged.length}`);
console.log(`kept white ${rejected.length} (cut-out would have eaten the product)`);
console.log(`skipped    ${skipped.length}`);

/* ------------------------------------------------------------------ report */

const report = [
  `# Product cut-outs — ${new Date().toISOString().slice(0, 10)}`,
  ``,
  `Target: ${describeTarget()}`,
  `Mode:   ${WRITE ? "WRITE (database + products.json updated)" : "images only, no database"}`,
  ``,
  `| | |`,
  `|---|---|`,
  `| Photos cut out | ${done.length} |`,
  `| — from Jara's original alpha | ${fromJara} |`,
  `| — white background flood-filled | ${done.length - fromJara} |`,
  `| Kept their white background (cut-out rejected) | ${rejected.length} |`,
  `| A backdrop still shows | ${flagged.length} |`,
  `| Skipped | ${skipped.length} |`,
  ``,
  `## Kept their white background (${rejected.length})`,
  ``,
  `The cut-out was computed and thrown away: what survived was too small or too`,
  `narrow to be the product, which happens when the product is itself white —`,
  `a surgical cap, an orthopaedic pillow, compression stockings. These still`,
  `point at their original photo, so nothing is broken; they simply show a`,
  `white square on a tinted card. Re-shoot or hand-cut them to fix.`,
  ``,
  ...(rejected.length
    ? [
        `| Code | Product | Opaque box | Opaque area |`,
        `|---|---|---|---|`,
        ...rejected.map(
          (r) =>
            `| ${r.sku} | ${r.name} | ${r.spanPct.toFixed(0)}% | ${r.inkPct.toFixed(1)}% |`
        ),
      ]
    : [`None.`]),
  ``,
  `## A backdrop still shows (${flagged.length})`,
  ``,
  `Cut out, but a flat colour still rings the product: the photo was shot on a`,
  `coloured studio backdrop rather than white, and migrate-images.mjs centred`,
  `that whole rectangle on white. Usable, but the rectangle is visible on a`,
  `tinted card. See audit/cutout-contact-sheet.html.`,
  ``,
  ...(flagged.length
    ? [
        `| Code | Product | Backdrop | File |`,
        `|---|---|---|---|`,
        ...flagged.map((d) => `| ${d.sku} | ${d.name} | ${d.backdropLeft} | ${d.to} |`),
      ]
    : [`None.`]),
  ``,
  ...(skipped.length
    ? [`## Skipped (${skipped.length})`, ``, ...skipped.map((s) => `- ${s.sku ?? s.id}: ${s.why}`), ``]
    : []),
].join("\n");

writeFileSync(path.join(ROOT, "audit", "cutout-images.md"), report);

// A contact sheet on a deliberately tinted background — a cut-out that still
// carries a white box is invisible against white, which is the whole point.
const sheet = [
  `<!doctype html><meta charset="utf-8"><title>Cut-out review</title>`,
  `<style>body{background:#eef5f1;font:14px system-ui;margin:0;padding:24px}`,
  `h1{font-size:18px}h2{font-size:15px;margin-top:32px}`,
  `.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}`,
  `figure{margin:0;text-align:center}img{width:100%;aspect-ratio:1;object-fit:contain}`,
  `figcaption{font-size:11px;color:#456}</style>`,
  `<h1>Cut-out review — tinted background, so any leftover white box shows</h1>`,
  `<h2>A backdrop still shows (${flagged.length})</h2><div class="g">`,
  ...flagged.map(
    (f) =>
      `<figure><img src="../public${f.to}" loading="lazy"><figcaption>${f.sku} · ${f.backdropLeft}<br>${f.name.slice(0, 40)}</figcaption></figure>`
  ),
  `</div><h2>Kept their white background — cut-out rejected (${rejected.length})</h2><div class="g">`,
  ...rejected.map(
    (r) =>
      `<figure><img src="../public${r.kept}" loading="lazy"><figcaption>${r.sku} · ${r.inkPct.toFixed(1)}% ink<br>${r.name.slice(0, 40)}</figcaption></figure>`
  ),
  `</div><h2>First 120 of the rest</h2><div class="g">`,
  ...done
    .filter((d) => !flagged.includes(d))
    .slice(0, 120)
    .map(
      (d) =>
        `<figure><img src="../public${d.to}" loading="lazy"><figcaption>${d.sku} · ${d.origin}<br>${d.name.slice(0, 40)}</figcaption></figure>`
    ),
  `</div>`,
].join("\n");
writeFileSync(path.join(ROOT, "audit", "cutout-contact-sheet.html"), sheet);

console.log(`report     audit/cutout-images.md`);
console.log(`review     audit/cutout-contact-sheet.html`);

if (!WRITE) {
  console.log(`\n(images written; pass --write to point the database at them)`);
  process.exit(0);
}

/* ------------------------------------------------------------------- write */

await sql`
  UPDATE products AS p
  SET images = v.img::jsonb, updated_at = now()
  FROM (
    SELECT unnest(${done.map((d) => d.id)}::int[]) AS id,
           unnest(${done.map((d) => JSON.stringify([d.to]))}::text[]) AS img
  ) AS v
  WHERE p.id = v.id
`;

// products.json is what `npm run seed:db` replays, so leaving it behind would
// mean the next re-seed quietly restores every white background.
const file = dataPath("products.json");
const seed = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(done.map((d) => [d.id, d.to]));
let touched = 0;
for (const p of seed) {
  const next = byId.get(p.id);
  if (!next) continue;
  p.images = [next];
  touched++;
}
writeFileSync(file, JSON.stringify(seed, null, 1));

const [check] = await sql`
  SELECT count(*) FILTER (WHERE images::text LIKE '%-cutout.webp%')::int AS cut,
         count(*)::int AS total
  FROM products
`;
console.log(`\ndatabase: ${check.cut}/${check.total} products point at a cut-out`);
console.log(`products.json: ${touched} entries updated`);
console.log(`\nThe superseded files are still in public/products/. Delete them with:`);
console.log(`  node scripts/cutout-images.mjs --prune`);
