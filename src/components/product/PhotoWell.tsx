/**
 * The well every product photo sits in.
 *
 * All 2 049 photos carry a real alpha channel (scripts/cutout-images.mjs), and
 * a cut-out on flat white is the one surface where that is invisible: the
 * product has no ground, so it reads as pasted on rather than standing in a
 * space. The catalogue site solved this early; the shop kept a plain white box
 * on the grounds that "against white the transparency simply does not read",
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
export function PhotoWell({
  className = "",
  glow = true,
  children,
}: {
  className?: string;
  /** Off for anything small — at thumbnail size the glow is just a smudge. */
  glow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative bg-gradient-to-b from-white to-tint ${className}`}>
      {glow && (
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
      )}
      {children}
    </div>
  );
}

/**
 * What seats the product on that ground. Warm rather than neutral-grey, because
 * the surface behind it is ivory and a cool shadow on warm paper looks like a
 * rendering mistake.
 */
export const PHOTO_SHADOW = "drop-shadow-[0_8px_18px_rgba(45,40,30,0.14)]";
