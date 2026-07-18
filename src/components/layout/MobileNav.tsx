"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { langHref, switchLangPath, fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import type { NavCategory } from "./HeaderClient";

const LINK_PATHS = [
  { href: "/", key: "home" },
  { href: "/produktet", key: "products" },
  { href: "/markat", key: "brands" },
  { href: "/oferta", key: "offers" },
  { href: "/rreth-nesh", key: "about" },
  { href: "/kontakti", key: "contact" },
  { href: "/lista-e-deshirave", key: "wishlist", icon: Heart },
  { href: "/shporta", key: "cart", icon: ShoppingBag },
] as const;

export function MobileNav({
  open,
  onClose,
  categories,
  user,
  dict,
}: {
  open: boolean;
  onClose: () => void;
  categories: NavCategory[];
  user: { name: string } | null;
  dict: Dictionary;
}) {
  const [catsOpen, setCatsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const lang = dict.lang;

  // Scroll lock + initial focus + Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label={dict.nav.menuLabel}
    >
      <button
        type="button"
        aria-label={dict.nav.closeMenu}
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/45"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className="absolute right-0 top-0 flex h-full w-[min(88vw,360px)] flex-col overflow-y-auto bg-white shadow-drawer"
      >
        <div className="flex items-center justify-between border-b border-ink-900/8 px-4 py-3.5">
          <Image src="/logo.svg" alt="SHEMO PHARM" width={124} height={44} className="h-9 w-auto" />
          <div className="flex items-center gap-2">
            {/* Language pill */}
            <div
              aria-label={dict.nav.langLabel}
              className="flex items-center rounded-full border border-ink-900/10 p-0.5 text-xs font-bold"
            >
              {(["sq", "en"] as const).map((l) => (
                <Link
                  key={l}
                  href={switchLangPath(pathname, l)}
                  onClick={onClose}
                  aria-current={lang === l ? "true" : undefined}
                  className={`rounded-full px-2.5 py-1.5 uppercase ${
                    lang === l ? "bg-brand-600 text-white" : "text-ink-500"
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={dict.nav.closeMenu}
              className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-ink-900/5"
            >
              <X className="size-6" aria-hidden />
            </button>
          </div>
        </div>

        <div className="border-b border-line px-4 py-3">
          <Link
            href={langHref(lang, "/kontakti")}
            onClick={onClose}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <MessageCircle className="size-4.5" aria-hidden />
            {dict.header.requestQuote}
          </Link>
        </div>

        <nav aria-label={dict.nav.mainLabel} className="flex-1 px-2 py-3">
          <ul>
            {LINK_PATHS.map((l) => (
              <li key={l.href}>
                <Link
                  href={langHref(lang, l.href)}
                  onClick={onClose}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-ink-900 hover:bg-brand-50"
                >
                  {"icon" in l && l.icon && (
                    <l.icon className="size-4.5 text-brand-600" aria-hidden />
                  )}
                  {dict.nav[l.key]}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setCatsOpen((v) => !v)}
                aria-expanded={catsOpen}
                className="flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium text-ink-900 hover:bg-brand-50"
              >
                {dict.nav.categories}
                <ChevronDown
                  className={`size-5 text-ink-400 transition-transform ${catsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {catsOpen && (
                <ul className="mb-2 ml-3 border-l-2 border-brand-100 pl-1">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={langHref(lang, `/kategorite/${c.slug}`)}
                        onClick={onClose}
                        className="flex min-h-11 items-center justify-between gap-2 rounded-full px-3 py-2.5 text-sm text-ink-700 hover:bg-brand-50"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 text-xs text-ink-400">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href={langHref(lang, "/kategorite")}
                      onClick={onClose}
                      className="flex min-h-11 items-center rounded-full px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      {dict.nav.allCategories}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <div className="border-t border-ink-900/8 px-4 py-4">
          <Link
            href={langHref(lang, user ? "/llogaria" : "/kycu")}
            onClick={onClose}
            className="mb-3 flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <User className="size-4.5" aria-hidden />
            {user
              ? fmt(dict.nav.accountWithName, { name: user.name })
              : dict.nav.loginRegister}
          </Link>
          <div className="space-y-1 text-sm">
            {SITE.phones.map((p) => (
              <a
                key={p.href}
                href={p.href}
                className="flex min-h-11 items-center gap-3 rounded-full px-2 py-2 text-ink-700 hover:bg-brand-50"
              >
                <Phone className="size-4.5 text-brand-600" aria-hidden />
                {p.label}
              </a>
            ))}
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-full px-2 py-2 text-ink-700 hover:bg-brand-50"
            >
              <MessageCircle className="size-4.5 text-brand-600" aria-hidden />
              WhatsApp
            </a>
            <a
              href={`mailto:${SITE.emails[0]}`}
              className="flex min-h-11 items-center gap-3 rounded-full px-2 py-2 text-ink-700 hover:bg-brand-50"
            >
              <Mail className="size-4.5 text-brand-600" aria-hidden />
              {SITE.emails[0]}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
