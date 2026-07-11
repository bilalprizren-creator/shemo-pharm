import Image from "next/image";
import Link from "next/link";
import { Lock, Package } from "lucide-react";
import type { CardProduct } from "@/lib/types";
import { WishlistButton } from "./WishlistButton";

/**
 * Product card used in grids and carousels. Works as a server component —
 * only the wishlist heart hydrates on the client. The whole card is one
 * link (stretched overlay) so nested interactive elements stay valid.
 */
export function ProductCard({ product }: { product: CardProduct }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/8 bg-white transition-shadow duration-200 hover:shadow-card-hover">
      <div className="relative aspect-square w-full bg-white">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 280px"
            className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden>
            <Package className="size-12 text-ink-300" strokeWidth={1.25} />
          </div>
        )}
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute right-3 top-3 z-10"
        />
        {!product.inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink-900/80 px-2.5 py-1 text-[11px] font-medium text-white">
            Pa stok
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-ink-900/6 p-4">
        {product.categoryName && (
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-ink-400">
            {product.categoryName}
          </p>
        )}
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink-900">
          <Link
            href={`/produktet/${product.slug}`}
            className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {product.sku && (
          <p className="text-xs text-ink-400">Kodi: {product.sku}</p>
        )}
        <div className="mt-auto pt-2">
          {product.price ? (
            <p className="text-base font-bold text-brand-800">{product.price}</p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-accent-700">
              <Lock className="size-3.5" aria-hidden />
              Kyçu për të parë çmimin
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
