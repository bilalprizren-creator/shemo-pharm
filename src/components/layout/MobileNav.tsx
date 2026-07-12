"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
import type { NavCategory } from "./HeaderClient";

const LINKS = [
  { href: "/", label: "Ballina" },
  { href: "/produktet", label: "Produktet" },
  { href: "/markat", label: "Markat" },
  { href: "/oferta", label: "Oferta" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
  { href: "/kontakti", label: "Kontakti" },
  { href: "/lista-e-deshirave", label: "Të preferuarat", icon: Heart },
  { href: "/shporta", label: "Shporta", icon: ShoppingBag },
];

export function MobileNav({
  open,
  onClose,
  categories,
  user,
}: {
  open: boolean;
  onClose: () => void;
  categories: NavCategory[];
  user: { name: string } | null;
}) {
  const [catsOpen, setCatsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyja">
      <button
        type="button"
        aria-label="Mbyll menynë"
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
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Mbyll menynë"
            className="flex size-11 items-center justify-center rounded-full text-ink-700 hover:bg-ink-900/5"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        <nav aria-label="Navigimi" className="flex-1 px-2 py-3">
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={onClose}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium text-ink-900 hover:bg-brand-50"
                >
                  {l.icon && <l.icon className="size-4.5 text-brand-600" aria-hidden />}
                  {l.label}
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
                Kategoritë
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
                        href={`/kategorite/${c.slug}`}
                        onClick={onClose}
                        className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-brand-50"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 text-xs text-ink-400">{c.count}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/kategorite"
                      onClick={onClose}
                      className="flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                    >
                      Shiko të gjitha kategoritë
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>

        <div className="border-t border-ink-900/8 px-4 py-4">
          <Link
            href={user ? "/llogaria" : "/kycu"}
            onClick={onClose}
            className="mb-3 flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <User className="size-4.5" aria-hidden />
            {user ? `Llogaria (${user.name})` : "Kyçu / Regjistrohu"}
          </Link>
          <div className="space-y-1 text-sm">
            {SITE.phones.map((p) => (
              <a
                key={p.href}
                href={p.href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-ink-700 hover:bg-brand-50"
              >
                <Phone className="size-4.5 text-brand-600" aria-hidden />
                {p.label}
              </a>
            ))}
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-ink-700 hover:bg-brand-50"
            >
              <MessageCircle className="size-4.5 text-brand-600" aria-hidden />
              WhatsApp
            </a>
            <a
              href={`mailto:${SITE.emails[0]}`}
              className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-ink-700 hover:bg-brand-50"
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
