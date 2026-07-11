import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

function pageHref(basePath: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("faqja");
  else next.set("faqja", String(page));
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Numbered pagination with a compact window: 1 … 4 [5] 6 … 12 */
export function Pagination({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: URLSearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const windowPages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = Array.from(windowPages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: (number | "gap")[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push("gap");
    items.push(pages[i]);
  }

  return (
    <nav aria-label="Faqet e produkteve" className="mt-10 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={pageHref(basePath, params, page - 1)}
              aria-label="Faqja e mëparshme"
              className="flex size-11 items-center justify-center rounded-full border border-ink-900/10 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
            >
              <ChevronLeft className="size-4.5" aria-hidden />
            </Link>
          ) : (
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-full border border-ink-900/6 text-ink-300"
            >
              <ChevronLeft className="size-4.5" />
            </span>
          )}
        </li>
        {items.map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-ink-400">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                href={pageHref(basePath, params, item)}
                aria-label={`Faqja ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={`flex size-11 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  item === page
                    ? "bg-brand-600 text-white"
                    : "border border-ink-900/10 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
                }`}
              >
                {item}
              </Link>
            </li>
          )
        )}
        <li>
          {page < totalPages ? (
            <Link
              href={pageHref(basePath, params, page + 1)}
              aria-label="Faqja tjetër"
              className="flex size-11 items-center justify-center rounded-full border border-ink-900/10 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700"
            >
              <ChevronRight className="size-4.5" aria-hidden />
            </Link>
          ) : (
            <span
              aria-hidden
              className="flex size-11 items-center justify-center rounded-full border border-ink-900/6 text-ink-300"
            >
              <ChevronRight className="size-4.5" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
