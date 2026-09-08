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

/**
 * A short hash of everything a printed sheet actually shows.
 *
 * The generated PDFs are a stored artefact, and a stored artefact can go stale
 * against the database — the one thing `/shtyp` was built to avoid. This is how
 * the site notices: scripts/build-catalog-pdf.mjs records the fingerprint of
 * the run it rendered, and the contents page compares it against today's. When
 * they differ the download says which day it is from, and the browser print
 * link is the one that is always current.
 *
 * It covers exactly what a sheet prints — section number, section name, and per
 * product the code, the name and the photograph — and nothing else, so a price
 * change or a stock change does not raise a false alarm about a sheet that
 * carries neither.
 *
 * FNV-1a rather than a real digest: this has to run in the same module the
 * contents page already imports, and "did this change" needs no more than 32
 * bits. It is not a signature and nothing security-carrying rests on it.
 */
export function catalogFingerprint(sections: CatalogSectionWithProducts[]): string {
  let hash = 0x811c9dc5;
  const eat = (value: string) => {
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= 0x1f; // A unit separator, so ["ab","c"] and ["a","bc"] differ.
    hash = Math.imul(hash, 0x01000193);
  };

  for (const section of sections) {
    eat(section.catalogNo);
    eat(section.name);
    for (const product of section.products) {
      eat(String(product.id));
      eat(product.sku);
      eat(product.displayName ?? product.name);
      eat(product.imageOverride ?? product.images[0] ?? "");
    }
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
