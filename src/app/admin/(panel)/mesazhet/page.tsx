import type { Metadata } from "next";
import { Mail, MailOpen, Phone } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { deleteMessageAction, markMessageReadAction } from "@/lib/admin-actions";

export const metadata: Metadata = { title: "Mesazhet" };

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

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminMessagesPage() {
  await requireAdmin();

  const messages = (await sql`
    SELECT id, name, company, email, phone, subject, message, is_read, created_at
    FROM contact_messages
    ORDER BY created_at DESC
    LIMIT 200
  `) as MessageRow[];

  const unread = messages.filter((m) => !m.is_read).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Mesazhet
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {messages.length} mesazhe · {unread} të palexuara
      </p>

      {messages.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink-900/12 bg-white px-4 py-10 text-center text-sm text-ink-400">
          Ende asnjë mesazh nga formulari i kontaktit.
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
                  {fmtDate(m.created_at)}
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

              <div className="mt-3 flex items-center gap-2 border-t border-ink-900/6 pt-3">
                <form action={markMessageReadAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="unread" value={m.is_read ? "1" : "0"} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    {m.is_read ? (
                      <>
                        <Mail className="size-3.5" aria-hidden />
                        Shëno si e palexuar
                      </>
                    ) : (
                      <>
                        <MailOpen className="size-3.5" aria-hidden />
                        Shëno si e lexuar
                      </>
                    )}
                  </button>
                </form>
                <form action={deleteMessageAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"
                  >
                    Fshij
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
