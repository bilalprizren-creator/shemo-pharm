"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { MAX_QTY, QtyInput } from "./QtyInput";

/** Compact square button used on product cards (screenshot style). */
export function AddToCartIconButton({
  productId,
  productName,
  label,
  addedLabel,
  className,
}: {
  productId: number;
  productName: string;
  /** Localized aria label; falls back to Albanian when omitted. */
  label?: string;
  /** Announced to screen readers after adding — the icon swap alone is silent. */
  addedLabel?: string;
  className?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          add(productId, 1, productName);
          setAdded(true);
          setTimeout(() => setAdded(false), 1200);
        }}
        aria-label={label ?? `Shto "${productName}" në shportë`}
        className={`flex size-10 items-center justify-center rounded-full transition-colors ${
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
      <span role="status" className="sr-only">
        {added ? (addedLabel ?? "U shtua në shportë") : ""}
      </span>
    </>
  );
}

export interface AddToCartQtyLabels {
  add: string;
  added: string;
  addAria: string;
  increase: string;
  decrease: string;
  qty: string;
  qtyInput: string;
}

/**
 * Quantity stepper + add button for the product detail page.
 *
 * `emphasis` because the page decides which of its actions leads: for a
 * partner who sees prices the basket is the thing to do, for a visitor it is
 * logging in, and two filled purple buttons side by side say neither.
 */
export function AddToCartWithQty({
  productId,
  productName,
  labels,
  emphasis = "primary",
}: {
  productId: number;
  /** Only used for the confirmation toast. */
  productName?: string;
  labels: AddToCartQtyLabels;
  emphasis?: "primary" | "secondary";
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
          aria-label={labels.decrease}
          className="flex size-11 items-center justify-center rounded-l-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <QtyInput
          value={qty}
          onChange={setQtyState}
          label={labels.qtyInput}
          className="w-14"
        />
        <button
          type="button"
          onClick={() => setQtyState((q) => Math.min(MAX_QTY, q + 1))}
          aria-label={labels.increase}
          className="flex size-11 items-center justify-center rounded-r-lg text-ink-700 hover:bg-brand-50 hover:text-brand-700"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          add(productId, qty, productName);
          setAdded(true);
          setTimeout(() => setAdded(false), 1500);
        }}
        aria-label={labels.addAria}
        className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors sm:flex-none ${
          added
            ? "bg-accent-500 text-white"
            : emphasis === "primary"
              ? "bg-brand-600 text-white hover:bg-brand-700"
              : "border border-brand-300 bg-white text-brand-700 hover:border-brand-400 hover:bg-brand-50"
        }`}
      >
        {added ? (
          <>
            <Check className="size-4.5" aria-hidden />
            {labels.added}
          </>
        ) : (
          <>
            <ShoppingBag className="size-4.5" aria-hidden />
            {labels.add}
          </>
        )}
      </button>
      <span role="status" className="sr-only">
        {added ? labels.added : ""}
      </span>
    </div>
  );
}
