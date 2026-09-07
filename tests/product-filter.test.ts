import { describe, expect, it } from "vitest";
import {
  isFiltering,
  NO_PRODUCT_FILTER,
  parseProductFilter,
  productFilterFields,
  productFilterParams,
} from "@/lib/product-filter";

/**
 * The product table's filter is read twice from two different shapes: once out
 * of the URL /admin/produktet was opened with, and once out of the FormData the
 * bulk bar posts back. The first decides what an editor is *shown*; the second
 * decides what a bulk button *changes*. The whole point of the module is that
 * those two cannot disagree — a filter parsed one way there and another way
 * here would mean the panel editing products it never listed.
 */
describe("parseProductFilter", () => {
  it("reads a full filter out of a searchParams object", () => {
    expect(
      parseProductFilter({
        kerko: " vitamin ",
        stoku: "pa-stok",
        dukshmeria: "e-fshehur",
        katalogu: "e-dukshme",
        seksioni: "me-seksion",
        seksioniId: "12",
        kategoria: "480",
      })
    ).toEqual({
      query: "vitamin",
      stock: "pa-stok",
      visibility: "e-fshehur",
      catalogVisibility: "e-dukshme",
      section: "me-seksion",
      sectionId: 12,
      categoryId: 480,
    });
  });

  it("reads the same filter out of the FormData the bulk bar posts", () => {
    const fromUrl = parseProductFilter({
      kerko: "vitamin",
      stoku: "pa-stok",
      dukshmeria: "e-fshehur",
      katalogu: "e-dukshme",
      seksioni: "me-seksion",
      seksioniId: "12",
      kategoria: "480",
    });

    // Exactly the round trip the bar makes: filter -> hidden inputs -> POST.
    const form = new FormData();
    for (const [name, value] of Object.entries(productFilterFields(fromUrl))) {
      form.set(name, value);
    }

    expect(parseProductFilter(form)).toEqual(fromUrl);
  });

  it("survives the round trip through a query string too", () => {
    const filter = {
      ...NO_PRODUCT_FILTER,
      query: "denk",
      catalogVisibility: "e-fshehur" as const,
      categoryId: 7,
    };
    expect(parseProductFilter(productFilterParams(filter))).toEqual(filter);
  });

  it("leaves absent parameters out of the query string", () => {
    expect(productFilterParams(NO_PRODUCT_FILTER).toString()).toBe("");
    expect(
      productFilterParams({ ...NO_PRODUCT_FILTER, sectionId: 3 }).toString()
    ).toBe("seksioniId=3");
  });

  it("falls back to no filter for a value it does not offer", () => {
    // A stale bookmark, a hand-edited URL, or a crafted POST. None of them may
    // become a filter the panel has no dropdown entry for.
    expect(
      parseProductFilter({ stoku: "vielleicht", dukshmeria: "hidden" })
    ).toMatchObject({ stock: "", visibility: "" });
  });

  it("ignores an id that is not a positive integer", () => {
    expect(
      parseProductFilter({ seksioniId: "0", kategoria: "-4" })
    ).toMatchObject({ sectionId: null, categoryId: null });
    expect(
      parseProductFilter({ seksioniId: "3.5", kategoria: "abc" })
    ).toMatchObject({ sectionId: null, categoryId: null });
  });

  it("drops an id the caller says does not exist", () => {
    // What the pages pass: a section deleted since the bookmark was made must
    // read as "no filter", not as a filter nothing can match.
    expect(
      parseProductFilter(
        { seksioniId: "99", kategoria: "12" },
        { sectionIds: new Set([1, 2]), categoryIds: new Set([12]) }
      )
    ).toMatchObject({ sectionId: null, categoryId: 12 });
  });

  it("takes the first value when a key arrives repeated", () => {
    expect(parseProductFilter({ stoku: ["ne-stok", "pa-stok"] })).toMatchObject({
      stock: "ne-stok",
    });
  });

  it("reads an empty filter out of nothing at all", () => {
    expect(parseProductFilter({})).toEqual(NO_PRODUCT_FILTER);
    expect(parseProductFilter(new FormData())).toEqual(NO_PRODUCT_FILTER);
  });
});

/** What "Pastro filtrat" is offered for, and what the row count is worded by. */
describe("isFiltering", () => {
  it("is false for the whole range", () => {
    expect(isFiltering(NO_PRODUCT_FILTER)).toBe(false);
    // Whitespace is trimmed away by the parser, so an empty search box is not
    // a filter however it was submitted.
    expect(isFiltering(parseProductFilter({ kerko: "   " }))).toBe(false);
  });

  it("is true for each field on its own", () => {
    const filters = [
      { query: "a" },
      { stock: "ne-stok" as const },
      { visibility: "e-fshehur" as const },
      { catalogVisibility: "e-dukshme" as const },
      { section: "pa-seksion" as const },
      { sectionId: 1 },
      { categoryId: 1 },
    ];
    for (const partial of filters) {
      expect(isFiltering({ ...NO_PRODUCT_FILTER, ...partial })).toBe(true);
    }
  });
});
