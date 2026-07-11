"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

export function WishlistButton({
  productId,
  productName,
  className,
}: {
  productId: number;
  productName: string;
  className?: string;
}) {
  const { has, toggle, ready } = useWishlist();
  const active = ready && has(productId);

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={active}
      aria-label={
        active
          ? `Hiq "${productName}" nga lista e dëshirave`
          : `Shto "${productName}" në listën e dëshirave`
      }
      className={`flex size-10 items-center justify-center rounded-full border border-ink-900/8 bg-white/90 backdrop-blur transition-colors hover:border-brand-300 hover:bg-brand-50 ${
        active ? "text-brand-600" : "text-ink-400"
      } ${className ?? ""}`}
    >
      <Heart className={`size-4.5 ${active ? "fill-current" : ""}`} aria-hidden />
    </button>
  );
}
