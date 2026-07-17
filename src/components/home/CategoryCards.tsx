import Image from "next/image";
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
import {
  getCategoryBySlug,
  getShowcaseProducts,
  HOME_CATEGORIES,
} from "@/lib/catalog";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { CardSlider } from "@/components/ui/CardSlider";

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
 * "Kategoritë Popullore" — compact cards with a white circle holding a
 * representative product image from the category (mockup style).
 */
export function CategoryCards({ dict }: { dict: Dictionary }) {
  const cards = HOME_CATEGORIES.map((c) => ({
    ...c,
    count: getCategoryBySlug(c.slug)?.count ?? 0,
    image: getShowcaseProducts(c.slug, 1)[0]?.images[0] ?? null,
  })).filter((c) => c.count > 0);

  return (
    <section
      aria-labelledby="kategorite-popullore"
      className="bg-glow-mint mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            {dict.home.categoriesEyebrow}
          </p>
          <h2
            id="kategorite-popullore"
            className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
          >
            {dict.home.categoriesTitle}
          </h2>
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

      <CardSlider
        label={dict.home.categoriesTitle}
        itemWidthClassName="w-[38%] sm:w-[26%] md:w-[19%] lg:w-[15%]"
      >
        {cards.map((c) => {
          const Icon = ICONS[c.icon] ?? Pill;
          return (
            <Link
              key={c.slug}
              href={langHref(dict.lang, `/kategorite/${c.slug}`)}
              className="group flex h-full flex-col items-center rounded-2xl border border-ink-900/6 bg-gradient-to-b from-white to-accent-50/60 px-3 py-6 text-center transition-all duration-200 hover:-translate-y-1 hover:border-accent-300 hover:to-accent-50 hover:shadow-card-hover"
            >
              <span className="relative flex size-21 items-center justify-center overflow-hidden rounded-full bg-white shadow-card ring-2 ring-accent-100 transition-all duration-200 group-hover:shadow-card-hover group-hover:ring-accent-200">
                {c.image ? (
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="84px"
                    className="object-contain p-3 transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <Icon className="size-8 text-brand-600" strokeWidth={1.5} aria-hidden />
                )}
              </span>
              <span className="mt-4 line-clamp-2 text-sm font-semibold leading-tight text-ink-900">
                {c.title}
              </span>
              <span className="mt-2 rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700 ring-1 ring-accent-200/60">
                {c.count} {dict.common.productsSuffix}
              </span>
              <span
                aria-hidden
                className="mt-3 flex size-7 items-center justify-center rounded-full bg-white text-accent-600 opacity-0 shadow-card transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 -translate-y-1"
              >
                <ArrowRight className="size-3.5" />
              </span>
            </Link>
          );
        })}
      </CardSlider>
    </section>
  );
}
