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
    title: dict.legal.privacy.title,
    description: dict.legal.privacy.metaDescription,
    alternates: {
      canonical: langHref(dict.lang, "/privatesia"),
      languages: { sq: "/privatesia", en: "/en/privatesia" },
    },
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return (
    <LegalPage
      title={dict.legal.privacy.title}
      intro={dict.legal.privacy.intro}
      sections={dict.legal.privacy.sections}
      dict={dict}
    />
  );
}
