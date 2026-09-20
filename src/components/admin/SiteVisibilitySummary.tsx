import Link from "next/link";
import { BookOpen, EyeOff, Package, Store, type LucideIcon } from "lucide-react";
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
 *
 * "Në katalog" carries a second number when it needs one: how many of those
 * products are in no printed section. shemo-katalog.com is arranged by section,
 * so a product switched on but never placed is on that site only through its
 * search and the tail of /te-gjitha — and an editor who counted it as "in the
 * catalogue" and then could not find it there took the switch for broken. The
 * number is a link to exactly those products, where the bulk bar can place them.
 */
interface Cell {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  tone: "neutral" | "warn";
  /** A narrower set worth naming next to the hint, as a link of its own. */
  aside?: { href: string; label: string; title: string };
}

export function SiteVisibilitySummary({
  counts,
  className = "",
}: {
  counts: SiteVisibilityCounts;
  className?: string;
}) {
  const cells: Cell[] = [
    {
      href: "/admin/produktet",
      icon: Package,
      label: "Gjithsej",
      value: counts.total,
      hint: "të gjitha produktet në bazë",
      tone: "neutral",
    },
    {
      href: "/admin/produktet?dukshmeria=e-dukshme",
      icon: Store,
      label: "Në dyqan",
      value: counts.shop,
      hint: "shfaqen te shemopharm",
      tone: "neutral",
    },
    {
      href: "/admin/produktet?katalogu=e-dukshme",
      icon: BookOpen,
      label: "Në katalog",
      value: counts.katalog,
      hint: "shtypen te shemo-katalog.com",
      tone: "neutral",
      // The same set narrowed to "no section" — both filters at once, as the
      // "askund" cell does, so the link lands on exactly what was counted.
      aside:
        counts.katalogUnplaced > 0
          ? {
              href: "/admin/produktet?katalogu=e-dukshme&seksioni=pa-seksion",
              label: `${counts.katalogUnplaced.toLocaleString("de-DE")} pa seksion`,
              title:
                "Në katalog, por pa seksion të shtypur: gjenden vetëm te kërkimi dhe te «Të gjitha»",
            }
          : undefined,
    },
    {
      // Both filters at once: the only way to name the set that fell out of
      // both sites, and not a thing anybody would assemble by hand.
      href: "/admin/produktet?dukshmeria=e-fshehur&katalogu=e-fshehur",
      icon: EyeOff,
      label: "Askund",
      value: counts.nowhere,
      hint: "as në dyqan, as në katalog",
      tone: counts.nowhere > 0 ? "warn" : "neutral",
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
        {/* A <div> carrying a stretched link, not a <Link> around the whole
            card: the aside is a second link, and an <a> cannot hold another.
            The number's ::after covers the card, so the whole card still
            presses; the aside sits above that overlay. */}
        {cells.map((c) => (
          <div
            key={c.label}
            className={`relative rounded-2xl border bg-white p-3 transition-colors ${
              c.tone === "warn"
                ? "border-amber-300/70 hover:border-amber-400 focus-within:border-amber-400"
                : "border-ink-900/8 hover:border-brand-300 focus-within:border-brand-300"
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
            <Link
              href={c.href}
              className="mt-1 block font-display text-2xl font-extrabold tabular-nums text-ink-900 after:absolute after:inset-0 after:rounded-2xl"
            >
              {c.value.toLocaleString("de-DE")}
            </Link>
            <span className="mt-0.5 block text-[11px] leading-tight text-ink-400">
              {c.hint}
              {c.aside && (
                <>
                  {" · "}
                  <Link
                    href={c.aside.href}
                    title={c.aside.title}
                    className="relative z-10 font-semibold text-amber-700 hover:underline"
                  >
                    {c.aside.label}
                  </Link>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        Dy kolona të pavarura: shumica e produkteve janë në të dyja faqet,
        prandaj «në dyqan» dhe «në katalog» nuk mblidhen te «gjithsej».
      </p>
    </section>
  );
}
