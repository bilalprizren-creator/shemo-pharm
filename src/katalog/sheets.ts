import type { CatalogSectionWithProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

/** Three columns of four, the same twelve-per-sheet the paper edition uses. */
export const PER_SHEET = 12;

export interface Sheet {
  section: CatalogSectionWithProducts;
  products: Product[];
  /** 1-based, running across section boundaries — the number printed on the
   *  sheet, so "Faqe 87/163" means the same thing whether the run is the whole
   *  catalogue or one section. */
  index: number;
}

/**
 * The printed run as a flat list of A4 sheets.
 *
 * A section always starts a new sheet, so its last one is usually part-empty —
 * that is the paper edition's own layout, not a rounding artefact, and it is
 * what makes a section number findable by flicking through the stack.
 *
 * Pure and exported on its own because two pages need the count before any of
 * it is rendered: the contents page and the section page both put the number of
 * sheets in the print button, and 163 is the number that makes somebody choose
 * a single section instead.
 */
export function sheetsFor(sections: CatalogSectionWithProducts[]): Sheet[] {
  const sheets: Sheet[] = [];
  for (const section of sections) {
    for (let i = 0; i < section.products.length; i += PER_SHEET) {
      sheets.push({
        section,
        products: section.products.slice(i, i + PER_SHEET),
        index: sheets.length + 1,
      });
    }
  }
  return sheets;
}
