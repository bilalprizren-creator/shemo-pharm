import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.auth.registerTitle,
    description: dict.auth.registerMetaDescription,
    robots: { index: false },
  };
}

export default async function RegisterPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const session = await getSession();
  if (session) redirect(langHref(dict.lang, "/llogaria"));

  return (
    <AuthShell title={dict.auth.registerHeading} subtitle={dict.auth.registerSub}>
      <RegisterForm dict={dict} />
    </AuthShell>
  );
}
