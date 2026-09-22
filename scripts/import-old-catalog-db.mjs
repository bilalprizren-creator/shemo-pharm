/**
 * Bring the shop in line with the old catalogue's own database.
 *
 *   npm run import:old-catalog                                  # dry run, development
 *   npm run import:old-catalog -- --write                       # apply, development
 *   DATABASE_TARGET=production npm run import:old-catalog       # dry run, production
 *   DATABASE_TARGET=production npm run import:old-catalog -- --write
 *
 * On 2026-09-22 the owner handed over the database behind shemo-katalog.com
 * (reference/old-katalog/u600177787_shemo.sql, gitignored with its photos under
 * reference/old-katalog/produkt/). Until then the old site could only be read
 * off its HTML, which shows neither prices nor what was switched off. The dump
 * is the catalogue the office maintains day to day — 172 edits in September
 * alone — so the owner decided it is the reference, in four respects:
 *
 *   1. Prices. Where an active row prices a product differently, its price
 *      wins (price_cents and regular_cents together: nothing is on offer, and
 *      the two are equal everywhere, which tests/product-data.test.ts pins).
 *      Codes printed twice at two different prices are reported, not guessed.
 *   2. Switched off. A product the old database only knows as inactive
 *      (status 0) leaves the printed catalogue — catalog_hidden, never hidden:
 *      the shop keeps selling it. Nothing is ever un-hidden by this rule, so a
 *      deliberate hide made in /admin survives every run.
 *   3. Missing. An active row whose code matches none of ours becomes a product,
 *      visible on both sites, priced, photographed from the old database's own
 *      file and placed in its printed section. Rows whose NAME matches one of
 *      ours under another code (3202A vs 3202-A) are code variants: reported for
 *      the owner, never inserted, since that would put one product in twice.
 *   4. Ivy Bear, waiting since 2026-09-11 for a price, gets it and is released.
 *      4151 is switched off in the old database too and stays hidden.
 *
 * Sections the database has and ours does not (8.8 CONALT, 32.1 SCHOLL) are
 * created where the page prints them. The promotional pseudo-section "AKSION"
 * is not a section of the printed catalogue and is skipped whole.
 *
 * Shop categories for a new product: whatever category set most of its
 * section's existing products carry (Labella lipsticks go where Labella
 * lipsticks are), refined by dosage form for medicines and supplements. The
 * three sections with no existing product to copy from are written down below.
 * products.json keeps what the development run chose, and every later run —
 * production included — takes it from there, so both databases agree.
 *
 * Ids: products have no sequence (catalog_sections does). A new product's id is
 * the one products.json gives its code, or the next above the highest id in the
 * database and products.json. The development run fills products.json, so the
 * production run lands on the same ids — refused if one is taken there.
 *
 * Photos: the old row's file, reframed onto the white 1000px square every other
 * original sits on and saved as `<sku>-<slug>.webp`, exactly as add-ivy-bear.mjs
 * does. The cut-out is cutout-images.mjs's job afterwards.
 *
 * Idempotent: a second run finds nothing to do. Report: audit/old-catalog-db-import.md.
 */
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { connect, dataPath, describeTarget, readJson, ROOT, target } from "./lib/db.mjs";
import { codeKeys, oldCatalogMatcher, trigrams } from "./lib/old-catalog-match.mjs";
import { readDump } from "./lib/old-catalog-sql.mjs";
import { reframe } from "./lib/reframe.mjs";

const WRITE = process.argv.includes("--write");

const OLD = path.join(ROOT, "reference/old-katalog");
const DUMP = path.join(OLD, "u600177787_shemo.sql");

const SKIP_SECTIONS = new Set(["aksion"]);

/** Sections the old database has and ours does not, and what they follow on the page. */
const NEW_SECTIONS = [
  { no: "8.8", name: "CONALT", after: { no: "8.7", name: "Suplemente te ndryshme" } },
  { no: "32.1", name: "SCHOLL", after: { no: "32", name: "Ortopedi" } },
];

/** Ivy Bear, created hidden and unpriced by add-ivy-bear.mjs. */
const RELEASE = new Set(["4139", "4141", "4142", "4150", "4149", "4148", "4171", "4170", "4138"]);

// Type categories by id, checked against their slug before use.
const CAT = {
  suplemente: 204,
  pluhurDheQese: 404,
  shurupaSuplemente: 405,
  kapsula: 210,
  barnat: 248,
  shurupa: 347,
  pika: 349,
  tableta: 400,
  sprej: 401,
  krema: 402,
  ampula: 403,
  ortopedi: 328,
  kembe: 238,
  shtroje: 239,
  kozmetike: 221,
  duarKembe: 410,
  floke: 222,
  fytyra: 406,
  trupi: 229,
};
const SLUGS = {
  204: "suplemente",
  404: "pluhur-dhe-qese",
  405: "shurupa-suplemente",
  210: "kapsula",
  248: "barnat",
  347: "shurupa",
  349: "pika",
  400: "tableta-dhe-kapsula",
  401: "sprej-dhe-inhalim",
  402: "krema-dhe-pomada",
  403: "ampula-dhe-tretesira",
  328: "ortopedi",
  238: "kembe",
  239: "shtroje",
  221: "kozmetike",
  410: "kujdesi-i-duarve-dhe-kembeve",
  222: "kujdesi-i-flokeve",
  406: "kujdesi-i-fytyres",
  229: "kujdesi-i-trupit",
};

/** Dosage form from the name, for medicines and supplements. */
function form(name) {
  const n = name.toLowerCase();
  // Figures run into the word as often as not: "30tab", "20compresse".
  const w = (words) => new RegExp(`(?:\\b|\\d)(?:${words})`);
  if (w("amp\\b|ampul|inj\\b|inj\\.|i\\.v|i\\.m|infusion").test(n)) return "ampula";
  if (w("syrup|sirup|sir\\b|shurup|susp").test(n) || /\d\s*mg\s*\/\s*5\s*ml/.test(n)) return "shurup";
  if (w("spray|sprej").test(n)) return "sprej";
  if (w("drops?\\b|pika\\b|kapka").test(n)) return "pika";
  if (w("cream|krem|gel\\b|mast\\b|pomad|ointment|losion|lotion").test(n)) return "krem";
  if (w("sachets?|sachtes|stick|kesica|qese|bustine|powder|pluhur").test(n)) return "qese";
  if (w("tab|caps|capsul|kapsul|softgel|compresse").test(n)) return "tableta";
  return null;
}

/**
 * Skin, hair and body products that a neighbour or a section filed with the
 * medicines or supplements beside them (Naturagen sells face toners next to
 * magnesium; Senti2 a bear balm next to eye drops).
 */
function cosmetic(name) {
  // "Pro all hair & skin & nail 60capsules" is taken, not applied.
  if (["tableta", "qese", "shurup", "pika"].includes(form(name))) return null;
  const n = name.toLowerCase();
  if (/shampo|conditioner|hair\b|floke/.test(n)) return [CAT.kozmetike, CAT.floke];
  if (/serum|toner|cleanser|face|fytyr|booster|retin/.test(n)) return [CAT.kozmetike, CAT.fytyra];
  if (/balsam|balm\b|body/.test(n)) return [CAT.kozmetike, CAT.trupi];
  return null;
}

/** Refine a copied or fixed category set by form, within barnat or suplemente only. */
function byForm(ids, name) {
  const f = form(name);
  if (!f) return ids;
  if (ids.includes(CAT.barnat)) {
    const leaf = { ampula: CAT.ampula, shurup: CAT.shurupa, sprej: CAT.sprej, pika: CAT.pika, krem: CAT.krema, tableta: CAT.tableta }[f];
    if (!leaf) return ids;
    const drugLeaves = [CAT.ampula, CAT.shurupa, CAT.sprej, CAT.pika, CAT.krema, CAT.tableta];
    return [...ids.filter((id) => !drugLeaves.includes(id)), leaf];
  }
  if (ids.includes(CAT.suplemente)) {
    const supLeaves = [CAT.shurupaSuplemente, CAT.pluhurDheQese, CAT.kapsula];
    // Drops and sprays have no shelf of their own among the supplements: the
    // root alone, rather than "Kapsula" for a bottle of baby drops.
    if (f === "pika" || f === "sprej") return ids.filter((id) => !supLeaves.includes(id));
    const leaf = { shurup: CAT.shurupaSuplemente, qese: CAT.pluhurDheQese, tableta: CAT.kapsula }[f];
    if (!leaf) return ids;
    return [...ids.filter((id) => !supLeaves.includes(id)), leaf];
  }
  return ids;
}

/** Categories for the sections with no existing product to copy from. */
function fixedCategories(sectionName, name) {
  switch (sectionName.toLowerCase()) {
    case "conalt":
      return byForm([CAT.suplemente, CAT.kapsula], name);
    case "denk pharma":
      return byForm([CAT.barnat, CAT.tableta], name);
    case "scholl":
      return /shtroje/i.test(name)
        ? [CAT.ortopedi, CAT.kembe, CAT.shtroje]
        : [CAT.kozmetike, CAT.duarKembe];
    default:
      return null;
  }
}

/** Same rule as slugify() in src/lib/admin-actions.ts. */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ë/g, "e")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
/** A name as two spellings of one product would share: no "(code)", no punctuation. */
const nameKey = (s) =>
  tidy(s)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const cents = (s) => {
  const v = Math.round(parseFloat(String(s ?? "").replace(",", ".")) * 100);
  return Number.isFinite(v) && v > 0 ? v : null;
};
const eur = (c) => (c / 100).toFixed(2).replace(".", ",");
const sectionKey = (name) => tidy(name).toLowerCase();
const md = (s) => String(s ?? "").replace(/\|/g, "\\|");

/* ------------------------------------------------------------------ dump */

if (!existsSync(DUMP)) throw new Error(`${DUMP} is missing — see reference/old-katalog`);
const { produktet } = readDump(DUMP, ["produktet"]);
if (!produktet.length) throw new Error("the dump holds no produktet rows — its layout changed");

const rows = produktet
  .filter((r) => !SKIP_SECTIONS.has(sectionKey(r.nenkategori)))
  .map((r) => ({
    id: Number(r.produktID),
    section: tidy(r.nenkategori),
    name: tidy(r.name),
    code: tidy(r.nrserik),
    number: Number(r.number),
    foto: tidy(r.foto),
    active: r.status === "1",
    cents: cents(r.price),
  }));
const active = rows.filter((r) => r.active);

const matcher = oldCatalogMatcher(rows);
/** The old rows that are this product of ours — see scripts/lib/old-catalog-match.mjs. */
const rowsFor = (p) => matcher.rowsFor({ sku: p.sku, name: p.name, cents: p.price_cents });

/* -------------------------------------------------------------- database */

const sql = connect();
const refused = [];

const products = await sql`
  SELECT id, sku, name, slug, price_cents, regular_cents, hidden, catalog_hidden,
         catalog_section_id, catalog_sort
  FROM products
`;
const links = await sql`SELECT product_id, category_id FROM product_categories`;
const sections = await sql`SELECT id, catalog_no, name, sort FROM catalog_sections ORDER BY sort, id`;
const typeRows = await sql`
  SELECT id, slug FROM categories WHERE id = ANY(${Object.keys(SLUGS).map(Number)}::int[])
`;
for (const [id, slug] of Object.entries(SLUGS)) {
  const row = typeRows.find((r) => r.id === Number(id));
  if (!row) refused.push(`category ${id} (${slug}) does not exist`);
  else if (row.slug !== slug) refused.push(`category ${id} is "${row.slug}", expected "${slug}"`);
}

const ourByKey = new Map();
for (const p of products) for (const k of codeKeys(p.sku)) if (!ourByKey.has(k)) ourByKey.set(k, p);
const ourByName = new Map();
for (const p of products) {
  const k = nameKey(p.name);
  if (k && !ourByName.has(k)) ourByName.set(k, p);
}
const catsOf = new Map();
for (const l of links) {
  if (!catsOf.has(l.product_id)) catsOf.set(l.product_id, []);
  catsOf.get(l.product_id).push(l.category_id);
}

/* ---------------------------------------------------------- 1. prices */

const priceChanges = []; // { p, from, to, row }
const priceConflicts = []; // { p, prices }
for (const p of products) {
  const mine = rowsFor(p);
  if (!mine.length) continue;
  let source = mine.filter((r) => r.active && r.cents);
  // Unpriced on our side and switched off on theirs (4151): their last price still beats 0.
  if (!source.length && !(p.price_cents > 0)) source = mine.filter((r) => r.cents);
  const prices = [...new Set(source.map((r) => r.cents))];
  if (prices.length > 1) {
    priceConflicts.push({ p, prices, rows: source });
    continue;
  }
  if (prices.length === 1 && (prices[0] !== p.price_cents || p.regular_cents !== prices[0])) {
    priceChanges.push({ p, from: p.price_cents, to: prices[0], row: source[0] });
  }
}

/* ------------------------------------------------- 2. switched off */

const activeNames = new Set(active.map((r) => nameKey(r.name)));
const catalogHides = [];
const keptAsVariant = [];
for (const p of products) {
  if (p.catalog_hidden) continue;
  const mine = rowsFor(p);
  if (!mine.length || mine.some((r) => r.active)) continue;
  // Still active there under another code: a variant, not a withdrawal.
  if (activeNames.has(nameKey(p.name))) {
    keptAsVariant.push(p);
    continue;
  }
  catalogHides.push({ p, row: mine[0] });
}

/* ------------------------------------------------------ 3. missing */

const seed = readJson(dataPath("products.json"));
const seedByKey = new Map();
for (const e of seed) for (const k of codeKeys(e.sku)) if (!seedByKey.has(k)) seedByKey.set(k, e);

/**
 * Is this old row one of ours under a code written differently? The old
 * database adds sizes and sides to a code ("0445RR ,F" for our 0445, "8600S,L"
 * for 8600, "0389" for our 0389SL) and sometimes files the very same product
 * under a new number ("8053-m" is our 1301, name for name). Same digits and a
 * similar name, or a near-identical name: a variant, reported, never created —
 * creating it would list one product twice. Names alone at 0.9 are strict on
 * purpose: "Normega 500mg … 60softgels" beside our "Normega 1000mg … 30" is
 * another product.
 */
const stem = (code) => /^0*(\d{3,5})/.exec(String(code).trim())?.[1] ?? null;
const ourByStem = new Map();
for (const p of products) {
  const s = stem(p.sku);
  if (!s) continue;
  if (!ourByStem.has(s)) ourByStem.set(s, []);
  ourByStem.get(s).push(p);
}
function strictSimilarity(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n / Math.max(A.size, B.size);
}
/** The numbers a name states — "A30", "100ml", "13x26cm" — as one comparable string. */
const figures = (s) =>
  (tidy(s).toLowerCase().replace(/\([^)]*\)/g, " ").match(/\d+(?:[.,]\d+)?/g) ?? []).sort().join(" ");
// Our names carry their code in brackets, and some carry the OLD code: 8327
// "Qese të mëdha për barnatore (0258)".
const ourByBracketCode = new Map();
for (const p of products) {
  for (const m of String(p.name).matchAll(/\(([^)]*)\)/g)) {
    for (const k of codeKeys(m[1])) if (!ourByBracketCode.has(k)) ourByBracketCode.set(k, p);
  }
}
function variantOf(r) {
  const exact = ourByName.get(nameKey(r.name));
  if (exact) return exact;
  const bracket = codeKeys(r.code).map((k) => ourByBracketCode.get(k)).find(Boolean);
  if (bracket && strictSimilarity(bracket.name, r.name) >= 0.5) return bracket;
  const s = stem(r.code);
  const sameDigits = (s && ourByStem.get(s)) ?? [];
  const byDigits = sameDigits.find((p) => strictSimilarity(p.name, r.name) >= 0.6);
  if (byDigits) return byDigits;
  // A name that differs only in its figures is another size: "A30" beside "A40".
  return (
    products.find(
      (p) => strictSimilarity(p.name, r.name) >= 0.9 && figures(p.name) === figures(r.name)
    ) ?? null
  );
}

const ourAllByKey = new Map();
for (const p of products) {
  for (const k of codeKeys(p.sku)) {
    if (!ourAllByKey.has(k)) ourAllByKey.set(k, []);
    ourAllByKey.get(k).push(p);
  }
}

const codeVariants = []; // { row, ours }
const collisions = []; // { row, ours }: our code, another product
const missing = [];
const claimedKeys = new Set();
for (const r of active) {
  const keys = codeKeys(r.code);
  if (!keys.length) continue;
  const holders = [...new Set(keys.flatMap((k) => ourAllByKey.get(k) ?? []))];
  if (holders.length) {
    // 7502 is both our compression stocking and our Labella balm: fine if any
    // product under the code is the one this row describes.
    if (!holders.some((p) => rowsFor(p).includes(r))) collisions.push({ row: r, ours: holders[0] });
    continue;
  }
  const variant = variantOf(r);
  if (variant) {
    codeVariants.push({ row: r, ours: variant });
    continue;
  }
  // The same code printed in two sections is one product: the first print wins.
  if (keys.some((k) => claimedKeys.has(k))) continue;
  keys.forEach((k) => claimedKeys.add(k));
  missing.push(r);
}

// A product the old database still prints under a variant code is not switched
// off there: our 0445 has an inactive "0445" row and an active "0445RR ,F".
{
  const printedAsVariant = new Set(codeVariants.map((v) => v.ours.id));
  for (let i = catalogHides.length - 1; i >= 0; i--) {
    if (!printedAsVariant.has(catalogHides[i].p.id)) continue;
    keptAsVariant.push(catalogHides[i].p);
    catalogHides.splice(i, 1);
  }
}

/* ------------------------------------------------------ sections */

const sectionByName = new Map(sections.map((s) => [sectionKey(s.name), s]));
const sectionsToCreate = NEW_SECTIONS.filter((n) => !sectionByName.has(sectionKey(n.name)));
for (const n of sectionsToCreate) {
  const after = sections.find((s) => s.catalog_no === n.after.no && s.name === n.after.name);
  if (!after) refused.push(`section ${n.after.no} ${n.after.name} (before ${n.no} ${n.name}) not found`);
}
const unknownSections = new Set();
for (const r of missing) {
  const key = sectionKey(r.section);
  if (!sectionByName.has(key) && !NEW_SECTIONS.some((n) => sectionKey(n.name) === key)) {
    unknownSections.add(r.section);
  }
}
for (const s of unknownSections) refused.push(`old section "${s}" matches no catalogue section`);

/** The category set most of a section's products carry, as it stands in this database. */
function sectionSignature(sectionId) {
  const tally = new Map();
  for (const p of products) {
    if (p.catalog_section_id !== sectionId) continue;
    const ids = (catsOf.get(p.id) ?? []).slice().sort((a, b) => a - b);
    if (!ids.length) continue;
    const key = ids.join(",");
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const best = [...tally].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0].split(",").map(Number) : null;
}

/**
 * The shop categories of the existing product whose name reads most like this
 * one. Sections mix product types — "Kozmetika te ndryshme" holds shampoos
 * beside creams, Naturagen face sprays beside magnesium — so a section's
 * majority would file a Bioscalin shampoo under medicinal creams. A near
 * neighbour by name ("Shkopinje per veshe A300" / "Shkopinje per vesh A300")
 * almost always sits where the new one belongs. Brand categories come along
 * only from the same printed section: a Scholl insole must not inherit Ersa.
 */
const kindOf = new Map((await sql`SELECT id, kind FROM categories`).map((c) => [c.id, c.kind]));
const ourTrigrams = products.map((p) => ({ p, g: trigrams(p.name) }));
const NEIGHBOUR = 0.45;
function neighbourCategories(r, sectionId) {
  const g = trigrams(r.name);
  if (!g.size) return null;
  let best = null;
  let bestScore = 0;
  for (const { p, g: h } of ourTrigrams) {
    if (!(catsOf.get(p.id) ?? []).length) continue;
    let n = 0;
    for (const t of g) if (h.has(t)) n++;
    const score = n / Math.max(g.size, h.size) + (p.catalog_section_id === sectionId ? 0.1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  if (!best || bestScore < NEIGHBOUR) return null;
  const sameSection = best.catalog_section_id === sectionId;
  return catsOf.get(best.id).filter((id) => kindOf.get(id) !== "brand" || sameSection);
}

let nextId = Math.max(0, ...products.map((p) => p.id), ...seed.map((e) => e.id)) + 1;
const takenSlugs = new Set(products.map((p) => p.slug));
const takenIds = new Map(products.map((p) => [p.id, p]));
const newProducts = [];
for (const r of missing) {
  const keys = codeKeys(r.code);
  const fromSeed = keys.map((k) => seedByKey.get(k)).find(Boolean);
  const section = sectionByName.get(sectionKey(r.section));
  let categoryIds = fromSeed?.categoryIds;
  if (!categoryIds) {
    const fixed = fixedCategories(r.section, r.name);
    const copied =
      neighbourCategories(r, section?.id ?? null) ?? (section ? sectionSignature(section.id) : null);
    categoryIds = fixed ?? (copied ? byForm(copied, r.name) : null);
    // A cosmetic that landed with the medicines, supplements or devices keeps
    // its brand and moves to the cosmetics shelf its name says.
    const misfiled = [CAT.barnat, CAT.suplemente, 220 /* paisje-medicinale */];
    const shelf = cosmetic(r.name);
    if (categoryIds && shelf && categoryIds.some((id) => misfiled.includes(id))) {
      categoryIds = [...shelf, ...categoryIds.filter((id) => kindOf.get(id) === "brand")];
    }
  }
  if (!categoryIds?.length) refused.push(`${r.code} ${r.name}: no category to copy in section ${r.section}`);

  let id = fromSeed?.id;
  let slug = fromSeed?.slug;
  if (!id) id = nextId++;
  if (!slug) {
    const base = `${slugify(r.name)}-${slugify(r.code)}`.replace(/-+$/, "");
    slug = base;
    for (let n = 2; takenSlugs.has(slug); n++) slug = `${base}-${n}`;
  }
  const holder = takenIds.get(id);
  if (holder) refused.push(`id ${id} for ${r.code} is taken by ${holder.sku} ${holder.name}`);
  if (takenSlugs.has(slug)) refused.push(`slug ${slug} for ${r.code} is taken`);
  takenSlugs.add(slug);

  const file = `${`${r.code}-${slug}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 90)}.webp`;
  const photo = r.foto ? path.join(OLD, r.foto) : null;
  if (!photo || !existsSync(photo)) refused.push(`${r.code} ${r.name}: photo ${r.foto || "(none)"} not in the dump`);
  if (!r.cents) refused.push(`${r.code} ${r.name}: no price in the old database`);

  newProducts.push({
    row: r,
    id,
    slug,
    sku: r.code,
    name: r.name,
    cents: r.cents,
    categoryIds,
    image: fromSeed?.images?.[0] ?? `/products/${file}`,
    file,
    photo,
    fromSeed: Boolean(fromSeed),
  });
}

/* ------------------------------------------------------ 4. Ivy Bear */

const releases = products.filter(
  (p) => RELEASE.has(String(p.sku).trim()) && (p.hidden || p.catalog_hidden) &&
    rowsFor(p).some((r) => r.active)
);

/* --------------------------------------------------------- report */

const variantPrices = priceChanges.filter((c) => c.to > c.from).length;
const report = [
  `# The old catalogue's database against ours — ${new Date().toISOString().slice(0, 10)}`,
  ``,
  `Source: \`reference/old-katalog/u600177787_shemo.sql\` (gitignored). Database: ${target()}.`,
  `Written by \`scripts/import-old-catalog-db.mjs\`${WRITE ? "" : " (dry run)"}.`,
  ``,
  `| | |`,
  `|---|---|`,
  `| Rows in the old database (without AKSION) | ${rows.length} |`,
  `| — active | ${active.length} |`,
  `| Our products | ${products.length} |`,
  `| Prices to change | ${priceChanges.length} (${variantPrices} up, ${priceChanges.length - variantPrices} down) |`,
  `| Codes priced twice, left alone | ${priceConflicts.length} |`,
  `| Switched off there, leaving the printed catalogue | ${catalogHides.length} |`,
  `| Active there under another code, kept | ${keptAsVariant.length} |`,
  `| Missing here, to create | ${newProducts.length} |`,
  `| Same name under another code, not created | ${codeVariants.length} |`,
  `| Our code given to another product there, not created | ${collisions.length} |`,
  `| Sections to create | ${sectionsToCreate.map((s) => `${s.no} ${s.name}`).join(", ") || "none"} |`,
  `| Ivy Bear to release | ${releases.length} |`,
  ``,
  `## Prices (${priceChanges.length})`,
  ``,
  `| Code | Product | Ours | Old catalogue |`,
  `|---|---|---:|---:|`,
  ...priceChanges.map((c) => `| ${md(c.p.sku)} | ${md(tidy(c.p.name))} | ${eur(c.from)} | ${eur(c.to)} |`),
  ``,
  `## Priced twice in the old database (${priceConflicts.length}) — left alone`,
  ``,
  ...(priceConflicts.length
    ? [
        `| Code | Product | Ours | Old prices |`,
        `|---|---|---:|---|`,
        ...priceConflicts.map(
          (c) => `| ${md(c.p.sku)} | ${md(tidy(c.p.name))} | ${eur(c.p.price_cents)} | ${c.rows.map((r) => `${eur(r.cents)} (${md(r.section)})`).join(", ")} |`
        ),
      ]
    : [`None.`]),
  ``,
  `## Leaving the printed catalogue (${catalogHides.length})`,
  ``,
  `Inactive in the old database. \`catalog_hidden\` only — the shop keeps them.`,
  ``,
  `| Code | Product | Old note |`,
  `|---|---|---|`,
  ...catalogHides.map((h) => `| ${md(h.p.sku)} | ${md(tidy(h.p.name))} | ${md(h.row.section)} |`),
  ``,
  `## Created (${newProducts.length})`,
  ``,
  `| Id | Code | Product | Price | Section | Categories |`,
  `|---:|---|---|---:|---|---|`,
  ...newProducts.map(
    (n) => `| ${n.id} | ${md(n.sku)} | ${md(n.name)} | ${n.cents ? eur(n.cents) : "?"} | ${md(n.row.section)} | ${(n.categoryIds ?? []).join(", ")} |`
  ),
  ``,
  `## Same product, another code (${codeVariants.length}) — for the owner`,
  ``,
  `The old database prints these under a code ours does not carry; the names agree.`,
  `Nothing was created or changed.`,
  ``,
  `| Old code | Old name | Our code | Our name |`,
  `|---|---|---|---|`,
  ...codeVariants.map((v) => `| ${md(v.row.code)} | ${md(v.row.name)} | ${md(v.ours.sku)} | ${md(tidy(v.ours.name))} |`),
  ``,
  `## One code, two products (${collisions.length}) — for the owner`,
  ``,
  `The old database gives one of our codes to a different product (it reuses`,
  `codes). Neither side was changed; the old product was not created, because`,
  `two products would then share a code.`,
  ``,
  `| Code | Old database | Price | Ours | Our price |`,
  `|---|---|---:|---|---:|`,
  ...collisions.map(
    (c) => `| ${md(c.row.code)} | ${md(c.row.name)} | ${c.row.cents ? eur(c.row.cents) : "?"} | ${md(tidy(c.ours.name))} | ${eur(c.ours.price_cents)} |`
  ),
  ``,
  `## Active there under another code — kept in the catalogue (${keptAsVariant.length})`,
  ``,
  ...(keptAsVariant.length ? keptAsVariant.map((p) => `- ${md(p.sku)}: ${md(tidy(p.name))}`) : [`None.`]),
  ``,
].join("\n");
writeFileSync(path.join(ROOT, "audit", "old-catalog-db-import.md"), report);

console.log(`\n${describeTarget()}\n`);
console.log(`old database: ${rows.length} rows, ${active.length} active`);
console.log(`prices:       ${priceChanges.length} to change (${variantPrices} up), ${priceConflicts.length} conflicting left alone`);
console.log(`catalogue:    ${catalogHides.length} to hide (switched off there), ${keptAsVariant.length} kept as variants`);
console.log(`missing:      ${newProducts.length} to create, ${codeVariants.length} code variants and ${collisions.length} reused codes reported`);
console.log(`sections:     ${sectionsToCreate.map((s) => `${s.no} ${s.name}`).join(", ") || "none"} to create`);
console.log(`Ivy Bear:     ${releases.length} to release`);
console.log(`report:       audit/old-catalog-db-import.md`);

if (refused.length) {
  console.log(`\nREFUSED (${refused.length}) — nothing written:`);
  for (const r of refused.slice(0, 40)) console.log(`  ${r}`);
  process.exit(1);
}
if (!WRITE) {
  console.log("\n(dry run; pass --write to apply)");
  process.exit(0);
}

/* ---------------------------------------------------------- write */

// Photos first: a row must never point at a file that is not there.
let originals = 0;
for (const n of newProducts) {
  const target = path.join(ROOT, "public", n.image);
  if (existsSync(target)) continue;
  const r = await reframe(n.photo);
  writeFileSync(target, r.webp);
  originals++;
}
console.log(`\noriginals written: ${originals}`);

// products.json mirrors what a re-seed would replay.
const seedById = new Map(seed.map((e) => [e.id, e]));
let seedChanged = 0;
for (const c of priceChanges) {
  const e = seedById.get(c.p.id);
  if (e && (e.priceCents !== c.to || e.regularCents !== c.to)) {
    e.priceCents = c.to;
    e.regularCents = c.to;
    seedChanged++;
  }
}
for (const n of newProducts) {
  if (seedById.has(n.id)) continue;
  seed.push({
    id: n.id,
    name: n.name,
    slug: n.slug,
    sku: n.sku,
    priceCents: n.cents,
    regularCents: n.cents,
    onSale: false,
    currency: "EUR",
    images: [n.image],
    categoryIds: n.categoryIds,
    inStock: true,
    description: "",
    shortDescription: "",
  });
  seedChanged++;
}
if (seedChanged) {
  writeFileSync(dataPath("products.json"), JSON.stringify(seed, null, 1));
  console.log(`products.json: ${seedChanged} entries written`);
}

if (priceChanges.length) {
  const payload = priceChanges.map((c) => ({ id: c.p.id, cents: c.to }));
  const done = await sql`
    UPDATE products p SET price_cents = t.cents, regular_cents = t.cents, updated_at = now()
    FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS t(id int, cents int)
    WHERE p.id = t.id
    RETURNING p.id
  `;
  console.log(`prices: ${done.length} updated`);
}

if (catalogHides.length) {
  const ids = catalogHides.map((h) => h.p.id);
  const done = await sql`
    UPDATE products SET catalog_hidden = true, updated_at = now()
    WHERE id = ANY(${ids}::int[]) AND catalog_hidden = false
    RETURNING id
  `;
  console.log(`catalogue: ${done.length} hidden`);
}

for (const n of sectionsToCreate) {
  const [after] = await sql`
    SELECT sort FROM catalog_sections WHERE catalog_no = ${n.after.no} AND name = ${n.after.name}
  `;
  await sql`UPDATE catalog_sections SET sort = sort + 1 WHERE sort > ${after.sort}`;
  await sql`
    INSERT INTO catalog_sections (catalog_no, name, sort)
    VALUES (${n.no}, ${n.name}, ${after.sort + 1})
    ON CONFLICT (catalog_no, name) DO NOTHING
  `;
  console.log(`section ${n.no} ${n.name} created after ${n.after.no} ${n.after.name}`);
}

if (newProducts.length) {
  const secs = await sql`SELECT id, name FROM catalog_sections`;
  const secId = new Map(secs.map((s) => [sectionKey(s.name), s.id]));
  const payload = newProducts.map((n) => ({
    id: n.id,
    name: n.name,
    slug: n.slug,
    sku: n.sku,
    cents: n.cents,
    images: [n.image],
    section: secId.get(sectionKey(n.row.section)),
  }));
  const inserted = await sql`
    INSERT INTO products (
      id, name, slug, sku, price_cents, regular_cents, on_sale, currency, images,
      in_stock, description, short_description, featured, hidden, catalog_hidden,
      catalog_section_id, catalog_sort
    )
    SELECT id, name, slug, sku, cents, cents, false, 'EUR', images,
           true, '', '', false, false, false, section, 0
    FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS t(
      id int, name text, slug text, sku text, cents int, images jsonb, section int
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `;
  console.log(`products: ${inserted.length} inserted`);

  const linkRows = newProducts.flatMap((n) => n.categoryIds.map((category_id) => ({ product_id: n.id, category_id })));
  const linked = await sql`
    INSERT INTO product_categories (product_id, category_id)
    SELECT product_id, category_id
    FROM jsonb_to_recordset(${JSON.stringify(linkRows)}::jsonb) AS t(product_id int, category_id int)
    ON CONFLICT DO NOTHING
    RETURNING product_id
  `;
  console.log(`product_categories: ${linked.length} links`);

  // Printed order: each new product goes in right after the product the old
  // database prints before it, so the order an editor set in /admin/katalogu
  // stays as it is around it. Then the section is renumbered 1..n.
  const touched = new Set(payload.map((p) => p.section));
  for (const sid of touched) {
    const members = await sql`
      SELECT id, sku FROM products WHERE catalog_section_id = ${sid}
      ORDER BY catalog_sort, id
    `;
    const fresh = new Set(newProducts.filter((n) => secId.get(sectionKey(n.row.section)) === sid).map((n) => n.id));
    const order = members.filter((m) => !fresh.has(m.id)).map((m) => m.id);
    const sectionName = secs.find((s) => s.id === sid).name;
    const printed = active
      .filter((r) => sectionKey(r.section) === sectionKey(sectionName))
      .sort((a, b) => a.number - b.number || a.id - b.id);
    const idForRow = (r) => {
      const n = newProducts.find((x) => x.row === r);
      if (n) return n.id;
      for (const k of codeKeys(r.code)) {
        const p = ourByKey.get(k);
        if (p) return p.id;
      }
      return null;
    };
    for (const n of newProducts.filter((x) => fresh.has(x.id))) {
      const at = printed.indexOf(n.row);
      let pos = 0;
      for (let i = at - 1; i >= 0; i--) {
        const prev = idForRow(printed[i]);
        const where = prev == null ? -1 : order.indexOf(prev);
        if (where !== -1) {
          pos = where + 1;
          break;
        }
      }
      order.splice(pos, 0, n.id);
    }
    await sql`
      UPDATE products p SET catalog_sort = t.ord
      FROM unnest(${order}::int[], ${order.map((_, i) => i + 1)}::int[]) AS t(id, ord)
      WHERE p.id = t.id AND p.catalog_sort IS DISTINCT FROM t.ord
    `;
  }
  console.log(`sections renumbered: ${touched.size}`);
}

if (releases.length) {
  const done = await sql`
    UPDATE products SET hidden = false, catalog_hidden = false, updated_at = now()
    WHERE id = ANY(${releases.map((p) => p.id)}::int[]) AND price_cents > 0
    RETURNING id
  `;
  console.log(`Ivy Bear: ${done.length} released`);
}

// Counts gate what the navigation shows; same statement as recountCategories()
// in src/lib/admin-actions.ts.
await sql`
  WITH RECURSIVE subtree AS (
    SELECT id AS root, id AS node, 0 AS depth FROM categories
    UNION ALL
    SELECT s.root, c.id, s.depth + 1
    FROM subtree s
    JOIN categories c ON c.parent = s.node
    WHERE s.depth < 10
  ), tallied AS (
    SELECT s.root AS id, count(DISTINCT p.id)::int AS n
    FROM subtree s
    LEFT JOIN product_categories pc ON pc.category_id = s.node
    LEFT JOIN products p ON p.id = pc.product_id AND p.hidden = false
    GROUP BY s.root
  )
  UPDATE categories c SET count = t.n
  FROM tallied t
  WHERE c.id = t.id AND c.count IS DISTINCT FROM t.n
`;
console.log(`category counts recomputed`);
console.log(
  `\nNext: the photos of the new products are reframed originals. Cut them with\n` +
    `  node scripts/cutout-images.mjs --only "<codes>" --write, then npm run images:thumbs && npm run images:print.\n` +
    `The live site caches the catalogue for up to 60 s.`
);
