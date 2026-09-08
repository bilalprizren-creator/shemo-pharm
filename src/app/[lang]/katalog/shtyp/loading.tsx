/**
 * The print run's own boundary.
 *
 * This is the slowest catalogue route by a wide margin — it resolves every
 * printed section, lays 1 733 products into sheets, and PrintButton then waits
 * for every photograph before it opens the dialog. Without a boundary the
 * visitor sits on the previous page for all of that with no sign anything is
 * happening.
 *
 * No text: loading.tsx receives no route params, so it has no language, and an
 * invented Albanian string here would be the one piece of copy on the site
 * outside the dictionaries. The shape says enough — it is the sheet layout.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse px-4 py-8 lg:px-6 lg:py-10"
      aria-hidden
    >
      <div className="h-4 w-40 rounded bg-ink-900/6" />
      <div className="mt-5 h-9 w-72 rounded-lg bg-ink-900/8" />
      <div className="mt-3 h-11 w-44 rounded-full bg-ink-900/8" />

      {Array.from({ length: 2 }).map((_, sheet) => (
        <section key={sheet} className="mt-10">
          <div className="flex items-center gap-3 border-b border-ink-900/8 pb-3">
            <div className="h-6 w-14 rounded bg-ink-900/8" />
            <div className="h-5 w-56 rounded bg-ink-900/6" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i}>
                <div className="h-24 rounded-xl bg-ink-900/5" />
                <div className="mt-2 h-3 w-full rounded bg-ink-900/6" />
                <div className="mt-1 h-3 w-2/3 rounded bg-ink-900/6" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
