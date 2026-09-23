import { NextRequest, NextResponse } from "next/server";
import {
  categoryDisplayName,
  getProducts,
  primaryCategory,
  productDisplayName,
  productImage,
} from "@/lib/catalog";
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
  // so the same answer serves every visitor and the CDN can hold it. The
  // window is short on purpose: it used to be a minute plus five of
  // stale-while-revalidate, and an editor who had just switched a product on
  // in /admin typed its name here and got the answer from before the switch —
  // the listing at /produktet already showed the product, the box under the
  // search field did not, for up to six minutes. The catalog behind this
  // handler comes out of the data cache (catalog.ts), not from Neon, so a
  // cache miss costs a function invocation and no database round trip; a
  // minute of staleness at most is the same ceiling loadCatalog() sets.
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
  };
  const { items, total } = await getProducts({ query: q, perPage: 8 });
  const results: PublicProduct[] = await Promise.all(
    items.map(async (p) => {
      const cat = await primaryCategory(p);
      return {
        id: p.id,
        // What every card shows: the name without the article code the raw
        // name repeats, sizes written one way, and the admin's photo override
        // where there is one.
        name: productDisplayName(p),
        slug: p.slug,
        sku: p.sku,
        image: productImage(p),
        categoryName: cat ? categoryDisplayName(cat) : null,
        inStock: p.inStock,
      };
    })
  );
  return NextResponse.json({ items: results, total }, { headers: cacheHeaders });
}
