"use server";

import { after } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";
import { adminNotificationAddress, sendMail, siteOrigin } from "@/lib/mail";
import { newOrderMessage } from "@/lib/mail-templates";

/**
 * Logs a cart order into the `orders` table the moment the customer opens
 * WhatsApp or their mail client, so every order attempt shows up in
 * /admin/porosite — the WhatsApp/email message itself never touches the
 * server, it goes straight from the customer's phone to the business.
 *
 * It also mails the business a copy. That is not belt and braces: the mail
 * channel puts the entire order in a `mailto:` query string, which Outlook
 * truncates around 2 000 characters and the Windows shell caps at ~2 048, so a
 * forty-line wholesale order is sent short with nothing to say so. The copy is
 * sent after the response, so a slow mail provider cannot delay the customer.
 *
 * Called from the client, which does not wait on the result before opening the
 * external app — but it does read it, because an order that was silently not
 * recorded used to be reported to the customer as sent.
 */

/** Why the caller may need to say something other than "sent". */
export type OrderLogResult =
  | "logged"
  /** The bucket is full — the order was not recorded. */
  | "rate-limited"
  /** Malformed input, or not one product in the basket still exists. */
  | "rejected"
  /** Thrown before or during the write. */
  | "failed"
  /** This exact basket was already logged on this channel. */
  | "duplicate";

const orderSchema = z.object({
  channel: z.enum(["whatsapp", "email"]),
  lines: z
    .array(
      z.object({
        id: z.number().int().positive(),
        qty: z.number().int().min(1).max(999),
      })
    )
    .min(1)
    .max(100),
});

export async function logOrderAction(input: {
  channel: "whatsapp" | "email";
  lines: { id: number; qty: number }[];
}): Promise<OrderLogResult> {
  // Guests may order (prices stay hidden), so the action cannot require a
  // session — the limit keeps a script from filling /admin/porosite with noise.
  if (await rateLimited("order", { limit: 10, windowMs: TEN_MINUTES_MS })) {
    return "rate-limited";
  }

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return "rejected";
  const { channel, lines } = parsed.data;

  // Resolve names/prices server-side — client input is ids and counts only.
  //
  // `hidden = false` matches every other product read (catalog.ts). Without it an
  // id guessed by hand put a withdrawn product's name and price into an order row
  // that the panel then displays as though somebody had ordered it.
  const ids = lines.map((l) => l.id);
  const products = (await sql`
    SELECT id, name, sku, price_cents FROM products
    WHERE id = ANY(${ids}) AND hidden = false
  `) as { id: number; name: string; sku: string; price_cents: number }[];
  if (products.length === 0) return "rejected";

  const byId = new Map(products.map((p) => [p.id, p]));
  const items = lines.flatMap((l) => {
    const p = byId.get(l.id);
    return p
      ? [{ id: p.id, name: p.name, sku: p.sku, qty: l.qty, priceCents: p.price_cents }]
      : [];
  });
  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);

  const session = await getSession();

  const rows = (await sql`
    INSERT INTO orders (customer_name, customer_email, channel, items, items_count, total_cents)
    VALUES (${session?.name || ""}, ${session?.email || ""}, ${channel},
            ${JSON.stringify(items)}::jsonb, ${items.length}, ${totalCents})
    RETURNING id
  `) as { id: number }[];
  const id = rows[0]?.id;
  if (id === undefined) return "failed";

  // After the response: the customer's WhatsApp or mail client is opening in
  // the same moment, and nothing about it should wait on Resend.
  after(async () => {
    try {
      await sendMail(
        newOrderMessage({
          order: {
            id,
            channel,
            customerName: session?.name ?? "",
            customerEmail: session?.email ?? "",
            items: items.map((i) => ({ name: i.name, sku: i.sku, qty: i.qty })),
            // A guest sees no prices; putting a total in their order copy would
            // be the one place the site quotes one to somebody unapproved. The
            // business reads the row in /admin/porosite either way.
            totalCents: session ? totalCents : null,
          },
          to: adminNotificationAddress(),
          adminUrl: `${siteOrigin()}/admin/porosite`,
        })
      );
    } catch (err) {
      console.error("[order] could not send the order copy:", err);
    }
  });

  return "logged";
}
