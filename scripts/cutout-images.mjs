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
/**
 * Recut only these codes, comma-separated.
 *
 * --recut on its own is all or nothing, and all is the wrong answer once the
 * range is in a state worth keeping: the note under MIN_LAYER_KEEP records
 * three photos a blanket recut makes worse, and there is no reason to put 2 000
 * good files through a resample to reach 90 bad ones. Implies --recut.
 */
const onlyAt = argv.indexOf("--only");
/**
 * Separated by semicolons when any of the codes contains a comma, which in this
 * catalogue they do: "4517 , 4533" is one product with two article numbers, and
 * splitting the list on commas silently turns it into two codes that match
 * nothing. Comma still works for the ordinary case, so
 * `--only 1681,9658` reads the way anyone would expect.
 */
const ONLY =
  onlyAt !== -1
    ? new Set(
        String(argv[onlyAt + 1] ?? "")
          .split(String(argv[onlyAt + 1] ?? "").includes(";") ? ";" : ",")
          .map((s) => skuKeyRaw(s))
          .filter(Boolean)
      )
    : null;
/** skuKey, but usable up here before the constants it sits among. */
function skuKeyRaw(s) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, "");
}

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
  // 8702 belongs here too, and it took a seeded fill to prove it: given its
  // backdrop colour the fill clears the grey and leaves a soft grey cloud
  // behind the model's hand, because a photographed arm on a lit ground has a
  // shadow that no flat colour describes.
  "8702",

  // Pale product on a pale ground, where removing the ground takes the product
  // with it: a white toilet-seat riser, a sterile gauze pouch, a clear infusion
  // bottle, glass ampoules, a white-on-white carton.
  "1164", "5287", "6241", "8832", "9065",

  /**
   * White cartons the fill went through rather than around.
   *
   * The same failure as the group above, but it took the coherence measure to
   * find them: each one passes both safety tests, because the printing on the
   * face survives and reaches the edges of the box, so the bounding box stays
   * full width and the ink left over clears 6%. What is actually left is the
   * ink alone — Diclofenac 1075 comes back as 38 fragments holding 17% between
   * the largest of them, which is the green swoosh and the lettering floating
   * in nothing where a white box used to be.
   *
   * On white that is invisible and always was, which is why it survived this
   * long. On the ground the site now uses, the box does not read as white — it
   * reads as a hole with text on it. Their original photo is the better answer
   * and PhotoWell puts an uncut photo on plain white.
   *
   * Found by measurement, kept by hand: this is the list the "came apart"
   * section of the report produced, checked against the contact sheet.
   */
  "1075", "1597", "1722", "1746", "1753", "1764", "2112", "2113",
  "7621", "7625", "7800", "8417", "8710", "9031", "9658", "9744",
  "9804", "9808", "9823", "9970", "91003",
]);


/**
 * Photos that are a picture, not a product — and the cut-out was never the
 * right idea for them.
 *
 * These arrive with a background of their own: a model wearing the support, a
 * bottle on marble, a jar on a coloured studio sweep, a tube on a branded
 * pattern, a sun cream on a beach. `migrate-images.mjs` centred each one at 86%
 * on white and the fill then took the white margin off, so what ships is a
 * hard-edged rectangle — and the ground and the drop shadow, which exist to
 * seat a cut-out product, instead frame it like a photo pasted onto the card.
 *
 * 214 cut-outs measure as a solid rectangle, and **the measurement is not the
 * answer**, for the same reason it never is here: a flat carton photographed
 * straight on is also a solid rectangle, and Always, Pampers, Dolphi, Tanflex
 * and a hundred others are exactly that. Those look right as they are. The
 * separation is what the rectangle contains, which no number available here
 * describes, so this is the reviewed half: read off the contact sheets, kept
 * deliberately conservative. Full-bleeding a real carton is a worse mistake
 * than leaving a photo padded, so a doubtful one is left out.
 *
 * They are written as `-scene.webp`, opaque and trimmed to their own edges, and
 * `PhotoWell` gives them the whole tile: no padding, no ground, no shadow.
 */
const SCENE_PHOTOS = new Set([
  // A model wearing the product.
  "8705", "8704", "8221", "8511", "8514", "0346", "8004",

  // A coloured or patterned studio backdrop.
  "4405", "4979", "5175", "4116", "9850", "2068", "1707", "2043", "7182",
  "6012", "0140", "7781",

  // A branded pattern behind a children's line.
  "3063", "3039", "3040", "3058", "3059", "3060", "3062", "3066", "3037",
  "3043", "3042", "3046", "3070", "6051",

  // A photographed scene or surface — marble, foliage, a table, a beach.
  "7066", "2770", "7472", "7473", "7011", "9462", "9828", "9482", "2307",
  "2308", "2309",

  // Studio grey, where the product sits on a shot floor rather than on white.
  "8395", "0445", "0421", "0427", "1095", "1070", "1502", "9813", "5032",
]);

/**
 * Photos whose backdrop the passes never reach, and the colour it is.
 *
 * The counterpart to KEEP_FLAT above, and it exists for the same reason: the
 * comment there records that two automatic tests were tried and neither
 * separates a backdrop slab from a pale carton, so this is eyes rather than
 * arithmetic. The difference is what is done about it — KEEP_FLAT gives up and
 * keeps the original, this hands the fill the one colour it could not work out
 * for itself and lets it finish the job.
 *
 * It is safe in a way another heuristic would not be, because it can only fire
 * on a code that is written here. The existing MIN_SPAN / MIN_INK net still
 * judges the result, so a colour entered wrongly costs the photo nothing — it
 * falls back to its original exactly as any other failure does.
 *
 * Measured off the checked-in files rather than copied from the report:
 * audit/cutout-images.md lists 30 flagged photos, and 13 of those no longer
 * carry anything (Winx 3039 and 3040, Turmeric 0140, Calcium 7182 and Trodon
 * 1734 all measure under 3% of their opaque pixels). The 17 below are the ones
 * that still do, plus the seven where a thinner ring survives.
 *
 * 3039 is deliberately absent. The note under MIN_LAYER_KEEP warns that a
 * --recut regresses it, and the checked-in file measures 1.0% — it is already
 * the good one, and the only thing this could do to it is harm.
 *
 * Twenty-five codes were tried and eleven kept. The other fourteen are listed
 * at the bottom so nobody spends the afternoon proving it again: on those the
 * backdrop and the product are the same colour to within the tolerance, so the
 * seeded fill takes the product with it and MIN_SPAN / MIN_INK throw the result
 * away. They keep the cut-out they already had, slab and all. Clearing those
 * needs a hand or a re-shoot, not a better number.
 */
const BACKDROP_REVIEWED = [
  // Cleared, and the slab measured afterwards at under 2% of the ink: Bio
  // Hanfol 2111 went from 80% grey to 0.2%, the cod liver oil 0139 from 66% to
  // 1.6%, Artilane 7417 from 40% to nothing.
  ["2111", [232, 232, 232]], ["0139", [213, 212, 208]], ["7417", [199, 220, 240]],
  ["5277", [233, 235, 237]], ["5061", [241, 241, 236]], ["5062", [237, 240, 237]],

  // Cleared a layer and revealed a darker one underneath — these were shot on a
  // backdrop that bands rather than one flat colour, so they are better than
  // they were and still flagged. Worth another colour here when someone reads
  // the report; harmless until then.
  ["NT021", [236, 233, 234]], ["5014", [236, 234, 234]],
  ["5015", [236, 234, 234]], ["5017", [236, 234, 234]],

  // Tried, and the fill takes the product with it. Do not re-add without a
  // different approach:
  //   1095 7472 7473 5060 5274 9063 1200 4960 8525A 8600 NT019 6711 8449
  //   "4517 , 4533"
];

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
function floodFillBackground(buf, width, height, backdrop = null) {
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

  // The reviewed colour, last. It goes after the undo rather than before the
  // layer passes so that it is working on the same buffer a human looked at:
  // for every code in BACKDROP_REVIEWED the slab is what survived everything
  // above, and seeding the fill with it is the only instruction the automatic
  // passes were missing.
  if (backdrop) cleared += fillFrom(buf, width, height, backdrop, 26);

  // Crumbs last of all, so that the span and ink reported below describe the
  // product rather than the product plus whatever the fill stranded around it.
  const { specks, components, largestShare } = pruneSpecks(buf, width, height);

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
    specks,
    components,
    largestShare,
    ...measure(buf, width, height),
  };
}

/** Opaque pixels. Shares the >8 threshold with measure(). */
function countInk(buf, n) {
  let ink = 0;
  for (let i = 0; i < n; i++) if (buf[i * 4 + 3] > 8) ink++;
  return ink;
}

/**
 * The share of the ink under 0.5% that a component has to clear to be product.
 *
 * A fill that stops short leaves crumbs: a rim of the backdrop that never
 * connected to the border, the ghost of an edge, a few dozen stranded pixels.
 * On white they are invisible and nobody ever noticed; on the tinted ground
 * they are specks, and they also pin the bounding box to the full frame, which
 * is what made Erythromycin 1597 measure as correctly framed while the product
 * in it is half size.
 *
 * 0.5% of the ink rather than of the canvas, so the bar scales with how much
 * product there is. On the range that is a blob of roughly 55x55 at the median
 * — smaller than any separately-photographed part of a product in this
 * catalogue, and far larger than any crumb.
 */
const SPECK = 0.005;

/**
 * How much of the ink the largest piece must hold for the photo to be one
 * coherent thing.
 *
 * Below this the fill did not clear a background, it went through the product:
 * 1597 comes back as 97 fragments with the biggest holding 46%, because the
 * white face of the carton was connected to the border and went with it. Such a
 * photo must not be reframed — reframing scales the wreckage up to 86% and
 * makes it the most prominent thing in the grid. It is reported instead.
 *
 * Multi-part packshots stay above it comfortably: a boxed product photographed
 * beside its device is one touching blob (the oximeter 0002 is a single
 * component), and the ampoule strips that genuinely do come apart hold 41/27/25
 * between three pieces, so their largest still clears the bar once the crumbs
 * are gone.
 */
const MIN_COHERENCE = 0.5;

/**
 * Erase the crumbs and describe what is left.
 *
 * Returns the bounding box of the components worth keeping, so a stranded pixel
 * in the corner cannot claim the photo is full-frame.
 */
function pruneSpecks(buf, width, height) {
  const n = width * height;
  const lab = new Int32Array(n).fill(-1);
  const comps = [];
  const stack = [];

  for (let seed = 0; seed < n; seed++) {
    if (lab[seed] !== -1 || buf[seed * 4 + 3] <= 8) continue;
    const id = comps.length;
    let count = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    stack.push(seed);
    lab[seed] = id;
    while (stack.length) {
      const i = stack.pop();
      count++;
      const x = i % width;
      const y = (i / width) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const push = (j) => {
        if (j >= 0 && j < n && lab[j] === -1 && buf[j * 4 + 3] > 8) {
          lab[j] = id;
          stack.push(j);
        }
      };
      if (x > 0) push(i - 1);
      if (x < width - 1) push(i + 1);
      push(i - width);
      push(i + width);
    }
    comps.push({ id, count, minX, minY, maxX, maxY });
  }

  const totalInk = comps.reduce((a, b) => a + b.count, 0);
  if (!totalInk) return { specks: 0, largestShare: 0, components: 0 };

  const keep = new Set(
    comps.filter((cp) => cp.count / totalInk >= SPECK).map((cp) => cp.id)
  );
  let specks = 0;
  for (let i = 0; i < n; i++) {
    const id = lab[i];
    if (id !== -1 && !keep.has(id)) {
      buf[i * 4 + 3] = 0;
      specks++;
    }
  }

  const largest = comps.reduce((a, b) => (b.count > a.count ? b : a));
  return {
    specks,
    components: keep.size,
    largestShare: largest.count / totalInk,
  };
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
  // How far the product sits from the middle, as a share of the canvas. Zero
  // when migrate-images.mjs centred it and nothing has moved since; a slab
  // coming off one side moves it, and so does a photo that was never centred.
  const offX = maxX < 0 ? 0 : (maxX + minX + 1) / 2 / width - 0.5;
  const offY = maxX < 0 ? 0 : (maxY + minY + 1) / 2 / height - 0.5;
  return { span, ink: ink / (width * height), offX, offY };
}

/**
 * Grow a picture to a square with the colour it already carries at its edge.
 *
 * The mean of the border ring rather than sharp's dominant colour: dominant is
 * whatever fills the most pixels, which on a beach photograph is the sky and on
 * a packshot is the product — neither of which is what continues past the edge.
 */
async function padToSquare(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { width: w, height: h, channels: c } = info;
  if (w === h) return input;

  let r = 0, g = 0, b = 0, n = 0;
  const ring = Math.max(1, Math.round(Math.min(w, h) * 0.02));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
      const i = (y * w + x) * c;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  const background = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  const size = Math.max(w, h);
  return sharp(input)
    .resize(size, size, { fit: "contain", background })
    .png()
    .toBuffer();
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

/**
 * BACKDROP_REVIEWED, keyed the way everything else here is keyed. KEEP_FLAT
 * matches on a bare `.trim()`, which is why the codes carrying a comma or a
 * trailing period have never been able to hit it; this side does not repeat
 * that.
 */
const BACKDROP = new Map(BACKDROP_REVIEWED.map(([sku, rgb]) => [skuKey(sku), rgb]));

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

  // Every referenced file, indexed by the photo it was made from: the basename
  // with any `-cutout` or `-cutout-v2` taken off. That is what makes "is there
  // a replacement for this file?" answerable once a photo can be cut twice —
  // asking for `<stem>-cutout.webp` by name kept every superseded file on disk
  // the moment a `-v2` existed, because the name it looked for was no longer
  // the one in the database.
  const base = (f) => path.basename(f, path.extname(f)).replace(/-cutout(-v\d+)?$/, "");
  const replacements = new Set([...referenced].map(base));

  let removed = 0;
  let freed = 0;
  for (const file of readdirSync(OUT)) {
    if (referenced.has(file)) continue;
    // Never delete something with no replacement in place.
    if (!replacements.has(base(file))) {
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
const cameApart = [];
const reverted = [];
const scenes = [];

let i = 0;
for (const p of products) {
  if (i >= LIMIT) break;
  if (ONLY && !ONLY.has(skuKey(p.sku))) continue;
  let current = p.images[0];
  let stem = path.basename(current, path.extname(current));
  // `-cutout-v2` and any later revision, not just the first cut.
  const cutSuffix = stem.match(/-cutout(-v\d+)?$/);
  if (cutSuffix) {
    if (!RECUT && !ONLY) {
      skipped.push({ ...p, why: "already a cut-out" });
      continue;
    }
    // Back to the photo this cut came from, so the fill starts from the pixels
    // migrate-images.mjs wrote rather than from its own last answer. The whole
    // matched suffix, so a second recut starts from the original and not from
    // `…-cutout-v2`.
    stem = stem.slice(0, -cutSuffix[0].length);
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
  if (!FORCE && !RECUT && !ONLY && existsSync(outPathEarly)) {
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

  /**
   * A picture rather than a product: trim it to its own edges and ship it
   * opaque.
   *
   * Deliberately before everything below, and using sharp's own trim rather
   * than the flood fill. The fill exists to separate a product from its
   * background, and here the background *is* the picture — on the model shots
   * it walks straight out of the white margin into a white top and takes half
   * the person with it. Trim only removes a uniform border, which is exactly
   * the white margin migrate-images.mjs added and nothing else.
   */
  if (SCENE_PHOTOS.has(String(p.sku ?? "").trim())) {
    const outName = `${stem}-scene.webp`;
    const trimmed = await sharp(source)
      .trim({ background: "#ffffff", threshold: 12 })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();

    /**
     * Padded to square here rather than cropped to square in the browser.
     *
     * The tile is square and `object-cover` fills it by cutting the long axis,
     * which on nine of these takes something that matters — OVA-Vit 9482 loses
     * the line of body copy along the bottom edge. Padding with the colour the
     * picture already has at its edge extends the backdrop instead of cutting
     * the picture, and a photo that is square to begin with is untouched.
     */
    const square = await padToSquare(trimmed);
    await sharp(square).webp({ quality: QUALITY }).toFile(path.join(OUT, outName));
    scenes.push({
      id: p.id,
      sku: p.sku,
      name: p.name,
      from: current,
      to: `/products/${outName}`,
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
  let reframed = false;
  let specks = 0;
  let components = 0;
  let largestShare = 1;
  let offX = 0;
  let offY = 0;
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
    ({
      clearedPct, layers, layersUndone, slabRemoved, backdropLeft,
      specks, components, largestShare, span, ink, offX, offY,
    } = floodFillBackground(
      buf,
      meta.width,
      meta.height,
      BACKDROP.get(skuKey(p.sku)) ?? null
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
        // KEEP_FLAT now holds three different failures — a slab surviving the
        // undo, a scene rather than a packshot, and a carton the fill goes
        // through — so the reason can only point at the list.
        why: flat ? "reviewed: in KEEP_FLAT" : "too little left",
      });
      /**
       * Put a product that is already on a cut-out back on its original photo,
       * but only on a reviewed decision.
       *
       * Without this KEEP_FLAT can only ever prevent a cut, never undo one: a
       * photo cut badly in an earlier run keeps pointing at that file no matter
       * what this run decides, because only `done` reaches the database. That
       * made the entry useless for exactly the photos that need it most — the
       * ones already shipping a bad cut on a tinted ground.
       *
       * `flat` and not the automatic tests, and the difference is not academic.
       * A photo can fail MIN_SPAN or MIN_INK *in this run* while the cut-out it
       * is already on is perfectly usable — that is precisely what a new pass
       * does when it overreaches, and the seeded backdrop fill above overreaches
       * on every pale-grey slab it was given. Reverting on that would answer a
       * cut this run made badly by throwing away a cut an earlier run made well.
       */
      if (cutSuffix && flat) {
        reverted.push({ id: p.id, sku: p.sku, name: p.name, to: current });
      }
      continue;
    }
    const framed = await sharp(buf, {
      raw: { width: meta.width, height: meta.height, channels: 4 },
    })
      .png()
      .toBuffer();

    /**
     * Re-frame only what is no longer framed, and only where there is one
     * coherent thing to frame.
     *
     * migrate-images.mjs put every product at 86% of the canvas, and while the
     * fill is only lifting a white background off that is still true, so the
     * old note here — "re-cropping would only shift it" — was right. It stops
     * being true the moment a slab comes off: the product was 86% of a picture
     * that included the backdrop, and what is left is smaller and usually no
     * longer centred.
     *
     * The coherence guard is the half of this that matters. A small span has
     * two causes that look identical to a measurement — a product that is
     * legitimately smaller now its backdrop has gone, and a product the fill
     * went through — and scaling the second one up to 86% turns a photo nobody
     * looked at twice into the biggest thing in the grid. Where it does not
     * hold, the photo is left exactly as it was and listed under "came apart"
     * in the report, which is a job for eyes.
     */
    const misframed =
      Math.abs(span - FILL) > 0.02 ||
      // Off-centre counts as misframed on its own. Three knee braces come back
      // at exactly 86% and sitting a tenth of the canvas to one side, which the
      // span test alone waves through and the eye does not.
      Math.abs(offX) > 0.03 ||
      Math.abs(offY) > 0.03;
    if (largestShare >= MIN_COHERENCE && misframed) {
      ({ mark } = await reframeTransparent(framed));
      reframed = true;
    } else {
      mark = framed;
    }
  }

  /**
   * A recut writes a new name, and it has to.
   *
   * The note at the top of this file explains why the first cut did not
   * overwrite: next/image caches its variants for a month keyed by the source
   * URL, so a photo replaced in place keeps serving the old one. That applies
   * just as much to the second cut as it did to the first — recutting
   * `…-cutout.webp` in place would fix nothing anybody can see until the cache
   * expires. `-v2` is what makes it visible, and the DB write below is what
   * points the product at it.
   */
  const revised = Boolean(cutSuffix);
  const outName = revised ? `${stem}-cutout-v2.webp` : `${stem}-cutout.webp`;
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
    reframed,
    specks,
    components,
    largestShare,
    backdropSeeded: BACKDROP.has(skuKey(p.sku)),
  };
  done.push(record);
  // Kept, because its original is no better, but the fill went through it
  // rather than around it. Only eyes can decide between a re-shoot, a hand cut
  // and an entry in KEEP_FLAT.
  if (largestShare < MIN_COHERENCE) cameApart.push(record);
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
console.log(`scenes     ${scenes.length} (trimmed, shown full bleed)`);
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
  `| Reframed after a slab came off | ${done.filter((d) => d.reframed).length} |`,
  `| Pictures, trimmed and shown full bleed | ${scenes.length} |`,
  `| Came apart under the fill | ${cameApart.length} |`,
  `| Skipped | ${skipped.length} |`,
  ``,
  `## Came apart under the fill (${cameApart.length})`,
  ``,
  `The fill went through the product rather than around it: the largest`,
  `surviving piece holds less than ${(MIN_COHERENCE * 100).toFixed(0)}% of the ink, so what is left is`,
  `fragments. Usually a white carton face that was connected to the border and`,
  `went with it. These keep whatever they had — nothing here has been made`,
  `worse — but they are also not reframed, because scaling wreckage up to 86%`,
  `only makes it the most prominent thing in the grid.`,
  ``,
  `Fix by hand-cutting, re-shooting, or adding the code to KEEP_FLAT so the`,
  `product shows its original photo on plain white instead.`,
  ``,
  ...(cameApart.length
    ? [
        `| Code | Product | Largest piece | Pieces | Opaque area |`,
        `|---|---|---|---|---|`,
        ...cameApart
          .slice()
          .sort((a, b) => a.largestShare - b.largestShare)
          .map(
            (r) =>
              `| ${r.sku} | ${r.name} | ${(r.largestShare * 100).toFixed(0)}% | ${r.components} | ${r.to} |`
          ),
      ]
    : [`None.`]),
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

// Everything whose image path this run changed: the cuts it made, and the
// products it sent back to their original photo because the cut they were on
// is worse than no cut at all.
const writes = [...done, ...reverted, ...scenes];

await sql`
  UPDATE products AS p
  SET images = v.img::jsonb, updated_at = now()
  FROM (
    SELECT unnest(${writes.map((d) => d.id)}::int[]) AS id,
           unnest(${writes.map((d) => JSON.stringify([d.to]))}::text[]) AS img
  ) AS v
  WHERE p.id = v.id
`;

// products.json is what `npm run seed:db` replays, so leaving it behind would
// mean the next re-seed quietly restores every white background.
const file = dataPath("products.json");
const seed = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(writes.map((d) => [d.id, d.to]));
let touched = 0;
for (const p of seed) {
  const next = byId.get(p.id);
  if (!next) continue;
  p.images = [next];
  touched++;
}
writeFileSync(file, JSON.stringify(seed, null, 1));

const [check] = await sql`
  SELECT count(*) FILTER (WHERE images::text LIKE '%-cutout%.webp%')::int AS cut,
         count(*)::int AS total
  FROM products
`;
console.log(`\ndatabase: ${check.cut}/${check.total} products point at a cut-out`);
console.log(`products.json: ${touched} entries updated`);
if (reverted.length) {
  console.log(`reverted:  ${reverted.length} put back on their original photo`);
}
console.log(`\nThe superseded files are still in public/products/. Delete them with:`);
console.log(`  node scripts/cutout-images.mjs --prune`);
