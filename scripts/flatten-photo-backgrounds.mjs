/**
 * Lift a flat backdrop off a product photo and re-mat the product on white.
 *
 * scripts/lib/reframe.mjs crops to the bounding box of the non-white pixels, so
 * it can only tidy a photo that was already shot against white. 281 of the 2049
 * photos were not (see audit/PHOTOS.md). Of those, 31 stand on a single flat
 * colour — grey, pale pink, near-black — and a flat colour is something a
 * program can actually remove: flood the canvas inwards from its own border,
 * through anything that is either the white mat or that backdrop colour, and
 * stop at the product.
 *
 * The other 250 are photographed scenes — a tea plantation, autumn leaves,
 * marble. Those are not attempted here and cannot be: separating a product from
 * a scene needs a segmentation model, not a threshold. They want a new
 * photograph, and audit/PHOTOS.md lists them.
 *
 * Six refusals, because a bad fill is worse than a background:
 *
 *   1. only photos audit/photos.json calls `flat` are touched at all;
 *   2. **the backdrop has to be a light one.** On a dark backdrop the product's
 *      own shadowed edges fall inside any useful tolerance, so the flood eats
 *      into the packaging and leaves the reflection behind it — the Bioblas
 *      shampoo on near-black lost the right edge of its carton and kept two
 *      grey arcs where the tabletop had been. Light backdrops do not hide their
 *      mistakes: a fill that goes too far leaves a visible hole, which the
 *      surviving-area check below catches;
 *   3. the flood must not reach the product — if what survives covers less than
 *      MIN_SURVIVING_PCT of the canvas, the backdrop colour was also the
 *      product's colour, and the photo is left alone;
 *   3. it must actually do something — under MIN_REMOVED_PCT means the audit
 *      and the pixels disagree, so nothing is written;
 *   4. **the result is measured, and has to be a clean packshot.** The audit
 *      reads flatness off a ring inside the product area, and a scene with a
 *      calm edge fools it — the autumn leaves behind a Vaseline tin sit on a
 *      pale brick wall, and the ring lands on the bricks. Whitening the bricks
 *      would leave the leaves and make that photo worse. So the fill is judged
 *      on what it produced rather than on what the audit predicted: unless the
 *      finished square is at least MIN_RESULT_WHITE white, it is thrown away.
 *
 * Everything it writes is a file already tracked by git, so `git checkout --
 * public/products` undoes the lot.
 *
 *   node scripts/audit-photos.mjs                        # produces the input
 *   node scripts/flatten-photo-backgrounds.mjs           # dry run, reports each photo
 *   node scripts/flatten-photo-backgrounds.mjs --preview <dir>
 *   node scripts/flatten-photo-backgrounds.mjs --commit
 *
 * `--preview` writes every accepted result to a directory as
 * `<sku>-before.webp` / `<sku>-after.webp` without touching public/products,
 * which is how these thresholds were set: look at the pairs, not at the
 * percentages.
 *
 * Local files only — no database, no network. The catalog rows already point at
 * these paths, so nothing downstream changes.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { reframe } from "./lib/reframe.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = path.join(ROOT, "audit/photos.json");
const COMMIT = process.argv.includes("--commit");
const previewAt = process.argv.indexOf("--preview");
const PREVIEW_DIR = previewAt === -1 ? null : process.argv[previewAt + 1];

/** Same white as reframe.mjs, so "already background" means the same thing. */
const WHITE_MIN = 240;
/**
 * Darkest backdrop worth attempting, as the minimum of its three channels.
 * Below this the technique is not trustworthy — see the second refusal above.
 */
const MIN_BACKDROP_LEVEL = 150;
/** Floor on the colour distance a backdrop pixel may sit from the backdrop mean. */
const MIN_TOLERANCE = 14;
/** Ceiling, so a bad measurement cannot authorise eating the product. */
const MAX_TOLERANCE = 34;
/** Below this share of canvas left standing, the fill reached the product. */
const MIN_SURVIVING_PCT = 0.04;
/** Below this share removed, there was no backdrop to remove. */
const MIN_REMOVED_PCT = 0.02;
/**
 * A finished packshot has to be at least this white. The audit calls anything
 * under 0.35 full-bleed; clearing that by ten points is the difference between
 * "a backdrop came off" and "something was recoloured and the frame is still
 * covered".
 */
const MIN_RESULT_WHITE = 0.45;
/** Sample size for that check — the same one audit-photos.mjs measures on. */
const SAMPLE = 160;
/**
 * An island of surviving pixels smaller than this share of the canvas, AND
 * still coloured like the backdrop, is a scrap of that backdrop rather than
 * anything of the product's. Removing it matters beyond tidiness: reframe crops
 * to the bounding box of everything non-white, so one speck in a corner drags
 * the box out to the edge and shrinks the actual product in every card.
 *
 * The colour condition is not optional. Size alone deletes the thin strokes of
 * lettering — the pale-pink Melatonin photo prints "NOT GETTING A GOOD NIGHT'S
 * SLEEP?" beside the bottle, and every dotless "I" in it is a small island.
 * They are dark purple, nothing like the backdrop, so they stay.
 */
const MIN_ISLAND_PCT = 0.0005;
/** How far an island's mean may sit from the backdrop and still count as its scrap. */
const ISLAND_COLOUR_SLACK = 2;
/**
 * A soft drop shadow does not stop at any tolerance: it fades from the backdrop
 * into white over tens of pixels, so the flood halts somewhere inside the fade
 * and leaves a ragged collar of half-lit grey around the product — worse on a
 * white card than the tidy backdrop it replaced.
 *
 * It shows up at the cut itself. Walk the surviving pixels that touch white and
 * ask what colour they are: a clean cut is bounded by the product, a fade is
 * bounded by more backdrop. Measuring the whole image instead of its edge does
 * not work — against a light grey backdrop the product's own highlights sit
 * just as close to it as any shadow does.
 *
 * The same number catches the other way this goes wrong. Where the backdrop
 * colour also occurs *inside* the packaging — the Elina lip balm is a pale blue
 * card on a pale blue backdrop — the flood crosses into the product and bites a
 * white notch out of it. That cut is bounded by backdrop-coloured card, so it
 * reads high here too, and 0.4 is where the notched results end and the clean
 * ones begin.
 */
const MAX_EDGE_BACKDROP_SHARE = 0.4;
/** How near the backdrop an edge pixel must be to count as unfinished fade. */
const EDGE_SLACK = 22;

if (!existsSync(REPORT)) {
  console.error("ABORT: audit/photos.json missing — run node scripts/audit-photos.mjs first.");
  process.exit(1);
}
const flat = JSON.parse(readFileSync(REPORT, "utf8")).rows.filter((r) => r.verdict === "flat");
if (flat.length === 0) {
  console.log("Nothing to do: the audit found no flat backdrops.");
  process.exit(0);
}

/** How far the backdrop ring strays from its own mean, in levels. */
function ringTolerance(data, width, height, channels, backdrop) {
  const at = (x, y) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const lo = Math.round(Math.min(width, height) * 0.075);
  const hiX = width - lo - 1;
  const hiY = height - lo - 1;
  let max = 0;
  for (let x = lo; x <= hiX; x++) {
    for (const px of [at(x, lo), at(x, hiY)]) {
      max = Math.max(max, ...px.map((v, c) => Math.abs(v - backdrop[c])));
    }
  }
  for (let y = lo; y <= hiY; y++) {
    for (const px of [at(lo, y), at(hiX, y)]) {
      max = Math.max(max, ...px.map((v, c) => Math.abs(v - backdrop[c])));
    }
  }
  return Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, max + 6));
}

/**
 * Whiten everything reachable from the canvas edge that is either the white mat
 * or the backdrop colour. Four-connected, so a backdrop-coloured detail *inside*
 * the product — a grey cap on a grey-backed photo — is never touched: it cannot
 * be reached without crossing the product.
 */
function floodFromBorder(data, width, height, channels, backdrop, tolerance) {
  const total = width * height;
  const filled = new Uint8Array(total);
  const stack = [];

  const isBackground = (i) => {
    const p = i * channels;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    if (Math.min(r, g, b) >= WHITE_MIN) return true;
    return (
      Math.abs(r - backdrop[0]) <= tolerance &&
      Math.abs(g - backdrop[1]) <= tolerance &&
      Math.abs(b - backdrop[2]) <= tolerance
    );
  };
  const push = (i) => {
    if (!filled[i] && isBackground(i)) {
      filled[i] = 1;
      stack.push(i);
    }
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (stack.length > 0) {
    const i = stack.pop();
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (y > 0) push(i - width);
    if (y < height - 1) push(i + width);
  }

  let removed = 0;
  for (let i = 0; i < total; i++) {
    if (!filled[i]) continue;
    const p = i * channels;
    if (Math.min(data[p], data[p + 1], data[p + 2]) < WHITE_MIN) removed++;
    data[p] = data[p + 1] = data[p + 2] = 255;
    if (channels === 4) data[p + 3] = 255;
  }

  let surviving = 0;
  for (let i = 0; i < total; i++) {
    const p = i * channels;
    if (Math.min(data[p], data[p + 1], data[p + 2]) < WHITE_MIN) surviving++;
  }
  return { removedPct: removed / total, survivingPct: surviving / total };
}

/** Whiten every small surviving island that is still the backdrop's colour. */
function removeSpecks(data, width, height, channels, backdrop, tolerance) {
  const total = width * height;
  const minSize = Math.max(1, Math.round(total * MIN_ISLAND_PCT));
  const seen = new Uint8Array(total);
  const isInk = (i) => {
    const p = i * channels;
    return Math.min(data[p], data[p + 1], data[p + 2]) < WHITE_MIN;
  };

  let removed = 0;
  for (let start = 0; start < total; start++) {
    if (seen[start] || !isInk(start)) continue;
    const island = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop();
      island.push(i);
      const x = i % width;
      const y = (i - x) / width;
      const neighbours = [];
      if (x > 0) neighbours.push(i - 1);
      if (x < width - 1) neighbours.push(i + 1);
      if (y > 0) neighbours.push(i - width);
      if (y < height - 1) neighbours.push(i + width);
      for (const n of neighbours) {
        if (!seen[n] && isInk(n)) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    if (island.length >= minSize) continue;

    const mean = [0, 1, 2].map(
      (c) => island.reduce((sum, i) => sum + data[i * channels + c], 0) / island.length
    );
    const isBackdropScrap = mean.every(
      (v, c) => Math.abs(v - backdrop[c]) <= tolerance * ISLAND_COLOUR_SLACK
    );
    if (!isBackdropScrap) continue;

    for (const i of island) {
      const p = i * channels;
      data[p] = data[p + 1] = data[p + 2] = 255;
      if (channels === 4) data[p + 3] = 255;
    }
    removed += island.length;
  }
  return removed / total;
}

/**
 * Share of the cut edge that is still backdrop-coloured — the surviving pixels
 * with a white neighbour, which is exactly where the flood stopped.
 */
function backdropAtTheCut(data, width, height, channels, backdrop) {
  const total = width * height;
  const isWhite = (i) => {
    const p = i * channels;
    return Math.min(data[p], data[p + 1], data[p + 2]) >= WHITE_MIN;
  };

  let edge = 0;
  let stillBackdrop = 0;
  for (let i = 0; i < total; i++) {
    if (isWhite(i)) continue;
    const x = i % width;
    const y = (i - x) / width;
    const touchesWhite =
      (x > 0 && isWhite(i - 1)) ||
      (x < width - 1 && isWhite(i + 1)) ||
      (y > 0 && isWhite(i - width)) ||
      (y < height - 1 && isWhite(i + width));
    if (!touchesWhite) continue;
    edge++;
    const p = i * channels;
    if (
      Math.abs(data[p] - backdrop[0]) <= EDGE_SLACK &&
      Math.abs(data[p + 1] - backdrop[1]) <= EDGE_SLACK &&
      Math.abs(data[p + 2] - backdrop[2]) <= EDGE_SLACK
    ) {
      stillBackdrop++;
    }
  }
  return edge === 0 ? 0 : stillBackdrop / edge;
}

/** White share of a finished WebP, measured the way audit-photos.mjs does. */
async function whiteShare(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(SAMPLE, SAMPLE, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let white = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (Math.min(data[i], data[i + 1], data[i + 2]) >= WHITE_MIN) white++;
  }
  return white / (info.width * info.height);
}

let written = 0;
let refused = 0;

for (const row of flat) {
  const file = path.join(ROOT, "public", row.image.replace(/^\//, ""));
  if (!existsSync(file)) {
    console.log(`skip     ${row.image} — not on disk`);
    refused++;
    continue;
  }

  const { data, info } = await sharp(file)
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const backdrop = row.background;
  if (Math.min(...backdrop) < MIN_BACKDROP_LEVEL) {
    console.log(
      `REFUSE   ${row.sku || row.id} ${row.name}\n         backdrop rgb(${backdrop.join(",")}) is too dark to separate safely`
    );
    refused++;
    continue;
  }
  const tolerance = ringTolerance(data, info.width, info.height, info.channels, backdrop);
  const { removedPct, survivingPct } = floodFromBorder(
    data,
    info.width,
    info.height,
    info.channels,
    backdrop,
    tolerance
  );

  const speckPct = removeSpecks(
    data,
    info.width,
    info.height,
    info.channels,
    backdrop,
    tolerance
  );

  const edgeShare = backdropAtTheCut(data, info.width, info.height, info.channels, backdrop);

  const pct = (n) => `${(n * 100).toFixed(1)}%`;
  const label = `${row.sku || row.id} ${row.name}`;

  if (survivingPct < MIN_SURVIVING_PCT) {
    console.log(`REFUSE   ${label}\n         fill reached the product — only ${pct(survivingPct)} left standing`);
    refused++;
    continue;
  }
  if (removedPct < MIN_REMOVED_PCT) {
    console.log(`REFUSE   ${label}\n         nothing to remove (${pct(removedPct)})`);
    refused++;
    continue;
  }
  if (edgeShare > MAX_EDGE_BACKDROP_SHARE) {
    console.log(
      `REFUSE   ${label}\n         soft shadow — ${pct(edgeShare)} of the cut edge is still backdrop`
    );
    refused++;
    continue;
  }

  // Back through the normal pipeline, so a fixed photo is framed exactly like
  // the 1768 that were already clean rather than merely de-backgrounded.
  const flattened = await sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
  const { webp } = await reframe(flattened);

  const resultWhite = await whiteShare(webp);
  if (resultWhite < MIN_RESULT_WHITE) {
    console.log(
      `REFUSE   ${label}\n         result is still covered (${pct(resultWhite)} white) — not a flat backdrop`
    );
    refused++;
    continue;
  }

  console.log(
    `${COMMIT ? "write   " : "would   "} ${label}\n` +
      `         backdrop rgb(${backdrop.join(",")}) tol ${tolerance} · removed ${pct(removedPct)}` +
      `${speckPct > 0 ? ` + ${pct(speckPct)} specks` : ""} · edge ${pct(edgeShare)} · white ${pct(resultWhite)}`
  );
  if (COMMIT) writeFileSync(file, webp);
  if (PREVIEW_DIR) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    const stem = path.join(PREVIEW_DIR, `${row.sku || row.id}`.replace(/[^\w.-]+/g, "_"));
    copyFileSync(file, `${stem}-before.webp`);
    writeFileSync(`${stem}-after.webp`, webp);
  }
  written++;
}

console.log(
  `\n${COMMIT ? "rewrote" : "would rewrite"} ${written} photo(s); refused ${refused}.`
);
if (!COMMIT) console.log("(dry run — pass --commit to write the files)");
