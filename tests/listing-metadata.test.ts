import { describe, expect, it } from "vitest";
import { listingMetadata } from "@/components/catalog/CatalogView";

/**
 * These rules were wrong once already: every page of /produktet declared itself
 * canonical to /produktet, so 85 of 86 pages claimed to be a page they are not
 * and the products on them stopped being discovered — while internal search
 * results were indexable and filled the index with URLs nobody linked to.
 */
const path = "/produktet";

describe("listingMetadata", () => {
  it("makes a plain listing canonical to itself", () => {
    const meta = listingMetadata({ lang: "sq", path, searchParams: {} });
    expect(meta.alternates?.canonical).toBe("/produktet");
    expect(meta.robots).toBeUndefined();
  });

  it("keeps the page number in the canonical of page 2 and up", () => {
    const meta = listingMetadata({
      lang: "sq",
      path,
      searchParams: { faqja: "3" },
    });
    expect(meta.alternates?.canonical).toBe("/produktet?faqja=3");
    expect(meta.alternates?.languages).toEqual({
      sq: "/produktet?faqja=3",
      en: "/en/produktet?faqja=3",
    });
  });

  it("prefixes only the canonical for English, not the sq alternate", () => {
    const meta = listingMetadata({ lang: "en", path, searchParams: {} });
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
    const meta = listingMetadata({ lang: "sq", path, searchParams: sp });
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe("/produktet");
  });

  it("does not treat the default sort as a view", () => {
    const meta = listingMetadata({
      lang: "sq",
      path,
      searchParams: { renditja: "emri-asc" },
    });
    expect(meta.robots).toBeUndefined();
  });

  it("drops the page number once the listing is a view", () => {
    const meta = listingMetadata({
      lang: "sq",
      path,
      searchParams: { kerko: "vitamin", faqja: "4" },
    });
    expect(meta.alternates?.canonical).toBe("/produktet");
  });

  it("applies the same rules to a category shelf", () => {
    const meta = listingMetadata({
      lang: "en",
      path: "/kategorite/barnat",
      searchParams: { faqja: "2" },
    });
    expect(meta.alternates?.canonical).toBe("/en/kategorite/barnat?faqja=2");
  });
});
