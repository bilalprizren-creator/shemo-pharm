"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/components/wishlist/WishlistProvider";

export function WishlistButton({
  productId,
  productName,
  labels,
  className,
}: {
  productId: number;
  productName: string;
  /** Localized aria labels; falls back to Albanian when omitted. */
  labels?: { add: string; remove: string };
  className?: string;
}) {
  const { has, toggle, ready } = useWishlist();
  const active = ready && has(productId);
  const addLabel = labels?.add ?? `Shto "${productName}" në listën e dëshirave`;
  const removeLabel =
    labels?.remove ?? `Hiq "${productName}" nga lista e dëshirave`;

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={active}
      aria-label={active ? removeLabel : addLabel}
      className={`flex size-10 items-center justify-center rounded-full border border-ink-900/8 bg-white/90 backdrop-blur transition-colors hover:border-brand-300 hover:bg-brand-50 ${
        active ? "text-brand-600" : "text-ink-400"
      } ${className ?? ""}`}
    >
      <Heart className={`size-4.5 ${active ? "fill-current" : ""}`} aria-hidden />
    </button>
  );
}
