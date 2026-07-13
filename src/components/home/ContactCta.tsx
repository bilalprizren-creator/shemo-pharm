import Link from "next/link";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { SITE } from "@/lib/site";

export function ContactCta() {
  return (
    <section aria-labelledby="cta-titulli" className="relative overflow-hidden bg-plum-950">
      <div
        aria-hidden
        className="absolute -left-24 top-0 size-96 rounded-full bg-brand-600/20 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -right-24 bottom-0 size-96 rounded-full bg-accent-600/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center lg:px-6 lg:py-20">
        <h2
          id="cta-titulli"
          className="text-2xl font-extrabold text-white sm:text-3xl lg:text-4xl"
        >
          Keni nevojë për ndihmë në zgjedhjen e produkteve?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-white/70 sm:text-lg">
          Kontaktoni ekipin tonë për informacione rreth produkteve,
          disponueshmërisë dhe bashkëpunimit.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={SITE.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
          >
            <MessageCircle className="size-4.5" aria-hidden />
            Na shkruani në WhatsApp
          </a>
          <a
            href={SITE.phones[0].href}
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Phone className="size-4.5" aria-hidden />
            {SITE.phones[0].label}
          </a>
          <Link
            href="/kontakti"
            className="inline-flex min-h-12 items-center gap-2 px-4 py-3 text-sm font-semibold text-white/85 hover:text-white"
          >
            Kontakti
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
