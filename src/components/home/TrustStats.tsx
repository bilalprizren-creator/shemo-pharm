import { SITE } from "@/lib/site";

/**
 * Company figures as a white card that overlaps the dark hero above it
 * (negative top margin) — used on the homepage right under <Hero /> and
 * standalone on /rreth-nesh, where the wrapper renders without overlap.
 */
export function TrustStats({ overlap = false }: { overlap?: boolean }) {
  return (
    <section
      aria-label="Shifrat e kompanisë"
      className={overlap ? "relative z-10 -mt-9 px-4 lg:px-6" : "px-4 py-4 lg:px-6"}
    >
      <dl className="mx-auto grid max-w-7xl grid-cols-2 divide-ink-900/6 rounded-2xl border border-ink-900/6 bg-white shadow-float sm:divide-x lg:grid-cols-4">
        {SITE.stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 px-4 py-6 text-center sm:py-7"
          >
            <dd className="order-1 font-display text-3xl font-bold tracking-tight text-brand-700 sm:text-4xl">
              {s.value}
            </dd>
            <dt className="order-2 text-sm font-medium text-ink-500">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
