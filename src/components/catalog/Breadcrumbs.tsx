import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Vendndodhja" className="overflow-x-auto scrollbar-none">
      <ol className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-400">
        <li>
          <Link href="/" className="transition-colors hover:text-brand-700">
            Ballina
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-brand-700">
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
