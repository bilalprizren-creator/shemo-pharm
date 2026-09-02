/**
 * Take the photographic backdrop out of the product packshots.
 *
 * scripts/migrate-images.mjs already normalised the framing: every photo is a
 * 1000x1000 white square with the product filling 86 % of it. What it could not
 * fix is what the product was photographed *on*. It whitens the near-white
 * matte (WHITE_MIN 240) and crops to the bounding box of everything darker —
 * so a bottle shot on a white sweep comes out clean, and a box shot on a grey
 * office table comes out as that table, cropped to a rectangle and centred.
 *
 * Measured over all 2 049 files: 722 have something other than white behind the
 * product. In the grid they alternate — a product floating on white, then a
 * product on a grey slab, then a product on a beige one — and the slab reads as
 * part of the card rather than part of the photo.
 *
 * What this run actually did, and it is worth being plain about the ratio: of
 * 2 049 photos it proposed 49 and 34 survived review. The rest were refused,
 * most of them by the two gates that matter — 1 834 have no backdrop dark
 * enough to separate from white cardboard (see MAX_BACKDROP_LIGHTNESS), and 76
 * have a background somebody designed rather than a surface. A tool that
 * rewrote all 722 would have got most of them wrong.
 *
 * ## How the backdrop is separated
 *
 * A flood fill inward from the border of the photo region, with two tolerances
 * that do different jobs:
 *
 *   LOCAL   a pixel joins the background if it is within this of the *neighbour*
 *           it was reached from. Small, so it cannot step over the edge of a
 *           product; large enough to walk down a gradient or a soft shadow,
 *           which is what a table under a light actually looks like.
 *   DARKER  and it must also stay inside the backdrop's own range of colour.
 *   ceiling Without a cap, a long enough gradient of small steps eventually
 *           reaches any colour at all, product included. The cap is asymmetric:
 *           DARKER is generous, because the shadow a product casts on the table
 *           is part of the table; upwards there is no constant at all, only the
 *           ninetieth percentile of what the backdrop is measured to reach,
 *           because a packshot is a light box on a darker surface and every
 *           mistake is the fill climbing off the table onto white cardboard.
 *
 * The mask is then grown by a pixel, blurred, and used as an alpha to composite
 * white, so the boundary keeps the photo's own anti-aliasing instead of gaining
 * a hard cut. Finally the file is reframed through the same pipeline migrate-images
 * uses — same CANVAS, same FILL, same QUALITY — because removing the backdrop
 * shrinks the bounding box and the product would otherwise come out smaller
 * than its neighbours, which is the exact problem that script existed to fix.
 *
 * ## What it refuses
 *
 * Every refusal is reported with a reason and the file is left alone. A photo
 * is skipped when its backdrop is already white; when the backdrop is not a
 * surface at all but a background somebody designed (see MAX_BACKDROP_CHROMA —
 * this is the refusal that matters most, and it is most of them); when the
 * border of the photo region has no dominant colour, because the product runs
 * off the edge; when the fill claims too little to be worth a rewrite or so
 * much that it must have escaped into the product; when it eats into the
 * middle of the frame where the product sits; when what is left is too small
 * to be the product, or comes apart into pieces.
 *
 * TWO PASSES, same as migrate-images.mjs and for the same reason — and here the
 * gap between them is a person, not a formality. Pass 1 only reads, and narrows
 * 2 049 photos to a set small enough to look at one by one. Pass 2 writes, and
 * refuses to run without the list that review produced: the thresholds below
 * cannot tell a clean separation from a bitten label on their own (MAX_INLETS
 * says why), so they are not allowed to decide alone.
 *
 *   node scripts/clean-backdrops.mjs                  # pass 1, report only
 *   node scripts/clean-backdrops.mjs --sheets         # + before/after sheets
 *   node scripts/clean-backdrops.mjs --limit 40       # pass 1, small sample
 *   node scripts/clean-backdrops.mjs --commit --approved scripts/backdrop-approved.json
 *
 * The originals are in git and nowhere else, so `git checkout -- public/products`
 * is the undo. Pass 2 refuses to run against a dirty public/products for that
 * reason: the undo has to point somewhere.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = path.join(ROOT, "public/products");
const REPORT = path.join(ROOT, "scripts/.backdrop-report.json");
const SHEETS = path.join(ROOT, "audit/backdrops");

const COMMIT = process.argv.includes("--commit");
const SHEET = process.argv.includes("--sheets");
const argOf = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const LIMIT = Number(argOf("--limit") ?? Infinity);
const ONLY = argOf("--only");
const APPROVED = argOf("--approved");

// Shared with scripts/migrate-images.mjs — the framing has to stay identical or
// a cleaned product ends up a different size from an untouched one.
const CANVAS = 1000;
const FILL = 0.86;
const WHITE_MIN = 240;
const QUALITY = 82;

/** A pixel may differ from the neighbour it was reached from by this much. */
const LOCAL = 14;
/** ...and be this much darker than the backdrop's median, whatever the path.
 *  Generous, because the shadow a product casts on the table is the backdrop. */
const DARKER = 58;
/** Upwards there is no constant: see the ceiling borderColour measures. */
/** How close two colours must be to count as the same backdrop. */
const RING_TOLERANCE = 20;
/** Share of what survives the fill that has to belong to one connected piece,
 *  and the share of the final crop that piece has to fill. Backstops under the
 *  chroma gate, for the pale designed backgrounds that slip past it. */
const MIN_SOLIDITY = 0.55;
const MIN_SPREAD = 0.6;
/** A leftover piece smaller than this share of the main one is swept away. */
const SPECK = 0.025;
/** How wide a channel the fill has to have come through to be believed. */
const RADIUS = 3;

/** The border of the photo region must be at least this much one colour. */
const MIN_RING_SHARE = 0.55;
/**
 * A backdrop lighter than this is left alone, and this number is the single
 * most important one in the file. It was moved down from 235 after looking at
 * the results: a table at 217–222 separates from white cardboard cleanly, and
 * one at 228–237 does not separate from it at all. There is no tolerance that
 * fixes the second case, because on those photos the shaded white of a label
 * and the lit part of the table are *the same colour* — "NUFLEX" came back as
 * "FLEX", "BIOTIN PLUS" as "TIN PLUS", and LUMINO lost the whole white band
 * its type sits in. A near-white backdrop is also the one least worth removing.
 */
const MAX_BACKDROP_LIGHTNESS = 224;
/**
 * ...and one darker than this, or more coloured than MAX_BACKDROP_CHROMA, is
 * not a surface a product was put down on. It is a background somebody
 * designed — the pink sweep with the hanging lamps, the purple panel with
 * "A NATURAL WAY FOR RELAXED & REFRESHING SLEEP" set across it. Those come
 * apart badly: the flat areas go and every headline, arrow and decorative
 * circle stays, which is worse than leaving the picture alone. A table, a wall
 * or a paper sweep is light and very close to neutral, and that is the whole
 * rule. Measured on the sample: the tables sit at a chroma of 2 to 7, the
 * designed backgrounds at 22 to 63 — and the pale ones, which is why this is
 * 12 rather than 18: the Tribulus banner's blue and the Biotin Plus pink are
 * washed out enough to read as 15 to 18, and both damage their own type.
 */
const MIN_BACKDROP_LIGHTNESS = 150;
const MAX_BACKDROP_CHROMA = 12;
/** Below this share of the photo region there is nothing worth rewriting. */
const MIN_FILL_SHARE = 0.08;
/** Above it, the fill has escaped: no packshot is 88 % backdrop. */
const MAX_FILL_SHARE = 0.88;
/** The middle of the frame is where the product is; the fill may not own it. */
const CENTRE = 0.4;
const MAX_CENTRE_SHARE = 0.55;
/** What is left has to still look like a product, not a fragment of one. */
const MIN_KEPT_AREA = 0.25;
/**
 * Share of the product's own outline the fill may reach into. See inletShare.
 *
 * Set where it catches gross damage and no finer, because finer does not work:
 * a good result on a perspective carton measures 0.035 to 0.065 (the shadow
 * tucks under the box and the far face is bracketed by table on the same
 * column) and a genuinely bitten label measures 0.053. The distributions
 * overlap, so this is a net under the eye, not a substitute for it — which is
 * what scripts/backdrop-approved.json is for.
 */
const MAX_INLETS = 0.12;

function raw(image) {
  return sharp(image)
    .flatten({ background: "#ffffff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/** The bounding box of everything that is not the white canvas. */
function contentBox(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      if (Math.min(data[o], data[o + 1], data[o + 2]) < WHITE_MIN) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

/**
 * The dominant colour on the border of the photo region, and how much of that
 * border agrees with it. A photo shot on a table agrees with itself almost
 * everywhere; a banner with type running off the edge does not.
 */
function borderColour(data, w, box) {
  const px = [];
  const at = (x, y) => {
    const o = (y * w + x) * 3;
    return [data[o], data[o + 1], data[o + 2]];
  };
  for (let x = box.minX; x <= box.maxX; x++) {
    px.push(at(x, box.minY));
    px.push(at(x, box.maxY));
  }
  for (let y = box.minY; y <= box.maxY; y++) {
    px.push(at(box.minX, y));
    px.push(at(box.maxX, y));
  }

  // Median per channel, then the share of the border that sits near it. The
  // median is used rather than the mean because a dark product touching one
  // edge should not drag the backdrop's colour towards itself.
  const channels = [0, 1, 2].map((c) => px.map((p) => p[c]).sort((a, b) => a - b));
  const median = channels.map((v) => v[v.length >> 1]);

  // How bright this backdrop actually gets, read off the backdrop rather than
  // assumed. A fixed allowance upwards cannot work: on a table at 231 an
  // allowance wide enough for a vignetted sweep also covers the shaded white
  // of a NUFLEX label at 238, and the fill takes the label's type with it. The
  // ninetieth percentile of the border is what the surface itself reaches;
  // three above that is noise, and anything past it is not this surface.
  const ceiling = channels.map((v) =>
    Math.min(WHITE_MIN - 1, v[Math.floor(v.length * 0.9)] + 3)
  );

  const near = px.filter((p) =>
    p.every((v, c) => Math.abs(v - median[c]) <= RING_TOLERANCE)
  );
  return { median, ceiling, share: near.length / px.length };
}

/**
 * Flood fill inward from every border pixel that matches the backdrop.
 * Four-connected and iterative — a thousand-pixel square recurses too deep.
 */
function backdropMask(data, w, h, box, median, ceiling) {
  const mask = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const colour = (i) => {
    const o = i * 3;
    return [data[o], data[o + 1], data[o + 2]];
  };
  // Upward, the surface's own measured ceiling — which is never at or above
  // WHITE_MIN, so the fill and contentBox agree on what counts as background.
  // Downward, room for the shadow the product casts, which is still the table.
  const nearMedian = (c) =>
    c.every((v, ch) => v <= ceiling[ch] && median[ch] - v <= DARKER);

  const seed = (x, y) => {
    const i = y * w + x;
    if (mask[i]) return;
    if (!nearMedian(colour(i))) return;
    mask[i] = 1;
    queue[tail++] = i;
  };
  for (let x = box.minX; x <= box.maxX; x++) {
    seed(x, box.minY);
    seed(x, box.maxY);
  }
  for (let y = box.minY; y <= box.maxY; y++) {
    seed(box.minX, y);
    seed(box.maxX, y);
  }

  while (head < tail) {
    const i = queue[head++];
    const from = colour(i);
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < box.minX || nx > box.maxX || ny < box.minY || ny > box.maxY) continue;
      const ni = ny * w + nx;
      if (mask[ni]) continue;
      const to = colour(ni);
      if (!to.every((v, c) => Math.abs(v - from[c]) <= LOCAL)) continue;
      if (!nearMedian(to)) continue;
      mask[ni] = 1;
      queue[tail++] = ni;
    }
  }
  return mask;
}

/** The largest connected region the fill did not take: the product itself. */
function largestComponent(mask, w, h, box) {
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let best = null;
  let bestSize = 0;

  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const start = y * w + x;
      if (seen[start] || mask[start]) continue;
      let head = 0;
      let tail = 0;
      seen[start] = 1;
      queue[tail++] = start;
      let size = 0;
      const members = [];
      while (head < tail) {
        const i = queue[head++];
        size++;
        members.push(i);
        const px = i % w;
        const py = (i - px) / w;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < box.minX || nx > box.maxX || ny < box.minY || ny > box.maxY) continue;
          const ni = ny * w + nx;
          if (seen[ni] || mask[ni]) continue;
          seen[ni] = 1;
          queue[tail++] = ni;
        }
      }
      if (size > bestSize) {
        bestSize = size;
        best = members;
      }
    }
  }

  const out = new Uint8Array(w * h);
  for (const i of best ?? []) out[i] = 1;
  return out;
}

/**
 * How much of the fill lies *inside* the product's own outline.
 *
 * This is the damage detector, and it is the one test that catches the failure
 * that matters. Every bad result in this catalog looks the same: the fill
 * crossed onto the packaging and took the light parts of the print with it, so
 * "NUFLEX" came back as "FLEX", "BIOTIN PLUS" as "TIN PLUS", "TRIBULUS
 * TERRESTRIS" as "TR S". Colour cannot see that — locally the eaten pixels
 * really are the same grey as the table. Geometry can: a backdrop is *around*
 * the product, so no backdrop pixel should ever sit between the product's left
 * and right edge on the same row, or between its top and bottom on the same
 * column. Anything that does is a bite taken out of the middle of the product.
 *
 * A product with a genuine hole through it — a hanger card, a brace with a
 * cut-out — reads as damage here and is refused. That is the safe direction.
 */
function inletShare(mask, product, w, box) {
  let inlets = 0;
  let size = 0;

  for (let y = box.minY; y <= box.maxY; y++) {
    let first = -1;
    let last = -1;
    for (let x = box.minX; x <= box.maxX; x++) {
      if (product[y * w + x]) {
        if (first < 0) first = x;
        last = x;
        size++;
      }
    }
    for (let x = first + 1; x < last; x++) if (mask[y * w + x]) inlets++;
  }

  for (let x = box.minX; x <= box.maxX; x++) {
    let first = -1;
    let last = -1;
    for (let y = box.minY; y <= box.maxY; y++) {
      if (product[y * w + x]) {
        if (first < 0) first = y;
        last = y;
      }
    }
    for (let y = first + 1; y < last; y++) if (mask[y * w + x]) inlets++;
  }

  return size === 0 ? 1 : inlets / (2 * size);
}

/**
 * Close the thin channels the fill escaped through.
 *
 * A flood fill only has to find one path. Where a product's edge is soft — the
 * shaded white of a NUFLEX label against a light grey table — there is a
 * one-pixel-wide chain of intermediate greys running from the table onto the
 * label, and the fill walks it and then spreads out inside the product, eating
 * the type. No tolerance setting distinguishes that chain from the table it
 * starts in, because locally it *is* the table.
 *
 * What distinguishes it is width. So the mask is opened: eroded by RADIUS,
 * which severs any channel narrower than that, then only the parts still
 * touching the border of the photo are kept, then dilated back and intersected
 * with the original so the boundary is exactly where the fill put it. A leak
 * through a hairline is disconnected from the border by the erosion and never
 * comes back; the backdrop itself, which is wide everywhere, is untouched.
 */
function openToBorder(mask, w, h, box, radius) {
  const inside = (x, y) => x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;

  const step = (src, keep) => {
    const out = new Uint8Array(w * h);
    for (let y = box.minY; y <= box.maxY; y++) {
      for (let x = box.minX; x <= box.maxX; x++) {
        const i = y * w + x;
        if (src[i] === (keep ? 0 : 1)) {
          out[i] = src[i];
          continue;
        }
        // Erosion drops a pixel whose 4-neighbourhood is not all background;
        // dilation adds one whose neighbourhood touches it. Outside the photo
        // region counts as background, so the border is not eroded away.
        let neighbours = 0;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (!inside(nx, ny) || src[ny * w + nx]) neighbours++;
        }
        out[i] = keep ? (neighbours === 4 ? 1 : 0) : neighbours > 0 ? 1 : 0;
      }
    }
    return out;
  };

  let eroded = mask;
  for (let r = 0; r < radius; r++) eroded = step(eroded, true);

  // Only what still reaches the edge of the photo is backdrop.
  const rooted = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (x, y) => {
    const i = y * w + x;
    if (!eroded[i] || rooted[i]) return;
    rooted[i] = 1;
    queue[tail++] = i;
  };
  for (let x = box.minX; x <= box.maxX; x++) {
    seed(x, box.minY);
    seed(x, box.maxY);
  }
  for (let y = box.minY; y <= box.maxY; y++) {
    seed(box.minX, y);
    seed(box.maxX, y);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(nx, ny)) continue;
      const ni = ny * w + nx;
      if (!eroded[ni] || rooted[ni]) continue;
      rooted[ni] = 1;
      queue[tail++] = ni;
    }
  }

  let grown = rooted;
  for (let r = 0; r < radius + 1; r++) grown = step(grown, false);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = grown[i] && mask[i] ? 1 : 0;
  return out;
}

/**
 * Label every connected piece of what is still visible after the fill.
 * Eight-connected, so a product whose parts touch only at a corner — a bottle
 * and the highlight on its cap — counts as one piece.
 */
function pieces(data, w, h, box) {
  const label = new Int32Array(w * h).fill(-1);
  const queue = new Int32Array(w * h);
  const solid = (i) => {
    const o = i * 3;
    return Math.min(data[o], data[o + 1], data[o + 2]) < WHITE_MIN;
  };

  const found = [];
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const start = y * w + x;
      if (label[start] >= 0 || !solid(start)) continue;
      const id = found.length;
      let head = 0;
      let tail = 0;
      label[start] = id;
      queue[tail++] = start;
      let size = 0;
      const bounds = { minX: w, minY: h, maxX: -1, maxY: -1 };
      while (head < tail) {
        const i = queue[head++];
        size++;
        const px = i % w;
        const py = (i - px) / w;
        if (px < bounds.minX) bounds.minX = px;
        if (px > bounds.maxX) bounds.maxX = px;
        if (py < bounds.minY) bounds.minY = py;
        if (py > bounds.maxY) bounds.maxY = py;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx < box.minX || nx > box.maxX || ny < box.minY || ny > box.maxY) {
              continue;
            }
            const ni = ny * w + nx;
            if (label[ni] >= 0 || !solid(ni)) continue;
            label[ni] = id;
            queue[tail++] = ni;
          }
        }
      }
      found.push({ id, size, box: bounds });
    }
  }
  found.sort((a, b) => b.size - a.size);
  return { label, found };
}

/** Crop to the product, scale it to FILL of the canvas, centre it on white. */
async function reframe(png) {
  const { data, info } = await raw(png);
  const box = contentBox(data, info.width, info.height);
  if (!box) return null;
  const cw = box.maxX - box.minX + 1;
  const ch = box.maxY - box.minY + 1;
  const target = Math.round(CANVAS * FILL);
  const scale = Math.min(target / cw, target / ch);

  const product = await sharp(png)
    .extract({ left: box.minX, top: box.minY, width: cw, height: ch })
    .resize({
      width: Math.max(1, Math.round(cw * scale)),
      height: Math.max(1, Math.round(ch * scale)),
      fit: "inside",
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 3,
      background: "#ffffff",
    },
  })
    .composite([{ input: product, gravity: "centre" }])
    .webp({ quality: QUALITY })
    .toBuffer();
}

/**
 * Decide about one file and, when it passes, produce the cleaned bytes.
 * Returns `{ skip }` or `{ output, stats }` — it never writes anything itself.
 */
async function clean(file) {
  const source = path.join(PRODUCTS, file);
  const { data, info } = await raw(source);
  const { width: w, height: h } = info;

  const box = contentBox(data, w, h);
  if (!box) return { skip: "blank" };

  const { median, ceiling, share } = borderColour(data, w, box);
  if (Math.min(...median) >= MAX_BACKDROP_LIGHTNESS) return { skip: "already-white" };

  const chroma = Math.max(...median) - Math.min(...median);
  if (chroma > MAX_BACKDROP_CHROMA || Math.min(...median) < MIN_BACKDROP_LIGHTNESS) {
    return { skip: "designed-background", backdrop: median.join(","), chroma };
  }
  if (share < MIN_RING_SHARE) {
    return { skip: "no-dominant-backdrop", share: Number(share.toFixed(2)) };
  }

  const mask = openToBorder(
    backdropMask(data, w, h, box, median, ceiling),
    w,
    h,
    box,
    RADIUS
  );

  const boxArea = (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1);
  let filled = 0;
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) if (mask[y * w + x]) filled++;
  }
  const fillShare = filled / boxArea;
  if (fillShare < MIN_FILL_SHARE) {
    return { skip: "nothing-to-remove", fill: Number(fillShare.toFixed(2)) };
  }
  if (fillShare > MAX_FILL_SHARE) {
    return { skip: "fill-escaped", fill: Number(fillShare.toFixed(2)) };
  }

  // The product is the largest thing the fill did not take. It has to be the
  // largest *connected* thing and not simply everything left over, or two
  // legitimately separate objects — the mattress carton and the strip of
  // printing above it — would have the table between them counted as a bite.
  const product = largestComponent(mask, w, h, box);
  const inlets = inletShare(mask, product, w, box);
  if (inlets > MAX_INLETS) {
    return { skip: "bit-into-the-product", inlets: Number(inlets.toFixed(3)) };
  }

  // The product sits in the middle — migrate-images.mjs put it there.
  const c0 = Math.round(w * (0.5 - CENTRE / 2));
  const c1 = Math.round(w * (0.5 + CENTRE / 2));
  let centre = 0;
  for (let y = c0; y < c1; y++) {
    for (let x = c0; x < c1; x++) if (mask[y * w + x]) centre++;
  }
  const centreShare = centre / ((c1 - c0) * (c1 - c0));
  if (centreShare > MAX_CENTRE_SHARE) {
    return { skip: "fill-reached-product", centre: Number(centreShare.toFixed(2)) };
  }

  // Composite white through a softened mask: a hard mask leaves the backdrop's
  // colour in the anti-aliased pixels along every edge, which reads as a halo.
  //
  // Grown by one pixel before it is blurred, for two reasons. The blur alone
  // would leave the *outer* rim of the fill — which is the edge of the photo —
  // only half whitened, so a frame of the old backdrop survived and the crop
  // that follows still saw a full-frame product. And the pixel it grows into is
  // the fringe where the backdrop bled onto the product's own outline.
  const alpha = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const grown =
        mask[i] ||
        (x > 0 && mask[i - 1]) ||
        (x < w - 1 && mask[i + 1]) ||
        (y > 0 && mask[i - w]) ||
        (y < h - 1 && mask[i + w]);
      alpha[i] = grown ? 255 : 0;
    }
  }
  // sharp widens a one-channel raw buffer to three on the way out, so the
  // stride has to be read back rather than assumed — indexing this by pixel
  // reads the alpha of every third pixel and washes the whole photo out.
  const { data: soft, info: softInfo } = await sharp(alpha, {
    raw: { width: w, height: h, channels: 1 },
  })
    .blur(0.8)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const stride = softInfo.channels;

  const out = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const a = soft[i * stride] / 255;
    for (let c = 0; c < 3; c++) {
      out[i * 3 + c] = Math.round(data[i * 3 + c] * (1 - a) + 255 * a);
    }
  }

  let whitened = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .png()
    .toBuffer();

  const after = (await raw(whitened)).data;

  // What survived has to be one thing.
  //
  // This is what separates a packshot from a marketing banner, and no measure
  // of colour does. A product photographed on a table leaves a single object
  // once the table is gone. A banner leaves the bottle *plus* every headline,
  // every arrow and every decorative circle the fill could not reach, scattered
  // across the frame — which looks worse than the backdrop did. So: the biggest
  // connected piece of what is left has to be most of what is left.
  const { label, found } = pieces(after, w, h, box);
  if (found.length === 0) return { skip: "nothing-left" };
  const main = found[0];

  // Sweep up the specks the fill left behind — a wisp of shadow the tolerance
  // stopped short of, a speck of dust on the table. Individually invisible,
  // but each one is a corner of the bounding box, so the crop that follows
  // frames the whole sheet of paper again instead of the product, and the
  // product comes out *smaller* than it went in. Anything under a fortieth of
  // the main piece goes; a product's own separate parts are far larger.
  //
  // Two kinds go: anything under a fortieth of the main piece, and anything —
  // at any size — whose own colour is still the backdrop's. The second is the
  // band of table the ceiling stopped just short of, left floating under the
  // product as a grey smear once everything around it turned white.
  const meanColour = (id) => {
    let n = 0;
    const sum = [0, 0, 0];
    for (let i = 0; i < w * h; i++) {
      if (label[i] !== id) continue;
      n++;
      for (let c = 0; c < 3; c++) sum[c] += after[i * 3 + c];
    }
    return sum.map((v) => v / n);
  };
  const isLeftover = (piece) => {
    if (piece === main) return false;
    if (piece.size < main.size * SPECK) return true;
    const mean = meanColour(piece.id);
    return mean.every((v, c) => Math.abs(v - median[c]) <= RING_TOLERANCE);
  };

  let swept = 0;
  for (const piece of found) if (isLeftover(piece)) swept += piece.size;
  if (swept > 0) {
    const drop = new Set(found.filter(isLeftover).map((p) => p.id));
    for (let i = 0; i < w * h; i++) {
      if (label[i] >= 0 && drop.has(label[i])) {
        after[i * 3] = 255;
        after[i * 3 + 1] = 255;
        after[i * 3 + 2] = 255;
      }
    }
    whitened = await sharp(after, { raw: { width: w, height: h, channels: 3 } })
      .png()
      .toBuffer();
  }

  const kept = found.filter((p) => !isLeftover(p));
  const keptTotal = kept.reduce((n, p) => n + p.size, 0);
  const solidity = main.size / keptTotal;

  const keptBox = contentBox(after, w, h);
  if (!keptBox) return { skip: "nothing-left" };

  // What survived has to be one thing, and it has to be where the crop is.
  //
  // This is what separates a packshot from a designed background that got past
  // the chroma gate, and no measure of colour does. A product photographed on a
  // table leaves a single object once the table is gone. A pastel banner leaves
  // the bottle *plus* the script headline, the drawn combs and the leaf motifs,
  // spread to the corners — so the largest piece is a third of what is left and
  // a quarter of the frame it would be cropped to.
  const area = (b) => (b.maxX - b.minX + 1) * (b.maxY - b.minY + 1);
  const spread = area(main.box) / area(keptBox);
  if (solidity < MIN_SOLIDITY || spread < MIN_SPREAD) {
    return {
      skip: "left-in-pieces",
      solidity: Number(solidity.toFixed(2)),
      spread: Number(spread.toFixed(2)),
    };
  }
  const keptArea =
    ((keptBox.maxX - keptBox.minX + 1) * (keptBox.maxY - keptBox.minY + 1)) / boxArea;
  if (keptArea < MIN_KEPT_AREA) {
    return { skip: "too-little-left", kept: Number(keptArea.toFixed(2)) };
  }

  const output = await reframe(whitened);
  if (!output) return { skip: "nothing-left" };

  return {
    output,
    whitened,
    stats: {
      backdrop: median.join(","),
      ring: Number(share.toFixed(2)),
      fill: Number(fillShare.toFixed(2)),
      centre: Number(centreShare.toFixed(2)),
      inlets: Number(inlets.toFixed(3)),
      kept: Number(keptArea.toFixed(2)),
      chroma,
      solidity: Number(solidity.toFixed(2)),
      spread: Number(spread.toFixed(2)),
    },
  };
}

/** A before/after strip, so a decision can be looked at rather than trusted. */
async function sheet(file, cleaned) {
  const half = 320;
  const before = await sharp(path.join(PRODUCTS, file))
    .resize(half, half, { fit: "contain", background: "#ffffff" })
    .toBuffer();
  const after = await sharp(cleaned)
    .resize(half, half, { fit: "contain", background: "#ffffff" })
    .toBuffer();
  return sharp({
    create: {
      width: half * 2 + 3,
      height: half,
      channels: 3,
      background: "#c8c8c8",
    },
  })
    .composite([
      { input: before, left: 0, top: 0 },
      { input: after, left: half + 3, top: 0 },
    ])
    .webp({ quality: 78 })
    .toBuffer();
}

function assertCleanTree() {
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "public/products"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  if (dirty) {
    console.error(
      "public/products already has uncommitted changes. Commit or revert them\n" +
        "first — git is the only copy of the originals, and this pass overwrites\n" +
        "them in place."
    );
    process.exit(1);
  }
}

async function main() {
  if (COMMIT) assertCleanTree();

  // The eye, made explicit. Pass 1 proposes; a person looks at the before/after
  // sheets; the files that survive that go in a list, and pass 2 writes those
  // and nothing else. Without --approved, pass 2 refuses to run at all — the
  // thresholds in this file narrow the field to something reviewable, they do
  // not decide, and none of them can (see MAX_INLETS).
  let approved = null;
  if (APPROVED) {
    approved = new Set(JSON.parse(readFileSync(APPROVED, "utf8")).files);
    console.log(`${approved.size} files approved by review in ${APPROVED}`);
  } else if (COMMIT) {
    console.error(
      "Refusing to write without --approved <list.json>. Run pass 1 with\n" +
        "--sheets, look at audit/backdrops, then pass the reviewed list."
    );
    process.exit(1);
  }
  console.log(
    COMMIT
      ? "PASS 2 — rewriting public/products in place"
      : "PASS 1 — reading only, nothing in public/products is touched"
  );

  const files = readdirSync(PRODUCTS)
    .filter((f) => f.endsWith(".webp"))
    .filter((f) => !ONLY || f === ONLY)
    .slice(0, LIMIT);

  if (SHEET) mkdirSync(SHEETS, { recursive: true });

  const cleaned = [];
  const skipped = {};
  const skippedFiles = [];
  let done = 0;

  for (const file of files) {
    if (approved && !approved.has(file)) continue;
    const result = await clean(file);
    done++;
    if (result.skip) {
      skipped[result.skip] = (skipped[result.skip] ?? 0) + 1;
      skippedFiles.push({ file, ...result });
    } else {
      cleaned.push({ file, ...result.stats });
      if (COMMIT) writeFileSync(path.join(PRODUCTS, file), result.output);
      if (SHEET) {
        writeFileSync(
          path.join(SHEETS, file.replace(/\.webp$/, "-ba.webp")),
          await sheet(file, result.output)
        );
        writeFileSync(path.join(SHEETS, file), result.output);
      }
    }
    if (done % 200 === 0) console.log(`  ${done}/${files.length}…`);
  }

  writeFileSync(
    REPORT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        committed: COMMIT,
        settings: {
          LOCAL,
          DARKER,
          RADIUS,
          RING_TOLERANCE,
          MIN_RING_SHARE,
          MAX_FILL_SHARE,
        },
        totals: { seen: files.length, cleaned: cleaned.length, ...skipped },
        cleaned,
        skipped: skippedFiles.filter((s) => s.skip !== "already-white"),
      },
      null,
      2
    )}\n`
  );

  console.log(`\ncleaned ${cleaned.length} of ${files.length}`);
  for (const [reason, n] of Object.entries(skipped).sort((a, b) => b[1] - a[1])) {
    console.log(`  skipped ${String(n).padStart(5)}  ${reason}`);
  }
  console.log(`\nreport: ${path.relative(ROOT, REPORT)}`);
  if (SHEET) console.log(`sheets: ${path.relative(ROOT, SHEETS)}`);
  if (!COMMIT) console.log("\nnothing was written. Re-run with --commit to apply.");
}

await main();
