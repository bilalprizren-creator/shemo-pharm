import type { CSSProperties } from "react";

/**
 * The well every product photo sits in.
 *
 * Most of the range carries a real alpha channel (scripts/cutout-images.mjs),
 * and what that buys is a product that can stand on any ground. The ground it
 * stands on is plain white, and the page around it is a very light cool grey
 * (`surface`, #f7f8fa), so the white wells and cards lift off the page by
 * themselves and the packaging is seen in neutral light.
 *
 * It was not always white. Until 2026-09-23 the well was a gradient from white
 * down to warm ivory (#f7f5f0), under a two-part warm shadow with a 24 px
 * throw, on an ivory page. Each of those was reasoned — a horizon for the
 * product, a shadow that matched warm paper — but together they tinted the
 * white cartons that most of this range is, and the wide throw read as a grey
 * smudge under every small bottle. The owner asked for neutral white image
 * surfaces and clearer packaging, and seen side by side on the proof sheet
 * (scripts/measure-photos.mjs --proof) they are simply cleaner.
 *
 * What seats a product on white is the shadow on the photo itself (the
 * caller's job, since the sizes differ) — see PHOTO_SHADOW below.
 *
 * What was tried and rejected, and should stay rejected: painting an elliptical
 * contact pool onto the ground instead of leaning on the shadow. A painted
 * ellipse has to assume one central foot at a fixed height, and products do not
 * oblige — the four-footed walking stick 8840 splays its feet to the corners, a
 * carton sits flat and wide — so it lands behind the product as often as under
 * it and reads as a stain. A shadow cast from the alpha follows whatever shape
 * the product actually has, which is the whole point of having the alpha.
 *
 * Shared rather than repeated because the card, the detail gallery, the
 * gallery's thumbnails, the catalogue's contents page, the basket and the
 * search suggestions must not drift apart; a grid mixing two grounds reads as
 * a bug long before anyone can say which card is wrong.
 */

/**
 * Not every photo has been cut out. An opaque photo is a white rectangle, which
 * on the white well is invisible — but a shadow would outline the rectangle
 * rather than the product, so those get none. Sixteen of the range are in that
 * state on purpose — white-on-white products the fill would destroy (see the
 * rejected set in scripts/cutout-images.mjs) — plus anything uploaded through
 * /admin, which is never a cut-out.
 *
 * The filename is the signal, because it is the same one the script itself
 * uses: it writes `-cutout.webp` and nothing else does. `-cutout-v2` is the
 * same file recut; the suffix exists because next/image caches its variants
 * for a month under the source URL, so a photo that changes has to change its
 * name or nobody sees it.
 */
export function isCutOut(image: string | null | undefined): boolean {
  return !!image && /-cutout(-v\d+)?\.webp$/i.test(image);
}

/**
 * Some photos are a picture, not a product.
 *
 * They came with a background of their own — a model wearing the support, a jar
 * on a coloured sweep, a sun cream on a beach — so there is nothing to cut out
 * and nothing to seat. Padding them and dropping a shadow behind them frames
 * them like a photograph pasted onto the card, which is what they looked like.
 * They get the whole tile instead: edge to edge, no ground, no shadow.
 *
 * The filename is the signal again, for the same reason `-cutout` is: the
 * script writes `-scene.webp` and nothing else does. Which photos those are is
 * a reviewed list in scripts/cutout-images.mjs, because a flat carton shot
 * straight on measures exactly the same as a picture and must not be treated
 * this way.
 */
export function isScenePhoto(image: string | null | undefined): boolean {
  return !!image && /-scene\.webp$/i.test(image);
}

/**
 * The padding, as a share of the well's width, that draws a photo at `fit`
 * times its standard size.
 *
 * `inset` is the padding a photo at fit 1 gets — the card's 7 %, the gallery's
 * 6 %. object-contain then fits the square photo into what is left, so the
 * product's drawn size is proportional to (1 − 2 · padding): solving
 * (1 − 2p) = fit · (1 − 2 · inset) for p gives the line below.
 *
 * Floored at zero, which is what makes a factor unable to crop anything: at
 * zero padding the photo's own margin (it is framed at 86 % of its canvas) is
 * the only room left, and the product still sits wholly inside the well. A
 * factor too large for the inset is therefore drawn as large as it can be,
 * never larger.
 */
export function photoPadding(fit: number, inset: number): number {
  const p = (1 - fit * (1 - 2 * inset)) / 2;
  return Math.min(0.45, Math.max(0, p));
}

/**
 * How one product photo should be presented, in one place.
 *
 * Eight surfaces render a product photo and each needs the same three-way
 * decision — picture, cut-out, or plain opaque packshot. Returning it from here
 * rather than repeating it is the argument the header of this file already
 * makes about the ground: a grid where two cards answer this differently reads
 * as a bug long before anyone can say which card is wrong.
 *
 * Two ways to say how much room the photo gets:
 *   - `pad`, a padding utility, for the small wells (menu circles, basket,
 *     suggestions), which differ by a factor of twelve from the gallery;
 *   - `inset` plus `fit`, for the card and the gallery, where photos are big
 *     enough for their sizes to be compared and are drawn at their measured
 *     factor (src/lib/photo-fit.ts). Returned as `style`, since the padding is a
 *     per-photo number no utility class holds.
 */
export function photoPresentation(
  image: string | null | undefined,
  {
    pad = "",
    inset,
    fit = 1,
    shadow = PHOTO_SHADOW,
  }: { pad?: string; inset?: number; fit?: number; shadow?: string }
): { cutOut: boolean; scene: boolean; className: string; style?: CSSProperties } {
  if (isScenePhoto(image)) {
    return { cutOut: false, scene: true, className: "object-cover" };
  }
  const cutOut = isCutOut(image);
  return {
    cutOut,
    scene: false,
    // `relative` lifts the photo above anything painted in the well behind it.
    className: `relative object-contain ${inset === undefined ? pad : ""} ${cutOut ? shadow : ""}`,
    style:
      inset === undefined
        ? undefined
        : { padding: `${(photoPadding(fit, inset) * 100).toFixed(2)}%` },
  };
}

export function PhotoWell({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`relative bg-white ${className}`}>{children}</div>;
}

/**
 * What seats the product on the white well: a tight contact shadow right under
 * and around it, and a short, faint second one for depth. Both neutral (slate,
 * the shadow ink of the page's cards), both small — the wide 24 px throw this
 * replaces spread a grey pool under every bottle that read as dirt on white.
 *
 * On a white product it is also what draws the edge: a white carton on a white
 * well has nothing else separating it from the ground. That is why it is not
 * dropped altogether.
 *
 * Only ever applied to a cut-out photo — on an opaque one it would shade the
 * white box, not the product.
 */
export const PHOTO_SHADOW =
  "[filter:drop-shadow(0_1px_2px_rgb(16_24_40/0.16))_drop-shadow(0_3px_6px_rgb(16_24_40/0.07))]";

/**
 * The same idea for the 44-80px thumbnails in the basket, the search
 * suggestions and the menu circles, where the full shadow is bigger than the
 * product it is meant to sit under.
 */
export const PHOTO_SHADOW_SM = "[filter:drop-shadow(0_1px_1.5px_rgb(16_24_40/0.18))]";
