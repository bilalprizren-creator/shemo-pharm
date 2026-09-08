/**
 * Builds the small copies of the product photographs.
 *
 *   node scripts/thumbnail-images.mjs                    # only what is missing or stale
 *   node scripts/thumbnail-images.mjs --force            # rebuild every one
 *   node scripts/thumbnail-images.mjs --variant print    # one variant only
 *
 * Why this exists. next/image used to resize the photographs on the way out,
 * and it is switched off: Vercel counts one transformation per image per width
 * per format, the Hobby plan allows 5 000, and a catalogue of 2 049 products
 * does not fit underneath that ceiling. Serving the sources directly brought
 * the pictures back, but a card is 280 CSS pixels and the sources are 1000, so
 * a listing page was carrying about four times the bytes it needs.
 *
 * So the resizing moves here, where it happens once per file instead of once
 * per request, and costs nothing at all against a quota.
 *
 * There are two variants, because the two surfaces want different things — see
 * VARIANTS below for what each one is for and why its numbers are what they are.
 *
 * Every file under public/products/ gets one of each, with no exceptions,
 * because thumbnailFor() and printImageFor() in src/lib/images.ts rewrite the
 * path arithmetically rather than looking anything up. tests/thumbnails.test.ts
 * fails if that stops being true, which is the guard against a photograph
 * arriving without its small copies and rendering as a broken image.
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

/*
 * Quality 75 throughout. Measured on 70 files spread across the range: q80
 * averages 15.1 KB, q75 13.0, q70 12.5, q65 11.9. Below 75 the curve flattens
 * and only the artefacts keep growing, so 75 is where the saving stops being
 * free. It is also the quality this project already trusts for small
 * renderings — next.config.ts keeps the 44-80px thumbnails there and reserves
 * 85 for the two large surfaces.
 */
const QUALITY = 75;

const VARIANTS = [
  {
    name: "thumb",
    dir: "thumb",
    /** 2x the widest a card is ever drawn. See ProductCard's `sizes`. */
    width: 560,
    /*
     * Transparency kept: a cut-out on a listing page sits on the card's own
     * background, which is not white everywhere and changes with the theme.
     */
    flatten: false,
  },
  {
    name: "print",
    dir: "print",
    /*
     * 384px across the 30mm box the print sheet draws is 325 dpi — past what
     * paper resolves, and half the pixels of the 560px thumbnail. A full run is
     * 1 713 photographs in one document: at 560 that is 537 megapixels for a
     * browser to decode before it can lay out 163 A4 pages, which is most of
     * the reason printing from the browser took minutes.
     */
    width: 384,
    /*
     * Flattened onto white, and this is the load-bearing part. A browser
     * writing a PDF stores a transparent image as Flate-compressed RGB plus a
     * soft mask, neither of which compresses the way a photograph does; opaque,
     * it stores JPEG. The sheet is white paper, so nothing is lost — and the
     * generated catalogue is ~15 MB rather than something nobody can download.
     */
    flatten: true,
  },
];

const SOURCE_DIR = path.join(process.cwd(), "public", "products");

const force = process.argv.includes("--force");
const only = (() => {
  const i = process.argv.indexOf("--variant");
  return i === -1 ? null : process.argv[i + 1];
})();

/** Only the pictures, and never the resized copies themselves. */
function isSource(name) {
  return /\.(webp|png|jpe?g)$/i.test(name);
}

/**
 * Skips a copy that is already newer than its source, so a rerun after adding
 * one photograph costs one encode rather than 4 574.
 */
async function isStale(source, out) {
  if (force || !existsSync(out)) return true;
  const [s, t] = await Promise.all([stat(source), stat(out)]);
  return s.mtimeMs > t.mtimeMs;
}

async function build(variant, files) {
  const outDir = path.join(SOURCE_DIR, variant.dir);
  await mkdir(outDir, { recursive: true });

  let written = 0;
  let skipped = 0;
  let sourceBytes = 0;
  let outBytes = 0;
  const failed = [];

  for (const name of files) {
    const source = path.join(SOURCE_DIR, name);
    // Always .webp out, whatever went in — neither surface has a reason to
    // carry a PNG, and the name stays otherwise identical so the path
    // arithmetic in src/lib/images.ts holds.
    const out = path.join(outDir, name.replace(/\.(png|jpe?g)$/i, ".webp"));

    try {
      if (await isStale(source, out)) {
        let pipeline = sharp(source)
          // `withoutEnlargement` so a source already smaller than the target is
          // copied rather than blown up into a blurry larger file.
          .resize({ width: variant.width, withoutEnlargement: true });
        if (variant.flatten) pipeline = pipeline.flatten({ background: "#ffffff" });
        await pipeline.webp({ quality: QUALITY }).toFile(out);
        written += 1;
      } else {
        skipped += 1;
      }
      const [s, t] = await Promise.all([stat(source), stat(out)]);
      sourceBytes += s.size;
      outBytes += t.size;
    } catch (err) {
      failed.push(`${name}: ${err.message}`);
    }
  }

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  console.log(
    `${variant.name} (${variant.width}px${variant.flatten ? ", on white" : ""}): ` +
      `${written} written · ${skipped} already current · ` +
      `${mb(sourceBytes)} → ${mb(outBytes)} ` +
      `(${Math.round((outBytes / sourceBytes) * 100)}% of the bytes)`
  );
  return failed;
}

async function main() {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`no such directory: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const wanted = only ? VARIANTS.filter((v) => v.name === only) : VARIANTS;
  if (!wanted.length) {
    console.error(
      `unknown variant "${only}" — expected one of ${VARIANTS.map((v) => v.name).join(", ")}`
    );
    process.exit(1);
  }

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && isSource(e.name))
    .map((e) => e.name)
    .sort();

  console.log(`${files.length} sources`);

  const failed = [];
  for (const variant of wanted) failed.push(...(await build(variant, files)));

  if (failed.length) {
    console.error(`\n${failed.length} failed:`);
    for (const f of failed.slice(0, 20)) console.error(`  ${f}`);
    process.exit(1);
  }
}

await main();
