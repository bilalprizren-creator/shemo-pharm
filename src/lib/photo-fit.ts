import "server-only";
import fits from "@/data/photo-fit.json";

/**
 * How large a product photo is drawn, relative to the standard framing.
 *
 * Every photo is framed by its longest side, so a slim bottle and a square
 * carton come out equally tall and the carton looks three times the size.
 * scripts/measure-photos.mjs measures each product's bounding box once and
 * writes a factor per photo — above 1 for the slim ones, a little below for the
 * bulky ones — which photoPresentation() turns into the photo's padding. See
 * that script for the formula and why its numbers are what they are.
 *
 * Server-only, because the table holds two thousand entries and no browser
 * needs it: the factor travels on the card (`CardProduct.imageFit`) and as a
 * prop to the gallery.
 *
 * A photo the table does not know — uploaded after the last measurement, a
 * remote URL, a picture drawn edge to edge — is drawn at 1, exactly as every
 * photo was drawn before the table existed.
 */
const FIT: Readonly<Record<string, number>> = fits;

export function photoFit(src: string | null | undefined): number {
  if (!src || !src.startsWith("/products/")) return 1;
  const name = src.slice("/products/".length);
  if (name.includes("/")) return 1;
  return FIT[name.replace(/\.(webp|png|jpe?g)$/i, "")] ?? 1;
}
