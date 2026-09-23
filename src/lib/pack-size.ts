/**
 * Pack sizes, as the product names write them.
 *
 * There is no pack-size column anywhere — not in the database, not in the
 * WooCommerce export, not in the old catalogue's own database. What there is,
 * is the name: "AC Cleanser Sal-Wash Liquid 200ml", "Haribo Mix 70G",
 * "Alkool 70% 1L". Written a dozen ways (200ml, 250ML, 30 ML, 15gr, 40G), which
 * down a grid of cards reads as carelessness. So the names are shown with their
 * sizes written one way, and — where a name states exactly one — the size is
 * lifted out for the detail page's facts.
 *
 * Both are readings of the name and nothing more. Nothing here invents a size
 * the name does not state, and anything ambiguous is left exactly as written.
 *
 * Pure and dependency-free on purpose: the catalogue's search runs in the
 * browser, and it has to normalise a typed query the same way the names were.
 */

/** The one spelling each unit is shown in. */
const UNIT: Readonly<Record<string, string>> = {
  ml: "ml",
  mg: "mg",
  mcg: "mcg",
  g: "g",
  gr: "g",
  kg: "kg",
};

/**
 * A non-breaking space, so "200 ml" never breaks across two lines of a card.
 * Built rather than typed: an invisible character in a source file is one
 * nobody can see to review.
 */
export const NBSP = String.fromCharCode(0xa0);

/**
 * Names in which an uppercase G is a needle gauge, not grams: "Shiring 5ml me
 * gjilper 21G-A100", "LANCETS CONTOUR 28G", "Baby sistem 23G". Measured over the
 * whole range, every gauge sits in a name carrying one of these words, and no
 * name carrying one weighs anything in grams.
 */
const NEEDLE = /gjilp|lancet|sistem|kanil|needle|shiring/i;

/**
 * A number and a mass or volume unit, glued or with one space between (`\s`
 * takes the non-breaking one too, so normalising twice changes nothing).
 *
 * The number may not follow a letter, a digit, a dot or a comma — so a model
 * number ("AS923L", "Art.8556 L") or the tail of a longer number is never
 * read as a size — and the unit may not run on into a letter or digit, so
 * "12tab" and "100mlx2" are left alone. Centimetres and metres are left out on
 * purpose: they almost always come as dimensions ("10cmX4.5m"), where a space
 * inserted in one place only makes things worse.
 */
const MASS_VOLUME = /(?<![\p{L}\p{N}.,])(\d+(?:[.,]\d+)?)\s?(mcg|mg|ml|kg|gr|g)(?![\p{L}\p{N}])/giu;

/**
 * Litres, glued only. Every "12 L" with a space in this range is a clothing
 * size after a model number ("SL-12 L", "KD205 L"), and a lowercase l never
 * occurs.
 */
const LITRE = /(?<![\p{L}\p{N}.,])(\d+(?:[.,]\d+)?)L(?![\p{L}\p{N}])/gu;

/**
 * The name with its masses and volumes written one way: "200ml", "200ML" and
 * "200 ML" all become "200 ml", "15gr" and "40G" become "15 g" and "40 g",
 * "1L" becomes "1 L". Everything else — needle gauges, dimensions, "A30",
 * "X10", clothing sizes — is returned untouched.
 */
export function normalizeSizes(name: string): string {
  const gauges = NEEDLE.test(name);
  return name
    .replace(MASS_VOLUME, (whole, n: string, unit: string) => {
      // "21G" in a syringe's name is a gauge. Lowercase g is always grams.
      if (gauges && unit === "G") return whole;
      return `${n}${NBSP}${UNIT[unit.toLowerCase()]}`;
    })
    .replace(LITRE, (_whole, n: string) => `${n}${NBSP}L`);
}

/**
 * Count words that name what a pack holds. Only words: the "A30" shorthand the
 * range is full of is almost always a pack count, but not always ("A6" on an
 * ear clip is a model), and a fact shown on its own line has to be one.
 */
const COUNT =
  /(?<![\p{L}\p{N}.,])(\d+)\s?(tableta|tablets?|tabs?|kapsula|kapsulla|capsules?|caps|softgels?|sachets?|bustine|buste|copë|cope|pcs|pieces|ampula|ampulla|ampoules?|supozitore|stick)(?![\p{L}\p{N}])/giu;

/**
 * The pack size a name states, when it states exactly one: "200 ml", "70 g",
 * "1 L", "30 tab". Null otherwise — no size at all, two sizes that disagree,
 * a multipack ("20X5G Sachets" is twenty of five grams, and either number
 * alone would be wrong), or a mass that is really a dose.
 *
 * Milligrams and micrograms never count: in this range they are the strength
 * of a medicine ("Acyclovir 200mg X 25 tab"), not the size of the pack. What
 * such a name says about the pack is the count, and that is what comes back.
 * A volume after a slash is a strength too ("250mg/5ml" is a concentration).
 */
export function packSizeOf(name: string): string | null {
  const normalised = normalizeSizes(name);
  // Multipacks. A dose before the x is not one: "250 mg x 30 tab" is thirty
  // tablets, which is why the letters of a unit may stand between the digit
  // and the x only when a mass or volume follows it ("6amp x 2 ml").
  if (/\d\s?[xX×]\s?\d/.test(normalised)) return null;
  if (/[xX×]\s?\d+(?:[.,]\d+)?\s?(?:ml|L|g|kg)(?![\p{L}\p{N}])/u.test(normalised)) return null;

  const gauges = NEEDLE.test(name);
  const found = new Set<string>();
  for (const m of normalised.matchAll(new RegExp(MASS_VOLUME.source, "giu"))) {
    // Guarded exactly as normalizeSizes guards it: in a syringe's name the
    // uppercase G was left standing as a gauge, and it is not grams here either.
    if (gauges && m[2] === "G") continue;
    const unit = UNIT[m[2].toLowerCase()];
    if (unit === "mg" || unit === "mcg") continue;
    if (normalised.slice(0, m.index).trimEnd().endsWith("/")) continue;
    found.add(`${m[1]}${NBSP}${unit}`);
  }
  // Read off the name as written: normalising put a space inside "1L".
  for (const m of name.matchAll(new RegExp(LITRE.source, "gu"))) {
    found.add(`${m[1]}${NBSP}L`);
  }
  const counts = new Set<string>();
  for (const m of normalised.matchAll(new RegExp(COUNT.source, "giu"))) {
    counts.add(`${m[1]}${NBSP}${m[2].toLowerCase()}`);
  }

  if (found.size === 1 && counts.size === 0) return [...found][0];
  if (found.size === 0 && counts.size === 1) return [...counts][0];
  return null;
}
