import Link from "next/link";
import { PackageSearch } from "lucide-react";

export function EmptyState({
  title,
  text,
  actionLabel,
  actionHref,
}: {
  title: string;
  text: string;
  actionLabel: string;
  /** Already language-prefixed by the caller. */
  actionHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-900/12 bg-white px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-50">
        <PackageSearch className="size-7 text-brand-600" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold text-ink-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{text}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
