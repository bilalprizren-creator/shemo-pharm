import Image from "next/image";
import Link from "next/link";
import { CircleCheck, Clock, MessageCircle } from "lucide-react";
import { SITE } from "@/lib/site";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * "Këshillim profesional" split section. The working-hours card shows only the
 * verified hours.
 *
 * TODO(image): /photos/keshillim.jpg is a PLACEHOLDER (two people in white coats
 * in a lab-like setting) and does not show real SHEMO Pharm consultation.
 * Replace with a real SHEMO photo — an employee advising a customer, a pharmacist
 * on the phone, or an employee processing an order — once one is available.
 * Do not substitute lab, hospital or generic medical stock imagery.
 */
export function AdviceSection({ dict }: { dict: Dictionary }) {
  return (
    <section aria-labelledby="keshillim-titulli" className="bg-white">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 lg:grid-cols-2 lg:gap-16 lg:px-6 lg:py-20">
        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            {dict.home.adviceEyebrow}
          </p>
          <h2
            id="keshillim-titulli"
            className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl"
          >
            {dict.home.adviceTitle1}{" "}
            <span className="text-brand-600">{dict.home.adviceTitle2}</span>
          </h2>
          <p className="mt-4 leading-relaxed text-ink-500">{dict.home.adviceSub}</p>

          <ul className="mt-6 space-y-3">
            {dict.home.adviceServices.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm text-ink-700 sm:text-base">
                <CircleCheck
                  className="mt-0.5 size-5 shrink-0 text-accent-500"
                  strokeWidth={2}
                  aria-hidden
                />
                {s}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={langHref(dict.lang, "/kontakti")}
              className="inline-flex min-h-12 items-center rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
            >
              {dict.hero.ctaContact}
            </Link>
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/10 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-accent-400 hover:text-accent-700"
            >
              <MessageCircle className="size-4.5 text-accent-500" aria-hidden />
              {dict.home.adviceWhatsapp}
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-card">
            {/* TODO(image): placeholder — replace with a real SHEMO consultation photo. */}
            <Image
              src="/photos/keshillim.jpg"
              alt={dict.home.adviceImageAlt}
              fill
              sizes="(max-width: 1024px) 92vw, 560px"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 right-4 w-72 max-w-[calc(100%-1rem)] rounded-2xl border border-line bg-white p-4 shadow-float sm:right-8">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Clock className="size-4 text-brand-600" aria-hidden />
              {dict.home.hoursTitle}
            </p>
            <dl className="mt-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="whitespace-nowrap font-medium text-ink-700">
                  {dict.home.hoursDays}
                </dt>
                <dd className="whitespace-nowrap text-ink-500">{dict.home.hoursTime}</dd>
              </div>
            </dl>
            <p className="mt-2 border-t border-ink-900/6 pt-2 text-xs text-ink-400">
              WhatsApp:{" "}
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-700 hover:underline"
              >
                {SITE.phones[0].label}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
