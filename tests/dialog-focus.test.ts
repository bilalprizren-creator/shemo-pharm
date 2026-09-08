import { describe, expect, it } from "vitest";
import { FOCUSABLE_SELECTOR } from "@/hooks/useDialogFocus";

/**
 * The trap itself needs a DOM and this suite is deliberately node-only, so what
 * is checked here is the list it walks — which is where it went wrong. The
 * drawer's own copy listed a[href], button and input, and nothing else: a
 * <select> or a <textarea> in a dialog fell outside the cycle, and so did
 * anything made focusable with tabindex.
 */
describe("FOCUSABLE_SELECTOR", () => {
  const clauses = FOCUSABLE_SELECTOR.split(", ");

  it("covers every natively focusable element a dialog can hold", () => {
    for (const tag of ["a[href]", "button", "input", "select", "textarea", "[tabindex]"]) {
      expect(clauses.some((c) => c.startsWith(tag))).toBe(true);
    }
  });

  it("excludes tabindex=-1 on every clause, not just some", () => {
    // A backdrop is usually a button with tabindex="-1" — clickable, but not
    // somewhere the browser would ever tab to. A trap that counts it wraps
    // focus onto an element the user cannot reach any other way.
    for (const clause of clauses) {
      expect(clause).toContain(':not([tabindex="-1"])');
    }
  });

  it("skips disabled controls", () => {
    for (const tag of ["button", "input", "select", "textarea"]) {
      const clause = clauses.find((c) => c.startsWith(tag));
      expect(clause).toContain(":not([disabled])");
    }
  });
});
