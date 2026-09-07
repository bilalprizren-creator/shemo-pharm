/**
 * Which product photos still carry a background.
 *
 * scripts/lib/reframe.mjs puts every packshot on a uniform white square by
 * cropping to the bounding box of the non-white pixels. That works on a photo
 * shot against white and does nothing at all on a photo shot against a scene:
 * there the bounding box *is* the whole frame, so the tea plantation behind
 * "Çaj Kantorini" and the autumn leaves behind the Vaseline tin survive the
 * pipeline untouched and land in a grid of otherwise white cards.
 *
 * Nothing here edits an image. It measures, classifies and writes the result
 * down, the way audit/ does for categories — a background cannot be removed by
 * a threshold, only by a new photograph, so the useful output is a list short
 * enough for someone to work through.
 *
 * Two independent pieces of evidence, and both have to agree:
 *
 *   markPct   from scripts/.image-manifest.json — how much of the ORIGINAL
 *             photo the crop kept. 100 means the crop found no white margin to
 *             cut, which is what a full-bleed photo looks like from inside the
 *             pipeline. It cannot be recovered from the output, because the
 *             output is always re-matted onto white.
 *   whitePct  measured here from the shipped WebP — how much of the square is
 *             white. A packshot leaves the mat plus the gaps around its own
 *             silhouette; a full-bleed photo leaves only the mat.
 *
 * A flagged photo is then split by what kind of background it is, because that
 * decides who can fix it:
 *
 *   flat   the backdrop is one colour — grey, pink, near-black — with almost no
 *          variation around the border. scripts/flatten-photo-backgrounds.mjs
 *          can lift that off and re-mat the product on white.
 *   scene  a photographed setting: a tea plantation, autumn leaves, marble.
 *          No threshold can separate a product from its scene; these need a new
 *          photograph, and the list is ordered so the busiest come first.
 *
 *   node scripts/audit-photos.mjs
 *
 * Writes audit/photos.json and audit/PHOTOS.md. Read-only against everything
 * else — no database, no network, no image is rewritten.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "scripts/.image-manifest.json");
const PRODUCTS = path.join(ROOT, "src/data/products.json");
const OUT_DIR = path.join(ROOT, "audit");

/** Same threshold reframe.mjs mats with, so "white" means the same thing. */
const WHITE_MIN = 240;
/** Analysis size. The classification is about large areas, not detail. */
const SAMPLE = 160;
/** The crop kept this much of the original or more: no white margin existed. */
const FULL_BLEED_MARK_PCT = 99;
/** A square this white cannot be full-bleed — 1 - 0.86^2 = 0.26 is the floor. */
const MAX_FULL_BLEED_WHITE = 0.35;
/** How far a border pixel may sit from the border's mean and still count as flat. */
const FLAT_TOLERANCE = 18;
/** Share of border pixels allowed past that tolerance before it is a scene. */
const MAX_FLAT_OUTLIERS = 0.02;
const CONCURRENCY = 8;

const products = JSON.parse(readFileSync(PRODUCTS, "utf8"));
const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8")).entries
  : {};
const markPctById = new Map(
  Object.values(manifest).map((e) => [e.id, e.markPct])
);

/**
 * White share, colour spread, and how uniform the background is.
 *
 * Uniformity is read off a ring just inside the 86% the product occupies —
 * outside that is the white mat reframe.mjs added, which says nothing about the
 * original. On a flat backdrop every pixel of that ring is the same colour; on
 * a scene it is leaves, tiles or a table edge.
 */
async function measure(file) {
  const { data, info } = await sharp(file)
    .resize(SAMPLE, SAMPLE, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const total = info.width * info.height;
  let white = 0;
  // 5 bits per channel is coarse enough that JPEG noise and a gradient do not
  // each count as their own colour, fine enough to separate print from a photo.
  const colours = new Set();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.min(r, g, b) >= WHITE_MIN) {
      white++;
      continue;
    }
    colours.add(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3));
  }

  const ring = [];
  const pixel = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const lo = Math.round(SAMPLE * 0.075);
  const hi = SAMPLE - lo - 1;
  for (let x = lo; x <= hi; x++) ring.push(pixel(x, lo), pixel(x, hi));
  for (let y = lo; y <= hi; y++) ring.push(pixel(lo, y), pixel(hi, y));
  const mean = [0, 1, 2].map((c) => ring.reduce((sum, px) => sum + px[c], 0) / ring.length);
  const outliers = ring.filter(
    (px) => Math.max(...px.map((v, c) => Math.abs(v - mean[c]))) > FLAT_TOLERANCE
  ).length;

  return {
    whitePct: white / total,
    colours: colours.size,
    background: mean.map(Math.round),
    borderOutlierPct: outliers / ring.length,
  };
}

async function mapWithLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (let i = next++; i < items.length; i = next++) out[i] = await fn(items[i]);
    })
  );
  return out;
}

const rows = await mapWithLimit(products, CONCURRENCY, async (product) => {
  const src = product.images?.[0] ?? null;
  const base = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    image: src,
  };
  if (!src || !src.startsWith("/")) {
    return { ...base, verdict: "missing", note: "no local photo" };
  }
  const file = path.join(ROOT, "public", src.replace(/^\//, ""));
  if (!existsSync(file)) return { ...base, verdict: "missing", note: "file not on disk" };

  const { whitePct, colours, background, borderOutlierPct } = await measure(file);
  const markPct = markPctById.get(product.id) ?? null;

  let verdict = "clean";
  if (whitePct >= 0.999) verdict = "blank";
  else if (
    markPct !== null &&
    markPct >= FULL_BLEED_MARK_PCT &&
    whitePct <= MAX_FULL_BLEED_WHITE
  ) {
    verdict = borderOutlierPct <= MAX_FLAT_OUTLIERS ? "flat" : "scene";
  }

  return {
    ...base,
    verdict,
    whitePct: Number(whitePct.toFixed(3)),
    colours,
    markPct,
    background,
    borderOutlierPct: Number(borderOutlierPct.toFixed(3)),
  };
});

const by = (v) => rows.filter((r) => r.verdict === v);
// Busiest first: a scene spreads over far more distinct colours than print does.
const scene = by("scene").sort((a, b) => b.colours - a.colours);
const flat = by("flat").sort((a, b) => b.colours - a.colours);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  path.join(OUT_DIR, "photos.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 1) + "\n"
);

const table = (list) =>
  list.length === 0
    ? "_none_"
    : [
        "| # | colours | white | id | SKU | product | file |",
        "|--:|--:|--:|--:|---|---|---|",
        ...list.map(
          (r, i) =>
            `| ${i + 1} | ${r.colours} | ${(r.whitePct * 100).toFixed(0)}% | ${r.id} | ${r.sku || "—"} | ${r.name.replace(/\|/g, "\\|")} | \`${r.image}\` |`
        ),
      ].join("\n");

const md = `# Photo audit — which packshots still carry a background

Generated by \`node scripts/audit-photos.mjs\`. Nothing here edits an image.

| | |
|---|---|
| Photos checked | **${rows.length}** |
| Clean packshot on white | ${by("clean").length} |
| **Flat backdrop — removable** | **${flat.length}** |
| **Photographed scene — needs a new photo** | **${scene.length}** |
| Blank | ${by("blank").length} |
| Missing | ${by("missing").length} |

## How a photo gets flagged

\`scripts/lib/reframe.mjs\` crops to the bounding box of everything that is not
white. A photo shot against white loses its margin and gains a uniform one; a
photo shot against anything else has no margin to lose, so it arrives on the
site with its backdrop still in it.

A photo is flagged when both agree:

- \`markPct >= ${FULL_BLEED_MARK_PCT}\` — the crop kept essentially all of the original, i.e. there
  was no white margin. From \`scripts/.image-manifest.json\`; it cannot be read
  back off the shipped file, which is always re-matted onto white.
- \`whitePct <= ${MAX_FULL_BLEED_WHITE}\` — the shipped square really is covered edge to edge. The
  floor is 0.26, the mat a 0.86 fill leaves behind.

It is then **flat** or a **scene**, measured on a ring just inside the product
area: flat means at most ${(MAX_FLAT_OUTLIERS * 100).toFixed(0)}% of that ring sits more than ${FLAT_TOLERANCE} levels from the
ring's own mean colour.

## Flat backdrops — ${flat.length}

One colour behind the product. \`node scripts/flatten-photo-backgrounds.mjs\`
lifts it off and re-mats the product on white; it refuses any photo where the
fill would reach into the product itself.

${table(flat)}

## Photographed scenes — ${scene.length}

A tea plantation, autumn leaves, marble, a wooden board. Separating a product
from a scene is not something a threshold can do, so these need a new
photograph. Busiest first — the top of this list is the most out of place in a
grid of white cards.

### Replacing one

The blob store is suspended, but nothing depends on it: \`isAllowedImageSrc\`
(\`src/lib/images.ts\`) accepts any local path, so a replacement is a new file in
\`public/products/\` and its path in the product form's photo-override field —
\`/products/<name>.webp\`.

${table(scene)}
`;
writeFileSync(path.join(OUT_DIR, "PHOTOS.md"), md);

console.log(`checked ${rows.length} photos`);
console.log(`  clean   ${by("clean").length}`);
console.log(`  flat    ${flat.length}  (removable backdrop)`);
console.log(`  scene   ${scene.length}  (needs a new photo)`);
console.log(`  blank   ${by("blank").length}`);
console.log(`  missing ${by("missing").length}`);
console.log(`\nwrote audit/photos.json and audit/PHOTOS.md`);
