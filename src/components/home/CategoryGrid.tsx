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
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

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

/**
 * "Kategoritë kryesore" — a substantial static grid (4 per row on desktop)
 * with consistent iconography, titles and blurbs from the dictionary. No
 * product packshots and no slider, so every card reads equal and premium.
 */
export function CategoryGrid({ dict }: { dict: Dictionary }) {
  const cards = HOME_CATEGORIES.map((c) => ({
    ...c,
    copy: dict.home.categoryCards[c.slug as keyof typeof dict.home.categoryCards],
    count: getCategoryBySlug(c.slug)?.count ?? 0,
  })).filter((c) => c.count > 0 && c.copy);

  return (
    <section aria-labelledby="kategorite-titulli" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
              {dict.home.categoriesEyebrow}
            </p>
            <h2
              id="kategorite-titulli"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
            >
              {dict.home.categoriesTitle}
            </h2>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">
              {dict.home.categoriesSub}
            </p>
          </div>
          <Link
            href={langHref(dict.lang, "/kategorite")}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {dict.common.viewAll}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {cards.map((c) => {
            const Icon = ICONS[c.icon] ?? Pill;
            return (
              <li key={c.slug}>
                <Link
                  href={langHref(dict.lang, `/kategorite/${c.slug}`)}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-card-hover lg:p-6"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-tint text-accent-700 transition-colors group-hover:bg-accent-100">
                    <Icon className="size-6" strokeWidth={1.5} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-semibold leading-snug text-ink-900">
                    {c.copy.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-500">
                    {c.copy.blurb}
                  </p>
                  <span className="mt-auto flex items-center justify-between pt-4 text-xs font-semibold text-brand-700">
                    {c.count} {dict.common.productsSuffix}
                    <ArrowRight
                      className="size-4 text-accent-600 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
