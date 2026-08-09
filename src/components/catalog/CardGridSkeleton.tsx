/**
 * Loading skeleton for the two full-width card grids — /kategorite and
 * /markat. Both open with a breadcrumb, a heading, a lead paragraph and then
 * a grid of cards; only the column count and card height differ, so those are
 * the two knobs.
 */
export function CardGridSkeleton({
  cards = 12,
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  cardHeight = "h-44",
}: {
  cards?: number;
  /**
   * The complete set of column classes including the base breakpoint — two
   * `grid-cols-*` utilities on one element resolve by stylesheet order, not by
   * the order they are written in, so the caller owns all of them.
   */
  columns?: string;
  cardHeight?: string;
}) {
  return (
    <div
      className="mx-auto max-w-7xl animate-pulse px-4 py-8 lg:px-6 lg:py-10"
      aria-hidden
    >
      <div className="h-4 w-40 rounded bg-ink-900/6" />
      <div className="mt-5 h-9 w-64 rounded-lg bg-ink-900/8" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-ink-900/6" />

      <div className={`mt-8 grid gap-4 ${columns}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className={`${cardHeight} rounded-2xl border border-ink-900/6 bg-white`}
          />
        ))}
      </div>
    </div>
  );
}
