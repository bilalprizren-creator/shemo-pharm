import type { Metadata } from "next";
import { CheckCircle2, Mail, MessageCircle, RotateCcw, User } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { deleteOrderAction, markOrderHandledAction } from "@/lib/admin-actions";

export const metadata: Metadata = { title: "Porositë" };

interface OrderItem {
  id: number;
  name: string;
  sku: string;
  qty: number;
  priceCents: number;
}

interface OrderRow {
  id: number;
  customer_name: string;
  customer_email: string;
  channel: "whatsapp" | "email";
  items: OrderItem[];
  items_count: number;
  total_cents: number;
  is_handled: boolean;
  created_at: Date;
}

function fmtDate(d: Date): string {
  return new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminOrdersPage() {
  await requireAdmin();

  const orders = (await sql`
    SELECT id, customer_name, customer_email, channel, items, items_count,
           total_cents, is_handled, created_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 200
  `) as OrderRow[];

  const open = orders.filter((o) => !o.is_handled).length;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
        Porositë
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {orders.length} porosi · {open} të hapura — regjistrohen kur klienti
        hap WhatsApp-in ose email-in nga shporta. Vetë mesazhi ju arrin në
        WhatsApp / email si zakonisht.
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-ink-900/12 bg-white px-4 py-10 text-center text-sm text-ink-400">
          Ende asnjë porosi nga shporta.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className={`rounded-2xl border bg-white p-4 shadow-card ${
                o.is_handled ? "border-ink-900/8" : "border-brand-300"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-ink-900">
                    {!o.is_handled && (
                      <span
                        className="inline-block size-2 shrink-0 rounded-full bg-brand-500"
                        aria-label="E hapur"
                      />
                    )}
                    Porosi #{o.id} — {o.items_count}{" "}
                    {o.items_count === 1 ? "produkt" : "produkte"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-4" aria-hidden />
                      {o.customer_name || "Anonim (identiteti në WhatsApp/email)"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {o.channel === "whatsapp" ? (
                        <>
                          <MessageCircle className="size-4 text-accent-600" aria-hidden />
                          WhatsApp
                        </>
                      ) : (
                        <>
                          <Mail className="size-4 text-brand-600" aria-hidden />
                          Email
                        </>
                      )}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-ink-400">
                  {fmtDate(o.created_at)}
                </span>
              </div>

              <table className="mt-3 w-full text-sm">
                <tbody className="divide-y divide-ink-900/6">
                  {o.items.map((it, i) => (
                    <tr key={`${o.id}-${i}`}>
                      <td className="py-1.5 pr-2 text-ink-700">
                        {it.name}
                        {/* Catalog names usually end in "(SKU)" already. */}
                        {it.sku && !it.name.includes(`(${it.sku})`) && (
                          <span className="ml-1.5 text-xs text-ink-400">
                            ({it.sku})
                          </span>
                        )}
                      </td>
                      <td className="w-20 py-1.5 pr-2 text-right font-semibold text-ink-900">
                        {it.qty} copë
                      </td>
                      <td className="w-24 py-1.5 text-right text-ink-500">
                        {formatPrice(it.priceCents * it.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-2 flex items-center justify-between border-t border-ink-900/6 pt-2 text-sm">
                <span className="text-ink-500">Totali (çmimet e katalogut)</span>
                <span className="font-extrabold text-ink-900">
                  {formatPrice(o.total_cents)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-900/6 pt-3">
                {o.customer_email && (
                  <a
                    href={`mailto:${o.customer_email}?subject=${encodeURIComponent(
                      `Porosia juaj #${o.id} — SHEMO PHARM`
                    )}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:border-brand-300"
                  >
                    <Mail className="size-3.5" aria-hidden />
                    {o.customer_email}
                  </a>
                )}
                <form action={markOrderHandledAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="unhandled" value={o.is_handled ? "1" : "0"} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                  >
                    {o.is_handled ? (
                      <>
                        <RotateCcw className="size-3.5" aria-hidden />
                        Rihap
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        Shëno si të kryer
                      </>
                    )}
                  </button>
                </form>
                <form action={deleteOrderAction}>
                  <input type="hidden" name="id" value={o.id} />
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
