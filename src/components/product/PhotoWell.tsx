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
 * Three things, and none of them may be loud enough to compete with the photo:
 *
 *   1. a barely-there vertical gradient, so the product has a horizon;
 *   2. one soft teal glow behind where the product sits, which is the brand's
 *      accent at a tenth strength — a whisper of colour, not a coloured field;
 *   3. a drop shadow on the photo itself (the caller's job, since the sizes
 *      differ), which is what actually seats it.
 *
 * Shared rather than repeated because the card, the detail gallery and the
 * gallery's thumbnails must not drift apart; a grid mixing two grounds reads as
 * a bug long before anyone can say which card is wrong.
 */

/**
 * Not every photo has been cut out, and a tinted ground is exactly wrong for
 * the ones that have not: an opaque photo is a white rectangle, and on anything
 * but white it shows as a hard white box behind the product. Thirty-five of the
 * range are in that state on purpose — white-on-white products the fill would
 * destroy (see the rejected set in scripts/cutout-images.mjs) — plus anything
 * uploaded through /admin, which is never a cut-out.
 *
 * The filename is the signal, because it is the same one the script itself
 * uses: it writes `-cutout.webp` and nothing else does.
 */
export function isCutOut(image: string | null | undefined): boolean {
  return !!image && /-cutout\.webp$/i.test(image);
}

export function PhotoWell({
  className = "",
  /**
   * False gives the flat white of before: no gradient, no glow, and callers
   * drop the shadow too. Deliberately plain — an uncut photo cannot be made to
   * float, and pretending otherwise only frames its white box.
   */
  cutOut = true,
  children,
}: {
  className?: string;
  cutOut?: boolean;
  children: React.ReactNode;
}) {
  if (!cutOut) {
    return <div className={`relative bg-white ${className}`}>{children}</div>;
  }

  return (
    // #f4f7f5 rather than the `tint` token: tint is tuned for icon wells and
    // notes, and behind a photo it is strong enough to outline any backdrop the
    // cut-out failed to remove. This is the value the Jara Pharmacy grid uses,
    // about a third softer, and it is the look this was modelled on.
    <div className={`relative bg-gradient-to-b from-white to-[#f4f7f5] ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        // Inline because the stops are a one-off: no utility expresses an
        // off-centre radial at 10% alpha, and inventing a token for a single
        // gradient would hide it from the person changing it.
        style={{
          background:
            "radial-gradient(58% 52% at 50% 44%, rgba(20,181,144,0.10) 0%, transparent 100%)",
        }}
      />
      {children}
    </div>
  );
}

/**
 * What seats the product on that ground. Warm rather than neutral-grey, because
 * the surface behind it is ivory and a cool shadow on warm paper looks like a
 * rendering mistake. Only ever applied to a cut-out photo — on an opaque one it
 * would shade the white box, not the product.
 */
export const PHOTO_SHADOW = "drop-shadow-[0_8px_18px_rgba(45,40,30,0.14)]";
