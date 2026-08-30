/**
 * The well every product photo sits in.
 *
 * Most of the 2 049 photos carry a real alpha channel (scripts/cutout-images.mjs),
 * and a cut-out on flat white is the one surface where that is invisible: the
 * product has no ground, so it reads as pasted on rather than standing in a
 * space. The catalogue site worked this out early; the shop kept a plain white
 * box on the grounds that "against white the transparency simply does not read",
 * which is true and was the wrong conclusion — the fix is to stop using flat
 * white, not to give up the alpha.
 *
 * Two things, and neither may be loud enough to compete with the photo:
 *
 *   1. a barely-there vertical gradient, so the product has a horizon;
 *   2. a two-part shadow on the photo itself (the caller's job, since the
 *      sizes differ), which is what actually seats it.
 *
 * The ground is warm. It used to carry the brand's turquoise at a tenth
 * strength, which was a mistake worth recording: the body behind it is ivory
 * (#f8f7f3) and the shadow on it is warm, so a cool green pool in the middle
 * read as a different light source from everything around it, and it put a
 * green cast on the white cartons that most of this range is. #f7f5f0 sits
 * between `surface` and `surface-deep` — the page's own paper, half a step
 * deeper so the well is still visibly a well.
 *
 * What was tried and rejected: painting an elliptical contact pool onto the
 * ground, low and centred, instead of leaning on the shadow. Rendered against
 * the range it reads as a stain rather than as contact, and the reason is that
 * a painted ellipse has to assume one central foot at a fixed height. Products
 * do not oblige — the four-footed walking stick 8840 splays its feet to the
 * corners, a carton sits flat and wide — so the ellipse lands behind the
 * product as often as under it. A shadow cast from the alpha follows whatever
 * shape the product actually has, which is the whole point of having the alpha.
 *
 * Shared rather than repeated because the card, the detail gallery, the
 * gallery's thumbnails, the catalogue's contents page, the basket and the
 * search suggestions must not drift apart; a grid mixing two grounds reads as
 * a bug long before anyone can say which card is wrong.
 */

/**
 * Not every photo has been cut out, and a tinted ground is exactly wrong for
 * the ones that have not: an opaque photo is a white rectangle, and on anything
 * but white it shows as a hard white box behind the product. Sixteen of the
 * range are in that state on purpose — white-on-white products the fill would
 * destroy (see the rejected set in scripts/cutout-images.mjs) — plus anything
 * uploaded through /admin, which is never a cut-out.
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

export function PhotoWell({
  className = "",
  /**
   * False gives the flat white of before: no gradient, and callers drop the
   * shadow too. Deliberately plain — an uncut photo cannot be made to float,
   * and pretending otherwise only frames its white box.
   */
  cutOut = true,
  children,
}: {
  className?: string;
  cutOut?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative ${
        cutOut ? "bg-gradient-to-b from-white to-[#f7f5f0]" : "bg-white"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * What seats the product on that ground. Two shadows rather than one, because
 * that is what contact looks like: a tight, fairly dark one immediately under
 * the product, and a wide pale one for the throw. The single soft shadow this
 * replaces was too diffuse at either size to read as anything but a smudge.
 *
 * Warm rather than neutral-grey, because the surface behind it is ivory and a
 * cool shadow on warm paper looks like a rendering mistake. One set of values
 * for both the 280px card and the 540px gallery — checked at both, and the
 * larger variant that seemed obvious for the gallery was not better.
 *
 * Only ever applied to a cut-out photo — on an opaque one it would shade the
 * white box, not the product.
 */
export const PHOTO_SHADOW =
  "[filter:drop-shadow(0_14px_24px_rgb(45_40_30/0.10))_drop-shadow(0_3px_5px_rgb(45_40_30/0.22))]";

/**
 * The same idea for the 44-80px thumbnails in the basket, the search
 * suggestions and the menu circles, where the full shadow is bigger than the
 * product it is meant to sit under.
 */
export const PHOTO_SHADOW_SM =
  "[filter:drop-shadow(0_2px_3px_rgb(45_40_30/0.18))]";
