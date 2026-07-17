"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { langFromPathname, langHref } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

/**
 * Client component so the language can be derived from the URL —
 * not-found.tsx receives no route params.
 */
export default function NotFound() {
  const pathname = usePathname();
  const lang = langFromPathname(pathname ?? "/");
  const dict = getDictionary(lang);

  return (
    <div className="mx-auto flex min-h-[55vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-brand-50">
        <PackageSearch className="size-9 text-brand-600" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-700">
        {dict.notFound.eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {dict.notFound.title}
      </h1>
      <p className="mt-3 text-ink-500">{dict.notFound.text}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href={langHref(lang, "/")}
          className="inline-flex min-h-12 items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {dict.notFound.backHome}
        </Link>
        <Link
          href={langHref(lang, "/produktet")}
          className="inline-flex min-h-12 items-center rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          {dict.common.browseProducts}
        </Link>
      </div>
    </div>
  );
}
