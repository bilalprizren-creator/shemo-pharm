/**
 * Cut a product out of a photograph the flood fill cannot touch.
 *
 *   mkdir ../segment-model && cd ../segment-model
 *   npm init -y && npm i @imgly/background-removal-node     # 332 MB of weights
 *   SEGMENT_MODEL_DIR=../segment-model node scripts/segment-scenes.mjs --all-scenes
 *   SEGMENT_MODEL_DIR=../segment-model node scripts/segment-scenes.mjs --codes 3039,3058
 *   node scripts/segment-scenes.mjs --codes 3060              # a "box" product needs no model
 *   # the run exits non-zero if a crop clipped a product; look at
 *   # sources/segmented-proof.png before believing anything
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
 * The knobs, all of them eyes rather than arithmetic, because the failure is not
 * one a number separates — see sources/segmented/recipe.json:
 *
 *   crop  The model keeps every salient object, and a marketing photograph is
 *         usually staged with props: 2307's bottle comes back with the
 *         surfboards beside it, and they are the larger of the two. Segment a
 *         region that holds only the product. Fractions of the frame,
 *         [left, top, width, height], read off a grid laid over the original.
 *
 *         A hint, and only a hint. It says where to look, never where the
 *         product ends — that is the model's answer, and the check below is
 *         what keeps the two from being confused. Read it generously: a crop
 *         with room to spare costs a moment of the model's time, and a crop
 *         read tight costs a corner of the packaging.
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
 *   box   The rectangle itself, when the model cannot find it: fractions of the
 *         original, cut straight out and shipped opaque, model not consulted.
 *         Also the one thing here that runs without the model at all, so a
 *         rectangle can be corrected without a 332 MB download.
 *
 *         Nothing uses it yet, and that is the point: 3060's card is blue on a
 *         blue backdrop and looked like the case for it, but a crop with room in
 *         it and `pick: "centre"` found the card after all. A hand-read rectangle
 *         is worth ±20px where the mask is exact, so this is what to reach for
 *         once widening the crop has been tried and has not worked.
 *
 *   fills  This product genuinely reaches the edge of its crop, so the clipping
 *         check below should not complain about it. A statement in the recipe
 *         rather than a threshold in the code — and nothing carries it: every
 *         product the check named turned out to be really clipped, 6051 included,
 *         whose die-cut Olaf had an arm off. Reach for it only after looking.
 *
 * The check, which is the part that was missing. A cut whose kept rectangle
 * reaches the edge of its own crop was cut by the crop and not by the model —
 * the hand-read grid decided where the product ended, and a grid read to ±2% is
 * ±20px of packaging. Commit 681b958 found eleven of these by measuring the
 * alpha against the frame, fixed ten crops, and never committed the measurement;
 * commit 2566c15 then added `rect`, whose output is opaque edge to edge, and an
 * alpha test cannot see anything in that. So it is measured here, on the
 * rectangle rather than on the alpha, before the opaque cut is made — and the
 * run fails rather than reports, because the last time it only reported, five
 * packs shipped cut.
 *
 * Re-runnable: it always recomputes, because the recipe is what changes between
 * runs and a cached answer would hide that.
 *
 * Every run leaves sources/segmented-proof.png: each original with its crop drawn
 * on it, next to what came back. Clipping is obvious in that pairing and invisible
 * in a directory of PNGs, and rebuilding it by hand is how the five packs were
 * found. Beside the folder rather than in it, because cutout-images.mjs reads that
 * folder as "every .png in it is an article code, and the listing is the index".
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, dataPath, readJson } from "./lib/db.mjs";
import { skuKeys } from "./lib/catalog-html.mjs";

const argv = process.argv.slice(2);
const at = (flag) => {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
};
const ALL = argv.includes("--all-scenes");
const CODES = (at("--codes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const OUT = path.join(ROOT, "sources/segmented");
const RECIPE_FILE = path.join(OUT, "recipe.json");
const SHEET = path.join(OUT, "segmented.json");
// Beside the folder, never in it: cutout-images.mjs indexes that folder by taking
// every .png in it for an article code, and a proof sheet is not a product.
const PROOF = path.join(ROOT, "sources/segmented-proof.png");
// How near its crop's edge a rectangle may sit before the crop, and not the
// model, is what put it there. The box is rounded into place, so not zero.
const EDGE = 2;
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
 * The model, and only when this run has something to ask it.
 *
 * A `box` product is a rectangle somebody read by hand; nothing about it needs
 * 332 MB of weights, and requiring them anyway would make re-cutting one of
 * those a download rather than a command. So the recipe decides, before
 * anything is loaded, whether the model is wanted at all.
 */
const needsModel = wanted.some((code) => !recipe[code]?.box);
let removeBackground = null;
if (needsModel) {
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
  ({ removeBackground } = await import(pathToFileURL(modelEntry).href));
}

/**
 * sharp after the model, and that order is the whole reason it is a dynamic
 * import rather than a line at the top of the file.
 *
 * Measured: model first then sharp works; sharp first then model ends the
 * process with a segmentation fault before either has done anything. Two
 * native libraries in one process, and only one order of loading them survives.
 * A static `import sharp from "sharp"` is hoisted above everything here, so the
 * order cannot be expressed any other way — and it is why the block above,
 * which may skip the model entirely, still has to come first when it does not.
 */
const sharp = (await import("sharp")).default;

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

/**
 * Where the alpha actually stops. The silhouette path's answer to what `rect`
 * gets from `dense()`, so both can be held against the same crop window.
 */
async function alphaBox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

const report = [];
const clipped = [];
const proofs = [];
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
  const meta = await sharp(source).metadata();
  const pixels = ([l, t, w, h]) => ({
    left: Math.round(l * meta.width),
    top: Math.round(t * meta.height),
    width: Math.round(w * meta.width),
    height: Math.round(h * meta.height),
  });

  // The crop window in the original's pixels, and what every measurement below
  // is taken against. Without a crop it is the whole photograph, and then there
  // is no hand-read rectangle for anything to be blamed on.
  const frame = rule.crop
    ? pixels(rule.crop)
    : { left: 0, top: 0, width: meta.width, height: meta.height };

  let cut;
  let piece = { pieces: 0, kept: 100 };
  let kept = null; // what survived, in the crop window's own pixels

  if (rule.box) {
    // The rectangle somebody read by hand. The model is not asked and the check
    // does not apply: the recipe is not guessing here, it is stating.
    cut = await sharp(source).extract(pixels(rule.box)).removeAlpha().ensureAlpha().png().toBuffer();
  } else {
    // PNG on the way in: the model reads a Blob and decodes by MIME type, and it
    // has no decoder for the WebP everything here is stored as.
    const png = await (rule.crop ? sharp(source).extract(frame) : sharp(source)).png().toBuffer();
    const blob = await removeBackground(new Blob([png], { type: "image/png" }), {
      output: { format: "image/png" },
    });
    let mask = Buffer.from(await blob.arrayBuffer());
    piece = await pickPiece(mask, rule.alpha ?? 16, rule.pick ?? "centre");
    // The floor applies whether or not the pieces are being reduced to one: it is
    // about what the model was sure of, not about how many objects it found.
    mask = rule.one === false ? piece.all : piece.buf;

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
      const { data, info } = await sharp(mask).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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
        const floor = Math.max(...counts) * (rule.dense ?? 0.15);
        let lo = 0, hi = counts.length - 1;
        while (lo < counts.length && counts[lo] < floor) lo++;
        while (hi >= 0 && counts[hi] < floor) hi--;
        return [lo, hi];
      };
      const [minX, maxX] = dense(cols);
      const [minY, maxY] = dense(rows);
      if (maxX < minX || maxY < minY) throw new Error(`${code}: the model found nothing to take a rectangle from`);
      const pad = Math.round((rule.pad ?? 0) * Math.max(maxX - minX + 1, maxY - minY + 1));
      kept = {
        left: Math.max(0, minX - pad),
        top: Math.max(0, minY - pad),
        width: Math.min(w, maxX + 1 + pad) - Math.max(0, minX - pad),
        height: Math.min(h, maxY + 1 + pad) - Math.max(0, minY - pad),
      };
      // Opaque on purpose: cutout-images.mjs frames whatever is opaque, so a fully
      // opaque rectangle lands at the same 86% as every silhouette beside it.
      cut = await sharp(png).extract(kept).removeAlpha().ensureAlpha().png().toBuffer();
    } else {
      kept = await alphaBox(mask);
      cut = mask;
    }
  }

  /**
   * Which sides the product ends on because the crop said so.
   *
   * A rectangle flush against the window it was cut from did not find its own
   * edge there — the crop did, and a crop is a number somebody read off a grid.
   * Two pixels of tolerance, because the box is rounded into place.
   */
  const touching = [];
  if (rule.crop && kept && !rule.fills) {
    if (kept.left <= EDGE) touching.push("left");
    if (kept.top <= EDGE) touching.push("top");
    if (kept.left + kept.width >= frame.width - EDGE) touching.push("right");
    if (kept.top + kept.height >= frame.height - EDGE) touching.push("bottom");
  }
  if (touching.length) clipped.push({ code, name: product.name, sides: touching });

  const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] <= 8) clear++;
  const clearPct = +((100 * clear) / (info.width * info.height)).toFixed(1);

  /**
   * How much of the window came back — printed, never enforced.
   *
   * The other way a product is lost is not by clipping but by collapse: the model
   * finds one piece of it and the rectangle closes around that. 3060's blister
   * card is blue on a blue backdrop, so what came back was the toothbrush lying on
   * it — 20% of the window's width, where the fifteen correct answers measure
   * 36-84%. Obvious in a column, invisible in a directory of PNGs.
   *
   * Not a threshold, because a product may legitimately be small in a window read
   * generously, and the gap between 20 and 36 is one run's worth of evidence and
   * not a law. The number is here to be looked at, beside the proof sheet.
   */
  const ofFrame = kept
    ? [+((100 * kept.width) / frame.width).toFixed(0), +((100 * kept.height) / frame.height).toFixed(0)]
    : null;

  writeFileSync(path.join(OUT, `${code}.png`), cut);
  proofs.push({ code, source, frame, kept, cut: path.join(OUT, `${code}.png`) });
  report.push({
    code,
    name: product.name,
    pieces: piece.pieces,
    keptPct: piece.kept,
    clearPct,
    crop: rule.crop ?? null,
    box: rule.box ?? null,
    ofFrame,
    clipped: touching.length ? touching : null,
    onePiece: rule.one !== false,
  });
  console.log(
    `${code.padEnd(6)} ${((Date.now() - started) / 1000).toFixed(1).padStart(5)}s  ` +
      `pieces=${String(piece.pieces).padStart(3)} kept=${String(piece.kept).padStart(5)}%  ` +
      `clear=${String(clearPct).padStart(5)}%  ` +
      `frame=${(ofFrame ? `${ofFrame[0]}x${ofFrame[1]}%` : "  by hand").padStart(9)}` +
      `${touching.length ? `  CLIPPED ${touching.join("+")}` : ""}  ${product.name.slice(0, 34)}`
  );
}

/**
 * The proof sheet: each original with its crop drawn on it, beside what came
 * back from it.
 *
 * Clipping is obvious in that pairing and invisible in a directory of PNGs —
 * the five packs that shipped cut were found by building this by hand, and it
 * should not have to be built by hand again.
 */
if (proofs.length) {
  const S = 300;
  const cols = 2; // pairs across
  const rows = Math.ceil(proofs.length / cols);
  const tiles = [];
  for (const [i, p] of proofs.entries()) {
    const x = (i % cols) * S * 2;
    const y = Math.floor(i / cols) * S;
    const meta = await sharp(p.source).metadata();
    const scale = S / Math.max(meta.width, meta.height);
    const inset = { x: (S - meta.width * scale) / 2, y: (S - meta.height * scale) / 2 };
    const at = (v, axis) => inset[axis] + v * scale;
    const marks =
      `<rect x="${at(p.frame.left, "x")}" y="${at(p.frame.top, "y")}" ` +
      `width="${p.frame.width * scale}" height="${p.frame.height * scale}" ` +
      `fill="none" stroke="#ff00ff" stroke-width="1.5"/>` +
      (p.kept
        ? `<rect x="${at(p.frame.left + p.kept.left, "x")}" y="${at(p.frame.top + p.kept.top, "y")}" ` +
          `width="${p.kept.width * scale}" height="${p.kept.height * scale}" ` +
          `fill="none" stroke="#00c000" stroke-width="1.5"/>`
        : "");
    const svg =
      `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg">${marks}` +
      `<text x="4" y="15" font-size="14" font-family="monospace" fill="#c00000">${p.code}</text></svg>`;
    const shot = await sharp(p.source).resize(S, S, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    tiles.push({ input: await sharp(shot).composite([{ input: Buffer.from(svg) }]).png().toBuffer(), left: x, top: y });
    tiles.push({
      input: await sharp(p.cut).resize(S, S, { fit: "contain", background: "#ffffff" }).png().toBuffer(),
      left: x + S,
      top: y,
    });
  }
  const sheet = await sharp({
    create: { width: cols * S * 2, height: rows * S, channels: 3, background: "#b0b0b0" },
  })
    .composite(tiles)
    .png()
    .toBuffer();
  writeFileSync(PROOF, sheet);
}

// Merged, not replaced: a run names the codes it was given, and overwriting left
// the file describing two products out of forty-one.
const previous = existsSync(SHEET) ? JSON.parse(readFileSync(SHEET, "utf8")) : [];
const merged = new Map(previous.map((r) => [r.code, r]));
for (const r of report) merged.set(r.code, r);
writeFileSync(
  SHEET,
  JSON.stringify([...merged.values()].sort((a, b) => a.code.localeCompare(b.code)), null, 1)
);

console.log(`\n${report.length} cut out into sources/segmented/`);
console.log(`  sources/segmented-proof.png   each crop drawn on its original, beside the cut`);

if (clipped.length) {
  console.error(`\n${clipped.length} cut by the crop rather than by the model:\n`);
  for (const c of clipped) {
    console.error(`  ${c.code.padEnd(6)} reaches its crop on the ${c.sides.join(" and ")}  ${c.name}`);
  }
  console.error(
    `\nThe crop says where to look, never where the product ends. Widen it in\n` +
      `sources/segmented/recipe.json and run again — or, if the product really does\n` +
      `fill its frame, say so there with "fills": true.\n` +
      `\nNothing was written to any database; the PNGs above are on disk and wrong.`
  );
  process.exit(1);
}

console.log(`Nothing is live yet: review them, then`);
console.log(`  node scripts/cutout-images.mjs --segmented          # writes the images`);
console.log(`  node scripts/cutout-images.mjs --segmented --write  # points the database at them`);
