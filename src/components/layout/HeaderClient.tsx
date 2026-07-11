"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Heart,
  Mail,
  Menu,
  Phone,
  Search,
  User,
  BookOpen,
  Clock,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { SearchBar } from "./SearchBar";
import { MobileNav } from "./MobileNav";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

export interface NavCategory {
  slug: string;
  name: string;
  count: number;
}

const NAV_LINKS = [
  { href: "/", label: "Ballina" },
  { href: "/produktet", label: "Produktet" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
  { href: "/kontakti", label: "Kontakti" },
];

export function HeaderClient({
  categories,
  user,
}: {
  categories: NavCategory[];
  user: { name: string } | null;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const { count, ready } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close overlays on navigation
  useEffect(() => {
    setCatOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Category dropdown: close on outside click / Escape
  useEffect(() => {
    if (!catOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node))
        setCatOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCatOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [catOpen]);

  const featuredCategories = categories.slice(0, 10);

  return (
    <>
      <header className="sticky top-0 z-40">
        {/* Utility bar */}
        <div
          className={`hidden bg-ink-900 text-white/90 transition-[max-height,opacity] duration-300 md:block ${
            scrolled ? "max-h-0 overflow-hidden opacity-0" : "max-h-10 opacity-100"
          }`}
        >
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs lg:px-6">
            <p className="truncate">
              Depo farmaceutike dhe distributor me shumicë në Kosovë
            </p>
            <div className="flex items-center gap-5">
              <a
                href={SITE.phones[0].href}
                className="flex items-center gap-1.5 hover:text-white"
              >
                <Phone className="size-3.5" aria-hidden />
                {SITE.phones[0].label}
              </a>
              <a
                href={`mailto:${SITE.emails[0]}`}
                className="hidden items-center gap-1.5 hover:text-white lg:flex"
              >
                <Mail className="size-3.5" aria-hidden />
                {SITE.emails[0]}
              </a>
              <span className="hidden items-center gap-1.5 xl:flex">
                <Clock className="size-3.5" aria-hidden />
                {SITE.hours}
              </span>
            </div>
          </div>
        </div>

        {/* Main row */}
        <div className="border-b border-ink-900/8 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
          <div
            className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-[height] duration-300 lg:gap-6 lg:px-6 ${
              scrolled ? "h-16" : "h-16 lg:h-20"
            }`}
          >
            <Link
              href="/"
              className="flex shrink-0 items-center"
              aria-label="SHEMO PHARM — Ballina"
            >
              <Image
                src="/logo.svg"
                alt="SHEMO PHARM"
                width={156}
                height={56}
                priority
                className={`w-auto transition-[height] duration-300 ${
                  scrolled ? "h-10" : "h-10 lg:h-12"
                }`}
              />
            </Link>

            <SearchBar className="hidden min-w-0 flex-1 lg:block lg:max-w-xl lg:mx-auto" />

            <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Kërko produkte"
                aria-expanded={searchOpen}
                className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
              >
                <Search className="size-5.5" aria-hidden />
              </button>

              <Link
                href="/lista-e-deshirave"
                aria-label={`Lista e dëshirave${count > 0 ? ` (${count} produkte)` : ""}`}
                className="relative flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-brand-50 hover:text-brand-700"
              >
                <Heart className="size-5.5" aria-hidden />
                {ready && count > 0 && (
                  <span
                    aria-hidden
                    className="absolute right-1 top-1 flex size-4.5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white"
                  >
                    {count > 99 ? "99" : count}
                  </span>
                )}
              </Link>

              <Link
                href={user ? "/llogaria" : "/kycu"}
                className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-brand-50 hover:text-brand-700 xl:size-auto xl:gap-2 xl:rounded-full xl:px-4 xl:py-2.5"
              >
                <User className="size-5.5 xl:size-5" aria-hidden />
                <span className="hidden text-sm font-medium xl:block">
                  {user ? "Llogaria" : "Kyçu / Regjistrohu"}
                </span>
              </Link>

              {SITE.catalogUrl && (
                <a
                  href={SITE.catalogUrl}
                  className="hidden items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 md:flex"
                >
                  <BookOpen className="size-4" aria-hidden />
                  Katalogu
                </a>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Hap menynë"
                className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
              >
                <Menu className="size-6" aria-hidden />
              </button>
            </div>
          </div>

          {/* Desktop nav row */}
          <nav
            aria-label="Navigimi kryesor"
            className="hidden border-t border-ink-900/6 lg:block"
          >
            <div className="mx-auto flex h-12 max-w-7xl items-center gap-1 px-4 lg:px-6">
              <div ref={catRef} className="relative mr-2">
                <button
                  type="button"
                  onClick={() => setCatOpen((v) => !v)}
                  aria-expanded={catOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    catOpen
                      ? "bg-brand-600 text-white"
                      : "bg-brand-50 text-brand-800 hover:bg-brand-100"
                  }`}
                >
                  Kategoritë
                  <ChevronDown
                    className={`size-4 transition-transform ${catOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {catOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[560px] rounded-2xl border border-ink-900/8 bg-white p-3 shadow-drawer">
                    <ul className="grid grid-cols-2 gap-0.5">
                      {featuredCategories.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/kategorite/${c.slug}`}
                            className="flex items-baseline justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm text-ink-700 hover:bg-brand-50 hover:text-brand-800"
                          >
                            <span className="truncate font-medium">{c.name}</span>
                            <span className="shrink-0 text-xs text-ink-400">
                              {c.count}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/kategorite"
                      className="mt-2 block rounded-lg border-t border-ink-900/6 bg-surface px-3.5 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Shiko të gjitha kategoritë
                    </Link>
                  </div>
                )}
              </div>

              {NAV_LINKS.map((l) => {
                const current =
                  l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={current ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      current
                        ? "text-brand-700"
                        : "text-ink-700 hover:bg-ink-900/4 hover:text-ink-900"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Mobile search sheet */}
          {searchOpen && (
            <div className="border-t border-ink-900/6 bg-white p-3 lg:hidden">
              <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
            </div>
          )}
        </div>
      </header>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        categories={categories}
        user={user}
      />
    </>
  );
}
