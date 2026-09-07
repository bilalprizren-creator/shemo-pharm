import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { langHref, type Lang } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Footer for the printed-catalogue site: who we are, how to reach us, the legal
 * pages, and a way across to the full shop. Nothing else — the shop footer's
 * category columns and quick links belong to a site that sells.
 */
export function KatalogFooter({ dict }: { dict: Dictionary }) {
  const lang = dict.lang as Lang;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
        <div>
          <p className="font-display text-lg font-extrabold text-ink-900">{SITE.name}</p>
          <p className="mt-2 max-w-sm text-sm text-ink-500">{SITE.tagline}</p>
        </div>

        <div className="text-sm text-ink-500">
          <p className="font-semibold text-ink-900">{dict.footer.contactTitle}</p>
          <ul className="mt-3 space-y-2">
            {SITE.phones.map((p) => (
              <li key={p.href}>
                <a
                  href={p.href}
                  className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
                >
                  <Phone className="size-4 shrink-0" aria-hidden />
                  {p.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${SITE.emails[0]}`}
                className="inline-flex items-center gap-2 transition-colors hover:text-brand-700"
              >
                <Mail className="size-4 shrink-0" aria-hidden />
                {SITE.emails[0]}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                {SITE.address.street}, {SITE.address.postalCode} {SITE.address.city}
              </span>
            </li>
          </ul>
        </div>

        <div className="text-sm text-ink-500">
          <p className="font-semibold text-ink-900">{dict.printedCatalog.moreTitle}</p>
          <ul className="mt-3 space-y-2">
            <li>
              {/* Absolute: the shop is a different domain from here. */}
              <a
                href={SITE.domain}
                className="transition-colors hover:text-brand-700"
              >
                {dict.printedCatalog.toShop}
              </a>
            </li>
            <li>
              <Link
                href={langHref(lang, "/kontakti")}
                className="transition-colors hover:text-brand-700"
              >
                {dict.nav.contact}
              </Link>
            </li>
            <li>
              <Link
                href={langHref(lang, "/kushtet")}
                className="transition-colors hover:text-brand-700"
              >
                {dict.legal.terms.title}
              </Link>
            </li>
            <li>
              <Link
                href={langHref(lang, "/privatesia")}
                className="transition-colors hover:text-brand-700"
              >
                {dict.legal.privacy.title}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-ink-400 lg:px-6">
          {dict.footer.rights.replace("{year}", String(year))}
        </p>
      </div>
    </footer>
  );
}
