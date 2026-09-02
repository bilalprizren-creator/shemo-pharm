import { describe, expect, it } from "vitest";
import { cleanProductName } from "@/lib/product-name";

/**
 * Every case below is a real product name out of src/data/products.json. The
 * rule is shape-based rather than a comparison against `sku`, so the tests that
 * matter most are the ones where the two disagree.
 */
describe("cleanProductName", () => {
  it("drops the trailing article code", () => {
    expect(cleanProductName("4 Joint 15 stick sachets (4108)")).toBe(
      "4 Joint 15 stick sachets"
    );
    expect(cleanProductName("Bensedin 2mg 30tab (9814)")).toBe("Bensedin 2mg 30tab");
  });

  it("drops a code that does not match the SKU column", () => {
    // SKU 8283, name says 5283. Neither is checked; the shape is.
    expect(cleanProductName("Biotin 10.000 mcg A30 (5283)")).toBe("Biotin 10.000 mcg A30");
    // SKU "1.60" — a price that leaked into the column.
    expect(cleanProductName("Hello Kitty Brushe Kids A2 (7657)")).toBe(
      "Hello Kitty Brushe Kids A2"
    );
  });

  it("drops a code that sits in the middle of the name", () => {
    expect(cleanProductName("Mbajtese krahu per femije (0433) L")).toBe(
      "Mbajtese krahu per femije L"
    );
    expect(cleanProductName("Gel kunder mushkonjave junior 100ml (5119) (AUTAN)")).toBe(
      "Gel kunder mushkonjave junior 100ml (AUTAN)"
    );
  });

  it("keeps a bracket that is not a code", () => {
    for (const name of [
      "Losion kunder mushkonjave family care 100ml (AUTAN)",
      "Qorape për vena mbi gju (CCL1)",
      "Korset ortoze tarkale lamber sacral (SL-911) M",
      "Splint gjuri me mbështetëse silikoni (REF-105) S, M, L, XL",
      "Corega ngjites i protezave 40g (Neutral, Versiegelung, Zascita dlesni)",
    ]) {
      expect(cleanProductName(name)).toBe(name);
    }
  });

  it("tidies the spacing the export left behind", () => {
    expect(cleanProductName("Adult Pants-Brek A30 ( DR.COMFORT ) L (4307-L)")).toBe(
      "Adult Pants-Brek A30 (DR.COMFORT) L"
    );
    // One product closes its bracket twice.
    expect(cleanProductName("Colidur 200mg X 12tab Rifaximin (5237))")).toBe(
      "Colidur 200mg X 12tab Rifaximin"
    );
    expect(cleanProductName("Kllompe ortopedike – Lëkurë ( NT-019 )")).toBe(
      "Kllompe ortopedike – Lëkurë (NT-019)"
    );
  });

  it("never returns an empty name", () => {
    expect(cleanProductName("(1234)")).toBe("(1234)");
    expect(cleanProductName("   ")).toBe("");
  });

  it("leaves a name with no code alone", () => {
    expect(cleanProductName("Folate 400mcg 50 tablets")).toBe("Folate 400mcg 50 tablets");
  });
});
