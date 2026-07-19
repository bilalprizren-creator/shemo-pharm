import type { Metadata } from "next";
import { BadgeCheck, Clock } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  approveUserAction,
  rejectUserAction,
  revokeUserAction,
} from "@/lib/admin-actions";

export const metadata: Metadata = { title: "Kërkesat B2B" };

interface CustomerRow {
  id: number;
  email: string;
  name: string;
  company: string;
  phone: string;
  status: string;
  created_at: Date;
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminRequestsPage() {
  await requireAdmin();

  const customers = (await sql`
    SELECT id, email, name, company, phone, status, created_at
    FROM users WHERE role = 'customer'
    ORDER BY (status = 'pending') DESC, created_at DESC
  `) as CustomerRow[];

  const pending = customers.filter((c) => c.status === "pending");
  const approved = customers.filter((c) => c.status === "approved");

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
                  <p className="mt-0.5 text-xs text-ink-400">
                    Regjistruar: {fmtDate(c.created_at)}
                  </p>
                </div>
                <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
                  <form action={approveUserAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                    >
                      Aprovo
                    </button>
                  </form>
                  <form action={rejectUserAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                    >
                      Refuzo & fshij
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-900">
          <BadgeCheck className="size-4 text-brand-600" aria-hidden />
          Të aprovuar ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-ink-900/12 bg-white px-4 py-6 text-center text-sm text-ink-400">
            Ende asnjë klient i aprovuar.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-ink-900/8 bg-white">
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
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {fmtDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <form action={revokeUserAction} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-ink-900/10 px-3.5 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:border-amber-300 hover:text-amber-700"
                        >
                          Kthe në pritje
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
