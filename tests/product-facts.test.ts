import { describe, expect, it } from "vitest";
import { cleanProductName } from "@/lib/product-name";
import { hasProductFacts, readProductFacts } from "@/lib/product-facts";

/** What the page does: clean, then read. Every name below is a real one. */
const facts = (raw: string) => readProductFacts(cleanProductName(raw));

describe("readProductFacts", () => {
  it("reads a pack count and its unit", () => {
    expect(facts("Leanax 60 capsules (0105)").pack).toEqual({ count: 60, unit: "caps" });
    expect(facts("Bensedin 10mg 30 tableta (1234)").pack).toEqual({
      count: 30,
      unit: "tab",
    });
    expect(facts("4 Joint 15 stick sachets (4108)").pack).toEqual({
      count: 15,
      unit: "sachet",
    });
    expect(facts("Calcium 400mg + Vit C 100mg 20eff (7182)").pack).toEqual({
      count: 20,
      unit: "eff",
    });
    // "A30" is the house notation for a count of loose pieces.
    expect(facts("Carefree Normal Aloe Vera A56 (4701)").pack).toEqual({
      count: 56,
      unit: "piece",
    });
  });

  it("separates strength from weight", () => {
    const f = facts("Daktanol 2% gel 40g (1234)");
    expect(f.weight).toBe("40 g");
    expect(f.strength).toBe("2 %");
    expect(facts("Vitamin E 200IU 30 tablets (1234)").strength).toBe("200 IU");
    expect(facts("Zaracet 75mg/650mg 30 tab (1234)").strength).toBe("75 mg/650mg");
  });

  it("joins the strengths of a combination product", () => {
    expect(facts("Calcium 400mg + Vit C 100mg 20eff (7182)").strength).toBe(
      "400 mg + 100 mg"
    );
  });

  it("normalises units without changing the number", () => {
    expect(facts("Pavloderm Powder 90gr (1234)").weight).toBe("90 g");
    expect(facts("Balsam kali ngrohës 100 ml (2003)").volume).toBe("100 ml");
    expect(facts("Alkool 96% 1L (1234)").volume).toBe("1 l");
  });

  it("reads a dimension instead of two half-measurements", () => {
    const f = facts("Fashë vetëngjitëse 10cm x 4.5m No:663");
    expect(f.dimensions).toBe("10 x 4.5 m");
    expect(f.volume).toBeNull();
    expect(f.weight).toBeNull();
    expect(f.pack).toBeNull();
  });

  it("reads sizes, including hyphenated ranges", () => {
    expect(facts("Shtrënguese e leshtë gjuri (SL-10) S, M, L, XL (1234)").sizes).toEqual([
      "S",
      "M",
      "L",
      "XL",
    ]);
    expect(facts("Shokë elastike lumbosakral (SL-271) S-M, L-XL, XXL (8390)").sizes).toEqual(
      ["S", "M", "L", "XL", "XXL"]
    );
    expect(facts("Mbathje për gips SL-508 M (1234)").sizes).toEqual(["M"]);
  });

  it("refuses the single letters that are not sizes", () => {
    for (const name of [
      "L – Gintau kompleks 30capsules X 981mg (1234)",
      "Slim Line L-Carnitine 20 EFF (1234)",
      "Nucal-M Calcium, Magnesium & D3 30tablets (0106)",
      "Renex-S Foaming Cleansing Liquid 200ml (1234)",
      "Mates për Puls & Oksigjen AS-304-L (1234)",
      "Rotacef 1G I.M (1234)",
      "Shishe 130ml 0+M (1234)",
      "Sodium Chloride 0.9% 100ml (DEMO S.A.) (9066)",
    ]) {
      expect(facts(name).sizes, name).toEqual([]);
    }
  });

  it("refuses a measurement that belongs to an article code or a range", () => {
    // "SL-12" is a model, not twelve litres.
    expect(facts("Mobilizues gjuri SL-12 L (1234)").volume).toBeNull();
    // The kilograms are the baby's, not the pack's.
    expect(facts("Pampers Premium Care 4-8kg A23 (1234)").weight).toBeNull();
    expect(facts("Pampers Premium Care 4-8kg A23 (1234)").pack).toEqual({
      count: 23,
      unit: "piece",
    });
    // "NO:9144L" is a model number.
    expect(facts("Ndihmëse për ecje me pushuese & frena dore NO:9144L").volume).toBeNull();
  });

  it("reads SPF written either way round, and never off a volume", () => {
    expect(facts("Q10 anti-wrinkle power 50ml SPF30 (7687)").spf).toBe("30");
    expect(facts("Sun protection cream 30 spf 150ml (1234)").spf).toBe("30");
    expect(facts("Anti – pigment cream spf 50+ 30ml (1234)").spf).toBe("50+");
  });

  it("reads the compression class of a stocking", () => {
    expect(facts("Qorape për vena mbi gju të hapura (CCL1) ERSA-507/1").compression).toBe(
      "CCL1"
    );
  });

  it("says nothing when the name says nothing", () => {
    const f = facts("Pompë gjiri manuale ANNA (1234)");
    expect(hasProductFacts(f)).toBe(false);
    expect(f).toEqual({
      pack: null,
      volume: null,
      weight: null,
      strength: null,
      dimensions: null,
      spf: null,
      sizes: [],
      compression: null,
    });
  });

  it("needs the cleaned name — the brackets hide the sizes", () => {
    // Four products list a shoe-size range after every letter. Those brackets
    // are code-shaped, so cleaning removes them and the sizes become readable.
    const raw = "Shtrojëse thembre për këpucë (SL-501) – S(35-38), M(38-41), L(42-44) (8353)";
    expect(readProductFacts(raw).sizes).toEqual([]);
    expect(facts(raw).sizes).toEqual(["S", "M", "L"]);
  });
});
