"use client";

import { useEffect, type RefObject } from "react";

/**
 * What the Tab key may land on inside a dialog.
 *
 * Exported so it can be tested without a browser: the parts that go wrong here
 * are which selectors are listed, not the event plumbing around them.
 *
 * `select` and `textarea` were missing from the drawer's own copy of this, and
 * so was anything made focusable with `tabindex`. The `:not([tabindex="-1"])`
 * matters more than it looks: a modal's backdrop is usually a button carrying
 * exactly that, to keep it clickable but out of the tab order, and a trap that
 * counts it wraps focus onto an element the browser would never tab to.
 */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]",
]
  .map((s) => `${s}:not([tabindex="-1"])`)
  .join(", ");

/**
 * Everything a modal owes the keyboard: scroll lock, initial focus, Escape,
 * a Tab cycle that stays inside, and the focus put back where it came from.
 *
 * The last one is the part most often skipped — closing a sheet without it
 * drops focus on <body>, so the next Tab starts again from the top of the page
 * rather than from the control that opened the sheet.
 */
export function useDialogFocus({
  open,
  panelRef,
  initialRef,
  onClose,
}: {
  open: boolean;
  /** The dialog's panel — the trap's boundary. Not the backdrop. */
  panelRef: RefObject<HTMLElement | null>;
  /** What gets focus on open. Falls back to the first focusable in the panel. */
  initialRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
}): void {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      panelRef.current
        ? [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        : [];

    (initialRef?.current ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Re-read on every press: the panel's contents change under it — a cart
      // line is removed, the "order sent" panel replaces the buttons.
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open, panelRef, initialRef, onClose]);
}
