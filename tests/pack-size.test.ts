import { describe, expect, it } from "vitest";
import { NBSP, normalizeSizes, packSizeOf } from "@/lib/pack-size";

/** Expectations mark the non-breaking space the helpers insert with "~". */
const nb = (s: string) => s.replaceAll("~", NBSP);

describe("normalizeSizes", () => {
  it.each([
    ["AC Cleanser Sal-Wash Liquid 200ml (7732)", "AC Cleanser Sal-Wash Liquid 200~ml (7732)"],
    ["Anti-Oilness Shampoo 200ML (7783)", "Anti-Oilness Shampoo 200~ml (7783)"],
    ["Aloe Vera Gel 200 ml (2086)", "Aloe Vera Gel 200~ml (2086)"],
    ["BIO HANFOL PREMIUM 100ML ( VAJ KANABISI )", "BIO HANFOL PREMIUM 100~ml ( VAJ KANABISI )"],
    ["Corega Extra Strong 40gr (3201)", "Corega Extra Strong 40~g (3201)"],
    ["Haribo Mix 70G (4154)", "Haribo Mix 70~g (4154)"],
    ["Labella Lip Balm Cocoa Butter 4.8G A3", "Labella Lip Balm Cocoa Butter 4.8~g A3"],
    ["Alkool 70% 1L (7839)", "Alkool 70% 1~L (7839)"],
    ["Demax 10MG X 30 tab (9891)", "Demax 10~mg X 30 tab (9891)"],
    ["Bacitagram 250mg/5ml 100ml (1200)", "Bacitagram 250~mg/5~ml 100~ml (1200)"],
  ])("%s", (name, expected) => {
    expect(normalizeSizes(name)).toBe(nb(expected));
  });

  it.each([
    // Needle gauges are not grams — the syringe's volume still is a size.
    ["Shiring 5ml me gjilper 21G-A100", "Shiring 5~ml me gjilper 21G-A100"],
    ["Gjilpëra sterile – LANCETS CONTOUR 28G A100", "Gjilpëra sterile – LANCETS CONTOUR 28G A100"],
    ["Baby sistem 21G – gjelbër", "Baby sistem 21G – gjelbër"],
    // Model numbers and clothing sizes that end in L.
    ["Patarica Brryli AS923L", "Patarica Brryli AS923L"],
    ["Mobilizues gjuri SL-12 L", "Mobilizues gjuri SL-12 L"],
    ["Splint per dore dhe gisht te madh Art.8556 L,XL", "Splint per dore dhe gisht te madh Art.8556 L,XL"],
    // Dimensions stay as written.
    ["Fashe e thjeshte 10cmX4m NO:624", "Fashe e thjeshte 10cmX4m NO:624"],
    // Counts and the A-notation are not units.
    ["Fix ear baby A6", "Fix ear baby A6"],
    ["Abox 20buste", "Abox 20buste"],
    // A unit that runs on into a word is not one.
    ["Krem 4 gel", "Krem 4 gel"],
  ])("does not read a size into %s", (name, expected) => {
    expect(normalizeSizes(name)).toBe(nb(expected));
  });

  it("is idempotent", () => {
    const once = normalizeSizes("Balsam kali 250ml, Haribo 70G, Alkool 1L");
    expect(normalizeSizes(once)).toBe(once);
  });
});

describe("packSizeOf", () => {
  it.each([
    ["AC Cleanser Sal-Wash Liquid 200ml (7732)", "200~ml"],
    ["Haribo Phantasia 80G (4162)", "80~g"],
    ["Alkool 96% 1L (7838)", "1~L"],
    ["Acyclovir Denk 200mg X 25 tab", "25~tab"],
    ["Folacin 400mcg 100 tablets (9912)", "100~tablets"],
    ["Collagen Peptides 30 sachets (4083)", "30~sachets"],
    ["Aria-des 2.5mg /5ml syrup 150ml (1064)", "150~ml"],
    ["Shiring 5ml me gjilper 21G-A100", "5~ml"],
  ])("%s → %s", (name, expected) => {
    expect(packSizeOf(name)).toBe(nb(expected));
  });

  it.each([
    // A dose, not a pack.
    "Rifaximin 200mg",
    "Drenomod solu 40mg/1ml",
    // Multipacks: either number alone would be wrong.
    "Ovavit Forte 20X5G Sachets",
    "Haribo Minis 10G X 100pcs",
    "Deksalgin 50mg/2ml IM/IV – 6amp x 2ml",
    "Alkalax çaj 20X1G",
    // Nothing stated.
    "Tensiometër digjital për krah – SHEMO SHM-500",
    "Fix ear baby A6",
  ])("%s → nothing", (name) => {
    expect(packSizeOf(name)).toBeNull();
  });
});
