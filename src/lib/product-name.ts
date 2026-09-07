/**
 * The name a customer should read, derived from the name WooCommerce exported.
 *
 * The import is raw shop data and it shows: 1994 of the 2049 names end with the
 * product's own article number in brackets — "A+D3 pika 10ml (1501)" — while the
 * card directly underneath already prints "Kodi 1501". Another 45 are shouted in
 * full capitals, 133 carry a typographic dash the rest of the catalog does not
 * use, and 60 have stray spacing inside their brackets.
 *
 * This is the same treatment the category audit got (see audit/RULES.md): fixed
 * rules applied to every row, a short table of named exceptions for what a rule
 * cannot know, and nothing decided per product by hand.
 *
 * Deliberately a *derivation*, not a migration. `products.name` keeps the
 * imported string, so a rule that turns out wrong is one deploy away from being
 * undone, and re-importing the catalog cannot fight with the cleanup. An
 * editor's own `display_name` still wins over everything here — see
 * productDisplayName() in src/lib/catalog.ts.
 *
 * Search deliberately does NOT go through this function: src/lib/catalog.ts
 * matches against the raw name and the SKU, so a customer who types "1501", or
 * the old shouted spelling, still finds the product.
 */

/**
 * One article code: 3–6 digits, optionally a size letter or two ("2830A",
 * "8513S"), optionally a dashed size ("4307-L", "3210-C").
 *
 * Three digits is the floor on purpose. Nappy and tampon names carry their size
 * in brackets — "Pampers Active Baby (3) 6-10kg A54", "Always Platinum Normal
 * A8 (1)" — and that single digit is part of the product, not a code.
 */
const ARTICLE_CODE = /^\d{3,6}[A-Za-z]{0,2}(?:-[A-Za-z0-9]{1,3})?$/;

/** A bare size letter in a list of codes: "(3304A, B, C)", "(1167 A, B, C, D, E)". */
const SIZE_LETTER = /^[A-Za-z]{1,2}$/;

/**
 * Unit symbols that must never be read as the size letter of a code. Without
 * this, "(250 ml)" parses as the code 250 plus the suffix "ml" and the whole
 * measurement disappears from the name.
 */
const UNITS = new Set([
  "g", "gr", "kg", "mg", "mcg", "ml", "l", "cl", "cm", "mm", "m",
  "iu", "ie", "pcs", "st", "tab", "kap", "caps", "x",
]);

/**
 * Fixes no rule can derive, each one read off the packshot rather than guessed.
 * Keyed by the exact imported name so an entry cannot quietly match a second
 * product. Keep this short — a growing table means a rule is missing.
 */
const MANUAL_FIXES: Record<string, string> = {
  // Capital I where the brand has a lowercase L. Every other Bioblas product
  // in the catalog spells it correctly, and the packshot reads "BIOBLAS".
  "BiobIas Anti Sebum + B3 Vitamini (7018)": "Bioblas Anti Sebum + B3 Vitamini (7018)",
};

/** Is this bracketed text an article number rather than part of the name? */
function isArticleCode(inner: string, sku: string): boolean {
  const text = inner.trim();
  if (!text) return false;
  // "( NT-008 )" on the product whose SKU is NT-008 — a duplicate whatever shape it has.
  if (sku && text.toLowerCase() === sku.trim().toLowerCase()) return true;

  const parts = text.split(/[,/\s]+/).filter(Boolean);
  if (!ARTICLE_CODE.test(parts[0])) return false;
  return parts
    .slice(1)
    .every(
      (part) =>
        ARTICLE_CODE.test(part) ||
        (SIZE_LETTER.test(part) && !UNITS.has(part.toLowerCase()))
    );
}

/**
 * A measurement written as one token: "40G", "100MG", "30X5ML", "1X15CM".
 * Lower-cased whole, because that is how the rest of the catalog writes them
 * ("Bensedin 5mg 30 tab", "Balsam kali ngrohës 250 ml").
 */
const MEASUREMENT = /^\d+(?:[.,]\d+)?(?:[xX]\d+(?:[.,]\d+)?)*([A-Za-z]{1,4})$/;

/**
 * One word of a shouted name, un-shouted.
 *
 * `capitalise` is what separates the two halves of the rule below: outside
 * brackets only the first word of the name gets a capital, inside them every
 * word does, because in this catalog a bracket holds a brand — (SENTI 2),
 * (BIO ALPINA), (GALENIKA), (DOVE).
 */
function unshoutWord(word: string, capitalise: boolean): string {
  const measurement = word.match(MEASUREMENT);
  if (measurement && UNITS.has(measurement[1].toLowerCase())) return word.toLowerCase();

  if (/\d/.test(word)) {
    // A token that mixes letters and digits is a pack count, a model or a
    // reference — "A20", "A-20", "RH-318", "YE660D", "NT41", "CCL1", "B3" — and
    // those are written in capitals everywhere in the catalog. Four letters or
    // more means it is a word carrying a number instead, like "OMEGA-3".
    const letters = word.replace(/[^A-Za-z]/g, "");
    if (letters.length < 4) return word;
    return capitalise ? capitaliseFirst(word.toLowerCase()) : word.toLowerCase();
  }

  // "O.B" — an abbreviation, not a word.
  if (word.includes(".")) return word;

  const lower = word.toLowerCase();
  return capitalise ? capitaliseFirst(lower) : lower;
}

function capitaliseFirst(word: string): string {
  return word.replace(/\p{L}/u, (ch) => ch.toUpperCase());
}

/**
 * Un-shout a name that arrived in full capitals: sentence case for the name
 * itself, so it sits beside the 2 004 names this function leaves alone, and a
 * capital on every bracketed word, which is where the brands are.
 */
function unshout(name: string): string {
  let insideBrackets = false;
  let seenFirstWord = false;
  return name
    .split(" ")
    .map((word) => {
      const opens = word.includes("(");
      const closes = word.includes(")");
      const bracketed = insideBrackets || opens;
      if (opens && !closes) insideBrackets = true;
      if (closes) insideBrackets = false;

      const capitalise = bracketed || !seenFirstWord;
      if (/\p{L}/u.test(word)) seenFirstWord = true;
      return unshoutWord(word, capitalise);
    })
    .join(" ");
}

/** Is the name shouted — six or more letters and not one of them lowercase? */
function isAllCaps(name: string): boolean {
  const letters = name.replace(/[^\p{L}]/gu, "");
  return letters.length >= 6 && letters === letters.toUpperCase();
}

/**
 * The catalog name, tidied for display. `sku` is optional and only used to
 * recognise a bracketed duplicate of the product's own code.
 */
export function cleanProductName(name: string, sku = ""): string {
  const imported = (MANUAL_FIXES[name] ?? name).trim();
  if (!imported) return name.trim();

  // 1. Drop bracketed article numbers, wherever they sit — "… 100ml (5119) (AUTAN)"
  //    keeps the brand and loses the code.
  let out = imported.replace(/[([]([^()[\]]*)[)\]]/g, (match, inner: string) =>
    isArticleCode(inner, sku) ? " " : match
  );

  // 2. Tidy what the shop's own typing left behind: "( SENTI 2 )" -> "(SENTI 2)",
  //    a bracket left unclosed by "…Rifaximin (5237))", doubled spaces, a space
  //    before punctuation.
  out = out
    .replace(/[–—‒]/g, "-")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .replace(/\s+([,;:.])/g, "$1")
    .trim()
    .replace(/^[)\]\s,;:-]+/, "")
    .replace(/[([\s,;:-]+$/, "")
    .trim();

  // An unmatched closing bracket can only be left over once the codes are gone.
  if (!out.includes("(")) out = out.replace(/\)/g, "");
  if (!out.includes("[")) out = out.replace(/\]/g, "");
  out = out.replace(/\s+/g, " ").trim();

  // 3. Un-shout the 45 names that arrived in full capitals.
  if (isAllCaps(out)) out = unshout(out);

  // A rule that empties a name is a broken rule — keep what the shop sent.
  return out || imported;
}
