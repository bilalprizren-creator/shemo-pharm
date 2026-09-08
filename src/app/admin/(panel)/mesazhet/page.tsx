import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MailOpen, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import {
  deleteMessageAction,
  markAllMessagesReadAction,
  markMessageReadAction,
} from "@/lib/admin-actions";
import { AdminAction } from "@/components/admin/AdminAction";
import { AdminPager } from "@/components/admin/AdminPager";

export const metadata: Metadata = { title: "Mesazhet" };

/** Enough to scan a morning's post without scrolling past it. */
const PER_PAGE = 40;

interface MessageRow {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ faqja?: string; e?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const unreadOnly = sp.e === "palexuara";
  const page = Math.max(1, Math.floor(Number(sp.faqja)) || 1);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.set("e", "palexuara");
    if (p > 1) params.set("faqja", String(p));
    const qs = params.toString();
    return `/admin/mesazhet${qs ? `?${qs}` : ""}`;
  };

  /**
   * Counted, not measured off the page.
   *
   * The list was capped at 200 rows and then labelled with `messages.length` —
   * so past two hundred the page said "200 mesazhe" forever and the oldest were
   * unreachable from the panel at all. The form that writes this table needs no
   * login, so it will pass two hundred.
   */
  const [counts] = (await sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE is_read = false)::int AS unread
    FROM contact_messages
  `) as { total: number; unread: number }[];
  const total = counts?.total ?? 0;
  const unread = counts?.unread ?? 0;
  const shown = unreadOnly ? unread : total;
  const totalPages = Math.max(1, Math.ceil(shown / PER_PAGE));
  const current = Math.min(page, totalPages);

  const messages = (await sql`
    SELECT id, name, company, email, phone, subject, message, is_read, created_at
    FROM contact_messages
    WHERE ${unreadOnly} = false OR is_read = false
    ORDER BY created_at DESC
    LIMIT ${PER_PAGE} OFFSET ${(current - 1) * PER_PAGE}
  `) as MessageRow[];

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Mesazhet
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {total} mesazhe · {unread} të palexuara
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* The one filter an inbox is actually used through. */}
        <Link
          href={unreadOnly ? "/admin/mesazhet" : "/admin/mesazhet?e=palexuara"}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            unreadOnly
              ? "border-brand-500 bg-brand-50 text-brand-800"
              : "border-ink-900/10 bg-white text-ink-600 hover:border-brand-300"
          }`}
        >
          {unreadOnly ? "Të gjitha" : "Vetëm të palexuara"}
        </Link>
        {unread > 0 && (
          <AdminAction
            action={markAllMessagesReadAction}
            fields={{}}
            label="Shëno të gjitha si të lexuara"
            className="rounded-full border border-ink-900/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
          />
        )}
      </div>

      {messages.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink-900/12 bg-white px-4 py-10 text-center text-sm text-ink-400">
          {unreadOnly
            ? "Asnjë mesazh i palexuar."
            : "Ende asnjë mesazh nga formulari i kontaktit."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl border bg-white p-4 shadow-card ${
                m.is_read ? "border-ink-900/8" : "border-brand-300"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-ink-900">
                    {!m.is_read && (
                      <span
                        className="inline-block size-2 shrink-0 rounded-full bg-brand-500"
                        aria-label="E palexuar"
                      />
                    )}
                    {m.subject}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-500">
                    {m.name}
                    {m.company && ` — ${m.company}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-400">
                  {formatDateTime(m.created_at)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {m.message}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <a
                  href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}
                  className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
                >
                  <Mail className="size-4" aria-hidden />
                  {m.email}
                </a>
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    className="inline-flex items-center gap-1.5 font-medium text-ink-600 hover:text-brand-700"
                  >
                    <Phone className="size-4" aria-hidden />
                    {m.phone}
                  </a>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-start gap-2 border-t border-ink-900/6 pt-3">
                <AdminAction
                  action={markMessageReadAction}
                  fields={{ id: m.id, unread: m.is_read ? "1" : "0" }}
                  icon={
                    m.is_read ? (
                      <Mail className="size-3.5" aria-hidden />
                    ) : (
                      <MailOpen className="size-3.5" aria-hidden />
                    )
                  }
                  label={m.is_read ? "Shëno si e palexuar" : "Shëno si e lexuar"}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                />
                <AdminAction
                  action={deleteMessageAction}
                  fields={{ id: m.id }}
                  label="Fshij"
                  confirmLabel="Po, fshije"
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                  confirmClassName="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminPager page={current} totalPages={totalPages} hrefFor={pageHref} />
    </div>
  );
}
