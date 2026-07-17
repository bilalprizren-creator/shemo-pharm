import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Heart,
  LogOut,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { findUser, getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

interface Props {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  return {
    title: dict.accountPage.title,
    robots: { index: false },
  };
}

export default async function AccountPage({ params }: Props) {
  const { lang } = await params;
  const dict = getDictionary(isLang(lang) ? (lang as Lang) : "sq");
  const session = await getSession();
  if (!session) redirect(langHref(dict.lang, "/kycu"));

  const user = findUser(session.email);
  const approved = session.status === "approved";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:py-16">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-50">
          <UserRound className="size-7 text-brand-700" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">
            {session.name || dict.accountPage.title}
          </h1>
          <p className="text-sm text-ink-500">{session.email}</p>
        </div>
      </div>

      <div
        className={`mt-6 flex items-start gap-3 rounded-2xl px-5 py-4 ${
          approved ? "bg-brand-50 text-brand-900" : "bg-amber-50 text-amber-900"
        }`}
      >
        {approved ? (
          <>
            <BadgeCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <div>
              <p className="font-semibold">{dict.accountPage.verifiedTitle}</p>
              <p className="mt-0.5 text-sm">{dict.accountPage.verifiedText}</p>
            </div>
          </>
        ) : (
          <>
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-semibold">{dict.accountPage.pendingTitle}</p>
              <p className="mt-0.5 text-sm">{dict.accountPage.pendingText}</p>
            </div>
          </>
        )}
      </div>

      {user && (
        <dl className="mt-6 grid gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 text-sm sm:grid-cols-2">
          {user.company && (
            <div>
              <dt className="text-ink-400">{dict.accountPage.company}</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{user.company}</dd>
            </div>
          )}
          {user.phone && (
            <div>
              <dt className="text-ink-400">{dict.accountPage.phone}</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{user.phone}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-400">{dict.accountPage.memberSince}</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {new Date(user.createdAt).toLocaleDateString(dict.accountPage.dateLocale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={langHref(dict.lang, "/produktet")}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <ShoppingBag className="size-4.5" aria-hidden />
          {dict.common.browseProducts}
        </Link>
        <Link
          href={langHref(dict.lang, "/lista-e-deshirave")}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          <Heart className="size-4.5 text-brand-600" aria-hidden />
          {dict.accountPage.wishlist}
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-red-300 hover:text-red-700"
          >
            <LogOut className="size-4.5" aria-hidden />
            {dict.accountPage.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
