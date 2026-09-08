import manifest from "@/data/catalog-pdf.json";

/**
 * The generated catalogue PDFs, as the site sees them.
 *
 * `/katalog/shtyp` renders 163 A4 sheets and asks the visitor's browser to
 * typeset them, which on a laptop takes minutes. scripts/build-catalog-pdf.mjs
 * does that work once, offline, and writes the results into public/pdf/ and the
 * manifest this module reads. What the visitor then does is download a file.
 *
 * Everything here tolerates an empty manifest, because there is a real state in
 * which it is empty: a checkout before anybody has run the script, and the days
 * after a new section is added but before the next run. The pages fall back to
 * the print sheet rather than offering a link to a file that is not there.
 */

export interface CatalogPdfFile {
  /** Absolute path under public/, e.g. /pdf/shemo-katalog-2026-09.pdf */
  file: string;
  bytes: number;
  sheets: number;
}

interface CatalogPdfManifest {
  /** ISO instant of the run, or null when there has not been one. */
  generatedAt: string | null;
  /** catalogFingerprint() of the catalogue the run rendered. */
  fingerprint: string | null;
  full: CatalogPdfFile | null;
  /** Keyed by catalogSectionSlug(). */
  sections: Record<string, CatalogPdfFile>;
}

const CATALOG_PDF = manifest as CatalogPdfManifest;

/** The whole catalogue, or null when none has been generated. */
export function fullCatalogPdf(): CatalogPdfFile | null {
  return CATALOG_PDF.full;
}

/** One section, or null — a section added since the last run has no file. */
export function sectionCatalogPdf(slug: string): CatalogPdfFile | null {
  return CATALOG_PDF.sections[slug] ?? null;
}

/** When the files were made, for the line under the download button. */
export function catalogPdfGeneratedAt(): string | null {
  return CATALOG_PDF.generatedAt;
}

/**
 * Whether the stored PDFs still match what the database would print today.
 *
 * A stored artefact can go stale, and `/shtyp` was written partly to avoid ever
 * having one. This is the compensation: the pages that offer a download compare
 * today's fingerprint against the one recorded at generation, and say so when
 * they differ instead of handing a partner last month's range without comment.
 *
 * Unknown counts as current. With no fingerprint recorded there is nothing to
 * disagree with, and a permanent warning nobody can clear is worse than none.
 */
export function catalogPdfIsCurrent(fingerprint: string): boolean {
  return !CATALOG_PDF.fingerprint || CATALOG_PDF.fingerprint === fingerprint;
}
