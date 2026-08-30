/**
 * Reads a price the way somebody actually types it into the panel.
 *
 * Prices live as integer cents and only become euros at the UI edge; this is the
 * way back in. It is deliberately more forgiving than the `z.coerce.number()` the
 * product form uses: an Albanian keyboard writes "12,50", which coerces to NaN
 * and would have rejected an ordinary price. Everything a price cannot be —
 * blank, letters, negative, past the column's ceiling — comes back as null, so
 * the caller answers with one message instead of writing a nonsense row.
 */

/**
 * price_cents is a Postgres `integer`, so anything past ~21.5 million euros
 * overflows the column and the UPDATE fails at the driver rather than in
 * validation. A million euros is far above anything a pharmacy wholesaler sells
 * and comfortably inside the type.
 */
const MAX_EUROS = 1_000_000;

/**
 * Plain decimal notation and nothing else.
 *
 * Number() is far too willing on its own: it reads "0x10" as 16, "1e3" as 1000
 * and "" as 0. Those are all things a slip of the hand produces at a keyboard,
 * and none of them is a price anybody meant to type — a field that turns "1e3"
 * into a thousand euros without comment is worse than one that refuses it.
 * Anchored, so a stray character anywhere rejects the whole string.
 */
const DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/;

/** Euros as typed → cents, or null when the input is not a price. */
export function parsePriceEuros(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim().replace(",", ".");
  // Rejects the blank, the negative and the exponent in one go, so only the
  // ceiling is left to check.
  if (!DECIMAL.test(text)) return null;
  const euros = Number(text);
  if (!Number.isFinite(euros) || euros > MAX_EUROS) return null;
  // The same rounding the full product form does, so the two routes into
  // price_cents cannot disagree about what "12.345" is worth.
  return Math.round(euros * 100);
}
