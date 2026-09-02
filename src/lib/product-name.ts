/**
 * The product name a customer should read.
 *
 * The WooCommerce export put the article code inside the name of every single
 * product — "4 Joint 15 stick sachets (4108)", "Bensedin 2mg 30tab (9814)" —
 * and the site then prints that same code again, on its own line, labelled
 * "Kodi i produktit". So the code is shown twice everywhere a product appears:
 * the card, the h1, the browser tab, the breadcrumb, the WhatsApp order
 * message, the wishlist. It is noise in all of them, and on a card the name is
 * clamped to two lines, so the code is spending one of them.
 *
 * Measured against the catalog: 2 049 of 2 049 products carry at least one
 * bracketed article code, and stripping them changes 2 036 names.
 *
 * ## Which brackets go
 *
 * Only the ones that are a code, and "is a code" is decided by shape rather
 * than by comparing against `sku` — the SKU column is not reliable enough to
 * hang the rule on. 15 products spell the code differently inside the name
 * than in the column ("(4307-L)" against "4307L"), 41 more disagree outright:
 * eight have an empty SKU, "Hello Kitty Brushe Kids A2 (7657)" carries the SKU
 * "1.60" (a price that leaked into the column), and "Biotin 10.000 mcg A30
 * (5283)" is filed under 8283.
 *
 * A bracket is a code when it starts with a digit and holds nothing but digits,
 * letters, commas, dots, hyphens and spaces. That was checked against every
 * bracket in the catalog: 2 049 distinct code-shaped ones, of which exactly one
 * ("4307-XL") contains a run of letters at all. The 197 brackets that stay are
 * all things a customer wants — a brand ("(AUTAN)", "(DR.COMFORT)", "(NIVEA)"),
 * a model number ("(SL-911)", "(NT-019)", "(BodyTemp478)"), a variant
 * ("(Neutral, Versiegelung, Zascita dlesni)", "(për fëmijë)"), a compression
 * class ("(CCL2)") or a composition ("(Calcium + D3 + K2 + Zn + B + Cu + Mn)").
 *
 * Codes are removed wherever they sit, not only at the end: "Mbajtese krahu per
 * femije (0433) L" has to keep its size.
 *
 * ## What this is not
 *
 * It is a display rule, not a data migration. `Product.name` stays exactly as
 * the database holds it, which is what `/admin/produktet` edits and what
 * `searchProducts` matches against — so a customer typing "4108" still finds
 * the product, and an editor still sees the row they are editing. The admin's
 * own `display_name` override wins over both; see `productDisplayName`.
 */

/** Brackets whose content is an article code rather than something to read. */
const CODE_BRACKET = /\(\s*([0-9][0-9A-Za-z,.\s-]*)\s*\)/g;

/** Separators and connectors left dangling once a code is cut out of the name. */
const TRAILING_JUNK = /[\s,;:./\\|·•\-–—]+$/;
const LEADING_JUNK = /^[\s,;:./\\|·•\-–—]+/;

export function cleanProductName(name: string): string {
  const cleaned = name
    // "Colidur 200mg X 12tab Rifaximin (5237))" — one product closes twice.
    .replace(/\)\s*\)+\s*$/, ")")
    .replace(CODE_BRACKET, " ")
    // "( DR.COMFORT )" — the export padded some brackets and not others.
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .replace(/\s+([,;.])/g, "$1")
    .replace(TRAILING_JUNK, "")
    .replace(LEADING_JUNK, "")
    .trim();

  // A name that was nothing but its code is worse blank than repeated.
  return cleaned || name.trim();
}
