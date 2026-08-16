import type { Metadata } from "next";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { LegalPage } from "@/components/legal/LegalPage";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.legal.terms.title,
    description: dict.legal.terms.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/kushtet"),
      languages: { sq: "/kushtet", en: "/en/kushtet" },
    },
  };
}

export default async function TermsPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return (
    <LegalPage
      title={dict.legal.terms.title}
      intro={dict.legal.terms.intro}
      sections={dict.legal.terms.sections}
      dict={dict}
    />
  );
}
