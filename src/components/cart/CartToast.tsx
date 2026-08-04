"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { useCart } from "./CartProvider";

const VISIBLE_MS = 4000;

/**
 * "X was added to the cart", bottom of the screen, with a way straight into
 * the basket. Deliberately not the drawer itself: adding a product should
 * confirm itself without interrupting someone who is still shopping.
 */
export function CartToast({ dict }: { dict: Dictionary }) {
  const { notice, dismissNotice, openCart, open } = useCart();

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  // The drawer says the same thing, louder — never both at once.
  if (!notice || open) return null;

  return (
    <div
      // Keyed on the sequence so a second add restarts the animation instead
      // of leaving a toast sitting there unchanged.
      key={notice.seq}
      role="status"
      className="toast-in fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-plum-950 px-4 py-3 text-white shadow-drawer sm:inset-x-auto sm:right-6 sm:bottom-6 md:bottom-6"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-500/20 text-accent-300">
        <Check className="size-4" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug">
        {fmt(dict.cartPage.addedToast, { name: notice.name })}
      </p>
      <button
        type="button"
        onClick={() => {
          dismissNotice();
          openCart();
        }}
        className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
      >
        {dict.cartPage.viewCartShort}
      </button>
      <button
        type="button"
        onClick={dismissNotice}
        aria-label={dict.cartPage.closeDrawer}
        className="shrink-0 text-white/60 transition-colors hover:text-white"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
