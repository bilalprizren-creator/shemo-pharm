import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Package,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { SITE } from "@/lib/site";

/** Verifiable USP points under the hero (no invented shipping/return claims). */
const USPS = [
  { icon: Package, title: "Mbi 2000 produkte", text: "nga brende ndërkombëtare" },
  { icon: ShieldCheck, title: "Distributor i licencuar", text: "nga MSh e Kosovës" },
  { icon: Stethoscope, title: "Këshillim profesional", text: "për barnatore e partnerë" },
  { icon: MessageCircle, title: "Porosi përmes WhatsApp", text: "përgjigje e shpejtë" },
];

/**
 * Split hero in the mockup style: headline left, real SHEMO store photo
 * right, separated by a double S-curve (echo of the logo mark) built from
 * three stacked layers clipped with the same objectBoundingBox path.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-surface via-white to-mint">
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <clipPath id="hero-s-curve" clipPathUnits="objectBoundingBox">
            <path d="M0.24,0 C0.0,0.16 0.42,0.4 0.18,0.6 C0.02,0.74 0.04,0.92 0.22,1 L1,1 L1,0 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="mx-auto grid max-w-7xl items-stretch gap-10 px-4 pt-12 pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:px-6 lg:pt-16 lg:pb-14">
        <div className="max-w-xl self-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            {SITE.tagline}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.06] text-ink-900 sm:text-5xl lg:text-[3.6rem]">
            Shëndeti juaj,
            <br />
            <span className="text-brand-600">prioriteti ynë.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-500 sm:text-lg">
            Më shumë se 2000 produkte farmaceutike dhe medicinale të zgjedhura
            me kujdes për mirëqenien tuaj dhe të familjes suaj.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/produktet"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              Shiko Produktet
            </Link>
            <Link
              href="/kontakti"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-ink-900/15 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              Na Kontaktoni
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Photo of the real SHEMO store behind a double S-curve edge;
            negative margin bleeds it to the right viewport edge. */}
        <div
          className="relative hidden min-h-[420px] lg:block lg:mr-[calc(50%-50vw)]"
          aria-hidden={false}
        >
          <div
            className="absolute inset-y-0 -left-7 right-0 bg-brand-600"
            style={{ clipPath: "url(#hero-s-curve)" }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 -left-3.5 right-0 bg-accent-500"
            style={{ clipPath: "url(#hero-s-curve)" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: "url(#hero-s-curve)" }}
          >
            <Image
              src="/photos/depo.jpg"
              alt="Depoja dhe barnatorja e SHEMO PHARM"
              fill
              priority
              sizes="(max-width: 1024px) 0px, 620px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Mobile: simple rounded photo */}
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl lg:hidden">
          <Image
            src="/photos/depo.jpg"
            alt="Depoja dhe barnatorja e SHEMO PHARM"
            fill
            sizes="92vw"
            className="object-cover"
          />
        </div>
      </div>

      {/* USP row */}
      <div className="border-t border-ink-900/6 bg-white/70 backdrop-blur">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 lg:grid-cols-4 lg:px-6">
          {USPS.map((u) => (
            <li key={u.title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <u.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-ink-900">
                  {u.title}
                </span>
                <span className="block truncate text-xs text-ink-400">{u.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
