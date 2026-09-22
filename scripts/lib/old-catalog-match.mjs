/**
 * Which rows of the old catalogue's database (scripts/lib/old-catalog-sql.mjs)
 * are which of our products.
 *
 * By article code first, but never by code alone: the old database reuses
 * codes. 7502 was a compression stocking at 24 EUR and is now a Labella lip
 * balm at 0,80; 5232 went from Tropimil to a Bioscalin shampoo; 7259 from
 * Alpecin to an acne cream. Matched on code only, the stocking would be
 * repriced at 0,80 and shown with a lip balm's photograph. So a row counts as
 * a product's only when the names agree too — letter trigrams, because the two
 * sides spell "40mgX14" and "40mg x 14" — or, where the old name is a
 * translation ("Baby wipes A20" / "Palloma becutan A20") and no row under the
 * code reads better, when its price is within a factor of 1.5 of ours.
 *
 * Shared by scripts/import-old-catalog-db.mjs (prices, visibility, what is
 * missing) and scripts/fetch-katalog-images.mjs --dump (which photo is whose),
 * so a product can never take its price from one row and its picture from
 * another.
 */
import { skuKeys } from "./catalog-html.mjs";

/**
 * skuKeys() without the keys that hold no digit. skuCandidates() splits
 * "8531B,C" into "8531B" and "C", and "0023A, B, C, D, E" likewise — so both
 * would meet under the key "c", and a hernia belt would reprice a thermometer.
 */
export const codeKeys = (s) => skuKeys(s).filter((k) => /\d/.test(k));

/** A row standing for several products at once: "3057 3102 3108", "2836A,B". */
export const multiCode = (code) => String(code).split(/[,\s]+/).filter(Boolean).length > 1;

export function trigrams(s) {
  const t = String(s ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  const g = new Set();
  for (let i = 0; i + 3 <= t.length; i++) g.add(t.slice(i, i + 3));
  return g;
}

/** Shared trigrams over the shorter name: lenient, for "is this the same product". */
export function similarity(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n / Math.min(A.size, B.size);
}

export const SIMILAR = 0.3;
export const PRICE_FACTOR = 1.5;

/**
 * Index rows ({ code, name, cents }) by every key their code stands for.
 *
 * rowsUnder(sku): every row filed under ANY of our code's keys — not the first
 * key's only, since our "9606, 9607, 9608" is printed there as "9607 9608 9609"
 * and 9606 alone is a collagen serum.
 *
 * rowsFor({ sku, name, cents }): those of them that describe this product.
 */
export function oldCatalogMatcher(rows) {
  const byKey = new Map();
  for (const r of rows) {
    for (const k of codeKeys(r.code)) {
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(r);
    }
  }

  function rowsUnder(sku) {
    const found = new Set();
    for (const k of codeKeys(sku)) for (const r of byKey.get(k) ?? []) found.add(r);
    return [...found];
  }

  function rowsFor(product) {
    const under = rowsUnder(product.sku);
    if (!under.length) return [];
    const sims = under.map((r) => similarity(product.name, r.name));
    const best = Math.max(...sims);
    return under.filter((r, i) => {
      if (sims[i] >= SIMILAR) return true;
      if (!r.cents) return false;
      // Unpriced on our side (Ivy Bear) has no price to compare; the name must carry it.
      if (!(product.cents > 0)) return false;
      const ratio = r.cents / product.cents;
      if (ratio > PRICE_FACTOR || ratio < 1 / PRICE_FACTOR) return false;
      // A better-named row wins, except over a row that groups several codes:
      // the office folded the children's brushes (Spiderman 3057, Stitch 3102 …)
      // into one "Brushe per dhembe me kapak" and switched the named rows off.
      return best < SIMILAR || multiCode(r.code);
    });
  }

  return { rowsUnder, rowsFor };
}

/** An old price string ("580.00", " 4,90") in cents, or null when it is none. */
export function oldCents(s) {
  const v = Math.round(parseFloat(String(s ?? "").replace(",", ".")) * 100);
  return Number.isFinite(v) && v > 0 ? v : null;
}
