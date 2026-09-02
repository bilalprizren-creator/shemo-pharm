/**
 * The measurable facts a product name already carries, pulled out as data.
 *
 * 2 027 of the 2 049 products have no description at all — the WooCommerce
 * export brought 22 of them and nothing since. So the product page has the
 * name, the code, the stock flag and the price, and then stops. Everything a
 * wholesale buyer actually decides on — how many tablets are in the box, how
 * many millilitres in the bottle, which sizes an orthopedic support comes in,
 * what compression class a stocking is — is written into the name and nowhere
 * else, jammed between the brand and the article code.
 *
 * This reads those facts back out. Nothing here is invented or looked up: every
 * value is a substring of the product's own name, normalised for spacing and
 * unit casing and never for meaning. A product whose name says nothing gets no
 * facts, which is the honest answer — 494 of 2 049 land there. The other 1 555
 * get a spec block: 633 a pack count, 579 a volume, 323 a strength, 152 a
 * weight, 146 a size range, 65 a dimension, 17 an SPF, 15 a compression class.
 *
 * The unit words are the one exception, and deliberately so: `pack` resolves to
 * a closed set of unit keys so the dictionary can say "tableta" in Albanian and
 * "tablets" in English. Everything else (ml, g, mg, SPF, S/M/L, CCL) is written
 * the same way in both languages and passes through as text.
 *
 * ## Why the patterns look defensive
 *
 * Each was measured against all 2 049 names and tightened until it stopped
 * being wrong, because a spec table that lies is worse than no spec table:
 *
 *   - A size is a single letter, and single letters are everywhere. "Nucal-M",
 *     "Renex-S", "L-Carnitine" and the model code "AS-304-L" are not sizes;
 *     neither is the "M" in "Rotacef 1G I.M" (a route) or the "S" in
 *     "(DEMO S.A.)" (a company suffix). So a size has to be *delimited* — it
 *     may only follow a space, a bracket, a comma or a slash, and may only be
 *     followed by one of those or the end of the name. That rule keeps the 125
 *     multi-size ranges and 21 of the 31 products that name a single size, and
 *     drops the ten that were never sizes at all.
 *   - A weight may not follow a hyphen: "Pampers Premium Care 4-8kg A23" is
 *     the weight of the baby, not of the pack.
 *   - "x 4.5" in "Fashë vetëngjitëse 10cm x 4.5m" is half of a dimension, so
 *     the "times N" pack pattern refuses a number with a decimal point.
 *   - mg/mcg/IU is a strength, g/kg is a weight. They never collide, and
 *     splitting them that way is why "Daktanol 2% gel 40g" reads as 40 g at 2 %
 *     rather than as one number with two meanings.
 */

/** Pack unit keys. The dictionary owns the words; this owns the vocabulary. */
export type PackUnit = "tab" | "caps" | "eff" | "sachet" | "amp" | "piece";

export interface ProductFacts {
  /** How many, and of what — "30 tableta", "20 eff", "A50" as 50 pieces. */
  pack: { count: number; unit: PackUnit } | null;
  /** "50 ml" */
  volume: string | null;
  /** "40 g" */
  weight: string | null;
  /** "400 mg", "0.5 mg/ml", "2 %" — joined with " + " for combinations. */
  strength: string | null;
  /** "10 x 4.5 cm" */
  dimensions: string | null;
  /** The number only: "30", "50+". */
  spf: string | null;
  /** Orthopedic sizes in the order the name lists them: ["S","M","L"]. */
  sizes: string[];
  /** Compression class for stockings: "CCL1" or "CCL2". */
  compression: string | null;
}

export const EMPTY_FACTS: ProductFacts = {
  pack: null,
  volume: null,
  weight: null,
  strength: null,
  dimensions: null,
  spf: null,
  sizes: [],
  compression: null,
};

const NUM = String.raw`\d+(?:[.,]\d+)?`;
/** Not in the middle of a longer number or word. */
const FREE = String.raw`(?<![\w.,])`;

const STRENGTH_UNIT = "mg|mcg|µg|ug|iu|ui";
const STRENGTH = new RegExp(
  `${FREE}(${NUM})\\s?(${STRENGTH_UNIT})(?:\\s?/\\s?(?:${NUM}\\s?)?(?:ml|g|${STRENGTH_UNIT}))?(?![a-z])`,
  "gi"
);
const PERCENT = new RegExp(`${FREE}(${NUM})\\s?%`, "g");
// A hyphen before the number makes it either a range ("Pampers 4-8kg", which
// is the weight of the baby) or the tail of an article code ("SL-12 L", which
// is not twelve litres). Both are excluded the same way, and the one product
// it costs — "Methylergometrin hf 0.25mg/ml-10ml" — keeps its strength.
const VOLUME_ML = new RegExp(`(?<![\\w.,-])(${NUM})\\s?ml(?![a-z0-9])`, "gi");
// Litres are written as an uppercase L or spelled out; a lowercase "l" after a
// number never occurs in the catalog and would only catch article codes. The
// three-digit ceiling drops "NO:9144L", which is a model number.
const VOLUME_L = /(?<![\w.,:-])(\d{1,3})\s?(L|lit(?:ër|er|ra)?)(?![a-z0-9])/g;
const WEIGHT = new RegExp(`(?<![\\w.,-])(${NUM})\\s?(kg|gr|g)(?![a-z0-9])`, "gi");
const DIMENSIONS = new RegExp(
  `${FREE}(${NUM})\\s?(?:cm|mm|m)?\\s?[x×*]\\s?(${NUM})\\s?(cm|mm|m)(?![a-z])`,
  "gi"
);
const SPF = /\bSPF\s?(\d{1,2}\+?)(?![\d.,])|(?<![\w.,])(\d{1,2}\+?)\s?SPF\b/i;
const COMPRESSION = /\bCCL\s?([12])\b/i;

/** Explicit counting words, longest spelling first so "tableta" wins over "tab". */
const PACK_WORDS: ReadonlyArray<[RegExp, PackUnit]> = [
  [/tabletash|tableta|tablets|tablet|tabs|tab/i, "tab"],
  [/kapsulash|kapsula|kapsule|capsules|capsule|softgels|softgel|caps|cap/i, "caps"],
  [/qeska|qese|sachets|sachet|sticks|stick/i, "sachet"],
  [/ampula|ampoules|ampoule|fiala|flakon|flacona/i, "amp"],
  [/copë|cope|pcs|kom|pairs|pair|palë|pale|blades|blade/i, "piece"],
];
const PACK_WORD = new RegExp(
  `${FREE}(\\d{1,4})\\s?(${PACK_WORDS.map(([re]) => re.source).join("|")})(?![a-z])`,
  "i"
);
/** "20eff", "A20 EFF" — an effervescent tube states its count this way. */
const PACK_EFF = new RegExp(`${FREE}(\\d{1,3})\\s?eff(?![a-z])`, "i");
/** "A30", "A 50" — the house notation for a count of loose pieces. */
const PACK_A = /(?:^|[^A-Za-z0-9])A\s?(\d{1,4})(?![A-Za-z0-9])/;
/** "x30", "X 12" — refuses a decimal, which would be half a dimension. */
const PACK_TIMES = /(?:^|[^A-Za-z0-9])[xX]\s?(\d{1,4})(?![A-Za-z0-9.,])/;

/**
 * A size letter, only where it is delimited on both sides. See the note above
 * on why this is not simply /\b(S|M|L|XL|XXL)\b/. Matched against the unpadded
 * name on purpose: a name that *opens* with a lone letter is "L – Gintau
 * kompleks", not a size, and the lookbehind is what refuses it.
 */
const SIZE = /(?<=[\s(,/])(XXL|XL|XS|S|M|L)(?=[\s,/)]|-\s|$)/g;
/**
 * "S-M, L-XL" — four products write their sizes as ranges, and the hyphen is
 * the one delimiter SIZE cannot allow (it is what disqualifies "L-Carnitine"
 * and "AS-304-L"). Split them into a list first rather than loosening the rule.
 */
const SIZE_RANGE = /(?<=[\s(,/])(XXL|XL|XS|S|M|L)-(?=(?:XXL|XL|XS|S|M|L)(?=[\s,/)]|$))/g;

/** "43gr" -> "43 g", "0.5MG/ML" -> "0.5 mg/ml", "100 ML" -> "100 ml". */
function normalizeMeasure(raw: string): string {
  const compact = raw.replace(/\s+/g, "").replace(",", ".");
  const split = compact.replace(/(\d)(?=[a-zA-Zµ%])/, "$1 ");
  const [value, ...rest] = split.split(" ");
  const unit = rest
    .join(" ")
    .toLowerCase()
    .replace(/^gr$/, "g")
    .replace(/^ug$/, "µg")
    .replace(/^ui$/, "iu")
    .replace(/^(iu)$/, "IU");
  return unit ? `${value} ${unit}` : value;
}

function firstMeasure(name: string, re: RegExp): string | null {
  const all = [...name.matchAll(re)].map((m) => normalizeMeasure(m[0]));
  return all[0] ?? null;
}

/** "10cm x 4.5m" -> "10 x 4.5 m". Rebuilt from the captures, not the match. */
function firstDimension(name: string): string | null {
  const m = DIMENSIONS.exec(name);
  DIMENSIONS.lastIndex = 0;
  if (!m) return null;
  const [, a, b, unit] = m;
  return `${a.replace(",", ".")} x ${b.replace(",", ".")} ${unit.toLowerCase()}`;
}

function readPack(name: string): ProductFacts["pack"] {
  const word = name.match(PACK_WORD);
  if (word) {
    const unit = PACK_WORDS.find(([re]) => re.test(word[2]))?.[1] ?? "piece";
    return { count: Number(word[1]), unit };
  }
  const eff = name.match(PACK_EFF);
  if (eff) return { count: Number(eff[1]), unit: "eff" };
  const a = name.match(PACK_A);
  if (a) return { count: Number(a[1]), unit: "piece" };
  const times = name.match(PACK_TIMES);
  if (times) return { count: Number(times[1]), unit: "piece" };
  return null;
}

/**
 * Read the facts out of an already-cleaned display name.
 *
 * Pass the name `cleanProductName` returned, not the raw one. On 2 045 of the
 * 2 049 products it makes no difference; on the four that write a shoe-size
 * range after every letter — "S(35-38), M(38-41), L(42-44)" — the brackets are
 * what stops the sizes being read at all, and cleaning is what removes them.
 */
export function readProductFacts(displayName: string): ProductFacts {
  const name = ` ${displayName} `;
  const dimensions = firstDimension(name);
  const strengths = [
    ...new Set([
      ...[...name.matchAll(STRENGTH)].map((m) => normalizeMeasure(m[0])),
      ...[...name.matchAll(PERCENT)].map((m) => normalizeMeasure(m[0])),
    ]),
  ];
  const spf = name.match(SPF);

  return {
    pack: readPack(name),
    // A dimension is written with the same units as a volume or a weight
    // ("10cm x 4.5m"), so it claims them first or they would report its halves.
    volume: dimensions
      ? null
      : firstMeasure(name, VOLUME_ML) ?? firstMeasure(name, VOLUME_L),
    weight: dimensions ? null : firstMeasure(name, WEIGHT),
    strength: strengths.join(" + ") || null,
    dimensions,
    spf: spf ? (spf[1] ?? spf[2]) : null,
    sizes: [
      ...new Set(
        [...displayName.replace(SIZE_RANGE, "$1, ").matchAll(SIZE)].map((m) => m[1])
      ),
    ],
    compression: name.match(COMPRESSION)?.[0].replace(/\s+/g, "").toUpperCase() ?? null,
  };
}

/** Whether anything at all was found — the page hides the block when not. */
export function hasProductFacts(facts: ProductFacts): boolean {
  return Boolean(
    facts.pack ||
      facts.volume ||
      facts.weight ||
      facts.strength ||
      facts.dimensions ||
      facts.spf ||
      facts.sizes.length ||
      facts.compression
  );
}
