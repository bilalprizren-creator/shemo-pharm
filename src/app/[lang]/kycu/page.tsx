import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.auth.loginTitle,
    description: dict.auth.loginMetaDescription,
    robots: { index: false },
  };
}

export default async function LoginPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const session = await getSession();
  if (session) redirect(langHref(dict.lang, "/llogaria"));

  return (
    <AuthShell title={dict.auth.loginHeading} subtitle={dict.auth.loginSub}>
      <LoginForm dict={dict} />
    </AuthShell>
  );
}
