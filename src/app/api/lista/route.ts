import { NextRequest, NextResponse } from "next/server";
import { canSeePrices, getSession } from "@/lib/auth";
import { getProducts, toCardProducts } from "@/lib/catalog";

/**
 * Resolves wishlist ids (kept in localStorage) into card data.
 * Prices are included only for approved sessions — checked server-side.
 */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);

  if (ids.length === 0) return NextResponse.json({ items: [] });

  const session = await getSession();
  const showPrices = canSeePrices(session);

  const wanted = new Set(ids);
  const { items } = await getProducts({ perPage: 3000 });
  const found = items.filter((p) => wanted.has(p.id));
  // Preserve the order items were added to the wishlist
  found.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

  return NextResponse.json(
    { items: await toCardProducts(found, showPrices) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
