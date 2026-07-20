import Link from "next/link";
import {
  ArrowRight,
  Inbox,
  Package,
  ShoppingBag,
  UserCheck,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

interface Stats {
  pending_users: number;
  approved_users: number;
  products: number;
  hidden_products: number;
  unread_messages: number;
  open_orders: number;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [stats] = (await sql`
    SELECT
      (SELECT count(*) FROM users WHERE role = 'customer' AND status = 'pending')::int  AS pending_users,
      (SELECT count(*) FROM users WHERE role = 'customer' AND status = 'approved')::int AS approved_users,
      (SELECT count(*) FROM products)::int                                              AS products,
      (SELECT count(*) FROM products WHERE hidden)::int                                 AS hidden_products,
      (SELECT count(*) FROM contact_messages WHERE NOT is_read)::int                    AS unread_messages,
      (SELECT count(*) FROM orders WHERE NOT is_handled)::int                           AS open_orders
  `) as Stats[];

  const cards = [
    {
      href: "/admin/porosite",
      label: "Porosi të hapura",
      value: stats.open_orders,
      hint: "nga shporta e uebfaqes",
      icon: ShoppingBag,
      highlight: stats.open_orders > 0,
    },
    {
      href: "/admin/kerkesat",
      label: "Kërkesa në pritje",
      value: stats.pending_users,
      hint: `${stats.approved_users} klientë të aprovuar`,
      icon: UserCheck,
      highlight: stats.pending_users > 0,
    },
    {
      href: "/admin/produktet",
      label: "Produkte",
      value: stats.products,
      hint: `${stats.hidden_products} të fshehura`,
      icon: Package,
      highlight: false,
    },
    {
      href: "/admin/mesazhet",
      label: "Mesazhe të palexuara",
      value: stats.unread_messages,
      hint: "nga formulari i kontaktit",
      icon: Inbox,
      highlight: stats.unread_messages > 0,
    },
  ] as const;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Paneli i administrimit
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Menaxhoni kërkesat e klientëve B2B, katalogun e produkteve dhe mesazhet.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`group rounded-2xl border bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${
              c.highlight ? "border-brand-300" : "border-ink-900/8"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex size-11 items-center justify-center rounded-xl ${
                  c.highlight ? "bg-brand-50 text-brand-700" : "bg-tint text-ink-500"
                }`}
              >
                <c.icon className="size-5.5" strokeWidth={1.7} aria-hidden />
              </span>
              <ArrowRight
                className="size-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600"
                aria-hidden
              />
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900">
              {c.value}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-ink-700">{c.label}</p>
            <p className="mt-0.5 text-xs text-ink-400">{c.hint}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-ink-900/8 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink-900">
          <Users className="size-4 text-brand-600" aria-hidden />
          Si funksionon aprovimi
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
          Bizneset regjistrohen vetë në faqe dhe fillimisht kanë status{" "}
          <strong className="text-ink-700">në pritje</strong> — nuk shohin çmime.
          Pasi verifikoni të dhënat e tyre te{" "}
          <Link href="/admin/kerkesat" className="font-semibold text-brand-700 hover:underline">
            Kërkesat B2B
          </Link>
          , aprovojini që t&apos;u shfaqen çmimet me shumicë.
        </p>
      </div>
    </div>
  );
}
