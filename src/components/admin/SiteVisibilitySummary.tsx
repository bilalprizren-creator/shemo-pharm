import Link from "next/link";
import { BookOpen, EyeOff, Package, Store } from "lucide-react";
import type { SiteVisibilityCounts } from "@/lib/admin-data";

/**
 * What each site shows, as four numbers you can press.
 *
 * One deployment serves two sites off one product table, split by two boolean
 * columns, and the whole arrangement only works if somebody can see at a glance
 * which range is which. Every number is a link into the product table filtered
 * to exactly the products it counted, so the answer to "which 5 are on neither
 * site" is one click away rather than a query somebody has to think up.
 *
 * The tallies are of two independent columns, so they do not sum to the total.
 * Saying so in the caption is cheaper than letting somebody try the arithmetic
 * and conclude the panel is wrong.
 */
export function SiteVisibilitySummary({
  counts,
  className = "",
}: {
  counts: SiteVisibilityCounts;
  className?: string;
}) {
  const cells = [
    {
      href: "/admin/produktet",
      icon: Package,
      label: "Gjithsej",
      value: counts.total,
      hint: "të gjitha produktet në bazë",
      tone: "neutral" as const,
    },
    {
      href: "/admin/produktet?dukshmeria=e-dukshme",
      icon: Store,
      label: "Në dyqan",
      value: counts.shop,
      hint: "shfaqen te shemopharm",
      tone: "neutral" as const,
    },
    {
      href: "/admin/produktet?katalogu=e-dukshme",
      icon: BookOpen,
      label: "Në katalog",
      value: counts.katalog,
      hint: "shtypen te shemo-katalog.com",
      tone: "neutral" as const,
    },
    {
      // Both filters at once: the only way to name the set that fell out of
      // both sites, and not a thing anybody would assemble by hand.
      href: "/admin/produktet?dukshmeria=e-fshehur&katalogu=e-fshehur",
      icon: EyeOff,
      label: "Askund",
      value: counts.nowhere,
      hint: "as në dyqan, as në katalog",
      tone: counts.nowhere > 0 ? ("warn" as const) : ("neutral" as const),
    },
  ];

  return (
    <section className={className} aria-labelledby="dukshmeria-sites">
      <h2
        id="dukshmeria-sites"
        className="text-xs font-semibold uppercase tracking-wide text-ink-400"
      >
        Dukshmëria sipas faqes
      </h2>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-2xl border bg-white p-3 transition-colors ${
              c.tone === "warn"
                ? "border-amber-300/70 hover:border-amber-400"
                : "border-ink-900/8 hover:border-brand-300"
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
              <c.icon
                className={`size-3.5 ${
                  c.tone === "warn" ? "text-amber-600" : "text-brand-600"
                }`}
                aria-hidden
              />
              {c.label}
            </span>
            <span className="mt-1 block font-display text-2xl font-extrabold tabular-nums text-ink-900">
              {c.value.toLocaleString("de-DE")}
            </span>
            <span className="mt-0.5 block text-[11px] leading-tight text-ink-400">
              {c.hint}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        Dy kolona të pavarura: shumica e produkteve janë në të dyja faqet,
        prandaj «në dyqan» dhe «në katalog» nuk mblidhen te «gjithsej».
      </p>
    </section>
  );
}
