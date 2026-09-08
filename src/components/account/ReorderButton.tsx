"use client";

import { RotateCcw } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Loads a past order back into the basket and slides the cart open.
 *
 * The loop lives on the cart context as addLines(), because the wishlist does
 * the same thing under a different name. Adds rather than replaces — a customer
 * halfway through a new order must not lose it by pressing this — and stays
 * quiet: the drawer opening is the feedback here, not a stack of toasts.
 */
export function ReorderButton({
  lines,
  label,
}: {
  lines: { id: number; qty: number }[];
  label: string;
}) {
  const { addLines, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => {
        addLines(lines);
        openCart();
      }}
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <RotateCcw className="size-4" aria-hidden />
      {label}
    </button>
  );
}
