import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CircleAlert, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResendVerification } from "@/components/account/ResendVerification";

interface Props {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ gjendja?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return { title: dict.verifyPage.title, robots: { index: false } };
}

/**
 * The outcome of clicking a verification link. Pure render — the state change
 * happened in /api/verifiko-email, which redirects here with ?gjendja=…
 */
export default async function VerificationPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const { gjendja } = await searchParams;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const v = dict.verifyPage;
  const session = await getSession();

  const state =
    gjendja === "ok" || gjendja === "tashme" || gjendja === "skaduar"
      ? gjendja
      : "gabim";
  const good = state === "ok" || state === "tashme";

  const { Icon, tone, title, text } = {
    ok: { Icon: BadgeCheck, tone: "brand", title: v.okTitle, text: v.okText },
    tashme: {
      Icon: BadgeCheck,
      tone: "brand",
      title: v.alreadyTitle,
      text: v.alreadyText,
    },
    skaduar: { Icon: Clock, tone: "amber", title: v.expiredTitle, text: v.expiredText },
    gabim: { Icon: CircleAlert, tone: "red", title: v.errorTitle, text: v.errorText },
  }[state];

  const toneClass =
    tone === "brand"
      ? "bg-brand-50 text-brand-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <AuthShell title={title} subtitle={text}>
      <div className="text-center">
        <span
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${toneClass}`}
        >
          <Icon className="size-7" strokeWidth={1.5} aria-hidden />
        </span>

        <Link
          href={langHref(dict.lang, session ? "/llogaria" : "/kycu")}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          {session ? v.toAccount : v.toLogin}
        </Link>

        {/* Only a logged-in visitor can ask for a new link: the action is what
            stops the endpoint from being used to probe which addresses exist. */}
        {!good && session && (
          <div className="flex justify-center">
            <ResendVerification dict={dict} />
          </div>
        )}
      </div>
    </AuthShell>
  );
}
