import { NextRequest, NextResponse } from "next/server";
import { getProducts, primaryCategory, categoryDisplayName } from "@/lib/catalog";
import type { PublicProduct } from "@/lib/types";

/**
 * Instant-search suggestions for the header search bar.
 * Returns only public fields — never prices.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }
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
  return NextResponse.json({ items: results, total });
}
