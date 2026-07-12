import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { categoryDisplayName, getTopCategories } from "@/lib/catalog";
import { FacebookIcon } from "@/components/icons/FacebookIcon";

const NAV = [
  { href: "/", label: "Ballina" },
  { href: "/produktet", label: "Produktet" },
  { href: "/markat", label: "Markat" },
  { href: "/oferta", label: "Oferta" },
  { href: "/kategorite", label: "Kategoritë" },
  { href: "/rreth-nesh", label: "Rreth nesh" },
  { href: "/kontakti", label: "Kontakti" },
];

export function Footer() {
  const topCategories = getTopCategories().slice(0, 6);
  const year = new Date().getFullYear();

  return (
    <footer className="bg-plum-950 text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.4fr] lg:gap-8 lg:px-6 lg:py-16">
        <div>
          {/* Original logo mark + wordmark as real text so it stays legible
              on the dark surface (the full logo bitmap has dark lettering). */}
          <Link href="/" className="flex items-center gap-3" aria-label="SHEMO PHARM — Ballina">
            <Image
              src="/logo-symbol.svg"
              alt=""
              width={38}
              height={51}
              className="h-12 w-auto"
            />
            <span className="font-display text-2xl font-extrabold tracking-tight text-white">
              SHEMO <span className="font-semibold text-white/80">PHARM</span>
            </span>
          </Link>
          <p className="mt-3 text-sm font-medium text-accent-300">{SITE.tagline}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            SHEMO PHARM furnizon barnatore dhe partnerë profesionalë në Kosovë
            me produkte mjekësore, ortopedike, suplemente dhe artikuj të
            kujdesit personal nga brende të njohura ndërkombëtare.
          </p>
          <div className="mt-5 flex gap-2">
            <a
              href={SITE.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="SHEMO PHARM në Facebook"
              className="flex size-10 items-center justify-center rounded-lg bg-white/8 text-white/80 transition-colors hover:bg-brand-600 hover:text-white"
            >
              <FacebookIcon className="size-4.5" />
            </a>
          </div>
        </div>

        <nav aria-label="Linqe të shpejta">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            Linqe të Shpejta
          </h2>
          <ul className="mt-4 space-y-2.5">
            {NAV.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm transition-colors hover:text-accent-300"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Kategoritë kryesore">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            Kategoritë
          </h2>
          <ul className="mt-4 space-y-2.5">
            {topCategories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/kategorite/${c.slug}`}
                  className="text-sm transition-colors hover:text-accent-300"
                >
                  {categoryDisplayName(c)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">
            Na Kontaktoni
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden />
              <span>
                {SITE.address.street}, {SITE.address.postalCode}{" "}
                {SITE.address.city}, {SITE.address.country}
              </span>
            </li>
            {SITE.phones.map((p) => (
              <li key={p.href}>
                <a
                  href={p.href}
                  className="flex items-center gap-2.5 transition-colors hover:text-accent-300"
                >
                  <Phone className="size-4 shrink-0 text-accent-400" aria-hidden />
                  {p.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`mailto:${SITE.emails[0]}`}
                className="flex items-center gap-2.5 transition-colors hover:text-accent-300"
              >
                <Mail className="size-4 shrink-0 text-accent-400" aria-hidden />
                {SITE.emails[0]}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Clock className="size-4 shrink-0 text-accent-400" aria-hidden />
              {SITE.hours}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-center text-xs text-white/50 sm:flex-row lg:px-6">
          <p>© {year} SHEMO PHARM. Të gjitha të drejtat e rezervuara.</p>
          <p>
            Licencuar nga Agjencia për Produkte dhe Pajisje Mjekësore — Ministria
            e Shëndetësisë e Kosovës
          </p>
        </div>
      </div>
    </footer>
  );
}
