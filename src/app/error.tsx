"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-red-50">
        <CircleAlert className="size-9 text-red-500" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        Diçka shkoi keq
      </h1>
      <p className="mt-3 text-ink-500">
        Ndodhi një gabim i papritur. Ju lutemi provoni përsëri.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        <RotateCcw className="size-4.5" aria-hidden />
        Provo përsëri
      </button>
    </div>
  );
}
