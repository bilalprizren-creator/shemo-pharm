/**
 * Put a product photo on a uniform white square.
 *
 * The catalog's source photos measure anywhere from 386x398 to 1030x1030 with
 * aspect ratios between 1:1 and 2:1, each carrying a different amount of baked-in
 * whitespace — so inside the square product cards one product looks huge and the
 * next tiny. Same treatment the brand logos get in scripts/trim-logos.mjs:
 * flatten onto white, whiten the near-white matte, crop to the bounding box of
 * the actual product, scale it to a fixed share of the canvas, centre it.
 *
 * Cropping to the bounding box never eats into the product itself, and white
 * *inside* the product is untouched.
 *
 * Shared by scripts/migrate-images.mjs and scripts/localize-images.mjs so the
 * pixels are identical whichever one produced them.
 */
import sharp from "sharp";

export const CANVAS = 1000; // final square, above the 540px PDP slot at ~2x
export const FILL = 0.86; // share of the canvas the product occupies
const WHITE_MIN = 240; // min(r,g,b) at or above this counts as background
const QUALITY = 82;

export async function reframe(input) {
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= WHITE_MIN) {
        data[i] = data[i + 1] = data[i + 2] = 255; // off-white matte -> crisp white
      } else {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  // An all-white source has no product to find — keep it whole rather than crop
  // it to nothing, and let the caller's report flag it.
  const blank = maxX < 0;
  const cropW = blank ? w : maxX - minX + 1;
  const cropH = blank ? h : maxY - minY + 1;

  const target = Math.round(CANVAS * FILL);
  const scale = target / Math.max(cropW, cropH);

  const mark = await sharp(Buffer.from(data), { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: blank ? 0 : minX, top: blank ? 0 : minY, width: cropW, height: cropH })
    .resize({
      width: Math.max(1, Math.round(cropW * scale)),
      height: Math.max(1, Math.round(cropH * scale)),
      fit: "fill",
      kernel: "lanczos3",
    })
    // Encode before compositing: a sharp pipeline fed raw pixels also returns
    // raw pixels, and composite() cannot read those without dimensions.
    .png()
    .toBuffer();

  const webp = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .flatten({ background: "#ffffff" })
    .webp({ quality: QUALITY })
    .toBuffer();

  // Tiny inline preview so cards can fade in instead of popping.
  const blur = await sharp(webp).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

  return {
    webp,
    blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
    source: `${w}x${h}`,
    markPct: Math.round(((cropW * cropH) / (w * h)) * 100),
    scale: Number(scale.toFixed(2)),
    blank,
  };
}
