import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { SITE } from "@/lib/site";

/**
 * "Këshillim profesional" split section. The photo is a licensed stock
 * placeholder (public/photos/keshillim.jpg) until real team photography
 * is available; the working-hours card shows only the verified hours.
 */
export function AdviceSection() {
  return (
    <section aria-labelledby="keshillim-titulli" className="bg-surface">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-16 lg:px-6 lg:py-20">
        <div className="max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            Këshillim profesional
          </p>
          <h2
            id="keshillim-titulli"
            className="mt-3 text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl"
          >
            Këshillim profesional{" "}
            <span className="text-brand-600">kurdo që keni nevojë.</span>
          </h2>
          <p className="mt-4 leading-relaxed text-ink-500">
            Ekipi ynë është gjithmonë i gatshëm t&apos;ju ndihmojë me zgjedhjen
            e produkteve, informacionin mbi disponueshmërinë dhe porositë me
            shumicë — profesionalisht dhe pa komplikime.
          </p>
          <Link
            href="/kontakti"
            className="mt-7 inline-flex min-h-12 items-center rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Na Kontaktoni
          </Link>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            <Image
              src="/photos/keshillim.jpg"
              alt="Këshillim profesional nga ekipi i SHEMO PHARM"
              fill
              sizes="(max-width: 1024px) 92vw, 560px"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-5 right-4 w-72 max-w-[calc(100%-1rem)] rounded-xl border border-ink-900/8 bg-white p-4 shadow-card-hover sm:right-8">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Clock className="size-4 text-brand-600" aria-hidden />
              Orari i Punës
            </p>
            <dl className="mt-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="whitespace-nowrap font-medium text-ink-700">
                  E Hënë – E Premte
                </dt>
                <dd className="whitespace-nowrap text-ink-500">09:00 – 18:00</dd>
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
