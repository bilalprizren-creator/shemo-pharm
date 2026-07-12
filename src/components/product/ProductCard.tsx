import Image from "next/image";
import Link from "next/link";
import { Lock, Package } from "lucide-react";
import type { CardProduct } from "@/lib/types";
import { WishlistButton } from "./WishlistButton";
import { AddToCartIconButton } from "@/components/cart/AddToCartButton";

/**
 * Product card used in grids and carousels. Works as a server component —
 * only the wishlist heart and cart button hydrate on the client. The whole
 * card is one link (stretched overlay); interactive controls sit above it.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: CardProduct;
  /** Eager-load the image when the card is above the fold. */
  priority?: boolean;
}) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-ink-900/8 bg-white transition-shadow duration-200 hover:shadow-card-hover">
      <div className="relative aspect-square w-full bg-white">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 280px"
            priority={priority}
            className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden>
            <Package className="size-12 text-ink-300" strokeWidth={1.25} />
          </div>
        )}
        {product.discountPct !== null && (
          <span className="absolute left-3 top-3 rounded-md bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
            -{product.discountPct}%
          </span>
        )}
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute right-3 top-3 z-10"
        />
        {!product.inStock && (
          <span className="absolute bottom-3 left-3 rounded-md bg-ink-900/80 px-2.5 py-1 text-[11px] font-medium text-white">
            Pa stok
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 border-t border-ink-900/6 p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-ink-900">
          <Link
            href={`/produktet/${product.slug}`}
            className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none"
          >
            {product.name}
          </Link>
        </h3>
        {product.categoryName && (
          <p className="truncate text-xs font-medium text-brand-600">
            {product.categoryName}
          </p>
        )}
        {product.sku && <p className="text-xs text-ink-400">Kodi: {product.sku}</p>}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {product.price ? (
            <p className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-base font-extrabold text-ink-900">
                {product.price}
              </span>
              {product.oldPrice && (
                <s className="text-xs font-medium text-ink-300">{product.oldPrice}</s>
              )}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-brand-700">
              <Lock className="size-3.5 shrink-0" aria-hidden />
              Kyçu për çmimin
            </p>
          )}
          <AddToCartIconButton
            productId={product.id}
            productName={product.name}
            className="z-10 shrink-0"
          />
        </div>
      </div>
    </article>
  );
}
