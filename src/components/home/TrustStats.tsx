import { SITE } from "@/lib/site";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Compact company-figures band — a restrained white strip with hairline
 * dividers. Used on the homepage right under <Hero /> and standalone on
 * /rreth-nesh. Values come from SITE.stats; labels are localized by index.
 */
export function TrustStats({ dict }: { dict: Dictionary }) {
  return (
    <section aria-label={dict.stats.label} className="border-y border-line bg-white">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-line sm:divide-x lg:grid-cols-4">
        {SITE.stats.map((s, i) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 px-4 py-7 text-center lg:py-8"
          >
            <dd className="order-1 font-display text-3xl font-bold tracking-tight text-brand-700 sm:text-4xl">
              {s.value}
            </dd>
            <dt className="order-2 text-sm font-medium text-ink-500">
              {dict.stats.labels[i] ?? s.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
