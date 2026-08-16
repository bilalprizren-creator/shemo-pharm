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

/** Euros as typed → cents, or null when the input is not a price. */
export function parsePriceEuros(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim().replace(",", ".");
  // Number("") is 0, so the blank has to be caught before the conversion.
  if (!text) return null;
  const euros = Number(text);
  if (!Number.isFinite(euros) || euros < 0 || euros > MAX_EUROS) return null;
  // The same rounding the full product form does, so the two routes into
  // price_cents cannot disagree about what "12.345" is worth.
  return Math.round(euros * 100);
}
