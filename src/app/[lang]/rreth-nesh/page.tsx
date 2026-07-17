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
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { TrustStats } from "@/components/home/TrustStats";
import { BrandStrip } from "@/components/home/BrandStrip";
import { ContactCta } from "@/components/home/ContactCta";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.aboutPage.title,
    description: dict.aboutPage.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/rreth-nesh"),
      languages: { sq: "/rreth-nesh", en: "/en/rreth-nesh" },
    },
  };
}

const VALUE_ICONS = [BadgeCheck, ShieldCheck, Target, Handshake, HeartHandshake];

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");

  return (
    <>
      <section className="bg-gradient-to-br from-mint via-white to-accent-50">
        <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6 lg:py-16">
          <Breadcrumbs items={[{ label: dict.aboutPage.title }]} dict={dict} />
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                {dict.aboutPage.title}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl lg:text-5xl">
                {dict.aboutPage.heading}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-500">
                {dict.aboutPage.intro}
              </p>
            </div>
            <figure className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-float">
                <Image
                  src="/photos/depo.jpg"
                  alt={dict.hero.depotAlt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 92vw, 520px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-center text-sm text-ink-400">
                {dict.aboutPage.depotCaption}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <TrustStats dict={dict} />

      <section aria-labelledby="misioni-titulli" className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-ink-900/8 bg-white p-7 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover lg:p-9">
            <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
              <Target className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 id="misioni-titulli" className="mt-4 text-xl font-extrabold text-ink-900">
              {dict.aboutPage.missionTitle}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-500">
              {dict.aboutPage.missionText}
            </p>
          </div>
          <div className="rounded-3xl border border-ink-900/8 bg-white p-7 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover lg:p-9">
            <span className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-50 to-accent-100 text-accent-700">
              <Eye className="size-6" strokeWidth={1.75} aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-ink-900">
              {dict.aboutPage.visionTitle}
            </h2>
            <p className="mt-3 leading-relaxed text-ink-500">
              {dict.aboutPage.visionText}
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
            {dict.aboutPage.valuesTitle}
          </h2>
          <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dict.aboutPage.values.map((v, i) => {
              const Icon = VALUE_ICONS[i] ?? BadgeCheck;
              return (
                <li
                  key={v.title}
                  className="rounded-2xl border border-ink-900/6 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <Icon className="size-6 text-brand-600" strokeWidth={1.75} aria-hidden />
                  <h3 className="mt-3 font-bold text-ink-900">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{v.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section aria-labelledby="licenca-titulli" className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-brand-200 bg-brand-50/60 p-8 text-center lg:p-10">
          <ShieldCheck className="mx-auto size-10 text-brand-700" strokeWidth={1.5} aria-hidden />
          <h2 id="licenca-titulli" className="mt-4 text-xl font-extrabold text-ink-900 sm:text-2xl">
            {dict.aboutPage.licenseTitle}
          </h2>
          <p className="mt-3 leading-relaxed text-ink-500">
            {dict.aboutPage.licenseText}
          </p>
          <Link
            href={langHref(dict.lang, "/kontakti")}
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {dict.aboutPage.licenseCta}
          </Link>
        </div>
      </section>

      <BrandStrip dict={dict} />
      <ContactCta dict={dict} />
    </>
  );
}
