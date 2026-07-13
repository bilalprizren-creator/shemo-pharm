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

export const metadata: Metadata = {
  title: "Llogaria ime",
  robots: { index: false },
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/kycu");

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
            {session.name || "Llogaria ime"}
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
              <p className="font-semibold">Llogari e verifikuar</p>
              <p className="mt-0.5 text-sm">
                Çmimet me shumicë janë të dukshme për ju në të gjithë katalogun.
              </p>
            </div>
          </>
        ) : (
          <>
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-semibold">Llogaria në pritje të verifikimit</p>
              <p className="mt-0.5 text-sm">
                Ekipi i SHEMO PHARM do ta shqyrtojë regjistrimin tuaj. Pas
                verifikimit, çmimet me shumicë bëhen të dukshme automatikisht.
              </p>
            </div>
          </>
        )}
      </div>

      {user && (
        <dl className="mt-6 grid gap-4 rounded-2xl border border-ink-900/8 bg-white p-5 text-sm sm:grid-cols-2">
          {user.company && (
            <div>
              <dt className="text-ink-400">Kompania / Barnatorja</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{user.company}</dd>
            </div>
          )}
          {user.phone && (
            <div>
              <dt className="text-ink-400">Telefoni</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{user.phone}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-400">Anëtar që nga</dt>
            <dd className="mt-0.5 font-semibold text-ink-900">
              {new Date(user.createdAt).toLocaleDateString("sq-AL", {
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
          href="/produktet"
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <ShoppingBag className="size-4.5" aria-hidden />
          Shfleto produktet
        </Link>
        <Link
          href="/lista-e-deshirave"
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
        >
          <Heart className="size-4.5 text-brand-600" aria-hidden />
          Lista e dëshirave
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-red-300 hover:text-red-700"
          >
            <LogOut className="size-4.5" aria-hidden />
            Dilni
          </button>
        </form>
      </div>
    </div>
  );
}
