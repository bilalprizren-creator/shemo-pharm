import { SITE } from "@/lib/site";

export function TrustStats() {
  return (
    <section aria-label="Shifrat e kompanisë" className="border-y border-ink-900/6 bg-white">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 py-8 sm:py-10 lg:grid-cols-4 lg:px-6">
        {SITE.stats.map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 py-3 text-center">
            <dd className="order-1 font-display text-3xl font-extrabold text-brand-700 sm:text-4xl">
              {s.value}
            </dd>
            <dt className="order-2 text-sm font-medium text-ink-500">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
