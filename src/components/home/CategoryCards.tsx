import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Cross,
  Droplets,
  Footprints,
  Leaf,
  Pill,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { getCategoryBySlug, HOME_CATEGORIES } from "@/lib/catalog";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  activity: Activity,
  footprints: Footprints,
  pill: Pill,
  sparkles: Sparkles,
  cross: Cross,
  droplets: Droplets,
  leaf: Leaf,
};

export function CategoryCards() {
  const cards = HOME_CATEGORIES.map((c) => ({
    ...c,
    count: getCategoryBySlug(c.slug)?.count ?? 0,
  })).filter((c) => c.count > 0);

  return (
    <section aria-labelledby="kategorite-kryesore" className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="kategorite-kryesore" className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
            Kategoritë kryesore
          </h2>
          <p className="mt-2 text-sm text-ink-500 sm:text-base">
            Eksploro gamën tonë të plotë të produkteve shëndetësore
          </p>
        </div>
        <Link
          href="/kategorite"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Shiko të gjitha kategoritë
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = ICONS[c.icon] ?? Pill;
          return (
            <li key={c.slug}>
              <Link
                href={`/kategorite/${c.slug}`}
                className="group flex h-full items-start gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-5.5" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-ink-900">{c.title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink-500">
                    {c.blurb}
                  </span>
                  <span className="mt-1.5 block text-xs font-medium text-brand-700">
                    {c.count} produkte
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
