/**
 * Builds the small copies the product grid uses.
 *
 *   node scripts/thumbnail-images.mjs           # only what is missing or stale
 *   node scripts/thumbnail-images.mjs --force   # rebuild every one
 *
 * Why this exists. next/image used to resize the photographs on the way out,
 * and it is switched off: Vercel counts one transformation per image per width
 * per format, the Hobby plan allows 5 000, and a catalogue of 2 049 products
 * does not fit underneath that ceiling. Serving the sources directly brought
 * the pictures back, but a card is 280 CSS pixels and the sources are 1000, so
 * a listing page was carrying about four times the bytes it needs.
 *
 * So the resizing moves here, where it happens once per file instead of once
 * per request, and costs nothing at all against a quota. WIDTH is 560 because
 * the largest a card is ever drawn is 280 CSS pixels (the `sizes` attribute in
 * ProductCard says so) and a 2x screen wants twice that. The detail page is a
 * different matter — it draws 432, so 864 on a 2x screen — and it keeps using
 * the full-size source.
 *
 * Every file under public/products/ gets one, with no exceptions, because
 * thumbnailFor() in src/lib/images.ts rewrites the path arithmetically rather
 * than looking anything up. tests/thumbnails.test.ts fails if that stops being
 * true, which is the guard against a photograph arriving without its small
 * copy and rendering as a broken image.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

/** 2x the widest a card is ever drawn. See ProductCard's `sizes`. */
const WIDTH = 560;
/*
 * Measured on 70 files spread across the range: q80 averages 15.1 KB, q75 13.0,
 * q70 12.5, q65 11.9. Below 75 the curve flattens and only the artefacts keep
 * growing, so 75 is where the saving stops being free. It is also the quality
 * this project already trusts for small renderings — next.config.ts keeps the
 * 44-80px thumbnails there and reserves 85 for the two large surfaces.
 */
const QUALITY = 75;

const SOURCE_DIR = path.join(process.cwd(), "public", "products");
export const THUMB_DIR = path.join(SOURCE_DIR, "thumb");

const force = process.argv.includes("--force");

/** Only the pictures, and never the thumbnails themselves. */
function isSource(name) {
  return /\.(webp|png|jpe?g)$/i.test(name);
}

/**
 * Skips a thumbnail that is already newer than its source, so a rerun after
 * adding one photograph costs one encode rather than 4 574.
 */
async function isStale(source, thumb) {
  if (force || !existsSync(thumb)) return true;
  const [s, t] = await Promise.all([stat(source), stat(thumb)]);
  return s.mtimeMs > t.mtimeMs;
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`no such directory: ${SOURCE_DIR}`);
    process.exit(1);
  }
  await mkdir(THUMB_DIR, { recursive: true });

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && isSource(e.name))
    .map((e) => e.name)
    .sort();

  let written = 0;
  let skipped = 0;
  let sourceBytes = 0;
  let thumbBytes = 0;
  const failed = [];

  for (const name of files) {
    const source = path.join(SOURCE_DIR, name);
    // Always .webp out, whatever went in — the grid has no reason to carry a
    // PNG, and the name stays otherwise identical so the path arithmetic in
    // thumbnailFor() holds.
    const thumbName = name.replace(/\.(png|jpe?g)$/i, ".webp");
    const thumb = path.join(THUMB_DIR, thumbName);

    try {
      if (await isStale(source, thumb)) {
        await sharp(source)
          // `withoutEnlargement` so a source already smaller than 560 is copied
          // rather than blown up into a blurry larger file.
          .resize({ width: WIDTH, withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toFile(thumb);
        written += 1;
      } else {
        skipped += 1;
      }
      const [s, t] = await Promise.all([stat(source), stat(thumb)]);
      sourceBytes += s.size;
      thumbBytes += t.size;
    } catch (err) {
      failed.push(`${name}: ${err.message}`);
    }
  }

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(
    `${files.length} sources · ${written} written · ${skipped} already current`
  );
  console.log(
    `sources ${mb(sourceBytes)} → thumbnails ${mb(thumbBytes)} ` +
      `(${Math.round((thumbBytes / sourceBytes) * 100)}% of the bytes)`
  );
  if (failed.length) {
    console.error(`\n${failed.length} failed:`);
    for (const f of failed.slice(0, 20)) console.error(`  ${f}`);
    process.exit(1);
  }
}

await main();
