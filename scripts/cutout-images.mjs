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
/**
 * Redo a cut that was already made, from the original photo beside it.
 *
 * Without this the script is a one-way door: once a product points at its
 * `-cutout`, it is skipped for ever, so an improvement to the fill can never
 * reach the photos that needed it. Trodon 1734 was cut, ruined, and then
 * unreachable. Implies --force, since the output file already exists.
 */
const RECUT = argv.includes("--recut");

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
 * How much of the product the layer passes are allowed to take.
 *
 * They exist to peel a *backdrop*, and a backdrop is gone once it is gone. When
 * the product's own face is a single flat pale colour — a plain pharmaceutical
 * carton — that face rings the product exactly as convincingly as a backdrop
 * does, the 0.75 flatness guard below cannot tell them apart, and the fill walks
 * straight through the box. Trodon 1734 lost four fifths of itself that way and
 * still passed both tests above: its print reached the edges, so the bounding
 * box stayed full width, and what survived cleared the 6% ink bar.
 *
 * Nothing that is merely finishing off a backdrop also removes most of what the
 * white pass left standing. So a run of layer passes that does is given back.
 *
 * Reviewed over the whole range: 69 photos repaired, three made worse. Those
 * three had a backdrop large enough to trip the ratio while the product itself
 * was never in danger, so the undo handed them a slab they were better without:
 *
 *   3039 Winx paste      a magenta backdrop
 *   9032 Pantenol        an off-white one
 *   2111 Bio Hanfol      an off-white one behind a black bottle
 *
 * They are checked in as their pre-recut files. A future --recut will regress
 * them again; compare against HEAD and keep the old three rather than assuming
 * every changed photo improved.
 */
const MIN_LAYER_KEEP = 0.7;

/**
 * Photos the undo rescues from the fill and hands a studio backdrop instead.
 *
 * Where the layer passes were peeling a real coloured backdrop rather than
 * eating the product, giving them back leaves that backdrop sitting behind the
 * product as a slab. Two automatic tests were tried and neither separates these
 * from the honest rescues, and the reasons are worth keeping so nobody spends
 * the afternoon again:
 *
 *   - `backdropLeft` fires on every undone photo, Trodon 1734 included: on a
 *     plain carton the carton's own face *is* the dominant colour ringing the
 *     product. Rejecting on it would undo the repair this was all built for.
 *   - "the slab fills all four edges of the bounding box" does not separate
 *     them either — the oxygen mask 0422, which has an obvious slab, measures
 *     the same 2% as Trodon, because the slab sits inside the box, not on it.
 *
 * So this is eyes, not arithmetic: rendered on the tinted card and looked at.
 * They keep their original photo, and PhotoWell puts an uncut photo on plain
 * white, where its white rectangle is invisible.
 */
const KEEP_FLAT = new Set([
  // A backdrop slab survives the undo.
  "2037", "5506", "7289C", "7782", "8356",
  "9652", "9653", "9655", "9664", "9745",

  // Photographs of a scene rather than a packshot: a model wearing the product,
  // a hand pouring water onto a mattress, a bottle staged among leaves. The
  // neutrality rule keeps the fill out of anything coloured, but a scene also
  // has neutral parts — white clothing, a pale stone plinth, bed linen — and it
  // walks in through those and leaves the rest in pieces. There is nothing to
  // cut out here in the first place: the whole frame is the picture.
  "1591", "2316", "2317", "3063", "8523", "8620",

  // Pale product on a pale ground, where removing the ground takes the product
  // with it: a white toilet-seat riser, a sterile gauze pouch, a clear infusion
  // bottle, glass ampoules, a white-on-white carton.
  "1164", "5287", "6241", "8832", "9065",
]);


/**
 * How far one step of the backdrop may drift from the pixel it came from.
 *
 * `fillFrom` below measures every pixel against one seed colour, which is right
 * for the flat white migrate-images.mjs painted on but wrong for what is inside
 * it. Most packshots were taken on a lit studio backdrop: light at the top,
 * shadowed at the bottom, drifting a long way from any one seed. The seeded
 * fill eats the part within tolerance and stops dead at the rest, which is the
 * ragged white "drip" along the bottom of the Belupo, Iruzid and Labello cards
 * and the pale slab behind hundreds of others.
 *
 * Comparing each pixel to its own neighbour follows that ramp the whole way,
 * because a gradient is smooth everywhere even when its ends are far apart. A
 * product edge is a step rather than a ramp, so it still stops the fill.
 *
 * 6 measured against the range: at 10 the fill starts crossing the softer
 * product edges (the Pantenol carton and the Labello blister both come apart),
 * at 6 every slab tested went and every product survived.
 */
const RAMP = 6;

/**
 * How much colour a pixel may carry and still be treated as backdrop.
 *
 * The ramp alone is not enough. A lifestyle photograph — the Dulcolax woman on
 * a lawn, the Krauterhof balsam in a styled scene — is also smooth everywhere,
 * so the fill walks out of the white margin, along the floor and straight into
 * the model. Brightness cannot stop it: measured on the range, a studio
 * backdrop *darkens* as it falls into shadow, from 236,231,235 at the top of
 * the Panklav card to 151,164,180 at the bottom, and refusing to follow that is
 * refusing the whole repair.
 *
 * What separates them is colour. A backdrop is neutral, however dark it gets —
 * the channel spread runs 0 to 29 across every slab measured (Labello 5,
 * Iruzid 4, Panklav 5–29, the teal Rosix card 28). A photographed scene is not:
 * the Dulcolax lawn is 87 and the skin on it 85. 38 sits in the gap.
 */
const NEUTRAL_MAX = 38;

/**
 * How dark the ramp may follow a backdrop before it stops.
 *
 * Neutrality alone lets the fill walk down a drop shadow, because a shadow is
 * smooth, grey and therefore perfectly neutral all the way to the object
 * casting it — which is how the black chamomile tin (9468) lost its lid. A
 * backdrop is lit; it does not go darker than mid-grey. The darkest one
 * measured on the range is the shadowed foot of the Panklav card at 151, so
 * 130 leaves that intact while cutting the path into anything genuinely dark.
 */
const DARKEST = 130;

/**
 * Neighbour-relative flood fill from the border. Clears a backdrop however far
 * it drifts, as long as it drifts smoothly and stays neutral.
 */
function rampFill(buf, width, height) {
  const n = width * height;
  const seen = new Uint8Array(n);
  const stack = [];
  const neutral = (i) => {
    const r = buf[i * 4], g = buf[i * 4 + 1], b = buf[i * 4 + 2];
    const hi = Math.max(r, g, b);
    return hi - Math.min(r, g, b) <= NEUTRAL_MAX && hi >= DARKEST;
  };
  const near = (i, j) =>
    neutral(i) &&
    Math.abs(buf[i * 4] - buf[j * 4]) <= RAMP &&
    Math.abs(buf[i * 4 + 1] - buf[j * 4 + 1]) <= RAMP &&
    Math.abs(buf[i * 4 + 2] - buf[j * 4 + 2]) <= RAMP;

  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  for (const i of stack) seen[i] = 1;

  let cleared = 0;
  while (stack.length) {
    const i = stack.pop();
    // Read the colour before clearing: alpha 0 is the marker the neighbours
    // test against, and the RGB underneath stays put for the comparison.
    const x = i % width;
    const y = (i / width) | 0;
    const push = (j) => {
      if (seen[j] || buf[j * 4 + 3] === 0 || !near(j, i)) return;
      seen[j] = 1;
      stack.push(j);
    };
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (y > 0) push(i - width);
    if (y < height - 1) push(i + width);
    buf[i * 4 + 3] = 0;
    cleared++;
  }
  return cleared;
}

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

  // The conservative pass, run first on a copy. It is wanted for two decisions
  // and not usually for its result: it is the fallback when the ramp fill
  // overreaches, and the yardstick for whether a backdrop slab was removed at
  // all — which is what lets a product be legitimately smaller than the 86%
  // frame migrate-images.mjs guaranteed.
  const white = Buffer.from(buf);
  const clearedWhite = fillFrom(white, width, height, [255, 255, 255], 255 - WHITE_MIN);
  const inkWhite = countInk(white, n);

  let cleared = rampFill(buf, width, height);
  // Following the ramp into the product leaves nothing behind; where it does,
  // the photo is no worse off than it was before any of this.
  if (countInk(buf, n) < n * MIN_INK) {
    buf.set(white);
    cleared = clearedWhite;
  }

  // A photo framed at 86% whose product now spans far less has had a slab taken
  // off it, and MIN_SPAN must not then be read as damage.
  const slabRemoved = countInk(buf, n) < inkWhite * 0.9;

  // What the product looks like with only the backdrop gone. The layer passes
  // are measured against this and can be handed it back.
  const afterWhite = new Uint8Array(n);
  for (let i = 0; i < n; i++) afterWhite[i] = buf[i * 4 + 3];
  const inkAfterWhite = countInk(buf, n);

  const layers = [];
  let gainedByLayers = 0;
  for (let pass = 0; pass < 3; pass++) {
    const frontier = frontierColour(buf, width, height);
    // A product's own outline is not one flat colour all the way round; a
    // backdrop is. 0.75 is what separates the two on this catalogue.
    if (!frontier || frontier.share < 0.75) break;
    const gained = fillFrom(buf, width, height, frontier.colour, 26);
    if (gained < n * 0.005) break;
    gainedByLayers += gained;
    layers.push(`rgb(${frontier.colour.join(",")})`);
  }

  // See MIN_LAYER_KEEP: a pale carton reads as a backdrop to the guard above, so
  // the only way to catch it is by what it cost.
  //
  // Judged on what the undo produces, never on the layered result it discards.
  // Gating it the other way round — "only rescue photos whose damaged version
  // still looked plausible" — rejected seventeen photos whose *undone* version
  // is perfectly good, among them the silicone catheters and the 22g cannula,
  // because their layered version was destroyed badly enough to fail the net.
  // That is the wrong question: a photo should not be thrown away for the state
  // of a buffer nobody will ever see. The safety net at the call site then
  // judges the result, which is the only thing that ships.
  let layersUndone = false;
  if (layers.length && countInk(buf, n) < inkAfterWhite * MIN_LAYER_KEEP) {
    for (let i = 0; i < n; i++) buf[i * 4 + 3] = afterWhite[i];
    layers.length = 0;
    gainedByLayers = 0;
    layersUndone = true;
  }
  cleared += gainedByLayers;

  // Whatever still rings the product after three passes. A flat colour here is
  // a backdrop the fill could not reach — worth a human look, but not a reason
  // to throw the photo away.
  const left = frontierColour(buf, width, height);
  const backdropLeft = left && left.share >= 0.75 ? `rgb(${left.colour.join(",")})` : null;

  return {
    clearedPct: (cleared / n) * 100,
    layers,
    layersUndone,
    slabRemoved,
    backdropLeft,
    ...measure(buf, width, height),
  };
}

/** Opaque pixels. Shares the >8 threshold with measure(). */
function countInk(buf, n) {
  let ink = 0;
  for (let i = 0; i < n; i++) if (buf[i * 4 + 3] > 8) ink++;
  return ink;
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
/**
 * An article code as a key both sides can agree on.
 *
 * The two projects punctuate the same code differently — Jara files it as
 * "2004 B" where the database holds "2004b", and "8803 , 8804" against
 * "8803, 8804". The old index also demanded `\d{3,5}[A-Za-z]?`, which no code
 * carrying a comma could satisfy, so every multi-code product was invisible to
 * it. Five photos were being flood-filled while a hand-cut original with a real
 * alpha channel sat unused next door, one of them the Krauterhof balsam whose
 * styled scene the fill takes apart.
 */
const skuKey = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "");

function jaraIndex() {
  if (!existsSync(JARA)) return new Map();
  const byCode = new Map();
  for (const f of readdirSync(JARA)) {
    if (!f.startsWith("shemo-")) continue;
    // Everything up to the next hyphen: codes hold digits, letters, commas and
    // spaces, but never a hyphen, which is what separates code from name.
    const code = /^shemo-([^-]+)-/.exec(f)?.[1];
    if (code && !byCode.has(skuKey(code))) byCode.set(skuKey(code), f);
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
  let current = p.images[0];
  let stem = path.basename(current, path.extname(current));
  if (stem.endsWith("-cutout")) {
    if (!RECUT) {
      skipped.push({ ...p, why: "already a cut-out" });
      continue;
    }
    // Back to the photo this cut came from, so the fill starts from the pixels
    // migrate-images.mjs wrote rather than from its own last answer.
    stem = stem.slice(0, -"-cutout".length);
    current = `/products/${stem}.webp`;
    if (!existsSync(path.join(OUT, `${stem}.webp`))) {
      skipped.push({ sku: p.sku, name: p.name, why: `no original beside ${p.images[0]}` });
      continue;
    }
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
  if (!FORCE && !RECUT && existsSync(outPathEarly)) {
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

  const jaraFile = jara.get(skuKey(p.sku));
  let origin;
  let clearedPct = null;
  let layers = [];
  let layersUndone = false;
  let slabRemoved = false;
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
    ({ clearedPct, layers, layersUndone, slabRemoved, backdropLeft, span, ink } = floodFillBackground(
      buf,
      meta.width,
      meta.height
    ));

    // The safety net. A photo that failed it keeps the white background it has.
    // KEEP_FLAT is the reviewed half of the same decision, for the slabs no
    // measurement separates from an honest rescue.
    // MIN_SPAN only means damage while the frame is still the whole photo. Once
    // a slab has come off, the product is the frame, and it is smaller than 86%
    // for the right reason — a 15g tube of Belogent shot on a lit backdrop is
    // a quarter of the canvas once that backdrop is gone. MIN_INK is what
    // separates a real product from wreckage anyway: measured over the range,
    // destroyed photos land at 0–3% and good ones at 8–69%.
    const flat = KEEP_FLAT.has(String(p.sku ?? "").trim());
    if ((span < MIN_SPAN && !slabRemoved) || ink < MIN_INK || flat) {
      rejected.push({
        sku: p.sku,
        name: p.name,
        kept: current,
        spanPct: span * 100,
        inkPct: ink * 100,
        why: flat ? "reviewed: backdrop slab survives the undo" : "too little left",
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
    layersUndone,
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
