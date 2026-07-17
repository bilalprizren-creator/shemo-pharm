"use client";

import { usePathname } from "next/navigation";
import { CircleAlert, RotateCcw } from "lucide-react";
import { langFromPathname } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const dict = getDictionary(langFromPathname(pathname ?? "/"));

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-red-50">
        <CircleAlert className="size-9 text-red-500" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {dict.errorPage.title}
      </h1>
      <p className="mt-3 text-ink-500">{dict.errorPage.text}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        <RotateCcw className="size-4.5" aria-hidden />
        {dict.errorPage.retry}
      </button>
    </div>
  );
}
