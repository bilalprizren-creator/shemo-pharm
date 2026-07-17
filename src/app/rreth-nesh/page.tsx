import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Eye,
  Handshake,
  HeartHandshake,
  ShieldCheck,
  Target,
} from "lucide-react";
import { SITE } from "@/lib/site";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { TrustStats } from "@/components/home/TrustStats";
import { BrandStrip } from "@/components/home/BrandStrip";
import { ContactCta } from "@/components/home/ContactCta";

export const metadata: Metadata = {
  title: "Rreth nesh",
  description:
    "SHEMO PHARM — depo farmaceutike dhe distributor me shumicë i produkteve dhe pajisjeve mjekësore në Kosovë, e licencuar nga Ministria e Shëndetësisë.",
  alternates: { canonical: "/rreth-nesh" },
};

const VALUES = [
  {
    icon: BadgeCheck,
    title: "Cilësi",
    text: "Produkte të përzgjedhura nga brende të njohura, me standarde të verifikuara.",
  },
  {
    icon: ShieldCheck,
    title: "Besueshmëri",
    text: "Furnizim i rregullt dhe korrekt për çdo partner, në çdo porosi.",
  },
  {
    icon: Target,
    title: "Përgjegjësi",
    text: "Trajtim i kujdesshëm i produkteve mjekësore në çdo hallkë të shpërndarjes.",
  },
  {
    icon: Handshake,
    title: "Partneritet",
    text: "Marrëdhënie afatgjata me barnatore, profesionistë dhe furnitorë.",
  },
  {
    icon: HeartHandshake,
    title: "Përkushtim ndaj klientit",
    text: "Mbështetje dhe këshillim profesional për çdo kërkesë.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-mint via-white to-lavender">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-16">
          <Breadcrumbs items={[{ label: "Rreth nesh" }]} />
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                Rreth nesh
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl lg:text-5xl">
                Ne kujdesemi për ju
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-500">
                {SITE.legalName} operon si {SITE.taglineLong.toLowerCase()} për
                territorin e Kosovës. Kompania është e licencuar nga Agjencia për
                Produkte dhe Pajisje Mjekësore, pranë Ministrisë së Shëndetësisë
                së Kosovës.
              </p>
            </div>
            <figure className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-float">
                <Image
                  src="/photos/depo.jpg"
                  alt="Depoja e SHEMO PHARM në Prizren"
                  fill
                  priority
                  sizes="(max-width: 1024px) 92vw, 520px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-center text-sm text-ink-400">
                Depoja jonë në Prizren — Rr. Ernest Koliqi 165/A
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <TrustStats />

      <section aria-labelledby="misioni-titulli" className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-ink-900/8 bg-white p-7 shadow-card lg:p-9">
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Target className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 id="misioni-titulli" className="mt-4 text-xl font-extrabold text-ink-900">
              Misioni ynë
            </h2>
            <p className="mt-3 leading-relaxed text-ink-500">
              Të furnizojmë barnatoret dhe partnerët e sektorit të shëndetësisë
              në Kosovë me produkte dhe pajisje mjekësore cilësore, në kohë dhe
              me kushte korrekte — duke kontribuar në shëndetin dhe mirëqenien e
              komunitetit.
            </p>
          </div>
          <div className="rounded-3xl border border-ink-900/8 bg-white p-7 shadow-card lg:p-9">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
              <Eye className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-ink-900">Vizioni ynë</h2>
            <p className="mt-3 leading-relaxed text-ink-500">
              Të jemi partneri më i besueshëm i shpërndarjes farmaceutike në
              rajon, duke zgjeruar vazhdimisht gamën e produkteve dhe duke
              ngritur standardet e shërbimit ndaj klientit.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="vlerat-titulli" className="bg-mint">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
          <h2
            id="vlerat-titulli"
            className="text-center text-2xl font-extrabold text-ink-900 sm:text-3xl"
          >
            Vlerat tona
          </h2>
          <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <li
                key={v.title}
                className="rounded-2xl border border-ink-900/6 bg-white p-6 shadow-card"
              >
                <v.icon className="size-6 text-brand-600" strokeWidth={1.75} aria-hidden />
                <h3 className="mt-3 font-bold text-ink-900">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="licenca-titulli" className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-brand-200 bg-brand-50/60 p-8 text-center lg:p-10">
          <ShieldCheck className="mx-auto size-10 text-brand-700" strokeWidth={1.5} aria-hidden />
          <h2 id="licenca-titulli" className="mt-4 text-xl font-extrabold text-ink-900 sm:text-2xl">
            Licencim dhe përkushtim ndaj cilësisë
          </h2>
          <p className="mt-3 leading-relaxed text-ink-500">
            {SITE.legalName} është e licencuar nga Agjencia për Produkte dhe
            Pajisje Mjekësore, pranë Ministrisë së Shëndetësisë së Republikës së
            Kosovës, për tregtimin me shumicë të produkteve dhe pajisjeve
            mjekësore. Çdo produkt trajtohet sipas kërkesave të ruajtjes dhe
            transportit të përcaktuara nga prodhuesi.
          </p>
          <Link
            href="/kontakti"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Na kontaktoni për bashkëpunim
          </Link>
        </div>
      </section>

      <BrandStrip />
      <ContactCta />
    </>
  );
}
