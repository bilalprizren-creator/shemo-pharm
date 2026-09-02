import { describe, expect, it } from "vitest";
import { listingMetadata } from "@/components/catalog/CatalogView";
import { getDictionary } from "@/lib/dictionaries";

/**
 * These rules were wrong once already: every page of /produktet declared itself
 * canonical to /produktet, so 85 of 86 pages claimed to be a page they are not
 * and the products on them stopped being discovered — while internal search
 * results were indexable and filled the index with URLs nobody linked to.
 */
const path = "/produktet";
const sq = getDictionary("sq");
const en = getDictionary("en");

/** The listing on /produktet, in Albanian, with nothing filtered. */
const listing = (
  searchParams: Parameters<typeof listingMetadata>[0]["searchParams"],
  dict = sq,
  overrides: Partial<Parameters<typeof listingMetadata>[0]> = {}
) =>
  listingMetadata({
    dict,
    path,
    name: dict.catalog.title,
    description: dict.catalog.metaDescription,
    searchParams,
    ...overrides,
  });

describe("listingMetadata", () => {
  it("makes a plain listing canonical to itself", () => {
    const meta = listing({});
    expect(meta.alternates?.canonical).toBe("/produktet");
    expect(meta.robots).toBeUndefined();
  });

  it("keeps the page number in the canonical of page 2 and up", () => {
    const meta = listing({ faqja: "3" });
    expect(meta.alternates?.canonical).toBe("/produktet?faqja=3");
    expect(meta.alternates?.languages).toEqual({
      sq: "/produktet?faqja=3",
      en: "/en/produktet?faqja=3",
    });
  });

  it("prefixes only the canonical for English, not the sq alternate", () => {
    const meta = listing({}, en);
    expect(meta.alternates?.canonical).toBe("/en/produktet");
    expect(meta.alternates?.languages).toEqual({
      sq: "/produktet",
      en: "/en/produktet",
    });
  });

  it.each([
    ["a search", { kerko: "vitamin" }],
    ["a non-default sort", { renditja: "te-rejat" }],
    ["the stock filter", { stok: "1" }],
    ["a brand type narrowing", { lloji: "suplemente" }],
  ])("treats %s as a view: noindex, follow, canonical to the plain page", (_label, sp) => {
    const meta = listing(sp);
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe("/produktet");
  });

  it("does not treat the default sort as a view", () => {
    const meta = listing({ renditja: "emri-asc" });
    expect(meta.robots).toBeUndefined();
  });

  it("drops the page number once the listing is a view", () => {
    const meta = listing({ kerko: "vitamin", faqja: "4" });
    expect(meta.alternates?.canonical).toBe("/produktet");
  });

  it("applies the same rules to a category shelf", () => {
    const meta = listingMetadata({
      dict: en,
      path: "/kategorite/barnat",
      name: "Barnat",
      description: "Barnat — 292 products",
      searchParams: { faqja: "2" },
    });
    expect(meta.alternates?.canonical).toBe("/en/kategorite/barnat?faqja=2");
    expect(meta.title).toBe("Barnat — 2");
  });

  it("numbers the title of page 2 and up", () => {
    expect(listing({}).title).toBe("Produktet");
    expect(listing({ faqja: "3" }).title).toBe("Produktet — 3");
  });
});

/**
 * What a person sees before they open a link someone sent them. Every listing
 * used to inherit the root layout's card, so a category, a brand shelf and a
 * search all previewed as the same site-wide tile.
 */
describe("listingMetadata share card", () => {
  it("names the listing and stays on the canonical URL", () => {
    const meta = listingMetadata({
      dict: sq,
      path: "/kategorite/vitaminat",
      name: "Vitaminat",
      description: "Vitaminat — 120 produkte",
      searchParams: {},
    });
    expect(meta.openGraph).toMatchObject({
      title: "Vitaminat",
      description: "Vitaminat — 120 produkte",
      url: "/kategorite/vitaminat",
      siteName: "SHEMO PHARM",
      locale: "sq",
    });
  });

  it("says a shared search is a search", () => {
    expect(listing({ kerko: "vitamin" }).openGraph?.title).toBe(
      "Kërkimi: “vitamin” — Produktet"
    );
  });

  it("carries the page number and the English locale", () => {
    const meta = listing({ faqja: "2" }, en);
    expect(meta.openGraph?.title).toBe("Products — 2");
    expect(meta.openGraph).toMatchObject({
      url: "/en/produktet?faqja=2",
      locale: "en",
    });
  });
});
