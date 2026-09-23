/**
 * How sharp each product photo can be, judged by the best source file this
 * project holds for it — and so which products need a new photograph rather
 * than a new cut.
 *
 *   node scripts/audit-photo-sources.mjs          # writes audit/photo-quality.md
 *
 * Read-only apart from the report. No database: the image paths come from
 * src/data/products.json, which sync-image-paths keeps equal to both databases.
 *
 * Why not measure the served files. Every served photo is a 1000 px square
 * with the product 860 px on its longest side (scripts/lib/reframe.mjs), so on
 * the file itself a 463 px remove.bg preview blown up 1.9× and a real 900 px
 * photograph look the same size. A frequency measure on the WebP was tried on
 * 2026-09-23 and cannot tell them apart either: compression noise swamps the
 * difference. What decides sharpness is how many pixels the product had in the
 * file it was cut from — so that is measured, for every source there is:
 *
 *   wordpress   the old shop's upload, via scripts/.image-manifest.json
 *               (migrate-images wrote how far it enlarged each: 860 / scale)
 *   jara        the Jara project's shemo-<code>-*.png files
 *   katalog     the old catalogue's own photo (sources/shemo-katalog/, fetched
 *               by scripts/fetch-katalog-images.mjs, matched by code there)
 *   segmented   sources/segmented/<code>.png, cut by the segmentation model
 *
 * The best of them is the most any recut could achieve. The detail page draws
 * a product up to about 465 CSS pixels tall — 930 device pixels on a phone or
 * a retina screen — so below ~450 px a photo is soft on every screen, and below
 * ~700 px on the high-density ones.
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { dataPath, readJson, ROOT } from "./lib/db.mjs";

const JARA_DIR = "C:/calude code/Jara pharmcay/public/products";
const KATALOG_DIR = path.join(ROOT, "sources/shemo-katalog");
const SEGMENTED_DIR = path.join(ROOT, "sources/segmented");
const REPORT = path.join(ROOT, "audit/photo-quality.md");

/** Longest side of the product itself: alpha where there is some, else not-white. */
async function productPixels(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let transparent = false;
  for (let i = 3; i < data.length; i += 4 * 97) if (data[i] < 250) transparent = true;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const ink = transparent
        ? data[i + 3] > 24
        : Math.min(data[i], data[i + 1], data[i + 2]) < 240;
      if (!ink) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? 0 : Math.max(x1 - x0 + 1, y1 - y0 + 1);
}

/**
 * Whether the old shop's upload for this product is a staged picture rather
 * than a packshot — a bottle on a pink plinth, in a water splash — in which
 * case its size measures the scene, not the product, and is no better source.
 *
 * Read off the reframed original (public/products/<name without -cutout>.webp):
 * a packshot touches the edges of its bounding box here and there; a picture
 * is a solid rectangle, so nearly every pixel along the box's edges is inked.
 * A carton shot straight on is a rectangle too, so this can only ever say
 * "maybe a scene" — it demotes the number, it never promotes one.
 *
 * REVIEWED_SCENES are the ones confirmed by eye that the edge test lets
 * through, because the scene has ragged edges of its own (rocks, a model's
 * shoulder, a grey sweep with the product small in it). Checked on a
 * side-by-side sheet of the reframed originals on 2026-09-23.
 */
const REVIEWED_SCENES = new Set(["7742", "7748", "7795"]);

async function looksLikeScene(file, sku) {
  if (REVIEWED_SCENES.has(sku)) return true;
  if (!existsSync(file)) return false;
  const { data, info } = await sharp(file).flatten({ background: "#ffffff" }).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const inked = (x, y) => {
    const i = (y * W + x) * 3;
    return Math.min(data[i], data[i + 1], data[i + 2]) < 240;
  };
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (!inked(x, y)) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return false;
  // A bottle or a tube is a solid rectangle too, but a narrow one; the staged
  // pictures fill the frame both ways. Only a near-square box can be a scene.
  const aspect = (x1 - x0 + 1) / (y1 - y0 + 1);
  if (aspect < 0.6 || aspect > 1 / 0.6) return false;
  let on = 0, all = 0;
  for (let x = x0; x <= x1; x += 3) {
    all += 2;
    on += inked(x, y0 + 2) + inked(x, y1 - 2);
  }
  for (let y = y0; y <= y1; y += 3) {
    all += 2;
    on += inked(x0 + 2, y) + inked(x1 - 2, y);
  }
  return on / all > 0.85;
}

const products = readJson(dataPath("products.json"));
const wordpress = new Map(
  readJson(path.join(ROOT, "scripts/.image-manifest.json")).entries
    .filter((e) => e.scale > 0)
    .map((e) => [String(e.sku), Math.round(860 / e.scale)])
);
const jaraFiles = existsSync(JARA_DIR) ? readdirSync(JARA_DIR).filter((f) => /\.png$/i.test(f)) : [];
const katalog = existsSync(path.join(KATALOG_DIR, "manifest.json"))
  ? readJson(path.join(KATALOG_DIR, "manifest.json")).entries.filter((e) => e.status === "ok" && e.file)
  : [];
const katalogBySku = new Map();
for (const e of katalog) {
  const k = String(e.sku);
  if (!katalogBySku.has(k)) katalogBySku.set(k, []);
  katalogBySku.get(k).push(path.join(KATALOG_DIR, e.file));
}

const results = [];
const queue = products.filter((p) => p.sku && p.images?.[0]);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      const sources = {};
      let scene = false;
      if (wordpress.has(p.sku)) {
        const flat = path.join(
          ROOT,
          "public",
          p.images[0].replace(/-cutout(-v\d+)?\.webp$/i, ".webp").replace(/-scene\.webp$/i, ".webp")
        );
        scene = await looksLikeScene(flat, p.sku);
        if (!scene) sources.wordpress = wordpress.get(p.sku);
      }
      const code = p.sku.toLowerCase();
      for (const f of jaraFiles.filter((f) => f.toLowerCase().startsWith(`shemo-${code}-`))) {
        sources.jara = Math.max(sources.jara ?? 0, await productPixels(path.join(JARA_DIR, f)));
      }
      for (const f of katalogBySku.get(p.sku) ?? []) {
        if (existsSync(f)) sources.katalog = Math.max(sources.katalog ?? 0, await productPixels(f));
      }
      const seg = path.join(SEGMENTED_DIR, `${p.sku}.png`);
      if (existsSync(seg)) sources.segmented = await productPixels(seg);
      const [bestSource, best] = Object.entries(sources).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
      results.push({ p, sources, best, bestSource, scene });
    }
  })
);

const tier = (px) => (px < 450 ? "soft" : px < 700 ? "retina" : "sharp");
const counts = { soft: 0, retina: 0, sharp: 0, none: 0 };
for (const r of results) {
  if (!r.bestSource) counts.none++;
  else counts[tier(r.best)]++;
}
const noPhoto = products.filter((p) => !p.images?.[0]);
const md = (s) => String(s ?? "").replace(/\|/g, "\\|");
const fmtSources = (s) =>
  Object.entries(s)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
const row = (r) =>
  `| ${md(r.p.sku)} | ${md(r.p.name)} | ${r.best || "—"} | ${fmtSources(r.sources) || "—"}${
    r.scene ? " (old shop: a staged picture, not counted)" : ""
  } |`;
const bySku = (a, b) => a.best - b.best || String(a.p.sku).localeCompare(String(b.p.sku));
// By the brand the taxonomy records, which is read off the packs themselves.
const froikaId = readJson(dataPath("categories.json")).find((c) => c.slug === "froika")?.id;
const froika = results.filter((r) => r.p.categoryIds?.includes(froikaId)).sort(bySku);

const lines = [
  `# Product photo sources — ${new Date().toISOString().slice(0, 10)}`,
  "",
  "How many pixels each product had in the best source file this project holds,",
  "on its longest side. Written by `scripts/audit-photo-sources.mjs`; see its",
  "header for why the served files cannot answer this themselves.",
  "",
  "The detail page draws a product up to ~465 CSS px tall (≈ 930 device px on a",
  "phone). Below 450 px a photo is soft everywhere; below 700 px on high-density",
  "screens. A better photo can only come from outside: the supplier's packshot,",
  "or a new photograph.",
  "",
  "| | Products |",
  "|---|---|",
  `| Soft on every screen (< 450 px) | ${counts.soft} |`,
  `| Soft on high-density screens (450–699 px) | ${counts.retina} |`,
  `| Sharp (≥ 700 px) | ${counts.sharp} |`,
  `| No packshot source (only a staged picture, or nothing) | ${counts.none} |`,
  `| No photo at all | ${noPhoto.length} |`,
  "",
  "## Froika",
  "",
  "The light Froika bottles read as blurry because every usable file this",
  "project has for them is small: the Jara PNGs and the old catalogue's photos",
  "are the same ~500 px remove.bg previews. Where the old shop's upload is",
  "larger, it is mostly a staged picture (a plinth, a water splash, a model) with",
  "the bottle a fraction of it — no sharper as a packshot. Checked on 2026-09-23:",
  "",
  "- Jara, the old catalogue, the old shop and the segmented cuts — the table below.",
  "- The Kimi image search for Jara (Downloads, master list of 9 460 articles):",
  "  three Froika articles, none of the AC range.",
  "- 7740 has a sharp 1 032 px photo in the Jara project, but of a newer pump",
  "  pack than the one shown now; worth using only if that is the pack SHEMO",
  "  delivers.",
  "",
  "What would fix them is the manufacturer's own packshots (Froika, ≥ 1 000 px).",
  "",
  "| Code | Product | Best px | Sources (px) |",
  "|---|---|---|---|",
  ...froika.map(row),
  "",
  "## Soft on every screen (< 450 px), smallest first",
  "",
  "| Code | Product | Best px | Sources (px) |",
  "|---|---|---|---|",
  ...results.filter((r) => r.bestSource && r.best < 450).sort(bySku).map(row),
  "",
];
if (noPhoto.length) {
  lines.push("## No photo", "", ...noPhoto.map((p) => `- ${md(p.sku)} ${md(p.name)}`), "");
}
writeFileSync(REPORT, lines.join("\n"));
console.log(counts, "no photo:", noPhoto.length);
console.log(`wrote ${path.relative(ROOT, REPORT)}`);
