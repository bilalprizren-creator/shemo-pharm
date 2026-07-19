/**
 * Normalize partner-brand logos to a consistent size and margin.
 *
 * Every source logo is an OPAQUE image with a white (a few: very-light-gray)
 * background and a different amount of white padding baked in — so inside equal
 * cards some logos looked large and others tiny (see the logo prompt: "logos
 * appear too small", "do not allow one logo to dominate because its source file
 * has more empty space", "compensate for excessive padding").
 *
 * The brand cards are white, so we keep a white background and simply:
 *   1. whiten any near-white / off-white matte to pure #fff,
 *   2. crop to the bounding box of the actual (non-white) mark,
 *   3. re-pad with a uniform white margin (~10% of the longer side),
 *   4. save an optimized PNG in place.
 *
 * Cropping to the bounding box never removes white *inside* the mark, so no logo
 * is holed, recoloured, upscaled, stretched, or downloaded. Re-runnable.
 *
 * Usage: node scripts/trim-logos.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BRANDS_DIR = path.join(__dirname, "..", "public", "brands");

const WHITE_MIN = 240; // min(r,g,b) >= this counts as white background
const MARGIN_RATIO = 0.1; // uniform white margin, share of the longer mark side

async function processLogo(file) {
  const filePath = path.join(BRANDS_DIR, file);
  const input = await readFile(filePath);
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" }) // drop any real transparency onto white
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const isWhite = Math.min(r, g, b) >= WHITE_MIN;
      if (isWhite) {
        // Normalize off-white/gray matte to crisp white.
        data[i] = data[i + 1] = data[i + 2] = 255;
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    console.log(`${file.padEnd(20)} SKIP (all white)`);
    return;
  }
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const margin = Math.round(Math.max(cropW, cropH) * MARGIN_RATIO);

  const output = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .extend({
      top: margin, bottom: margin, left: margin, right: margin,
      background: "#ffffff",
    })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(filePath, output);

  const before = `${w}x${h}`;
  const after = `${cropW + margin * 2}x${cropH + margin * 2}`;
  console.log(
    `${file.padEnd(20)} ${before} -> ${after}  mark ${((cropW / w) * 100).toFixed(0)}%x${((cropH / h) * 100).toFixed(0)}%` +
      `  ${(input.length / 1024).toFixed(0)}K -> ${(output.length / 1024).toFixed(0)}K`
  );
}

async function main() {
  const files = (await readdir(BRANDS_DIR)).filter((f) => f.endsWith(".png")).sort();
  console.log(`Normalizing ${files.length} brand logos\n`);
  for (const file of files) {
    try {
      await processLogo(file);
    } catch (err) {
      console.error(`FAILED ${file}: ${err.message}`);
    }
  }
  console.log("\nDone.");
}

main();
