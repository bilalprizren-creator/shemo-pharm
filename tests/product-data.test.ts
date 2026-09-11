import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Integrity of the checked-in range, src/data/products.json.
 *
 * This file is what `npm run seed:db` replays into a database, so a defect that
 * survives here comes back on the next seed however carefully the database was
 * repaired. That is not hypothetical: four products reached production with the
 * `sku` and the price in each other's columns — "Mobilizues per Nyje te Kembes
 * … (8709)" was on sale at 8 709,00 EUR, its article code was "16.00", and it
 * stayed that way for months because nothing looked at the range as a whole.
 *
 * These tests are cheap and read no database. They are deliberately about
 * shapes that are always wrong, never about a price being surprising — the
 * range really does run from a 0,05 EUR gauze compress to a 1 300,00 EUR oxygen
 * concentrator, and a test with an opinion about that would be turned off
 * within a week.
 *
 * scripts/repair-product-codes.mjs is what fixes a failure here.
 */
interface SeedProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  priceCents: number;
  regularCents: number;
  images: string[];
  categoryIds: number[];
}

const products: SeedProduct[] = JSON.parse(
  readFileSync(fileURLToPath(new URL("../src/data/products.json", import.meta.url)), "utf8")
);

const describeProduct = (p: SeedProduct) => `${p.id} "${p.sku}" ${p.name}`;

describe("the checked-in product range", () => {
  it("is the whole range", () => {
    expect(products.length).toBeGreaterThan(2000);
  });

  it("gives every product a unique id and slug", () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
  });

  /**
   * "16.00" in the code column is the swap's fingerprint. A real article code
   * here is digits, or digits with a size or variant letter on it (4307L,
   * 3304A,C,D, NT019) — never a decimal number.
   */
  it("has no article code shaped like a price", () => {
    const priceShaped = products.filter((p) => /^\d+[.,]\d{1,2}$/.test(p.sku));
    expect(priceShaped.map(describeProduct)).toEqual([]);
  });

  /**
   * The other half of the same swap, and the half that reaches a customer. A
   * price that is exactly the article code in euros cannot happen by accident:
   * it means the code was written into the price column.
   */
  it("prices no product at its own article code", () => {
    const selfPriced = products.filter((p) => {
      const code = p.name.match(/\((\d{3,5})\)/)?.[1];
      return code !== undefined && p.priceCents === Number(code) * 100;
    });
    expect(selfPriced.map(describeProduct)).toEqual([]);
  });

  /**
   * The Ivy Bear range came in from the printed catalogue on 2026-09-11 with no
   * wholesale price to be had anywhere — not on shemo-katalog.com, not in the
   * Jara import, and the old shop's API is closed — and is hidden on both sites
   * until the owner prices it in /admin/produktet (scripts/add-ivy-bear.mjs).
   * Pinned by code so that the list can only shrink: a price entered here is
   * a code taken off the list, and any other product at 0 is still a defect.
   */
  const AWAITING_PRICE = new Set([
    "4139", "4141", "4142", "4150", "4149", "4148", "4171", "4170", "4138", "4151",
  ]);

  it("charges something for everything not awaiting a price", () => {
    const unpriced = products.filter((p) => !(p.priceCents > 0) && !AWAITING_PRICE.has(p.sku));
    expect(unpriced.map(describeProduct)).toEqual([]);
  });

  it("only waits for the prices of products that exist and are still unpriced", () => {
    const bySku = new Map(products.map((p) => [p.sku, p]));
    const stale = [...AWAITING_PRICE].filter((sku) => (bySku.get(sku)?.priceCents ?? 1) > 0);
    expect(stale).toEqual([]);
  });

  /**
   * regular_cents below price_cents renders as a negative discount. The two are
   * equal for all but the products actually on offer.
   */
  it("never has a regular price below the selling price", () => {
    const inverted = products.filter((p) => p.regularCents < p.priceCents);
    expect(inverted.map(describeProduct)).toEqual([]);
  });

  it("gives every product a photograph and a category", () => {
    expect(products.filter((p) => !p.images?.length).map(describeProduct)).toEqual([]);
    expect(products.filter((p) => !p.categoryIds?.length).map(describeProduct)).toEqual([]);
  });

  /**
   * One product, "Folate 400mcg 50 tablets", genuinely has no code anywhere —
   * not in its name either, so there is nothing to recover it from. It is
   * pinned here so that it stays the *only* one: a code is what a partner types
   * out of the printed catalogue, and a product without one cannot be found.
   */
  it("has exactly one product with no article code", () => {
    const codeless = products.filter((p) => !p.sku?.trim());
    expect(codeless.map((p) => p.name)).toEqual(["Folate 400mcg 50 tablets"]);
  });
});
