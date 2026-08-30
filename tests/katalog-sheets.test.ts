import { describe, expect, it } from "vitest";
import { PER_SHEET, sheetsFor } from "@/katalog/sheets";
import type { CatalogSectionWithProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/**
 * The number this produces is printed on every sheet and shown in the print
 * button before anyone commits to 163 pages, so it is worth pinning down: the
 * paper edition's rule is twelve to a sheet and a fresh sheet per section, and
 * a page number that restarted at each section would be useless for putting a
 * loose sheet back.
 */
function product(id: number): Product {
  return {
    id,
    name: `Product ${id}`,
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
    catalogSectionId: null,
    catalogSort: 0,
  };
}

let nextId = 1;
function section(catalogNo: string, count: number): CatalogSectionWithProducts {
  const id = nextId++;
  return {
    id,
    catalogNo,
    name: `Section ${catalogNo}`,
    sort: id,
    products: Array.from({ length: count }, () => product(nextId++)),
  };
}

describe("sheetsFor", () => {
  it("puts twelve products on a sheet", () => {
    const [sheet] = sheetsFor([section("1.1", 30)]);
    expect(sheet!.products).toHaveLength(PER_SHEET);
  });

  it("does not spill an exactly full section onto an empty second sheet", () => {
    expect(sheetsFor([section("1.1", PER_SHEET)])).toHaveLength(1);
  });

  it("leaves the last sheet of a section part-empty rather than filling it from the next", () => {
    const sheets = sheetsFor([section("1.1", 13), section("2", 5)]);
    expect(sheets.map((s) => s.products.length)).toEqual([12, 1, 5]);
  });

  it("numbers sheets straight through, across section boundaries", () => {
    const sheets = sheetsFor([section("1.1", 13), section("2", 5), section("3", 24)]);
    expect(sheets.map((s) => s.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps each sheet pointing at the section it came from", () => {
    const first = section("1.1", 13);
    const second = section("2", 5);
    const sheets = sheetsFor([first, second]);
    expect(sheets.map((s) => s.section.catalogNo)).toEqual(["1.1", "1.1", "2"]);
  });

  it("contributes nothing for a section with no products", () => {
    expect(sheetsFor([section("38", 0)])).toEqual([]);
  });

  it("counts a whole run the way the print page renders it", () => {
    const sheets = sheetsFor([section("1.1", 24), section("2", 19)]);
    expect(sheets).toHaveLength(4);
    expect(sheets.at(-1)!.index).toBe(4);
  });
});
