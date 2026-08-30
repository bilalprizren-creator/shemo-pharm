"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Lock, Search, User } from "lucide-react";
import { langHref, switchLangPath, type Lang } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Chrome for the printed-catalogue site.
 *
 * Deliberately not the shop header: no cart, no wishlist, no category mega-menu,
 * no offers. The catalogue is for looking things up — a partner with the paper
 * edition in hand wants the search box, the contents and the login that reveals
 * prices, and nothing between them.
 *
 * Paths here are already catalogue-relative ("/", "/kerko"), because the proxy
 * folds them under /katalog on the way in. See sitePath() in src/lib/site-mode.ts.
 */
export function KatalogHeader({
  dict,
  user,
}: {
  dict: Dictionary;
  user: { name: string } | null;
}) {
  const lang = dict.lang as Lang;
  const pathname = usePathname();
  const search = useSearchParams().toString();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 lg:px-6">
        <Link
          href={langHref(lang, "/")}
          className="flex shrink-0 items-center gap-2.5"
          aria-label={dict.nav.homeAria}
        >
          <Image
            src="/logo.svg"
            alt="SHEMO PHARM"
            width={132}
            height={47}
            priority
            className="h-9 w-auto"
          />
          <span className="hidden border-l border-line pl-2.5 text-sm font-semibold text-brand-700 sm:block">
            {dict.printedCatalog.title}
          </span>
        </Link>

        <Link
          href={langHref(lang, "/te-gjitha")}
          className="hidden shrink-0 text-sm font-medium text-ink-700 transition-colors hover:text-brand-700 md:block"
        >
          {dict.printedCatalog.allTitle}
        </Link>

        {/* Plain GET form: the catalogue has to work with scripting off, the
            way the paper edition it replaces always did. */}
        <form
          action={langHref(lang, "/kerko")}
          className="order-3 flex min-w-0 flex-1 basis-full items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 focus-within:border-brand-300 sm:order-none sm:basis-auto"
        >
          <Search className="size-4 shrink-0 text-ink-400" aria-hidden />
          <input
            type="search"
            name="kerko"
            defaultValue=""
            placeholder={dict.printedCatalog.searchPlaceholder}
            aria-label={dict.search.label}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
          >
            {dict.search.button}
          </button>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href={langHref(lang, user ? "/llogaria" : "/kycu")}
            className="inline-flex items-center gap-1.5 rounded-field border border-line px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:text-brand-700"
          >
            {user ? (
              <User className="size-4" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {user ? user.name : dict.header.partnerLogin}
            </span>
          </Link>

          <div
            aria-label={dict.nav.langLabel}
            className="flex items-center rounded-full border border-ink-900/10 bg-white p-0.5 text-[11px] font-bold"
          >
            {(["sq", "en"] as const).map((l) => (
              <Link
                key={l}
                href={switchLangPath(pathname, l, search)}
                aria-current={lang === l ? "true" : undefined}
                className={`rounded-full px-2 py-1 uppercase transition-colors ${
                  lang === l
                    ? "bg-brand-600 text-white"
                    : "text-ink-500 hover:text-brand-700"
                }`}
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
