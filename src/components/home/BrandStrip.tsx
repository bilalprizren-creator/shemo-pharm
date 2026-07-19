import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_BRANDS } from "@/lib/site";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Curated partner-brand logos as a calm, even grid — grayscale until hover,
 * with a consistent visual area per cell so no single logo dominates and the
 * section never becomes a dense logo wall. The full brand list stays on /markat.
 */
export function BrandStrip({ dict }: { dict: Dictionary }) {
  return (
    <section aria-labelledby="brendet-titulli" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
        <div className="mb-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-700">
            {dict.home.brandsEyebrow}
          </p>
          <h2
            id="brendet-titulli"
            className="mt-2 font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl"
          >
            {dict.home.brandsTitle}
          </h2>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:gap-4">
          {HOME_BRANDS.map((b) => (
            <li
              key={b.name}
              className="brand-logo-cell flex h-16 items-center justify-center rounded-xl border border-line bg-white px-5 sm:h-[4.5rem]"
              title={b.name}
            >
              <Image
                src={b.image}
                alt={b.name}
                width={150}
                height={60}
                className="brand-logo max-h-12 w-auto max-w-[120px] object-contain sm:max-h-14 sm:max-w-[140px]"
              />
            </li>
          ))}
        </ul>

        <div className="mt-7 text-center">
          <Link
            href={langHref(dict.lang, "/markat")}
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {dict.home.brandsCta}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
