import Image from "next/image";
import Link from "next/link";
import { Lock, Package } from "lucide-react";
import { thumbnailFor } from "@/lib/images";
import type { CardProduct } from "@/lib/types";
import { langHref } from "@/lib/i18n";
import type { SiteMode } from "@/lib/site-mode";
import type { Dictionary } from "@/lib/dictionaries";
import { PhotoWell, photoPresentation } from "./PhotoWell";
import { WishlistButton } from "./WishlistButton";
import { AddToCartIconButton } from "@/components/cart/AddToCartButton";
import { fmt } from "@/lib/i18n";

/**
 * Product card used in grids and carousels. Works as a server component —
 * only the wishlist heart and cart button hydrate on the client. The whole
 * card is one link (stretched overlay); interactive controls sit above it.
 *
 * Read top to bottom it answers four questions, in the order a buyer asks
 * them, and every card answers them at the same height so a row lines up:
 *
 *   1. what is it — the photo, then the name, which carries the weight;
 *   2. which shelf, which code — quiet lines above and below the name, there
 *      to be found rather than to be read;
 *   3. can I have it — a line of its own, turquoise in stock, amber when the
 *      order will take longer (it can still be placed, see the detail page);
 *   4. what does it cost and what do I do — the footer: the price, or the
 *      lock for a visitor who may not see one, and the basket button.
 */
export function ProductCard({
  product,
  dict,
  priority = false,
  mode = "shop",
}: {
  product: CardProduct;
  dict: Dictionary;
  /** Eager-load the image when the card is above the fold. */
  priority?: boolean;
  /**
   * Which site is rendering. The catalogue has no basket and no wishlist, so
   * its cards carry neither — passed down rather than read from headers()
   * here, which would mean one header lookup per card on a 155-product page.
   */
  mode?: SiteMode;
}) {
  const isKatalog = mode === "katalog";
  // 7 % a side is the p-5 this card always had at its full 280 px; the
  // measured factor then draws a slim bottle larger and a bulky carton a
  // little smaller, so a row reads as one range (src/lib/photo-fit.ts).
  const photo = photoPresentation(product.image, { inset: 0.07, fit: product.imageFit });
  return (
    /* focus-within, so tabbing to the title lights the whole card the
       way hovering does. The link's own focus-visible:outline-none does not
       suppress anything, by the way: the :focus-visible rule in globals.css is
       unlayered and beats every Tailwind utility, so the ring is drawn around
       the title text regardless. This adds the card-level treatment that was
       evidently meant to replace it. */
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover focus-within:-translate-y-0.5 focus-within:border-brand-200 focus-within:shadow-card-hover">
      <PhotoWell className="aspect-square w-full">
        {product.image ? (
          <Image
            // The 560px copy, not the 1000px source. `sizes` below says a card
            // is never drawn wider than 280 CSS pixels, so the source was four
            // times the bytes a grid of these needs — which mattered the moment
            // next/image stopped resizing anything (see thumbnailFor).
            src={thumbnailFor(product.image)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 280px"
            // Kept for the day the optimizer is switched back on: the source
            // files are already WebP q82 (scripts/cutout-images.mjs), so the
            // default 75 would be a second lossy pass over the fine print on a
            // carton. Inert while `images.unoptimized` is set.
            quality={85}
            priority={priority}
            className={`${photo.className} transition-transform duration-300 group-hover:scale-[1.04]`}
            style={photo.style}
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden>
            <Package className="size-12 text-ink-300" strokeWidth={1.25} />
          </div>
        )}
        {product.discountPct !== null && (
          <span className="absolute left-3 top-3 rounded-md bg-accent-500 px-2 py-0.5 text-xs font-bold text-white">
            {fmt(dict.product.discountBadge, { pct: product.discountPct })}
          </span>
        )}
        {!isKatalog && (
          <WishlistButton
            productId={product.id}
            productName={product.name}
            labels={{
              add: fmt(dict.product.wishlistAdd, { name: product.name }),
              remove: fmt(dict.product.wishlistRemove, { name: product.name }),
            }}
            className="absolute right-3 top-3 z-10"
          />
        )}
      </PhotoWell>

      <div className="flex flex-1 flex-col border-t border-line px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        {/* The catalogue site has no product pages — the printed catalogue it
            replaces had none either, and its job is looking a code up, not
            opening a detail view. So its cards are plain text, not links. */}
        {/* The shelf above the name, not beside the code below it: down a grid
            of 48 near-identical syringes the category is what the eye sorts by
            first. Quiet, though — it used to be bold turquoise capitals and
            outshouted the name it is there to qualify. The line is kept even
            when a product has no category, so its name starts where its
            neighbours' do. */}
        <p className="h-4 truncate text-xs leading-4 text-ink-400">{product.categoryName}</p>
        {/* Lines reserved whether the name needs them or not: a one-line name
            must not pull its card's code, stock and price up out of line with
            the rest of the row. Three on a phone, where a card is 166 px wide
            and two lines cut "AC Cleanser Sal-Wash Liquid 200 ml" off before
            its size — the one part of the name a buyer is checking. */}
        <h3 className="mt-1 line-clamp-3 min-h-[4.125em] text-sm font-semibold leading-snug text-ink-900 sm:line-clamp-2 sm:min-h-[2.75em] sm:text-[15px]">
          {isKatalog ? (
            product.name
          ) : (
            <Link
              href={langHref(dict.lang, `/produktet/${product.slug}`)}
              className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none"
            >
              {product.name}
            </Link>
          )}
        </h3>
        <p className="mt-1 h-4 truncate text-xs leading-4 tabular-nums text-ink-400">
          {product.sku && (
            <>
              {dict.common.code} {product.sku}
            </>
          )}
        </p>

        {/* Availability on every card, both ways. It used to be said only when
            the answer was no, as a label over the photo — which left "in
            stock" to be inferred from the absence of something. */}
        {product.inStock ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-accent-700">
            <span className="size-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
            {dict.product.inStock}
          </p>
        ) : (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium leading-tight text-amber-700">
            <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            {/* May wrap on a narrow card; the footer stays level with its
                neighbours' regardless, since it is pinned to the bottom. */}
            <span>{dict.product.outOfStockOrderable}</span>
          </p>
        )}

        {/* The footer is the card's one place for money and action, drawn at
            the same height on every card by mt-auto: price or lock on the
            left, the basket on the right. */}
        <div className="mt-auto flex min-h-13 items-center justify-between gap-2 border-t border-line pt-3">
          {product.price ? (
            <p className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-base font-bold tabular-nums text-ink-900">
                {product.price}
              </span>
              {product.oldPrice && (
                <s className="text-xs font-medium text-ink-300">{product.oldPrice}</s>
              )}
            </p>
          ) : (
            // Not "log in to see the price": the card cannot tell a visitor
            // from a partner whose account is still being checked, and the
            // second is already logged in. The product page, which can tell,
            // says what to do next.
            // Wraps rather than truncates: on a two-column phone grid the card
            // is 160 px wide, and "Çmimi vetëm …" says nothing at all.
            <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium leading-tight text-ink-500 sm:text-[13px]">
              <Lock className="size-3.5 shrink-0 text-brand-600" aria-hidden />
              <span>{dict.product.partnerPrice}</span>
            </p>
          )}
          {!isKatalog && (
            <AddToCartIconButton
              productId={product.id}
              productName={product.name}
              label={fmt(dict.product.addToCartAria, { name: product.name })}
              addedLabel={dict.product.addedToCart}
              className="z-10 shrink-0"
            />
          )}
        </div>
      </div>
    </article>
  );
}
