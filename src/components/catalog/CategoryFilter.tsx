import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { CategoryNode } from "@/lib/types";
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
  hrefFor,
  allHref,
  dict,
}: {
  tree: CategoryNode[];
  activeSlug?: string;
  displayName: Record<string, string>;
  /**
   * Where a category row links to.
   *
   * A callback rather than a bare slug because narrowing to a category has to
   * keep the rest of the view: someone who ticked "in stock only" and then
   * picked Barnat used to lose it with no indication, which is the same fault
   * listingHref() was written to fix for the chips. BrandTypeFilter takes
   * hrefForType for the same reason.
   */
  hrefFor: (slug: string) => string;
  /** The unfiltered listing, with the current view carried across. */
  allHref: string;
  dict: Dictionary;
}) {
  const containsActive = (node: CategoryNode): boolean =>
    node.slug === activeSlug || node.children.some(containsActive);

  const renderNode = (node: CategoryNode, depth: number) => {
    const isActive = node.slug === activeSlug;
    const name = displayName[node.slug] ?? node.name;
    const link = (
      <Link
        href={hrefFor(node.slug)}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-10 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-brand-600 font-semibold text-white"
            : "text-ink-700 hover:bg-brand-50 hover:text-brand-800"
        }`}
      >
        {/* One line for the usual names, two for the long ones — cutting them
            off pushed the count out of a 260px sidebar. break-words matters at
            the third level, where a single long word like "kompresioni" has no
            space to break in and otherwise widens the row past its siblings. */}
        <span className="line-clamp-2 min-w-0 break-words leading-snug">{name}</span>
        {/* Right-aligned in a fixed column with tabular figures, so 20 and 461
            end on the same pixel instead of each starting wherever its label
            happens to leave off. */}
        <span
          className={`w-8 shrink-0 text-right text-xs tabular-nums ${
            isActive ? "text-white/80" : "text-ink-400"
          }`}
        >
          {node.count}
        </span>
      </Link>
    );

    // A branch carries a chevron button beside its link, a leaf does not — so
    // without this spacer every leaf's count sits a chevron-width further right
    // than its siblings', which is exactly the ragged column being fixed.
    const chevronWidth = <span aria-hidden className="size-9 shrink-0" />;

    if (node.children.length === 0) {
      return (
        <li key={node.id} className="flex items-center gap-0.5">
          {link}
          {chevronWidth}
        </li>
      );
    }

    /**
     * The link is a sibling of <details>, not a child of <summary>.
     *
     * Interactive content inside <summary> is invalid, and browsers act on it
     * twice: clicking "Barnat" navigated *and* collapsed the branch under it,
     * and the keyboard reached the summary (where Enter toggles) before it
     * reached the link. So <summary> now holds nothing but the chevron.
     *
     * The children then cannot live inside <details> — content after <summary>
     * is what <details> hides, and the link has to stay visible when the branch
     * is shut. They sit beside it instead and follow the same [open] state
     * through the peer variant, which needs no script, so the "works without
     * JS" property this list was built for survives. flex-wrap puts the w-full
     * child list on its own line beneath the row.
     */
    return (
      <li key={node.id} className="flex flex-wrap items-center gap-0.5">
        {link}
        <details
          open={containsActive(node)}
          className="peer/branch group/details shrink-0"
        >
          <summary
            aria-label={name}
            className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg text-ink-400 hover:bg-brand-50 [&::-webkit-details-marker]:hidden"
          >
            <ChevronDown
              className="size-4 transition-transform group-open/details:rotate-180"
              aria-hidden
            />
          </summary>
        </details>
        <ul className="ml-3 mt-0.5 hidden w-full space-y-0.5 border-l-2 border-brand-100 pl-2 peer-open/branch:block">
          {node.children.map((c) => renderNode(c, depth + 1))}
        </ul>
      </li>
    );
  };

  return (
    <nav aria-label={dict.catalog.filterByCategory}>
      <ul className="space-y-0.5">
        <li>
          <Link
            href={allHref}
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
