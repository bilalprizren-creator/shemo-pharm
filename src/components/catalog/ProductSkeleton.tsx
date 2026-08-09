/**
 * Loading skeleton for the product detail page.
 *
 * Mirrors the real two-column layout — gallery left, everything else right —
 * so the page does not jump when the content lands. The product page reads
 * the session cookie for price gating and is therefore always rendered on
 * demand; without a skeleton the whole viewport sits on the previous page for
 * as long as that takes.
 */
export function ProductSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse px-4 py-8 lg:px-6 lg:py-10"
      aria-hidden
    >
      <div className="h-4 w-56 rounded bg-ink-900/6" />

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="aspect-square w-full rounded-2xl bg-ink-900/5" />
          <div className="mt-3 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="size-18 rounded-xl bg-ink-900/5" />
            ))}
          </div>
        </div>

        <div>
          <div className="h-3 w-24 rounded bg-ink-900/6" />
          <div className="mt-3 h-8 w-full rounded-lg bg-ink-900/8" />
          <div className="mt-2 h-8 w-2/3 rounded-lg bg-ink-900/8" />
          <div className="mt-5 flex gap-6">
            <div className="h-4 w-28 rounded bg-ink-900/6" />
            <div className="h-4 w-24 rounded bg-ink-900/6" />
          </div>

          <div className="mt-6 rounded-xl border border-ink-900/8 bg-white p-5">
            <div className="h-4 w-32 rounded bg-ink-900/6" />
            <div className="mt-3 h-8 w-40 rounded-lg bg-ink-900/8" />
            <div className="mt-5 border-t border-ink-900/6 pt-4">
              <div className="h-12 w-full rounded-full bg-ink-900/6" />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 w-36 rounded-full bg-ink-900/6" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
