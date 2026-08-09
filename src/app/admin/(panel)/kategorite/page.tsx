import type { Metadata } from "next";
import { Info } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories } from "@/lib/admin-data";
import { CategoryRow } from "@/components/admin/CategoryRow";
import { NewCategoryForm } from "@/components/admin/NewCategoryForm";

export const metadata: Metadata = { title: "Kategoritë" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await getAdminCategories();

  const types = categories.filter((c) => c.kind === "type");
  const brands = categories.filter((c) => c.kind === "brand");

  // Only product types can be a parent: brands are a flat parallel list, and
  // nesting one under the other is what made the original WooCommerce tree
  // unreadable in the first place.
  const parentOptions = types.map((c) => ({
    id: c.id,
    label: `${"— ".repeat(c.depth)}${c.displayName ?? c.name}`,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Kategoritë
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {types.length} lloje produktesh dhe {brands.length} marka.
      </p>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-tint px-4 py-3 text-sm text-ink-600">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        <p>
          Kategoritë nuk fshihen nga këtu me qëllim: fshirja e një kategorie
          heq njëkohësisht të gjitha lidhjet e produkteve me të. Për ta hequr
          një kategori nga faqja, zhvendosni produktet e saj — kategoritë pa
          produkte nuk shfaqen askund. Emri i katalogut nuk ndryshohet;
          ndryshoni <strong className="font-semibold">emrin e shfaqur</strong>,
          i cili është ai që sheh vizitori.
        </p>
      </div>

      <NewCategoryForm parentOptions={parentOptions} />

      <Section
        title="Llojet e produkteve"
        sub="Këto janë kategoritë që shfaqen në menu, në ballinë dhe te /kategorite."
        rows={types}
        parentOptions={parentOptions}
      />
      <Section
        title="Markat"
        sub="Listë paralele, e lexuar vetëm nga faqja /markat."
        rows={brands}
        parentOptions={parentOptions}
      />
    </div>
  );
}

function Section({
  title,
  sub,
  rows,
  parentOptions,
}: {
  title: string;
  sub: string;
  rows: Awaited<ReturnType<typeof getAdminCategories>>;
  parentOptions: { id: number; label: string }[];
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
      <p className="mt-0.5 text-sm text-ink-500">{sub}</p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-ink-900/8 text-xs uppercase tracking-wide text-ink-400">
              <th className="px-3 py-3 font-semibold">Kategoria</th>
              <th className="px-3 py-3 font-semibold">Produkte</th>
              <th className="px-3 py-3 font-semibold" colSpan={5}>
                Emri i shfaqur · lloji · prindi · renditja
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                parentOptions={parentOptions.filter((o) => o.id !== c.id)}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-400">
                  Asnjë kategori.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
