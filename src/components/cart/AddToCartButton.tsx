"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

/** Compact square button used on product cards (screenshot style). */
export function AddToCartIconButton({
  productId,
  productName,
  className,
}: {
  productId: number;
  productName: string;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        add(productId);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      aria-label={`Shto "${productName}" në shportë`}
      className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
        added
          ? "bg-accent-500 text-white"
          : "bg-brand-600 text-white hover:bg-brand-700"
      } ${className ?? ""}`}
    >
      {added ? (
        <Check className="size-4.5" aria-hidden />
      ) : (
        <ShoppingBag className="size-4.5" aria-hidden />
      )}
    </button>
  );
}

/** Quantity stepper + add button for the product detail page. */
export function AddToCartWithQty({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const { add } = useCart();
  const [qty, setQtyState] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex h-12 items-center rounded-lg border border-ink-900/12 bg-white">
        <button
          type="button"
          onClick={() => setQtyState((q) => Math.max(1, q - 1))}
          aria-label="Zvogëlo sasinë"
          className="flex size-11 items-center justify-center rounded-l-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span
          aria-live="polite"
          aria-label={`Sasia: ${qty}`}
          className="w-10 text-center text-sm font-bold text-ink-900"
        >
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQtyState((q) => Math.min(999, q + 1))}
          aria-label="Rrit sasinë"
          className="flex size-11 items-center justify-center rounded-r-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          add(productId, qty);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        aria-label={`Shto "${productName}" në shportë`}
        className={`inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors ${
          added ? "bg-accent-500" : "bg-brand-600 hover:bg-brand-700"
        }`}
      >
        {added ? (
          <>
            <Check className="size-4.5" aria-hidden />
            U shtua në shportë
          </>
        ) : (
          <>
            <ShoppingBag className="size-4.5" aria-hidden />
            Shto në shportë
          </>
        )}
      </button>
    </div>
  );
}
