import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, MailCheck, MailWarning } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AdminAction } from "@/components/admin/AdminAction";
import { AdminPager } from "@/components/admin/AdminPager";
import {
  approveUserAction,
  rejectUserAction,
  revokeUserAction,
} from "@/lib/admin-actions";

export const metadata: Metadata = { title: "Kërkesat B2B" };

/** Approved customers per page. The waiting list is never long enough to need one. */
const PER_PAGE = 50;

interface CustomerRow {
  id: number;
  email: string;
  name: string;
  company: string;
  phone: string;
  status: string;
  created_at: Date;
  email_verified_at: Date | null;
}

/** Whether the customer proved the mailbox. Separate from the approval below:
 *  this says the address is real, approval says the business is a partner. */
function EmailBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800">
      <MailCheck className="size-3" aria-hidden />
      Email i verifikuar
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
      <MailWarning className="size-3" aria-hidden />
      Email i paverifikuar
    </span>
  );
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ faqja?: string; kerko?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const query = sp.kerko?.trim() ?? "";
  const page = Math.max(1, Math.floor(Number(sp.faqja)) || 1);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("kerko", query);
    if (p > 1) params.set("faqja", String(p));
    const qs = params.toString();
    return `/admin/kerkesat${qs ? `?${qs}` : ""}`;
  };

  /**
   * The waiting list is read whole, the approved list is paged.
   *
   * Two queries rather than one, because the two halves of this page have
   * nothing in common but a table: a pending request is something to act on
   * today and there are never many, while the approved list is every customer
   * the business has ever taken on and grows forever. It used to be one
   * unbounded SELECT rendered in full, which was fine at the size it is and
   * linear in the customer count from here on.
   */
  const pending = (await sql`
    SELECT id, email, name, company, phone, status, created_at, email_verified_at
    FROM users WHERE role = 'customer' AND status = 'pending'
    ORDER BY created_at DESC
  `) as CustomerRow[];

  // ILIKE on name, company and email — what somebody looking for one pharmacy
  // in a list of hundreds actually types. The two LIKE wildcards are stripped
  // rather than escaped: nobody searches a pharmacy by "%", and a stray one
  // typed into the box would otherwise match every customer on the list.
  const like = `%${query.replace(/[%_]/g, " ")}%`;
  const [counted] = (await sql`
    SELECT count(*)::int AS total FROM users
    WHERE role = 'customer' AND status = 'approved'
      AND (${query} = '' OR name ILIKE ${like} OR company ILIKE ${like} OR email ILIKE ${like})
  `) as { total: number }[];
  const total = counted?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = Math.min(page, totalPages);

  const approved = (await sql`
    SELECT id, email, name, company, phone, status, created_at, email_verified_at
    FROM users WHERE role = 'customer' AND status = 'approved'
      AND (${query} = '' OR name ILIKE ${like} OR company ILIKE ${like} OR email ILIKE ${like})
    ORDER BY created_at DESC
    LIMIT ${PER_PAGE} OFFSET ${(current - 1) * PER_PAGE}
  `) as CustomerRow[];

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Kërkesat B2B
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Aprovoni llogaritë e bizneseve që të shohin çmimet me shumicë.
      </p>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-900">
          <Clock className="size-4 text-amber-600" aria-hidden />
          Në pritje ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-ink-900/12 bg-white px-4 py-6 text-center text-sm text-ink-400">
            Asnjë kërkesë në pritje.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((c) => (
              <li
                key={c.id}
                className="rounded-2xl border border-amber-200 bg-white p-4 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900">
                    {c.name}
                    {c.company && (
                      <span className="font-normal text-ink-500"> — {c.company}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink-500">
                    {c.email}
                    {c.phone && ` · ${c.phone}`}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                    <EmailBadge verified={c.email_verified_at !== null} />
                    Regjistruar: {formatDateTime(c.created_at)}
                  </p>
                </div>
                <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
                  <AdminAction
                    action={approveUserAction}
                    fields={{ id: c.id }}
                    label="Aprovo"
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  />
                  {/* Asks first: this deletes the account outright, and used to
                      do it on one press — while deleting a *product* asked
                      twice and put itself behind a "danger zone" heading. */}
                  <AdminAction
                    action={rejectUserAction}
                    fields={{ id: c.id }}
                    label="Refuzo &amp; fshij"
                    confirmLabel="Po, fshije llogarinë"
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                    confirmClassName="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-900">
          <BadgeCheck className="size-4 text-brand-600" aria-hidden />
          Të aprovuar ({total})
        </h2>

        {/* A plain GET form, like the catalogue's: no JavaScript needed, and
            the search survives the back button because it is in the URL. */}
        <form action="/admin/kerkesat" className="mt-3 flex max-w-md items-center gap-2">
          <input
            type="search"
            name="kerko"
            defaultValue={query}
            placeholder="Kërko sipas emrit, kompanisë ose email-it"
            aria-label="Kërko klientët e aprovuar"
            className="h-10 min-w-0 flex-1 rounded-lg border border-ink-900/10 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
          <button
            type="submit"
            className="h-10 shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Kërko
          </button>
          {query && (
            <Link
              href="/admin/kerkesat"
              className="shrink-0 text-sm font-semibold text-ink-500 hover:text-brand-700"
            >
              Pastro
            </Link>
          )}
        </form>

        {approved.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-ink-900/12 bg-white px-4 py-6 text-center text-sm text-ink-400">
            {query ? "Asnjë klient nuk përputhet me kërkimin." : "Ende asnjë klient i aprovuar."}
          </p>
        ) : (
          <>
          {/* Cards on a phone, the table from `sm` up — approving and revoking
              is done from a phone, and the five-column table put the only
              button on it 640px to the right of the name. The pending list
              above has always been cards, so this is the two halves of the
              page agreeing with each other. */}
          <ul className="mt-3 divide-y divide-ink-900/6 overflow-hidden rounded-2xl border border-ink-900/8 bg-white sm:hidden">
            {approved.map((c) => (
              <li key={c.id} className="p-4">
                <p className="font-semibold text-ink-900">
                  {c.name}
                  {c.company && (
                    <span className="font-normal text-ink-500"> — {c.company}</span>
                  )}
                </p>
                <p className="mt-0.5 break-all text-sm text-ink-500">{c.email}</p>
                {c.phone && <p className="text-sm text-ink-500">{c.phone}</p>}
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                  <EmailBadge verified={c.email_verified_at !== null} />
                  Regjistruar: {formatDateTime(c.created_at)}
                </p>
                <div className="mt-3">
                  <AdminAction
                    action={revokeUserAction}
                    fields={{ id: c.id }}
                    label="Kthe në pritje"
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3.5 py-2 text-xs font-semibold text-ink-500 transition-colors hover:border-amber-300 hover:text-amber-700"
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 hidden overflow-x-auto rounded-2xl border border-ink-900/8 bg-white sm:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-900/8 text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3 font-semibold">Emri</th>
                  <th className="px-4 py-3 font-semibold">Kompania</th>
                  <th className="px-4 py-3 font-semibold">Kontakti</th>
                  <th className="px-4 py-3 font-semibold">Regjistruar</th>
                  <th className="px-4 py-3 font-semibold text-right">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((c) => (
                  <tr key={c.id} className="border-b border-ink-900/4 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">{c.name}</td>
                    <td className="px-4 py-3 text-ink-500">{c.company || "—"}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {c.email}
                      {c.phone && (
                        <span className="block text-xs text-ink-400">{c.phone}</span>
                      )}
                      <span className="mt-1 block">
                        <EmailBadge verified={c.email_verified_at !== null} />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {formatDateTime(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-col items-end">
                        <AdminAction
                          action={revokeUserAction}
                          fields={{ id: c.id }}
                          label="Kthe në pritje"
                          className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3.5 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:border-amber-300 hover:text-amber-700"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}

        <AdminPager
          page={current}
          totalPages={totalPages}
          hrefFor={pageHref}
          label="Faqet e klientëve"
        />
      </section>
    </div>
  );
}
