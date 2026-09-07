import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminCatalogSections,
  getCatalogPlacementCounts,
} from "@/lib/admin-data";
import { CatalogSectionRow } from "@/components/admin/CatalogSectionRow";
import { NewCatalogSectionForm } from "@/components/admin/NewCatalogSectionForm";

export const metadata: Metadata = { title: "Katalogu i shtypur" };

/**
 * The printed catalogue as the panel sees it: the numbered sections of
 * shemo-katalog.com, in the order that site prints them.
 *
 * Both sites are served by this one deployment and share this one admin, which
 * is the whole point of the arrangement — a price or a placement changed here
 * takes effect on the shop and on the catalogue at once.
 */
export default async function AdminCatalogPage() {
  await requireAdmin();
  const [sections, counts] = await Promise.all([
    getAdminCatalogSections(),
    getCatalogPlacementCounts(),
  ]);

  // A section with nothing visible in it is dropped by the catalogue site, so
  // it is worth counting where the numbers are read rather than leaving it to
  // be discovered by someone comparing the site against the paper edition.
  const invisible = sections.filter((s) => s.visibleCount === 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
            Katalogu i shtypur
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {sections.length} seksione · {counts.placed} produkte të vendosura ·{" "}
            <Link
              href="/admin/produktet?seksioni=pa-seksion"
              className="font-semibold text-brand-700 hover:underline"
            >
              {counts.unplaced} pa seksion
            </Link>
            {invisible > 0 && ` · ${invisible} seksione nuk shfaqen`}
          </p>
        </div>
        <a
          href="/katalog"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          <ExternalLink className="size-4" aria-hidden />
          Shiko katalogun
        </a>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-tint px-4 py-3 text-sm text-ink-600">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        <p>
          Këto janë seksionet e katalogut të shtypur, jo kategoritë e faqes:
          shumica e tyre janë prodhues ose shpërndarës, prandaj rrinë veç dhe nuk
          shfaqen te filtrat e dyqanit. Renditja e katalogut vjen nga kolona{" "}
          <strong className="font-semibold">renditja</strong>, jo nga numri —
          numri është vetëm ai që shtypet. Një seksion pa produkte të dukshme
          nuk shfaqet fare në katalog, dhe produktet pa seksion shfaqen vetëm te
          faqja <span className="font-mono text-[13px]">/te-gjitha</span>.
          Dukshmëria këtu është e ndarë nga ajo e dyqanit: një produkt mund të
          hiqet nga dyqani dhe të mbetet i shtypur, ose e kundërta.
        </p>
      </div>

      <NewCatalogSectionForm />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-ink-900/8 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-3 py-3 font-semibold">Seksioni</th>
              <th className="px-3 py-3 font-semibold">Produkte</th>
              <th className="px-3 py-3 font-semibold" colSpan={3}>
                Numri · emri · renditja
              </th>
              <th className="px-3 py-3 font-semibold text-right">Fshi</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <CatalogSectionRow key={s.id} section={s} />
            ))}
            {sections.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-ink-400">
                  Asnjë seksion. Krijoni të parin më lart.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
