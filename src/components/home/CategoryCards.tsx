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
export function CategoryCards() {
  const cards = HOME_CATEGORIES.map((c) => ({
    ...c,
    count: getCategoryBySlug(c.slug)?.count ?? 0,
    image: getShowcaseProducts(c.slug, 1)[0]?.images[0] ?? null,
  })).filter((c) => c.count > 0);

  return (
    <section
      aria-labelledby="kategorite-popullore"
      className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16"
    >
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h2 id="kategorite-popullore" className="text-2xl font-extrabold text-ink-900 sm:text-[1.7rem]">
          Kategoritë Popullore
        </h2>
        <Link
          href="/kategorite"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
        >
          Shiko të gjitha
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <CardSlider
        label="Kategoritë popullore"
        itemWidthClassName="w-[38%] sm:w-[26%] md:w-[19%] lg:w-[15%]"
      >
        {cards.map((c) => {
          const Icon = ICONS[c.icon] ?? Pill;
          return (
            <Link
              key={c.slug}
              href={`/kategorite/${c.slug}`}
              className="group flex h-full flex-col items-center rounded-xl border border-ink-900/6 bg-surface px-3 py-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-card-hover"
            >
              <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border border-ink-900/6 bg-white">
                {c.image ? (
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-3 transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <Icon className="size-8 text-brand-600" strokeWidth={1.5} aria-hidden />
                )}
              </span>
              <span className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-ink-900">
                {c.title}
              </span>
              <span className="mt-1 text-xs font-medium text-accent-600">
                {c.count} produkte
              </span>
            </Link>
          );
        })}
      </CardSlider>
    </section>
  );
}
