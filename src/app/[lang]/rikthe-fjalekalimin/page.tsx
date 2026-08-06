import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert, Clock } from "lucide-react";
import { getSession, readResetToken } from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.auth.forgotTitle,
    description: dict.auth.forgotMetaDescription,
    // Never indexed: the page is a login-adjacent form, and with ?token it is
    // a bearer credential that must not end up in a search index.
    robots: { index: false, follow: false },
  };
}

/**
 * One route, two states.
 *
 * Without ?token it asks which address should receive a link. With one it
 * checks the link and, if it holds, shows the new-password form. A dead link
 * falls back to the request form on the same page rather than a dead end —
 * the thing a customer with an expired link wants is a fresh one.
 */
export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { token } = await searchParams;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");

  // Somebody already signed in has no use for this page and can change nothing
  // here they could not change while signed in.
  if (!token && (await getSession())) {
    redirect(langHref(dict.lang, "/llogaria"));
  }

  if (!token) {
    return (
      <AuthShell title={dict.auth.forgotHeading} subtitle={dict.auth.forgotSub}>
        <ForgotPasswordForm dict={dict} />
      </AuthShell>
    );
  }

  const checked = await readResetToken(token);

  if (checked.ok) {
    return (
      <AuthShell
        title={dict.auth.newPasswordHeading}
        subtitle={dict.auth.forgotSub.replace(/\.$/, "")}
      >
        <ResetPasswordForm dict={dict} token={token} email={checked.email} />
      </AuthShell>
    );
  }

  const { Icon, tone, text } = {
    expired: { Icon: Clock, tone: "amber", text: dict.auth.linkExpiredText },
    used: { Icon: Clock, tone: "amber", text: dict.auth.linkUsedText },
    invalid: { Icon: CircleAlert, tone: "red", text: dict.auth.linkInvalidText },
  }[checked.reason];

  return (
    <AuthShell title={dict.auth.linkDeadHeading} subtitle={text}>
      <div className="mb-6 flex justify-center">
        <span
          className={`flex size-14 items-center justify-center rounded-full ${
            tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
          }`}
        >
          <Icon className="size-7" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
      <ForgotPasswordForm dict={dict} />
    </AuthShell>
  );
}
