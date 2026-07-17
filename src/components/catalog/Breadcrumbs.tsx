import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

export interface Crumb {
  label: string;
  /** Unprefixed path — the language prefix is added when rendering. */
  href?: string;
}

export function Breadcrumbs({ items, dict }: { items: Crumb[]; dict: Dictionary }) {
  return (
    <nav aria-label={dict.catalog.breadcrumbLabel} className="overflow-x-auto scrollbar-none">
      <ol className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-400">
        <li>
          <Link
            href={langHref(dict.lang, "/")}
            className="transition-colors hover:text-brand-700"
          >
            {dict.nav.home}
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            {item.href ? (
              <Link
                href={langHref(dict.lang, item.href)}
                className="transition-colors hover:text-brand-700"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-700">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
