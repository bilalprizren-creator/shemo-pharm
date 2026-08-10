import { NextRequest, NextResponse } from "next/server";
import { getProducts, primaryCategory, categoryDisplayName } from "@/lib/catalog";
import { MINUTE_MS, rateLimited } from "@/lib/rate-limit";
import type { PublicProduct } from "@/lib/types";

/**
 * Instant-search suggestions for the header search bar.
 * Returns only public fields — never prices.
 */
export async function GET(request: NextRequest) {
  // Every call loads the catalog, so the endpoint gets a ceiling well above
  // what a fast typist reaches (the search bar debounces by 250 ms).
  if (await rateLimited("search", { limit: 60, windowMs: MINUTE_MS })) {
    return NextResponse.json({ items: [], total: 0 }, { status: 429 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }
  // Suggestions carry no price and no session-dependent field (PublicProduct),
  // so the same answer serves every visitor and the CDN can hold it. A minute
  // is short next to how often the catalog changes, and the stale window means
  // a popular query is never waiting on a function.
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
  const { items, total } = await getProducts({ query: q, perPage: 8 });
  const results: PublicProduct[] = await Promise.all(
    items.map(async (p) => {
      const cat = await primaryCategory(p);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        image: p.images[0] ?? null,
        categoryName: cat ? categoryDisplayName(cat) : null,
        inStock: p.inStock,
      };
    })
  );
  return NextResponse.json({ items: results, total }, { headers: cacheHeaders });
}
