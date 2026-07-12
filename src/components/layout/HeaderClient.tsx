"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  User,
  BookOpen,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { SearchBar } from "./SearchBar";
import { MobileNav } from "./MobileNav";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useCart } from "@/components/cart/CartProvider";

export interface NavCategory {
  slug: string;
  name: string;
  count: number;
}

const NAV_LINKS = [
  { href: "/", label: "Ballina" },
  { href: "/produktet", label: "Produktet" },
  { href: "/markat", label: "Markat" },
  { href: "/oferta", label: "Oferta" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
  { href: "/kontakti", label: "Kontakti" },
];

/** Verifiable trust points for the top utility bar (no invented claims). */
const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Distributor i licencuar nga MSh e Kosovës" },
  { icon: BadgeCheck, text: "2000+ produkte nga brende ndërkombëtare" },
  { icon: Stethoscope, text: "Këshillim profesional" },
];

function IconAction({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string;
  label: string;
  icon: typeof Heart;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-ink-700 transition-colors hover:text-brand-700"
    >
      <span className="relative">
        <Icon className="size-5.5" strokeWidth={1.75} aria-hidden />
        {badge !== undefined && badge > 0 && (
          <span
            aria-hidden
            className="absolute -right-2 -top-1.5 flex min-w-4.5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-4 text-white"
          >
            {badge > 99 ? "99" : badge}
          </span>
        )}
      </span>
      <span className="hidden text-xs font-medium lg:block">{label}</span>
      <span className="sr-only lg:hidden">{label}</span>
    </Link>
  );
}

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
  const { count: wishCount, ready: wishReady } = useWishlist();
  const { count: cartCount, ready: cartReady } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const raf = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close overlays on navigation — state adjustment during render
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setCatOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  }

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
        {/* Utility bar — dark plum, verifiable trust points */}
        <div
          className={`hidden bg-plum-900 text-white/85 transition-[max-height,opacity] duration-300 md:block ${
            scrolled ? "max-h-0 overflow-hidden opacity-0" : "max-h-10 opacity-100"
          }`}
        >
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-6 px-4 text-xs lg:px-6">
            {TRUST_POINTS.map((t, i) => (
              <span
                key={t.text}
                className={`flex items-center gap-1.5 ${i === 1 ? "hidden lg:flex" : ""}`}
              >
                <t.icon className="size-3.5 text-accent-400" aria-hidden />
                {t.text}
              </span>
            ))}
          </div>
        </div>

        {/* Main row: logo — search — actions */}
        <div className="border-b border-ink-900/8 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
          <div
            className={`mx-auto flex max-w-7xl items-center gap-3 px-4 transition-[height] duration-300 lg:gap-8 lg:px-6 ${
              scrolled ? "h-16" : "h-16 lg:h-[4.75rem]"
            }`}
          >
            <Link
              href="/"
              className="flex shrink-0 flex-col items-start"
              aria-label="SHEMO PHARM — Ballina"
            >
              <Image
                src="/logo.svg"
                alt="SHEMO PHARM"
                width={156}
                height={56}
                priority
                className={`w-auto transition-[height] duration-300 ${
                  scrolled ? "h-9" : "h-9 lg:h-11"
                }`}
              />
              <span
                className={`mt-0.5 hidden text-[9px] font-medium uppercase tracking-wide text-ink-400 xl:block ${
                  scrolled ? "xl:hidden" : ""
                }`}
              >
                {SITE.tagline}
              </span>
            </Link>

            <SearchBar
              withButton
              className="hidden min-w-0 flex-1 lg:block lg:max-w-2xl lg:mx-auto"
            />

            <div className="ml-auto flex items-center gap-0.5 lg:ml-0 lg:gap-1.5">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Kërko produkte"
                aria-expanded={searchOpen}
                className="flex size-11 items-center justify-center rounded-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
              >
                <Search className="size-5.5" aria-hidden />
              </button>

              <IconAction
                href={user ? "/llogaria" : "/kycu"}
                label="Logaria"
                icon={User}
              />
              <IconAction
                href="/lista-e-deshirave"
                label="Të preferuarat"
                icon={Heart}
                badge={wishReady ? wishCount : 0}
              />
              <IconAction
                href="/shporta"
                label="Shporta"
                icon={ShoppingBag}
                badge={cartReady ? cartCount : 0}
              />

              {SITE.catalogUrl && (
                <a
                  href={SITE.catalogUrl}
                  className="hidden items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 xl:flex"
                >
                  <BookOpen className="size-4" aria-hidden />
                  Katalogu
                </a>
              )}

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Hap menynë"
                className="flex size-11 items-center justify-center rounded-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
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
              <div ref={catRef} className="relative mr-3">
                <button
                  type="button"
                  onClick={() => setCatOpen((v) => !v)}
                  aria-expanded={catOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    catOpen
                      ? "bg-brand-600 text-white"
                      : "bg-brand-50 text-brand-800 hover:bg-brand-100"
                  }`}
                >
                  <Menu className="size-4.5" aria-hidden />
                  Kategoritë
                  <ChevronDown
                    className={`size-4 transition-transform ${catOpen ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {catOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[560px] rounded-xl border border-ink-900/8 bg-white p-3 shadow-drawer">
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
                    className={`relative px-3.5 py-3 text-sm font-medium transition-colors ${
                      current
                        ? "font-semibold text-brand-700 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600"
                        : "text-ink-700 hover:text-brand-700"
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
