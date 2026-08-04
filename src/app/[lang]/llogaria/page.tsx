import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  Heart,
  LogOut,
  MailWarning,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { canSeePrices, findUser, getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/auth-actions";
import { sql } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { fmt, isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";
import { ResendVerification } from "@/components/account/ResendVerification";
import { ReorderButton } from "@/components/account/ReorderButton";

interface OrderRow {
  id: number;
  channel: string;
  items: { id: number; name: string; qty: number }[];
  items_count: number;
  total_cents: number;
  created_at: Date;
}

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

  const user = await findUser(session.email);
  const approved = user?.status === "approved";
  const emailVerified = user ? user.emailVerifiedAt !== null : true;
  const showPrices = canSeePrices(session);

  // Orders the customer sent while logged in (guest orders carry no address).
  const orders = (await sql`
    SELECT id, channel, items, items_count, total_cents, created_at
    FROM orders WHERE customer_email = ${session.email}
    ORDER BY created_at DESC LIMIT 10
  `) as OrderRow[];

  // A product can have been hidden or deleted since the order was logged —
  // drop those ids before they reach the reorder button.
  const orderedIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.id)))];
  const live = new Set(
    orderedIds.length === 0
      ? []
      : (
          (await sql`
            SELECT id FROM products WHERE id = ANY(${orderedIds}) AND hidden = false
          `) as { id: number }[]
        ).map((r) => r.id)
  );

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

      {/* Two separate gates, two separate lines: a confirmed mailbox is not
          the same thing as an approved account, and conflating them is how a
          customer ends up thinking one is the other. */}
      {!emailVerified && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-amber-900">
          <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="font-semibold">{dict.accountPage.emailUnverifiedTitle}</p>
            <p className="mt-0.5 text-sm">
              {fmt(dict.accountPage.emailUnverifiedText, { email: session.email })}
            </p>
            <ResendVerification dict={dict} />
          </div>
        </div>
      )}

      <div
        className={`mt-4 flex items-start gap-3 rounded-2xl px-5 py-4 ${
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

      {orders.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold text-ink-900">
            {dict.accountPage.ordersTitle}
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">{dict.accountPage.ordersSub}</p>

          <ul className="mt-4 space-y-3">
            {orders.map((o) => {
              const lines = o.items
                .filter((i) => live.has(i.id))
                .map((i) => ({ id: i.id, qty: i.qty }));
              return (
                <li
                  key={o.id}
                  className="rounded-2xl border border-ink-900/8 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">
                      {new Date(o.created_at).toLocaleDateString(
                        dict.accountPage.dateLocale,
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                      <span className="ml-2 font-normal text-ink-400">
                        {o.channel === "whatsapp"
                          ? dict.accountPage.orderChannelWhatsapp
                          : dict.accountPage.orderChannelEmail}
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">
                      {o.items.map((i) => i.name).join(", ")}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {fmt(dict.accountPage.ordersItems, { n: o.items_count })}
                      {showPrices && o.total_cents > 0 && (
                        <span className="ml-2 font-semibold text-brand-800">
                          {formatPrice(o.total_cents)}
                        </span>
                      )}
                    </p>
                  </div>
                  {lines.length > 0 && (
                    <div className="mt-3 sm:mt-0">
                      <ReorderButton lines={lines} label={dict.accountPage.reorder} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
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
