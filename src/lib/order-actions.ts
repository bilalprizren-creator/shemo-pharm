"use server";

import { z } from "zod";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";

/**
 * Logs a cart order into the `orders` table the moment the customer opens
 * WhatsApp or their mail client, so every order attempt shows up in
 * /admin/porosite — the WhatsApp/email message itself never touches the
 * server, it goes straight from the customer's phone to the business.
 *
 * Fire-and-forget from the client: failures must never block the customer
 * from placing the order through the external channel.
 */

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
}): Promise<void> {
  // Guests may order (prices stay hidden), so the action cannot require a
  // session — the limit keeps a script from filling /admin/porosite with noise.
  if (await rateLimited("order", { limit: 10, windowMs: TEN_MINUTES_MS })) return;

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return;
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
  if (products.length === 0) return;

  const byId = new Map(products.map((p) => [p.id, p]));
  const items = lines.flatMap((l) => {
    const p = byId.get(l.id);
    return p
      ? [{ id: p.id, name: p.name, sku: p.sku, qty: l.qty, priceCents: p.price_cents }]
      : [];
  });
  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.qty, 0);

  const session = await getSession();

  await sql`
    INSERT INTO orders (customer_name, customer_email, channel, items, items_count, total_cents)
    VALUES (${session?.name || ""}, ${session?.email || ""}, ${channel},
            ${JSON.stringify(items)}::jsonb, ${items.length}, ${totalCents})
  `;
}
