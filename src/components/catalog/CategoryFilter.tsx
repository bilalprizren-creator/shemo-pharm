import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CategoryNode } from "@/lib/types";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Category filter list used in the desktop sidebar and the mobile sheet.
 * Uses native <details> for expand/collapse — accessible without JS.
 * The branch containing the active category renders expanded.
 */
export function CategoryFilter({
  tree,
  activeSlug,
  displayName,
  dict,
}: {
  tree: CategoryNode[];
  activeSlug?: string;
  displayName: Record<string, string>;
  dict: Dictionary;
}) {
  const containsActive = (node: CategoryNode): boolean =>
    node.slug === activeSlug || node.children.some(containsActive);

  const renderNode = (node: CategoryNode, depth: number) => {
    const isActive = node.slug === activeSlug;
    const name = displayName[node.slug] ?? node.name;
    const link = (
      <Link
        href={langHref(dict.lang, `/kategorite/${node.slug}`)}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-10 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-brand-600 font-semibold text-white"
            : "text-ink-700 hover:bg-brand-50 hover:text-brand-800"
        }`}
      >
        <span className="truncate">{name}</span>
        <span className={`shrink-0 text-xs ${isActive ? "text-white/80" : "text-ink-400"}`}>
          {node.count}
        </span>
      </Link>
    );

    if (node.children.length === 0) {
      return <li key={node.id}>{link}</li>;
    }

    return (
      <li key={node.id}>
        <details open={containsActive(node)} className="group/details">
          <summary className="flex cursor-pointer list-none items-center gap-0.5 [&::-webkit-details-marker]:hidden">
            {link}
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-brand-50"
            >
              <ChevronDown className="size-4 transition-transform group-open/details:rotate-180" />
            </span>
          </summary>
          <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-brand-100 pl-2">
            {node.children.map((c) => renderNode(c, depth + 1))}
          </ul>
        </details>
      </li>
    );
  };

  return (
    <nav aria-label={dict.catalog.filterByCategory}>
      <ul className="space-y-0.5">
        <li>
          <Link
            href={langHref(dict.lang, "/produktet")}
            aria-current={!activeSlug ? "page" : undefined}
            className={`flex min-h-10 items-center rounded-lg px-3 py-2 text-sm transition-colors ${
              !activeSlug
                ? "bg-brand-600 font-semibold text-white"
                : "text-ink-700 hover:bg-brand-50 hover:text-brand-800"
            }`}
          >
            {dict.catalog.allProducts}
          </Link>
        </li>
        {tree.map((n) => renderNode(n, 0))}
      </ul>
    </nav>
  );
}
