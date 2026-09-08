"use client";

import { useRef, useState } from "react";
import { useCart } from "./CartProvider";

/**
 * Emptying the basket, behind a confirmation and in front of an undo.
 *
 * It used to be one unguarded click. A forty-line wholesale basket is twenty
 * minutes of somebody's morning and there is no server-side copy to restore
 * from — the lines live in localStorage and nowhere else. So: one press asks,
 * the second empties, and for a few seconds after that the same button offers
 * the basket back.
 *
 * Both timed states fall back on their own, so the control is never left
 * sitting in a state nobody chose. The snapshot is a ref rather than state
 * because restoring it must not depend on a render having happened.
 */
export function ClearCartButton({
  labels,
  className,
  confirmClassName,
}: {
  labels: { clear: string; confirm: string; undo: string; cleared: string };
  className: string;
  confirmClassName: string;
}) {
  const { lines, clear, restore } = useCart();
  const [phase, setPhase] = useState<"idle" | "confirming" | "cleared">("idle");
  const snapshot = useRef<typeof lines>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const arm = (next: "confirming" | "cleared", ms: number) => {
    clearTimeout(timer.current);
    setPhase(next);
    timer.current = setTimeout(() => setPhase("idle"), ms);
  };

  if (phase === "cleared") {
    return (
      <button
        type="button"
        onClick={() => {
          clearTimeout(timer.current);
          restore(snapshot.current);
          setPhase("idle");
        }}
        className={confirmClassName}
      >
        {labels.cleared} · {labels.undo}
      </button>
    );
  }

  if (phase === "confirming") {
    return (
      <button
        type="button"
        onClick={() => {
          snapshot.current = lines;
          clear();
          arm("cleared", 8000);
        }}
        className={confirmClassName}
      >
        {labels.confirm}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => arm("confirming", 5000)} className={className}>
      {labels.clear}
    </button>
  );
}
