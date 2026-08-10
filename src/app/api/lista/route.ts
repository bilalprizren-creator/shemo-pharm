import { NextRequest, NextResponse } from "next/server";
import { canSeePrices, getSession } from "@/lib/auth";
import { getProductsByIds, toCardProducts } from "@/lib/catalog";
import { MINUTE_MS, rateLimited } from "@/lib/rate-limit";

/**
 * Resolves wishlist ids (kept in localStorage) into card data.
 * Prices are included only for approved sessions — checked server-side.
 */
export async function GET(request: NextRequest) {
  // The cart drawer and the wishlist page both call this, and each visit to
  // either is one request — so the ceiling is generous. It is here at all
  // because this is the one public route that answers with prices.
  if (await rateLimited("lista", { limit: 60, windowMs: MINUTE_MS })) {
    return NextResponse.json({ items: [] }, { status: 429 });
  }

  const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 200);

  if (ids.length === 0) return NextResponse.json({ items: [] });

  const session = await getSession();
  const showPrices = canSeePrices(session);

  // getProductsByIds answers in the order asked, which is the order things were
  // added to the wishlist — no sorting the whole catalog to find 200 rows.
  const found = await getProductsByIds(ids);

  return NextResponse.json(
    { items: await toCardProducts(found, showPrices) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
