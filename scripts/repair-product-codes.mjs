/**
 * Put the article code and the price back in their own columns.
 *
 *   node scripts/repair-product-codes.mjs                          # dry run, development
 *   node scripts/repair-product-codes.mjs --write                  # apply, development
 *   DATABASE_TARGET=production node scripts/repair-product-codes.mjs --write
 *
 * Four products arrived from the WooCommerce export with two columns swapped:
 * the `sku` cell holds the price and the `price_cents` cell holds the article
 * code, multiplied by a hundred because it was read as euros. Production still
 * shows all four:
 *
 *     sku "16.00"  price 8 709.00  "Mobilizues per Nyje te Kembes … (8709)"
 *     sku "4.40"   price 7 694.00  "Sona adapalen gel 1mg/30g (7694)"
 *     sku "8.70"   price 5 295.00  "Water for injections … (5295)"
 *     sku "1.60"   price     1.60  "Hello Kitty Brushe Kids A2 (7657)"
 *
 * The first three are priced at four figures on a live shop. The fourth kept
 * its real price and lost only its code, which is why the two repairs below are
 * separate and each carries its own proof.
 *
 * Ten more products have no code at all, and nine of them print one in the
 * name — so a partner reading the printed catalogue types 4666 and the search
 * finds nothing.
 *
 * ## What counts as proof
 *
 * Nothing here is inferred from a price looking wrong. Each change needs the
 * arithmetic to close:
 *
 * **The price** is restored only when `price_cents / 100` equals the code the
 * name carries — that equality is the swap itself, and it cannot happen by
 * accident at these magnitudes. The price it is restored *to* is read from
 * SWAPPED below, which records what the `sku` cell held on production before
 * this ran. That table is deliberately not computed from
 * `src/data/products.json`: this script repairs that file in the same run, so a
 * re-seed cannot reinstate the swap, and the evidence would be gone the second
 * time the script was called.
 *
 * A row that the general rule detects but the table does not name is reported
 * and left alone — a fresh import repeating this mistake should stop somebody,
 * not be silently guessed at.
 *
 * **The code** is filled only from a parenthesised group in the name, and only
 * when the name carries exactly one. "Folate 400mcg 50 tablets" carries none
 * and is left alone rather than guessed at.
 *
 * Both repairs are idempotent: a second run finds nothing, on either database.
 */
import { writeFileSync } from "node:fs";
import { connect, dataPath, describeTarget, readJson } from "./lib/db.mjs";

const WRITE = process.argv.includes("--write");

/**
 * What the `sku` cell held on production — the real price, in cents. Measured
 * 2026-09-10 against the production branch before any of this was applied.
 */
const SWAPPED = new Map([
  [19377, 1600], // sku "16.00", price_cents 870900
  [19667, 440], //  sku "4.40",  price_cents 769400
  [19623, 870], //  sku "8.70",  price_cents 529500
]);

/** "16.00" or "4,40" — a price where a code belongs. */
const PRICE_SHAPED = /^\d+[.,]\d{1,2}$/;
const asCents = (s) => Math.round(Number(String(s).replace(",", ".")) * 100);

/** The code a name prints in brackets, when it prints exactly one. */
function codeInName(name) {
  const groups = [...name.matchAll(/\(([^()]*)\)/g)]
    .map((m) => m[1].trim())
    .filter((g) => /^\d{3,5}$/.test(g));
  return groups.length === 1 ? groups[0] : null;
}

const sql = connect();

const rows = await sql`
  SELECT id, sku, name, price_cents, regular_cents
  FROM products
  WHERE sku ~ '^[0-9]+[.,][0-9]{1,2}$' OR sku = '' OR sku IS NULL OR price_cents > 200000
  ORDER BY id
`;

const prices = []; // { id, sku, name, from, to }
const codes = []; // { id, name, from, to }
const refused = [];

for (const r of rows) {
  const code = codeInName(r.name);

  // Repair A — the price cell holds the article code.
  if (code && r.price_cents === asCents(code)) {
    const real = SWAPPED.get(r.id);
    if (real === undefined) {
      refused.push(
        `${r.id} ${r.name}: priced at its own article code, but SWAPPED has no recorded price — ` +
          `a new import has repeated the column swap, so look at it by hand`
      );
    } else {
      prices.push({ id: r.id, sku: r.sku, name: r.name, from: r.price_cents, to: real });
    }
  }

  // Repair B — the code cell holds a price, or nothing at all.
  const missing = !r.sku || PRICE_SHAPED.test(r.sku);
  if (missing) {
    if (!code) refused.push(`${r.id} ${r.name}: no code in the name to take`);
    else codes.push({ id: r.id, name: r.name, from: r.sku ?? "", to: code });
  }
}

/**
 * The same two repairs against src/data/products.json, decided on the file's own
 * contents rather than on the rows this database happens to need. The
 * development database had thirteen of these codes put right by hand months ago
 * and the seed never heard about it, so the two are already out of step — and
 * `npm run seed:db` would have undone the lot.
 */
const seedFile = dataPath("products.json");
const seed = readJson(seedFile);
const seedEdits = [];
for (const row of seed) {
  const code = codeInName(row.name);
  const cents = SWAPPED.get(row.id);
  const wantPrice = cents !== undefined && row.priceCents !== cents;
  const wantSku = code && (!row.sku || PRICE_SHAPED.test(String(row.sku)));
  if (wantPrice || wantSku) seedEdits.push({ row, code, cents, wantPrice, wantSku });
}

console.log(`\n${describeTarget()}\n`);

console.log(`prices to restore: ${prices.length}`);
for (const p of prices) {
  console.log(`  ${p.id}  ${(p.from / 100).toFixed(2)} -> ${(p.to / 100).toFixed(2)}   ${p.name}`);
}
console.log(`\ncodes to fill: ${codes.length}`);
for (const c of codes) console.log(`  ${c.id}  "${c.from}" -> "${c.to}"   ${c.name}`);

console.log(`\nsrc/data/products.json entries to correct: ${seedEdits.length}`);
for (const e of seedEdits) {
  const what = [
    e.wantSku ? `sku "${e.row.sku}" -> "${e.code}"` : null,
    e.wantPrice ? `price ${(e.row.priceCents / 100).toFixed(2)} -> ${(e.cents / 100).toFixed(2)}` : null,
  ].filter(Boolean);
  console.log(`  ${e.row.id}  ${what.join(", ")}   ${e.row.name}`);
}

if (refused.length) {
  console.log(`\nleft alone, evidence does not close (${refused.length}):`);
  for (const r of refused) console.log(`  ${r}`);
}

if (!prices.length && !codes.length && !seedEdits.length) {
  console.log("\nnothing to do.");
  process.exit(0);
}
if (!WRITE) {
  console.log("\n(dry run; pass --write to apply)");
  process.exit(0);
}

// regular_cents moves with price_cents: both were filled from the same bad cell,
// and leaving it behind would make every one of these look discounted by 99%.
if (prices.length) {
  const done = await sql`
    UPDATE products AS p
    SET price_cents = v.cents, regular_cents = v.cents, updated_at = now()
    FROM (
      SELECT unnest(${prices.map((p) => p.id)}::int[]) AS id,
             unnest(${prices.map((p) => p.to)}::int[]) AS cents
    ) AS v
    WHERE p.id = v.id
    RETURNING p.id
  `;
  console.log(`\nprices updated: ${done.length}`);
}

if (codes.length) {
  const done = await sql`
    UPDATE products AS p
    SET sku = v.sku, updated_at = now()
    FROM (
      SELECT unnest(${codes.map((c) => c.id)}::int[]) AS id,
             unnest(${codes.map((c) => c.to)}::text[]) AS sku
    ) AS v
    WHERE p.id = v.id
    RETURNING p.id
  `;
  console.log(`codes updated: ${done.length}`);
}

// products.json is what `npm run seed:db` replays. Left as it is, the next seed
// would put all four rows straight back — the same trap sync-image-paths.mjs
// exists to close for the photo paths.
if (seedEdits.length) {
  for (const e of seedEdits) {
    if (e.wantSku) e.row.sku = e.code;
    if (e.wantPrice) {
      e.row.priceCents = e.cents;
      e.row.regularCents = e.cents;
    }
  }
  writeFileSync(seedFile, JSON.stringify(seed, null, 1));
  console.log(`src/data/products.json: ${seedEdits.length} entries updated`);
}

const [after] = await sql`
  SELECT count(*) FILTER (WHERE price_cents > 200000)::int AS absurd,
         count(*) FILTER (WHERE sku ~ '^[0-9]+[.,][0-9]{1,2}$')::int AS price_shaped,
         count(*) FILTER (WHERE sku IS NULL OR sku = '')::int AS blank
  FROM products
`;
console.log(
  `\nremaining: ${after.absurd} prices over 2 000 EUR, ${after.price_shaped} price-shaped codes, ` +
    `${after.blank} products with no code`
);
console.log("Remember: the catalogue PDF and the cached catalog both need a refresh after this.");
