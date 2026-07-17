"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  ChevronDown,
  Heart,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  User,
} from "lucide-react";
import { langHref, switchLangPath, type Lang } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { SearchBar } from "./SearchBar";
import { MobileNav } from "./MobileNav";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import { useCart } from "@/components/cart/CartProvider";

export interface NavCategory {
  slug: string;
  name: string;
  count: number;
  /** Representative product image for the mega-menu tile. */
  image: string | null;
}

const NAV_PATHS = [
  { href: "/produktet", key: "products" },
  { href: "/markat", key: "brands" },
  { href: "/oferta", key: "offers" },
  { href: "/rreth-nesh", key: "about" },
  { href: "/kontakti", key: "contact" },
] as const;

const TRUST_ICONS = [ShieldCheck, BadgeCheck, Stethoscope];

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
      aria-label={label}
      title={label}
      className="group relative flex size-11 items-center justify-center rounded-full text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon className="size-5.5" strokeWidth={1.75} aria-hidden />
      {badge !== undefined && badge > 0 && (
        <span
          aria-hidden
          className="absolute right-0.5 top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold leading-4 text-white"
        >
          {badge > 99 ? "99" : badge}
        </span>
      )}
    </Link>
  );
}

/** SQ|EN pill — swaps the locale prefix while keeping the current path. */
function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const pathname = usePathname();
  return (
    <div
      aria-label={label}
      className="flex items-center rounded-full border border-ink-900/10 bg-white p-0.5 text-xs font-bold"
    >
      {(["sq", "en"] as const).map((l) => (
        <Link
          key={l}
          href={switchLangPath(pathname, l)}
          aria-current={lang === l ? "true" : undefined}
          className={`rounded-full px-2.5 py-1.5 uppercase transition-colors ${
            lang === l
              ? "bg-brand-600 text-white"
              : "text-ink-500 hover:text-brand-700"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

export function HeaderClient({
  categories,
  user,
  dict,
}: {
  categories: NavCategory[];
  user: { name: string } | null;
  dict: Dictionary;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lang = dict.lang;

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
    setMegaOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
  }

  // Mega menu + search overlay: close on outside click / Escape
  useEffect(() => {
    if (!megaOpen && !searchOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
        setSearchOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [megaOpen, searchOpen]);

  const megaCategories = categories.slice(0, 8);

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-40">
        {/* Utility bar — dark plum, verifiable trust points */}
        <div
          className={`hidden bg-plum-900 text-white/85 transition-[max-height,opacity] duration-300 md:block ${
            scrolled ? "max-h-0 overflow-hidden opacity-0" : "max-h-10 opacity-100"
          }`}
        >
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-6 px-4 text-xs lg:px-6">
            {dict.header.trust.map((text, i) => {
              const Icon = TRUST_ICONS[i] ?? ShieldCheck;
              return (
                <span
                  key={text}
                  className={`flex items-center gap-1.5 ${i === 1 ? "hidden lg:flex" : ""}`}
                >
                  <Icon className="size-3.5 text-accent-400" aria-hidden />
                  {text}
                </span>
              );
            })}
          </div>
        </div>

        {/* Single main row: logo — nav — search pill — icons — language */}
        <div className="border-b border-ink-900/8 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/85">
          <div
            className={`mx-auto flex max-w-7xl items-center gap-2 px-4 transition-[height] duration-300 lg:gap-4 lg:px-6 ${
              scrolled ? "h-16" : "h-16 lg:h-20"
            }`}
          >
            <Link
              href={langHref(lang, "/")}
              className="shrink-0"
              aria-label={dict.nav.homeAria}
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
            </Link>

            {/* Desktop nav, inline */}
            <nav
              aria-label={dict.nav.mainLabel}
              className="ml-4 hidden items-center gap-0.5 lg:flex"
            >
              <button
                type="button"
                onClick={() => {
                  setMegaOpen((v) => !v);
                  setSearchOpen(false);
                }}
                aria-expanded={megaOpen}
                aria-haspopup="true"
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                  megaOpen
                    ? "bg-brand-600 text-white"
                    : "text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                }`}
              >
                {dict.nav.categories}
                <ChevronDown
                  className={`size-4 transition-transform ${megaOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {NAV_PATHS.map((l) => {
                const href = langHref(lang, l.href);
                const current = pathname.startsWith(href);
                return (
                  <Link
                    key={l.href}
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      current
                        ? "bg-accent-50 font-semibold text-accent-800"
                        : "text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    {dict.nav[l.key]}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex items-center gap-1 lg:gap-2">
              {/* Search pill (desktop) / icon (mobile) */}
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((v) => !v);
                  setMegaOpen(false);
                }}
                aria-label={dict.header.searchOpen}
                aria-expanded={searchOpen}
                className="hidden min-w-56 items-center gap-2.5 rounded-full border border-ink-900/10 bg-surface px-4 py-2.5 text-sm text-ink-400 transition-colors hover:border-accent-400 hover:text-ink-700 lg:flex"
              >
                <Search className="size-4.5 text-accent-600" aria-hidden />
                {dict.search.placeholder}
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label={dict.header.searchOpen}
                aria-expanded={searchOpen}
                className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
              >
                <Search className="size-5.5" aria-hidden />
              </button>

              <IconAction
                href={langHref(lang, user ? "/llogaria" : "/kycu")}
                label={dict.nav.account}
                icon={User}
              />
              <WishlistAction lang={lang} label={dict.nav.wishlist} />
              <CartAction lang={lang} label={dict.nav.cart} />

              <div className="hidden lg:block">
                <LangSwitch lang={lang} label={dict.nav.langLabel} />
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label={dict.nav.openMenu}
                className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-brand-50 hover:text-brand-700 lg:hidden"
              >
                <Menu className="size-6" aria-hidden />
              </button>
            </div>
          </div>

          {/* Full-width search overlay — enter animation only; closing
              unmounts instantly so the panel can never linger mid-exit */}
          {searchOpen && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="border-t border-ink-900/6 bg-white shadow-drawer"
              >
                <div className="mx-auto max-w-3xl px-4 py-4 lg:px-6">
                  <SearchBar
                    autoFocus
                    withButton
                    lang={lang}
                    dict={dict}
                    onNavigate={() => setSearchOpen(false)}
                  />
                </div>
              </motion.div>
          )}

          {/* Mega menu — enter animation only, instant unmount on close */}
          {megaOpen && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="hidden border-t border-ink-900/6 bg-white shadow-drawer lg:block"
              >
                <div className="mx-auto grid max-w-7xl grid-cols-[1fr_270px] gap-6 px-4 py-6 lg:px-6">
                  <div>
                    <ul className="grid grid-cols-4 gap-2.5">
                      {megaCategories.map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={langHref(lang, `/kategorite/${c.slug}`)}
                            className="group flex items-center gap-3 rounded-2xl border border-ink-900/6 bg-surface p-3 transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:bg-white hover:shadow-card"
                          >
                            <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-ink-900/6">
                              {c.image ? (
                                <Image
                                  src={c.image}
                                  alt=""
                                  fill
                                  sizes="48px"
                                  className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-110"
                                />
                              ) : (
                                <Package
                                  className="size-5 text-brand-600"
                                  strokeWidth={1.5}
                                  aria-hidden
                                />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink-900">
                                {c.name}
                              </span>
                              <span className="block text-xs font-medium text-accent-600">
                                {c.count} {dict.common.productsSuffix}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={langHref(lang, "/kategorite")}
                      className="group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
                    >
                      {dict.nav.allCategories}
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </div>

                  {/* Promo card — real warehouse photo, links to offers */}
                  <Link
                    href={langHref(lang, "/oferta")}
                    className="group relative flex flex-col justify-end overflow-hidden rounded-2xl bg-plum-950 p-5 text-white"
                  >
                    <Image
                      src="/photos/depo.jpg"
                      alt=""
                      fill
                      sizes="270px"
                      className="object-cover opacity-40 transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-plum-950/95 via-plum-950/40 to-transparent"
                    />
                    <span className="relative flex size-10 items-center justify-center rounded-xl bg-accent-500/20 text-accent-300">
                      <BadgePercent className="size-5" aria-hidden />
                    </span>
                    <span className="relative mt-3 font-display text-lg font-bold leading-snug">
                      {dict.header.megaPromoTitle}
                    </span>
                    <span className="relative mt-1 text-sm text-white/75">
                      {dict.header.megaPromoText}
                    </span>
                    <span className="relative mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-300">
                      {dict.header.megaPromoCta}
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Link>
                </div>
              </motion.div>
          )}
        </div>
      </header>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        categories={categories}
        user={user}
        dict={dict}
      />
    </>
  );
}

/** Wishlist + cart badges need the providers — split so hooks stay simple. */
function CartAction({ lang, label }: { lang: Lang; label: string }) {
  const { count, ready } = useCart();
  return (
    <IconAction
      href={langHref(lang, "/shporta")}
      label={label}
      icon={ShoppingBag}
      badge={ready ? count : 0}
    />
  );
}

function WishlistAction({ lang, label }: { lang: Lang; label: string }) {
  const { count, ready } = useWishlist();
  return (
    <IconAction
      href={langHref(lang, "/lista-e-deshirave")}
      label={label}
      icon={Heart}
      badge={ready ? count : 0}
    />
  );
}
