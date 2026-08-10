"use client";

import Link from "next/link";
import { CircleAlert, RotateCcw } from "lucide-react";

/**
 * The admin tree is its own root layout outside [lang], so [lang]/error.tsx
 * never covers it — a failed query in the products list or the orders inbox
 * used to fall through to the framework's bare error page.
 *
 * Albanian only, like the rest of the panel, and it offers the way back to the
 * dashboard: an editor who broke one page should not be left guessing whether
 * the whole panel is down.
 */
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-red-50">
        <CircleAlert className="size-9 text-red-500" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-ink-900">Diçka shkoi keq</h1>
      <p className="mt-3 text-ink-500">
        Kjo faqe e panelit nuk u ngarkua. Provoni përsëri ose kthehuni te ballina
        e panelit.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <RotateCcw className="size-4.5" aria-hidden />
          Provo përsëri
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-12 items-center rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          Paneli
        </Link>
      </div>
    </div>
  );
}
