/**
 * Reading the old hand-written shemo-katalog.com.
 *
 * Split out from scripts/import-catalog-order.mjs so it can be imported without
 * running the import: that script fetches a URL and opens a database connection
 * at the top level, which a test must not do. Everything here is pure.
 *
 * Source shape (uniform across all 174 pages, single-quoted attributes):
 *
 *   <div class='page'>
 *     <img src='./img/template.png' ...>
 *     <div class='subcategory-number one-decimal'>1.1</div>
 *     <h2>SHEMO</h2>                    -- or <img class='brendimg' alt='Swiss energy'>
 *     <div class='product'>
 *       <img src='produkt/....png'>
 *       <div class='productinfo'>
 *         <div class='nrserik' ...>0018</div>
 *         <p class='very-long-name'>Tensiometer digjital SHM-500 (me adapter)</p>
 *         <div class='leaf'></div>
 *
 * Regexes rather than a DOM parser on purpose: this runs against one file whose
 * shape is machine-generated and verified, and it saves adding a parser
 * dependency to a project that has none.
 */

/**
 * Sections in printed order, each with its products in printed order.
 *
 * A section spans as many pages as it needs and reprints its number on each, so
 * consecutive pages sharing (number, name) fold into one section. Nine pages
 * carry a supplier logo instead of an <h2>; the logo's alt text is the name.
 */
export function parseCatalog(html) {
  const pages = [];
  const pageRe = /<div class='page'>([\s\S]*?)(?=<div class='page'>|<\/div>\s*<\/body>|$)/g;
  for (let m; (m = pageRe.exec(html)); ) pages.push(m[1]);

  const sections = [];
  for (const page of pages) {
    const no = /<div class='subcategory-number[^']*'>([^<]*)<\/div>/.exec(page)?.[1]?.trim() ?? "";
    const heading = /<h2>([\s\S]*?)<\/h2>/.exec(page)?.[1];
    const logo =
      /class='brendimg'[^>]*alt='([^']*)'/.exec(page)?.[1] ??
      /alt='([^']*)'[^>]*class='brendimg'/.exec(page)?.[1];
    const name = (heading ?? logo ?? "").replace(/<[^>]*>/g, "").trim();

    let section = sections.at(-1);
    if (!section || section.no !== no || section.name !== name) {
      section = { no, name, products: [] };
      sections.push(section);
    }
    const prodRe = /<div class='product'>([\s\S]*?)<div class='leaf'>/g;
    for (let p; (p = prodRe.exec(page)); ) {
      const block = p[1];
      section.products.push({
        sku: /<div class='nrserik'[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1]?.trim() ?? "",
        name:
          /<p class='[^']*'>([\s\S]*?)<\/p>/.exec(block)?.[1]?.replace(/<[^>]*>/g, "").trim() ??
          "",
        image: /<img\s+src='([^']*)'/.exec(block)?.[1] ?? "",
      });
    }
  }
  return sections;
}

/**
 * A printed cell can stand for several products: "5062,5063", "5061 5060",
 * "4522 4523 4524 4527", "2770 ABCD", "0023A,B,C,D,E". The last two are a stem
 * plus bare variant letters, so "2770 ABCD" means 2770A through 2770D.
 *
 * Returns every code the cell could mean, the whole string first: "3210-B" is
 * one real SKU and must not be read as 3210 plus B.
 */
export function skuCandidates(raw) {
  const cell = raw.trim();
  const found = new Set([cell]);
  const parts = cell.split(/[,\s]+/).filter(Boolean);
  for (const part of parts) found.add(part);

  const stem = /^(\d{3,5})/.exec(cell)?.[1];
  if (stem) {
    for (const part of parts) {
      if (!/^[A-Za-z]+$/.test(part)) continue;
      for (const letter of part) found.add(stem + letter);
    }
  }
  return [...found];
}
