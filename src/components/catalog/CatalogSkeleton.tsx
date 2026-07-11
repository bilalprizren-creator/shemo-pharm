/** Loading skeleton matching the catalog layout — prevents layout shift. */
export function CatalogSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 lg:px-6 lg:py-10" aria-hidden>
      <div className="h-4 w-40 rounded bg-ink-900/6" />
      <div className="mt-5 h-9 w-64 rounded-lg bg-ink-900/8" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-ink-900/6" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <div className="hidden h-96 rounded-2xl bg-ink-900/5 lg:block" />
        <div>
          <div className="mb-5 flex gap-3">
            <div className="h-10 flex-1 rounded-lg bg-ink-900/6" />
            <div className="h-10 w-32 rounded-lg bg-ink-900/6" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-ink-900/6 bg-white">
                <div className="aspect-square bg-ink-900/4" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-16 rounded bg-ink-900/6" />
                  <div className="h-4 w-full rounded bg-ink-900/8" />
                  <div className="h-4 w-2/3 rounded bg-ink-900/8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
