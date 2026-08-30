import { describe, expect, it } from "vitest";
import { parseCatalog, skuCandidates } from "../scripts/lib/catalog-html.mjs";

/**
 * The reader for the old hand-written shemo-katalog.com.
 *
 * Worth testing even though the import runs once: every one of these rules was
 * derived from the real file, and getting one wrong does not fail loudly — it
 * silently files a product under the wrong section number, which is exactly the
 * information the import exists to preserve.
 */

const page = (
  no: string,
  heading: string,
  cells: { sku: string; name: string; img?: string }[]
) =>
  `<div class='page'><img src='./img/template.png'><div class='subcategory-number one-decimal'>${no}</div>${heading}` +
  cells
    .map(
      (c) =>
        `<div class='product'><img  src='${c.img ?? "produkt/x.png"}'><div class='productinfo'>` +
        `<div class='nrserik' style='font-size: 13px'>${c.sku}</div>` +
        `<p class=''>${c.name}</p><div class='leaf'></div></div></div>`
    )
    .join("") +
  `</div>`;

describe("parseCatalog", () => {
  it("reads the number, heading and cells of a page", () => {
    const html = page("1.1", "<h2>SHEMO</h2>", [
      { sku: "0008", name: "Aparat inhalimi JK-17" },
      { sku: "0015", name: "Compressor Nebulizer" },
    ]);
    expect(parseCatalog(html)).toEqual([
      {
        no: "1.1",
        name: "SHEMO",
        products: [
          { sku: "0008", name: "Aparat inhalimi JK-17", image: "produkt/x.png" },
          { sku: "0015", name: "Compressor Nebulizer", image: "produkt/x.png" },
        ],
      },
    ]);
  });

  it("folds consecutive pages that reprint the same section heading", () => {
    // Cansin runs across eight sheets; all eight are one section.
    const html =
      page("6.7", "<h2>Cansin</h2>", [{ sku: "1", name: "a" }]) +
      page("6.7", "<h2>Cansin</h2>", [{ sku: "2", name: "b" }]);
    const sections = parseCatalog(html);
    expect(sections).toHaveLength(1);
    expect(sections[0].products.map((p: { sku: string }) => p.sku)).toEqual(["1", "2"]);
  });

  it("keeps sections apart when the number repeats under a different name", () => {
    // "8.1" names both Corega and "Eferveta me brende te ndryshme".
    const html =
      page("8.1", "<h2>Corega</h2>", [{ sku: "1", name: "a" }]) +
      page("8.1", "<h2>Eferveta me brende te ndryshme</h2>", [{ sku: "2", name: "b" }]);
    expect(parseCatalog(html).map((s: { name: string }) => s.name)).toEqual([
      "Corega",
      "Eferveta me brende te ndryshme",
    ]);
  });

  it("takes the section name from a supplier logo when there is no heading", () => {
    // Nine of the 174 pages carry a brand image instead of an <h2>.
    const html = page(
      "9",
      "<img src='furnitor/image.png' class='brendimg' alt='Swiss energy'>",
      [{ sku: "7201", name: "Oriblete" }]
    );
    expect(parseCatalog(html)[0].name).toBe("Swiss energy");
  });

  it("preserves printed order rather than sorting", () => {
    const html = page("2", "<h2>Diabetike</h2>", [
      { sku: "0365", name: "c" },
      { sku: "0300", name: "a" },
      { sku: "0327", name: "b" },
    ]);
    expect(parseCatalog(html)[0].products.map((p: { sku: string }) => p.sku)).toEqual([
      "0365",
      "0300",
      "0327",
    ]);
  });
});

describe("skuCandidates", () => {
  it("offers the untouched cell first", () => {
    // "3210-B" is one real SKU; splitting it would match the wrong product.
    expect(skuCandidates("3210-B")[0]).toBe("3210-B");
  });

  it("splits a comma-separated cell", () => {
    expect(skuCandidates("5062,5063")).toEqual(["5062,5063", "5062", "5063"]);
  });

  it("splits a space-separated cell", () => {
    expect(skuCandidates("4522 4523 4524 4527")).toContain("4524");
  });

  it("expands a stem followed by bare variant letters", () => {
    // "2770 ABCD" is printed once but stands for four products.
    const found = skuCandidates("2770 ABCD");
    expect(found).toEqual(expect.arrayContaining(["2770A", "2770B", "2770C", "2770D"]));
  });

  it("expands letters listed one per comma", () => {
    const found = skuCandidates("0023A,B,C,D,E");
    expect(found).toEqual(expect.arrayContaining(["0023A", "0023B", "0023E"]));
  });

  it("does not invent variants from a cell that carries no stem", () => {
    expect(skuCandidates("WZD001")).toEqual(["WZD001"]);
  });

  it("ignores surrounding whitespace", () => {
    expect(skuCandidates("  0445RR ,F  ")).toContain("0445RR");
  });
});
