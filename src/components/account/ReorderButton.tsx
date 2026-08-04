"use client";

import { RotateCcw } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

/**
 * Loads a past order back into the basket and slides the cart open.
 *
 * Adds to whatever is already in the basket rather than replacing it — a
 * customer who is halfway through a new order must not lose it by pressing
 * this. Lines are passed without a product name so the add-to-cart toast
 * stays quiet: the drawer opening is the feedback here.
 */
export function ReorderButton({
  lines,
  label,
}: {
  lines: { id: number; qty: number }[];
  label: string;
}) {
  const { add, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => {
        for (const line of lines) add(line.id, line.qty);
        openCart();
      }}
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700"
    >
      <RotateCcw className="size-4" aria-hidden />
      {label}
    </button>
  );
}
