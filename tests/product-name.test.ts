import { describe, expect, it } from "vitest";
import { cleanProductName } from "@/lib/product-name";

/**
 * The cases are real rows from src/data/products.json, not invented ones —
 * every expectation below was checked against the actual catalog.
 */
describe("cleanProductName", () => {
  describe("the article number in brackets", () => {
    it("drops the code the card already prints as “Kodi”", () => {
      expect(cleanProductName("A+D3 pika 10ml (1501)", "1501")).toBe("A+D3 pika 10ml");
      expect(cleanProductName("Abox 20buste (1049)", "1049")).toBe("Abox 20buste");
    });

    it("drops a code carrying a size letter or a dashed size", () => {
      expect(cleanProductName("Baby Shampoo Gentle to Eyes 300ml (2830A)", "2830A")).toBe(
        "Baby Shampoo Gentle to Eyes 300ml"
      );
      expect(cleanProductName("Adult Pants-Brek A30 (DR.COMFORT) L (4307-L)", "4307L")).toBe(
        "Adult Pants-Brek A30 (DR.COMFORT) L"
      );
    });

    it("drops a list of codes, however it is punctuated", () => {
      expect(
        cleanProductName("Brush me fije interdentale (9607, 9608, 9609)", "9606, 9607, 9608")
      ).toBe("Brush me fije interdentale");
      expect(cleanProductName("Gomë për patarica hiri dhe e zeze (8803,8804)", "8803, 8804")).toBe(
        "Gomë për patarica hiri dhe e zeze"
      );
      expect(
        cleanProductName("Corega ngjites i protezave 40g (3304A,B,C)", "3304A,C,D")
      ).toBe("Corega ngjites i protezave 40g");
    });

    it("drops a code that is not the last thing in the name", () => {
      expect(
        cleanProductName("Gel kunder mushkonjave junior 100ml (5119) (AUTAN)", "5119")
      ).toBe("Gel kunder mushkonjave junior 100ml (AUTAN)");
    });

    it("drops a bracketed duplicate of the SKU whatever shape it has", () => {
      expect(cleanProductName("Kllompe ortopedike – Lëkurë ( NT-008 )", "NT-008")).toBe(
        "Kllompe ortopedike - Lëkurë"
      );
    });

    it("keeps a brand, a flavour or a composition", () => {
      expect(cleanProductName("Anti-Colic PP Bottle 240ml 0-6 Month (Bio Tree) (3004)", "3004")).toBe(
        "Anti-Colic PP Bottle 240ml 0-6 Month (Bio Tree)"
      );
      expect(
        cleanProductName(
          "ACTIVE LIFE (25 Vitamins and Minerals + Vitamin K2 + Guarana) Dynamic life A30 (7207)",
          "7207"
        )
        // Not shouted — it carries lowercase words — so only the code goes.
      ).toBe("ACTIVE LIFE (25 Vitamins and Minerals + Vitamin K2 + Guarana) Dynamic life A30");
      expect(cleanProductName("Bisolvon sol 4mg/2ml (2mg/1ml) 40ml (1535)", "1535")).toBe(
        "Bisolvon sol 4mg/2ml (2mg/1ml) 40ml"
      );
    });

    it("keeps a model or reference number, which is not the article code", () => {
      expect(cleanProductName("Compressor Nebulizer Shemo (SHM-102) (0015)", "0015")).toBe(
        "Compressor Nebulizer Shemo (SHM-102)"
      );
      expect(
        cleanProductName("Mbajtëse elastike e nyjës së këmbës (REF-720) S, M, L, XL (8510)", "8510")
      ).toBe("Mbajtëse elastike e nyjës së këmbës (REF-720) S, M, L, XL");
      expect(cleanProductName("Hollaopke për shtatzana (CCL1) Nr. 1, 2, 3 (7501)", "7501")).toBe(
        "Hollaopke për shtatzana (CCL1) Nr. 1, 2, 3"
      );
    });

    it("keeps a nappy or tampon size, which is a single digit in brackets", () => {
      expect(cleanProductName("Pampers Active Baby (3) 6-10kg A54 (5253)", "5253")).toBe(
        "Pampers Active Baby (3) 6-10kg A54"
      );
      expect(cleanProductName("Always Platinum Normal A8 (1) (5012)", "5012")).toBe(
        "Always Platinum Normal A8 (1)"
      );
      expect(cleanProductName("Pampers për të rritur (L) 110-150cm A30 (4316L)", "4316L")).toBe(
        "Pampers për të rritur (L) 110-150cm A30"
      );
    });

    it("never reads a measurement as a code plus a unit", () => {
      expect(cleanProductName("Vaj kokosi (250 ml)", "1234")).toBe("Vaj kokosi (250 ml)");
      expect(cleanProductName("Shurup (100 mg)", "1234")).toBe("Shurup (100 mg)");
    });
  });

  describe("what the shop's own typing left behind", () => {
    it("closes up spaced brackets", () => {
      expect(cleanProductName("Stick Arnica 15ml ( SENTI 2 ) (2108)", "2108")).toBe(
        "Stick Arnica 15ml (SENTI 2)"
      );
    });

    it("removes a bracket the code left unmatched", () => {
      expect(cleanProductName("Colidur 200mg X 12tab Rifaximin (5237))", "5237")).toBe(
        "Colidur 200mg X 12tab Rifaximin"
      );
    });

    it("uses the catalog's plain hyphen for a typographic dash", () => {
      expect(cleanProductName("Black Mulberry Syrup 40gr – Shurup dudi (2844)", "2844")).toBe(
        "Black Mulberry Syrup 40gr - Shurup dudi"
      );
      expect(cleanProductName("Anti – pigment serum 30ml (7749)", "7749")).toBe(
        "Anti - pigment serum 30ml"
      );
    });
  });

  describe("names that arrived shouted", () => {
    it("sets them in sentence case, like the names around them", () => {
      expect(cleanProductName("SEA WATER ISOTONIC MICRO DIFFUSION 100ML (2085)", "2085")).toBe(
        "Sea water isotonic micro diffusion 100ml"
      );
      expect(cleanProductName("PIKA PER SY KUNDER ALERGJIVE 15ML (2135)", "2135")).toBe(
        "Pika per sy kunder alergjive 15ml"
      );
    });

    it("capitalises inside brackets, where the brands are", () => {
      expect(cleanProductName("CAJ BEKUNIS A20 ( BIO ALPINA ) (5195)", "5195")).toBe(
        "Caj bekunis A20 (Bio Alpina)"
      );
      expect(cleanProductName("BIO HANFOL PREMIUM 100ML ( VAJ KANABISI ) (2114)", "2114")).toBe(
        "Bio hanfol premium 100ml (Vaj Kanabisi)"
      );
    });

    it("lower-cases a measurement but never a pack count or a model", () => {
      expect(cleanProductName("VASELINA 100G (2092)", "2092")).toBe("Vaselina 100g");
      expect(cleanProductName("TUBO PROTECTOR BANDAGE 1X15CM (2098)", "2098")).toBe(
        "Tubo protector bandage 1x15cm"
      );
      expect(cleanProductName("SPIRONOLAKTON 100MG X 30TAB (9859)", "9859")).toBe(
        "Spironolakton 100mg x 30tab"
      );
      expect(cleanProductName("BLISTER PLASTER HYDROCOLLOIDS A6 (2094)", "2094")).toBe(
        "Blister plaster hydrocolloids A6"
      );
      expect(cleanProductName("BREAST PUMP ELEKTRIKE RH-318 A1 (4807)", "4807")).toBe(
        "Breast pump elektrike RH-318 A1"
      );
      expect(cleanProductName("TENSIOMETER MEKANIK MODEL A-20 (0286)", "0286")).toBe(
        "Tensiometer mekanik model A-20"
      );
    });

    it("lower-cases a word that happens to carry a number", () => {
      expect(cleanProductName("SOFT GUMMIES OMEGA-3 MULTIVIT A60 (7230)", "7230")).toBe(
        "Soft gummies omega-3 multivit A60"
      );
    });

    it("leaves a name alone that is only partly capitalised", () => {
      expect(cleanProductName("Bioblas Antistress + Biotin (7023)", "7023")).toBe(
        "Bioblas Antistress + Biotin"
      );
      expect(cleanProductName("Tea Tree Oil 30ml (0234)", "0234")).toBe("Tea Tree Oil 30ml");
    });
  });

  describe("safety", () => {
    it("returns the imported name rather than nothing", () => {
      expect(cleanProductName("(1501)", "1501")).toBe("(1501)");
      expect(cleanProductName("", "1501")).toBe("");
      expect(cleanProductName("   ", "1501")).toBe("");
    });

    it("works without a SKU", () => {
      expect(cleanProductName("Folate 400mcg 50 tablets")).toBe("Folate 400mcg 50 tablets");
      expect(cleanProductName("Tea Tree Oil 30ml (0234)")).toBe("Tea Tree Oil 30ml");
    });

    it("is idempotent — cleaning a clean name changes nothing", () => {
      const once = cleanProductName("CAJ BEKUNIS A20 ( BIO ALPINA ) (5195)", "5195");
      expect(cleanProductName(once, "5195")).toBe(once);
    });

    it("applies a named fix the rules cannot derive", () => {
      expect(cleanProductName("BiobIas Anti Sebum + B3 Vitamini (7018)", "7018")).toBe(
        "Bioblas Anti Sebum + B3 Vitamini"
      );
    });
  });
});
