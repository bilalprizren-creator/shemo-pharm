import { describe, expect, it } from "vitest";
import { searchCatalogSections } from "@/lib/catalog";
import type { CatalogSectionWithProducts } from "@/lib/catalog";

/**
 * The printed catalogue is arranged by manufacturer — 6.7 Cansin, 23 Froika,
 * 38 Denk Pharma — and searching it could not find any of them: a product is
 * matched on its own name and code, and most are not named after the house that
 * makes them. "cansin" answered with three products while its section held 92.
 *
 * The ranking is the second half of the fix. A substring match is not a
 * recommendation: "a" appears somewhere in 45 of the 61 real sections, so an
 * unranked, uncapped list buried the useful answer under most of the contents.
 */
const section = (
  catalogNo: string,
  name: string,
  productCount = 1
): CatalogSectionWithProducts =>
  ({
    id: Number(catalogNo.replace(/\D/g, "")) || 1,
    catalogNo,
    name,
    sort: 0,
    products: Array.from({ length: productCount }, (_, i) => ({ id: i })),
  }) as unknown as CatalogSectionWithProducts;

const sections = [
  section("6.7", "Cansin", 92),
  section("23", "Froika", 67),
  section("23.1", "Bioblas dhe restorex", 24),
  section("38", "Denk Pharma", 5),
  section("9", "Swiss energy", 40),
  section("26.2", "Chicco", 16),
  section("8.2", "Haribo", 10),
];

const names = (q: string, limit?: number) =>
  searchCatalogSections(sections, q, limit).map((s) => s.name);

describe("searchCatalogSections", () => {
  it("finds a section by the manufacturer's name", () => {
    expect(names("cansin")).toEqual(["Cansin"]);
    expect(names("froika")).toEqual(["Froika"]);
  });

  it("finds a section by the number printed on the page", () => {
    expect(names("6.7")).toEqual(["Cansin"]);
  });

  it("matches token by token, in any order", () => {
    expect(names("denk pharma")).toEqual(["Denk Pharma"]);
    expect(names("pharma denk")).toEqual(["Denk Pharma"]);
  });

  it("is case-insensitive", () => {
    expect(names("CANSIN")).toEqual(["Cansin"]);
  });

  it("puts a section the query starts before one it merely appears in", () => {
    // "ha" begins Haribo and sits inside Pharma.
    expect(names("ha")[0]).toBe("Haribo");
  });

  it("prefers a word boundary to the middle of a word", () => {
    // "energy" is a whole word in "Swiss energy"; nothing else has it.
    expect(names("energy")).toEqual(["Swiss energy"]);
  });

  it("breaks a tie by which section holds more of the range", () => {
    // Both start with "c"; Cansin has 92 products against Chicco's 16.
    expect(names("c").slice(0, 2)).toEqual(["Cansin", "Chicco"]);
  });

  it("caps the list, because a broad match recommends nothing", () => {
    // Every section here contains an "a" somewhere.
    expect(searchCatalogSections(sections, "a").length).toBeLessThanOrEqual(6);
    expect(names("a", 2)).toHaveLength(2);
  });

  it("returns nothing for an empty query rather than everything", () => {
    expect(names("")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });

  it("survives a query made of regex punctuation", () => {
    // The ranking builds a RegExp from the token; "(" unescaped would throw.
    expect(() => names("(")).not.toThrow();
    expect(() => names("6.7)")).not.toThrow();
    expect(names("*")).toEqual([]);
  });
});
