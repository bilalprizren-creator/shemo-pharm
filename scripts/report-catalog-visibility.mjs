/**
 * Which products the shop sells but the catalogue hides although the old
 * catalogue's own database still prints them.
 *
 *   node scripts/report-catalog-visibility.mjs                          # development
 *   DATABASE_TARGET=production node scripts/report-catalog-visibility.mjs
 *
 * Read-only: it selects, and it writes one report,
 * audit/catalog-visibility-vs-old-db.md. It changes no visibility — that is the
 * owner's call, product by product, in /admin/produktet.
 *
 * Why it exists. On 2026-09-23 article 7732 (AC Cleanser Sal-Wash Liquid, in
 * section 23 Froika) was found by the shop's search and not by the
 * catalogue's. Not a search bug: the catalogue searches everything with
 * `catalog_hidden = false`, placed in a section or not, and 7732 had been
 * switched off there by hand on 2026-09-08 — together with three more of the AC
 * range within the same second. Yet the old database, which the owner made the
 * reference on 2026-09-22 (scripts/import-old-catalog-db.mjs), lists all seven
 * AC products as active.
 *
 * The import deliberately never switches a product back on — "a deliberate
 * hide made in /admin survives every run" — so the two can disagree for good.
 * This lists every such disagreement, with the product's section and the last
 * time its row changed, so each can be decided on purpose.
 *
 * Matched with the same rules as the import (scripts/lib/old-catalog-match.mjs):
 * never on code alone, because the old database reuses codes.
 */
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { connect, ROOT, target } from "./lib/db.mjs";
import { oldCatalogMatcher, oldCents } from "./lib/old-catalog-match.mjs";
import { readDump } from "./lib/old-catalog-sql.mjs";

const DUMP = path.join(ROOT, "reference/old-katalog/u600177787_shemo.sql");
const REPORT = path.join(ROOT, "audit/catalog-visibility-vs-old-db.md");

if (!existsSync(DUMP)) throw new Error(`${DUMP} is missing — see reference/old-katalog`);

const tidy = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const md = (s) => String(s ?? "").replace(/\|/g, "\\|");

const { produktet } = readDump(DUMP, ["produktet"]);
const rows = produktet
  .filter((r) => tidy(r.nenkategori).toLowerCase() !== "aksion")
  .map((r) => ({
    section: tidy(r.nenkategori),
    name: tidy(r.name),
    code: tidy(r.nrserik),
    active: r.status === "1",
    cents: oldCents(r.price),
    updated: r.dateupdated,
  }));
const matcher = oldCatalogMatcher(rows);

const sql = connect();
const products = await sql`
  SELECT p.id, p.sku, p.name, p.price_cents, p.hidden, p.catalog_hidden, p.updated_at,
         s.catalog_no, s.name AS section_name, s.sort AS section_sort, p.catalog_sort
  FROM products p
  LEFT JOIN catalog_sections s ON s.id = p.catalog_section_id
  WHERE NOT p.hidden AND p.catalog_hidden
`;

const conflicts = [];
let notInDump = 0;
let inactiveThere = 0;
for (const p of products) {
  const mine = matcher.rowsFor({ sku: p.sku, name: p.name, cents: p.price_cents });
  if (!mine.length) {
    notInDump++;
    continue;
  }
  const active = mine.filter((r) => r.active);
  if (!active.length) {
    inactiveThere++;
    continue;
  }
  conflicts.push({ p, row: active[0] });
}

conflicts.sort(
  (a, b) =>
    (a.p.section_sort ?? 1e9) - (b.p.section_sort ?? 1e9) ||
    (a.p.catalog_sort ?? 0) - (b.p.catalog_sort ?? 0) ||
    String(a.p.sku).localeCompare(String(b.p.sku))
);

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const lines = [
  `# Hidden in the catalogue, active in the old database — ${new Date().toISOString().slice(0, 10)}`,
  "",
  // The target only, not its host: this report is committed, and the repository is public.
  `Database: ${target()}`,
  "",
  "Products the shop sells (`hidden = false`) that the catalogue hides",
  "(`catalog_hidden = true`) although the old catalogue's database — the",
  "reference since 2026-09-22 — lists them as active. Read-only report of",
  "`scripts/report-catalog-visibility.mjs`; nothing was changed.",
  "",
  "Each is a decision for /admin/produktet: switch it on in the catalogue if the",
  "hide was a mistake, or leave it off if it was meant. Until then the",
  "catalogue's search does not find these, and offers the whole online range",
  "instead.",
  "",
  "| | |",
  "|---|---|",
  `| In the shop, hidden in the catalogue | ${products.length} |`,
  `| — of those active in the old database (listed below) | ${conflicts.length} |`,
  `| — switched off in the old database too | ${inactiveThere} |`,
  `| — not in the old database at all | ${notInDump} |`,
  "",
  "| Code | Product | Section | Last changed here | Old database |",
  "|---|---|---|---|---|",
  ...conflicts.map(
    ({ p, row }) =>
      `| ${md(p.sku)} | ${md(p.name)} | ${p.catalog_no ? md(`${p.catalog_no} ${p.section_name}`) : "—"} | ${day(p.updated_at)} | ${md(row.name)} (${md(row.section)}) |`
  ),
  "",
];

writeFileSync(REPORT, lines.join("\n"));
console.log(`${target()}: ${products.length} hidden in the catalogue, ${conflicts.length} active in the old database`);
console.log(`wrote ${path.relative(ROOT, REPORT)}`);
