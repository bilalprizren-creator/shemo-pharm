import Link from "next/link";
import { PackageSearch } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  /** Already language-prefixed by the caller. */
  href: string;
}

export function EmptyState({
  title,
  text,
  actionLabel,
  actionHref,
  secondaryAction,
}: {
  title: string;
  text: string;
  actionLabel: string;
  /** Already language-prefixed by the caller. */
  actionHref: string;
  /**
   * The narrower way out, offered before the primary one is needed.
   *
   * The primary action is "start over", which on a filtered category page
   * throws away the search, the category, the stock filter and the type at
   * once — four decisions for one dead end. When the reason for the dead end
   * is knowable, the caller offers undoing just that reason here.
   */
  secondaryAction?: EmptyStateAction;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/12 bg-white px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
        <PackageSearch className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{text}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className="inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {secondaryAction.label}
          </Link>
        )}
        {/* Demoted to the quieter treatment when there is a narrower way out,
            because starting over is then the second-best answer. */}
        <Link
          href={actionHref}
          className={
            secondaryAction
              ? "inline-flex min-h-11 items-center rounded-full border border-ink-900/12 bg-white px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
              : "inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          }
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
