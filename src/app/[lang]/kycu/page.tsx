import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeReturnPath } from "@/lib/return-path";

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ kthehu?: string | string[] }>;
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

export default async function LoginPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  // Where the login link came from — a product page's "log in to see the
  // price". Checked here and again in loginAction; see safeReturnPath.
  const { kthehu } = await searchParams;
  const returnTo = safeReturnPath(Array.isArray(kthehu) ? kthehu[0] : kthehu);
  const session = await getSession();
  if (session) redirect(returnTo ?? langHref(dict.lang, "/llogaria"));

  return (
    <AuthShell title={dict.auth.loginHeading} subtitle={dict.auth.loginSub}>
      <LoginForm dict={dict} returnTo={returnTo} />
    </AuthShell>
  );
}
