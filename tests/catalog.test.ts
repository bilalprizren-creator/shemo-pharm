import { describe, expect, it } from "vitest";
import {
  brandMatches,
  primaryCategoryOf,
  rankRelated,
  searchProducts,
} from "@/lib/catalog";
import type { Category, Product } from "@/lib/types";

function product(id: number, name: string, over: Partial<Product> = {}): Product {
  return {
    id,
    name,
    slug: `p-${id}`,
    sku: String(1000 + id),
    priceCents: 100,
    regularCents: 100,
    onSale: false,
    currency: "EUR",
    images: ["/products/x.png"],
    categoryIds: [],
    inStock: true,
    description: "",
    shortDescription: "",
    displayName: null,
    imageOverride: null,
    featured: false,
    updatedAt: null,
    ...over,
  };
}

function category(
  id: number,
  name: string,
  over: Partial<Category> = {}
): Category {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    parent: 0,
    count: 10,
    displayName: null,
    kind: "type",
    sort: 0,
    ...over,
  };
}

/** Barnat (root) > Shurupa (child) > Shurupa për fëmijë (grandchild), plus a
 *  second root so a product can straddle two branches the way real ones do. */
const BARNAT = category(1, "Barnat", { count: 292 });
const SHURUPA = category(2, "Shurupa", { parent: 1, count: 40 });
const SHURUPA_FEMIJE = category(3, "Shurupa për fëmijë", { parent: 2, count: 12 });
const KOZMETIKE = category(4, "Kozmetikë", { count: 481 });
const CATEGORIES = [BARNAT, SHURUPA, SHURUPA_FEMIJE, KOZMETIKE];

describe("searchProducts", () => {
  const list = [
    product(1, "Vitamin C 500mg"),
    product(2, "Vitamin D3 1000 IU"),
    product(3, "Paracetamol 500mg", { sku: "9892" }),
  ];

  it("requires every token, in any order", () => {
    expect(searchProducts(list, "vitamin c").map((p) => p.id)).toEqual([1]);
    expect(searchProducts(list, "c vitamin").map((p) => p.id)).toEqual([1]);
    expect(searchProducts(list, "vitamin").map((p) => p.id)).toEqual([1, 2]);
  });

  it("matches the SKU as well as the name", () => {
    expect(searchProducts(list, "9892").map((p) => p.id)).toEqual([3]);
  });

  it("returns everything for an empty query rather than nothing", () => {
    expect(searchProducts(list, "   ")).toHaveLength(3);
  });
});

describe("primaryCategoryOf", () => {
  it("prefers the most specific shelf over the broadest one", () => {
    const p = product(1, "Shurup", { categoryIds: [1, 2, 3] });
    expect(primaryCategoryOf(p, CATEGORIES)?.name).toBe("Shurupa për fëmijë");
  });

  /**
   * The bug this replaced: one caller scanned the category table and another
   * scanned the product's id list, so the answer depended on which order it
   * happened to read. Both orders must now give the same category.
   */
  it("does not depend on the order the ids or the categories come in", () => {
    const a = product(1, "X", { categoryIds: [1, 4] });
    const b = product(1, "X", { categoryIds: [4, 1] });
    expect(primaryCategoryOf(a, CATEGORIES)?.id).toBe(
      primaryCategoryOf(b, [...CATEGORIES].reverse())?.id
    );
  });

  it("breaks a tie between two roots on the smaller shelf", () => {
    const p = product(1, "X", { categoryIds: [1, 4] });
    // Barnat has 292, Kozmetikë 481 — the smaller one says more.
    expect(primaryCategoryOf(p, CATEGORIES)?.name).toBe("Barnat");
  });

  it("ignores ids that no longer resolve, and copes with none at all", () => {
    expect(primaryCategoryOf(product(1, "X", { categoryIds: [99] }), CATEGORIES))
      .toBeUndefined();
    expect(primaryCategoryOf(product(1, "X"), CATEGORIES)).toBeUndefined();
  });
});

describe("rankRelated", () => {
  const subject = product(100, "Shurup për kollë", { categoryIds: [1, 2, 3] });
  const catalog = [
    subject,
    // Low ids, only the broad root in common — these used to win by default.
    product(1, "Tabletë A", { categoryIds: [1] }),
    product(2, "Tabletë B", { categoryIds: [1] }),
    // Same specific shelf, far higher id.
    product(900, "Shurup për fëmijë A", { categoryIds: [1, 2, 3] }),
    product(901, "Shurup për fëmijë B", { categoryIds: [2, 3] }),
    // Nothing in common at all.
    product(500, "Krem duarsh", { categoryIds: [4] }),
  ];

  it("puts the products that share the specific shelf first", () => {
    expect(rankRelated(subject, catalog, CATEGORIES).slice(0, 2).map((p) => p.id))
      .toEqual([900, 901]);
  });

  it("never includes the product itself or anything with no shared category", () => {
    const ids = rankRelated(subject, catalog, CATEGORIES).map((p) => p.id);
    expect(ids).not.toContain(100);
    expect(ids).not.toContain(500);
  });

  it("skips products without a photo — the row is a strip of pictures", () => {
    const noPhoto = product(902, "Pa foto", { categoryIds: [1, 2, 3], images: [] });
    const ids = rankRelated(subject, [...catalog, noPhoto], CATEGORIES).map((p) => p.id);
    expect(ids).not.toContain(902);
  });

  /** The regression: every product in a big category used to get the same row. */
  it("gives two products in the same broad category different neighbours", () => {
    const a = product(10, "A", { categoryIds: [1] });
    const b = product(80, "B", { categoryIds: [1] });
    const shelf = [a, b, ...Array.from({ length: 40 }, (_, i) =>
      product(20 + i, `Barn ${i}`, { categoryIds: [1] })
    )];
    const forA = rankRelated(a, shelf, CATEGORIES, 4).map((p) => p.id);
    const forB = rankRelated(b, shelf, CATEGORIES, 4).map((p) => p.id);
    expect(forA).not.toEqual(forB);
  });

  it("is deterministic — the same input gives the same row", () => {
    expect(rankRelated(subject, catalog, CATEGORIES)).toEqual(
      rankRelated(subject, catalog, CATEGORIES)
    );
  });
});

describe("brandMatches", () => {
  /**
   * The measured case this rule exists for: "Alg" is inside "Deksalgin",
   * "algodon" and "valgus", so a substring test claimed products for a brand
   * that has none.
   */
  const list = [
    product(1, "Deksalgin 25mg"),
    product(2, "Algodon steril"),
    product(3, "Hallux valgus splint"),
    product(4, "ALG spray"),
    product(5, "Swiss Energy Vitamin C"),
    product(6, "Swiss tea"),
  ];

  it("matches whole words only", () => {
    expect(brandMatches(list, "Alg").map((p) => p.id)).toEqual([4]);
  });

  it("is case-insensitive", () => {
    expect(brandMatches(list, "alg").map((p) => p.id)).toEqual([4]);
  });

  it("requires every word of a multi-word brand", () => {
    expect(brandMatches(list, "Swiss Energy").map((p) => p.id)).toEqual([5]);
  });

  it("finds nothing rather than guessing when no product carries the name", () => {
    expect(brandMatches(list, "Kräuterhof")).toEqual([]);
  });
});
