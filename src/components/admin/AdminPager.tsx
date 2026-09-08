import Link from "next/link";

/**
 * Back / page N of M / forward, for the admin lists.
 *
 * Lifted out of /admin/produktet because three other pages needed it and had
 * instead capped themselves at 200 rows — silently, and while reporting that
 * cap as the total, so an inbox past two hundred said "200 mesazhe" forever and
 * the oldest were unreachable from the panel at all.
 */
export function AdminPager({
  page,
  totalPages,
  hrefFor,
  label = "Faqet",
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-5 flex items-center justify-center gap-2" aria-label={label}>
      {page > 1 && (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-full border border-ink-900/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300"
        >
          ← Mbrapa
        </Link>
      )}
      <span className="px-2 text-sm text-ink-500">
        Faqja {page} / {totalPages}
      </span>
      {page < totalPages && (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-full border border-ink-900/10 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-brand-300"
        >
          Para →
        </Link>
      )}
    </nav>
  );
}
