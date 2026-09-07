/**
 * Cut a product out of a photograph the flood fill cannot touch.
 *
 *   mkdir ../segment-model && cd ../segment-model
 *   npm init -y && npm i @imgly/background-removal-node     # 332 MB of weights
 *   SEGMENT_MODEL_DIR=../segment-model node scripts/segment-scenes.mjs --all-scenes
 *   SEGMENT_MODEL_DIR=../segment-model node scripts/segment-scenes.mjs --codes 3039,3058
 *   node scripts/cutout-images.mjs --segmented --write
 *
 * scripts/cutout-images.mjs can only separate a product from a background it
 * can walk in from: a white border, or a flat colour it has been handed. A tube
 * on a Winx pattern, a bottle staged on a beach, a jar on a coloured sweep —
 * those it either leaves alone (SCENE_PHOTOS, shipped full bleed as a picture)
 * or takes apart. Neither of the two alpha archives holds them: measured over
 * the 66 scene photos, Jara has 2 and shemo-katalog.com has 9, and those nine
 * are the ones already dealt with.
 *
 * This is the remaining answer — a segmentation model, which finds the salient
 * object rather than a background. It writes plain RGBA PNGs into
 * sources/segmented/<code>.png, and cutout-images.mjs reads that folder as its
 * most trusted source: a file being there is a decision somebody made about
 * that one product, which is more than any of the automatic paths can claim.
 *
 * Why the model is not a dependency of this project, and must not become one:
 * 332 MB of ONNX weights for something run by hand a few times a year, in an app
 * whose whole node_modules is smaller than that — and, measured, it does not
 * survive this project's node_modules. Installed here, the first
 * removeBackground() call ends the process with a segmentation fault; installed
 * in a folder of its own and reached through SEGMENT_MODEL_DIR, the identical
 * code runs. Both it and sharp load native binaries, and only that arrangement
 * keeps them apart.
 *
 * Two knobs, both eyes rather than arithmetic, because the failure is not one a
 * number separates — see sources/segmented/recipe.json:
 *
 *   crop  The model keeps every salient object, and a marketing photograph is
 *         usually staged with props: 2307's bottle comes back with the
 *         surfboards beside it, and they are the larger of the two. Segment a
 *         region that holds only the product. Fractions of the frame,
 *         [left, top, width, height], read off a grid laid over the original.
 *
 *   one   Keep only the largest connected piece, which is the default. It drops
 *         a prop that stands apart (the painted sun beside 2308's bottle) but
 *         not one that touches the product (3058's spiderman balls overlap the
 *         tube, so they survive it and need a crop instead). Set false where a
 *         product is genuinely two pieces — a carton beside its tube.
 *
 *   alpha The model's own confidence, used as the knife. On a blister pack lying
 *         on printed wrapping paper it is certain about the pack and hesitant
 *         about the characters printed behind it, so the leftovers come back
 *         faint — a pale ghost of a paw or a spider hanging off the product.
 *         Anything under this alpha is cut away before the pieces are counted,
 *         which also breaks the faint bridges that were keeping a ghost attached
 *         and let `one` drop it. 16 (the default) keeps everything the model
 *         admitted to; 200 keeps only what it was sure of. Above ~230 the
 *         product's own anti-aliased edge starts to go, so it is raised per
 *         product rather than globally.
 *
 * Re-runnable: it always recomputes, because the recipe is what changes between
 * runs and a cached answer would hide that.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, dataPath, readJson } from "./lib/db.mjs";
import { skuKeys } from "./lib/catalog-html.mjs";

const MODEL_DIR = process.env.SEGMENT_MODEL_DIR;
if (!MODEL_DIR) {
  throw new Error(
    "SEGMENT_MODEL_DIR is not set. The model lives in a folder of its own, " +
      "never in this project's node_modules (see the note above):\n" +
      "  mkdir ../segment-model && cd ../segment-model\n" +
      "  npm init -y && npm i @imgly/background-removal-node\n" +
      "  SEGMENT_MODEL_DIR=../segment-model node scripts/segment-scenes.mjs --all-scenes"
  );
}
const modelEntry = path.resolve(
  MODEL_DIR,
  "node_modules/@imgly/background-removal-node/dist/index.mjs"
);
if (!existsSync(modelEntry)) throw new Error(`no model at ${modelEntry}`);
// The model finds its own weights relative to the working directory, not to the
// module that imported it, so it has to be run from where it is installed.
// Everything this script touches is an absolute path off ROOT, so moving is free.
process.chdir(path.resolve(MODEL_DIR));
const { removeBackground } = await import(pathToFileURL(modelEntry).href);

/**
 * sharp after the model, and that order is the whole reason it is a dynamic
 * import rather than a line at the top of the file.
 *
 * Measured: model first then sharp works; sharp first then model ends the
 * process with a segmentation fault before either has done anything. Two
 * native libraries in one process, and only one order of loading them survives.
 * A static `import sharp from "sharp"` is hoisted above everything here, so the
 * order cannot be expressed any other way.
 */
const sharp = (await import("sharp")).default;

const argv = process.argv.slice(2);
const at = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
};
const ALL = argv.includes("--all-scenes");
const CODES = (at("--codes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const OUT = path.join(ROOT, "sources/segmented");
const RECIPE_FILE = path.join(OUT, "recipe.json");
mkdirSync(OUT, { recursive: true });
const recipe = existsSync(RECIPE_FILE) ? JSON.parse(readFileSync(RECIPE_FILE, "utf8")) : {};

const products = readJson(dataPath("products.json"));
const byCode = new Map();
for (const p of products) for (const k of skuKeys(p.sku)) if (!byCode.has(k)) byCode.set(k, p);
const lookup = (code) => skuKeys(code).map((k) => byCode.get(k)).find(Boolean) ?? null;

// The scene list lives in cutout-images.mjs, which is where it is reviewed; read
// it rather than keeping a second copy that can drift out of step with it.
const cutter = readFileSync(path.join(ROOT, "scripts/cutout-images.mjs"), "utf8");
const from = cutter.indexOf("const SCENE_PHOTOS = new Set([");
const scenes = [...cutter.slice(from, cutter.indexOf("]);", from)).matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const wanted = ALL ? scenes : CODES;
if (wanted.length === 0) throw new Error("nothing to do: pass --all-scenes or --codes a,b,c");

/**
 * Pick the piece of alpha that is the product, and say what the pieces held.
 *
 * Flood fill over the mask rather than sharp: this asks a question about the
 * shape of the alpha, which no image operation answers.
 */
async function pickPiece(buf, floor = 16, mode = "centre") {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Everything the model was unsure of goes first, so a ghost hanging off the
  // product by a few faint pixels becomes a piece of its own and can be dropped.
  if (floor > 16) for (let i = 3; i < data.length; i += 4) if (data[i] < floor) data[i] = 0;
  const alphaAt = (i) => data[i * 4 + 3];
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  const stack = [];
  for (let seed = 0; seed < w * h; seed++) {
    if (label[seed] !== -1 || alphaAt(seed) <= 16) continue;
    const id = sizes.length;
    let n = 0;
    stack.push(seed);
    label[seed] = id;
    while (stack.length) {
      const i = stack.pop();
      n++;
      const x = i % w;
      const y = (i / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (label[j] === -1 && alphaAt(j) > 16) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    sizes.push(n);
  }
  const asPng = (bytes) =>
    sharp(bytes, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const all = await asPng(data);
  if (sizes.length === 0) return { buf: all, all, pieces: 0, kept: 0 };

  /**
   * Which piece is the product.
   *
   * "largest" is the obvious answer and the wrong one for half of these. The
   * children's line is photographed on printed wrapping paper, and the printed
   * characters are objects to the model too — on 3049 the Minions cover more of
   * the frame than the toothbrush does.
   *
   * "centre" is the answer the photographs themselves give: the product is what
   * the picture is of, so it is in the middle, and the paper is what surrounds
   * it. Scored rather than picked by the centre pixel alone, because the centre
   * can land in a gap — a blister's hang-hole, the space between a brush's
   * bristles — so a piece is judged on how much of it lies in the middle third
   * and how near its own middle is to the frame's.
   */
  const centres = sizes.map(() => ({ n: 0, sx: 0, sy: 0, mid: 0 }));
  const bandX0 = w / 3, bandX1 = (2 * w) / 3;
  for (let i = 0; i < w * h; i++) {
    const id = label[i];
    if (id === -1) continue;
    const x = i % w, y = (i / w) | 0;
    const c = centres[id];
    c.n++; c.sx += x; c.sy += y;
    if (x >= bandX0 && x <= bandX1) c.mid++;
  }
  const score = centres.map((c) => {
    const dx = (c.sx / c.n - w / 2) / w;
    const dy = (c.sy / c.n - h / 2) / h;
    const pull = 1 - Math.min(1, Math.hypot(dx, dy) * 2); // 1 dead centre, 0 at a corner
    return (c.mid / c.n) * pull * Math.sqrt(c.n);
  });
  const keep = mode === "centre" ? score.indexOf(Math.max(...score)) : sizes.indexOf(Math.max(...sizes));

  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) if (label[i] !== keep) out[i * 4 + 3] = 0;
  return {
    buf: await asPng(out),
    all,
    pieces: sizes.length,
    kept: +((100 * sizes[keep]) / sizes.reduce((a, b) => a + b, 0)).toFixed(1),
  };
}

const report = [];
for (const code of wanted) {
  const product = lookup(code);
  if (!product) {
    console.log(`${code}: no product carries this code`);
    continue;
  }
  // The original, never the scene file: a scene file is the picture already
  // trimmed to its own edges, and trimming is not what has to be undone here.
  const stem = path.basename(product.images[0], ".webp").replace(/-(scene|cutout(-v\d+)?)$/, "");
  const source = path.join(ROOT, "public/products", `${stem}.webp`);
  if (!existsSync(source)) {
    console.log(`${code}: no original beside ${product.images[0]}`);
    continue;
  }

  const started = Date.now();
  const rule = recipe[code] ?? {};
  let input = sharp(source);
  if (rule.crop) {
    const meta = await sharp(source).metadata();
    const [left, top, width, height] = rule.crop;
    input = sharp(source).extract({
      left: Math.round(left * meta.width),
      top: Math.round(top * meta.height),
      width: Math.round(width * meta.width),
      height: Math.round(height * meta.height),
    });
  }
  // PNG on the way in: the model reads a Blob and decodes by MIME type, and it
  // has no decoder for the WebP everything here is stored as.
  const png = await input.png().toBuffer();
  const blob = await removeBackground(new Blob([png], { type: "image/png" }), {
    output: { format: "image/png" },
  });
  let cut = Buffer.from(await blob.arrayBuffer());
  const piece = await pickPiece(cut, rule.alpha ?? 16, rule.pick ?? "centre");
  // The floor applies whether or not the pieces are being reduced to one: it is
  // about what the model was sure of, not about how many objects it found.
  cut = rule.one === false ? piece.all : piece.buf;

  /**
   * `rect`: use the model to *find* the product, then cut the original at that
   * rectangle instead of at the product's outline.
   *
   * For anything that is already a rectangle — a blister card, a boxed set, a
   * carton — this is the better answer and the simpler one. Tracing the outline
   * of a card gains nothing, because the card has no interesting outline, and it
   * loses something real: the model reads the card's own white as background and
   * eats it, so a pack with a white margin comes back with holes in it. A
   * rectangle keeps every pixel the photographer put there.
   *
   * The model still does the hard part. Finding the card by hand means reading a
   * crop off a grid, and a grid read to ±2% is ±20px, which is how eleven of
   * these ended up clipped. The mask's bounding box is exact.
   */
  if (rule.rect) {
    const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    /**
     * The edge is where the mask gets dense, not where its last pixel is.
     *
     * An outermost-pixel box is inflated by every scrap the model left behind —
     * half a printed paw, the corner of a cartoon — and the rectangle then
     * carries a rim of wrapping paper. A column that is part of the card is
     * opaque down most of its length; a column that only holds a scrap is opaque
     * for a few pixels. Cutting at a fraction of the busiest column separates the
     * two without knowing anything about either.
     */
    const cols = new Int32Array(w);
    const rows = new Int32Array(h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 16) { cols[x]++; rows[y]++; }
      }
    }
    const dense = (counts) => {
      const cut = Math.max(...counts) * (rule.dense ?? 0.15);
      let lo = 0, hi = counts.length - 1;
      while (lo < counts.length && counts[lo] < cut) lo++;
      while (hi >= 0 && counts[hi] < cut) hi--;
      return [lo, hi];
    };
    const [minX, maxX] = dense(cols);
    const [minY, maxY] = dense(rows);
    if (maxX < minX || maxY < minY) throw new Error(`${code}: the model found nothing to take a rectangle from`);
    const pad = Math.round((rule.pad ?? 0) * Math.max(maxX - minX + 1, maxY - minY + 1));
    const box = {
      left: Math.max(0, minX - pad),
      top: Math.max(0, minY - pad),
      width: Math.min(w, maxX + 1 + pad) - Math.max(0, minX - pad),
      height: Math.min(h, maxY + 1 + pad) - Math.max(0, minY - pad),
    };
    // Opaque on purpose: cutout-images.mjs frames whatever is opaque, so a fully
    // opaque rectangle lands at the same 86% as every silhouette beside it.
    cut = await sharp(png).extract(box).removeAlpha().ensureAlpha().png().toBuffer();
  }

  const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] <= 8) clear++;
  const clearPct = +((100 * clear) / (info.width * info.height)).toFixed(1);

  writeFileSync(path.join(OUT, `${code}.png`), cut);
  report.push({
    code,
    name: product.name,
    pieces: piece.pieces,
    keptPct: piece.kept,
    clearPct,
    crop: rule.crop ?? null,
    onePiece: rule.one !== false,
  });
  console.log(
    `${code.padEnd(6)} ${((Date.now() - started) / 1000).toFixed(1).padStart(5)}s  ` +
      `pieces=${String(piece.pieces).padStart(3)} kept=${String(piece.kept).padStart(5)}%  ` +
      `clear=${String(clearPct).padStart(5)}%${rule.crop ? "  cropped" : ""}  ${product.name.slice(0, 34)}`
  );
}

writeFileSync(path.join(OUT, "segmented.json"), JSON.stringify(report, null, 1));
console.log(`\n${report.length} cut out into sources/segmented/`);
console.log(`Nothing is live yet: review them, then`);
console.log(`  node scripts/cutout-images.mjs --segmented          # writes the images`);
console.log(`  node scripts/cutout-images.mjs --segmented --write  # points the database at them`);
