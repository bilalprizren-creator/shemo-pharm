import { describe, expect, it } from "vitest";
import { catalogFingerprint, PER_SHEET, sheetsFor } from "@/katalog/sheets";
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
    catalogHidden: false,
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

/**
 * The stored PDFs are what the buttons link to, and the contents page only
 * knows one has gone stale by comparing this against the run it recorded. So
 * the hash has to cover what a sheet prints and has to move when that changes.
 */
describe("catalogFingerprint", () => {
  const withProducts = (...products: Product[]): CatalogSectionWithProducts[] => [
    { id: 1, catalogNo: "1.1", name: "Shemo", sort: 1, products },
  ];

  it("gives the same run the same fingerprint twice", () => {
    expect(catalogFingerprint(withProducts(product(1)))).toBe(
      catalogFingerprint(withProducts(product(1)))
    );
  });

  it("moves when a photograph is replaced", () => {
    const before = catalogFingerprint(withProducts(product(1)));
    const after = catalogFingerprint(
      withProducts({ ...product(1), images: ["/products/x-cutout.webp"] })
    );
    expect(after).not.toBe(before);
  });

  it("moves when a section is reordered", () => {
    const before = catalogFingerprint(withProducts(product(1), product(2)));
    const after = catalogFingerprint(withProducts(product(2), product(1)));
    expect(after).not.toBe(before);
  });

  it("ignores a price change, which no sheet prints", () => {
    const before = catalogFingerprint(withProducts(product(1)));
    const after = catalogFingerprint(withProducts({ ...product(1), priceCents: 999 }));
    expect(after).toBe(before);
  });

  /**
   * The regression this exists for. PrintSheets prints productDisplayName(), so
   * the hash has to read the same string — hashing the raw `name` column left it
   * blind to a change in the display rule, which is exactly what renamed fifteen
   * printed products when the rule learned to strip "(4307-L)" against SKU
   * 4307L.
   */
  it("hashes the name as printed, not the raw column", () => {
    const raw: Product = { ...product(1), name: "Adult Pants A30 (4307-L)", sku: "4307L" };
    const already: Product = { ...raw, name: "Adult Pants A30" };
    expect(catalogFingerprint(withProducts(raw))).toBe(
      catalogFingerprint(withProducts(already))
    );
  });

  it("still respects an admin display_name, which is what the sheet shows", () => {
    const before = catalogFingerprint(withProducts(product(1)));
    const after = catalogFingerprint(
      withProducts({ ...product(1), displayName: "Something the owner typed" })
    );
    expect(after).not.toBe(before);
  });
});
