import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";
import { ContactForm } from "@/components/contact/ContactForm";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.contactPage.title,
    description: dict.contactPage.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/kontakti"),
      languages: { sq: "/kontakti", en: "/en/kontakti" },
    },
  };
}

export default async function ContactPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Breadcrumbs items={[{ label: dict.contactPage.title }]} dict={dict} />
      <h1 className="mt-4 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {dict.contactPage.heading}
      </h1>
      <p className="mt-2 max-w-2xl text-ink-500">{dict.contactPage.sub}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:gap-12">
        <div className="space-y-3">
          {SITE.phones.map((p) => (
            <a
              key={p.href}
              href={p.href}
              className="flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 transition-colors hover:border-brand-300"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Phone className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm text-ink-400">
                  {dict.contactPage.phone}
                </span>
                <span className="block font-semibold text-ink-900">{p.label}</span>
              </span>
            </a>
          ))}

          <a
            href={SITE.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 transition-colors hover:border-brand-300"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <MessageCircle className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm text-ink-400">WhatsApp</span>
              <span className="block font-semibold text-ink-900">
                {dict.contactPage.whatsappDirect}
              </span>
            </span>
          </a>

          {SITE.emails.map((email) => (
            <a
              key={email}
              href={`mailto:${email}`}
              className="flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 transition-colors hover:border-brand-300"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Mail className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-ink-400">
                  {dict.contactPage.email}
                </span>
                <span className="block truncate font-semibold text-ink-900">
                  {email}
                </span>
              </span>
            </a>
          ))}

          <div className="flex items-start gap-4 rounded-2xl border border-ink-900/8 bg-white p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <MapPin className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm text-ink-400">
                {dict.contactPage.address}
              </span>
              <span className="block font-semibold text-ink-900">
                {SITE.address.street}
              </span>
              <span className="block text-sm text-ink-500">
                {SITE.address.postalCode} {SITE.address.city}, {SITE.address.country}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Clock className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm text-ink-400">
                {dict.contactPage.hours}
              </span>
              <span className="block font-semibold text-ink-900">
                {dict.home.hoursDays}, {dict.home.hoursTime}
              </span>
            </span>
          </div>

          <a
            href={SITE.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 transition-colors hover:border-brand-300"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <FacebookIcon className="size-5" />
            </span>
            <span>
              <span className="block text-sm text-ink-400">Facebook</span>
              <span className="block font-semibold text-ink-900">@shemofarm</span>
            </span>
          </a>

          {SITE.social.instagram && (
            <a
              href={SITE.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 transition-colors hover:border-brand-300"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <InstagramIcon className="size-5" />
              </span>
              <span>
                <span className="block text-sm text-ink-400">Instagram</span>
                <span className="block font-semibold text-ink-900">
                  @shemopharmshpk
                </span>
              </span>
            </a>
          )}
        </div>

        <div className="rounded-2xl border border-ink-900/8 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink-900">
            {dict.contactPage.formTitle}
          </h2>
          <p className="mt-1.5 mb-6 text-sm text-ink-500">{dict.contactPage.formSub}</p>
          <ContactForm dict={dict} />
        </div>
      </div>
    </div>
  );
}
