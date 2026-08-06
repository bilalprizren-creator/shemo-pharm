/**
 * Price formatting for EUR amounts stored in minor units (cents),
 * matching the old shop's format: "2,00 €".
 * Only call from server components after the session check — prices must
 * never reach unauthenticated visitors.
 */
export function formatPrice(cents: number): string {
  const value = (cents / 100).toFixed(2).replace(".", ",");
  return `${value} €`;
}

/**
 * The clock every date on this site is read against.
 *
 * Vercel runs the lambdas in UTC, so a date formatted without a zone is the
 * server's, not the customer's. Kosovo is two hours ahead in summer: an order
 * placed at 01:20 on the 7th was stamped 23:20 on the 6th in UTC and the account
 * page dutifully showed the customer the wrong day for their own order. Anything
 * placed between midnight and 02:00 local was off by one.
 *
 * IANA has no zone of its own for Kosovo — Europe/Belgrade is the one that
 * carries its CET/CEST rules, and it is what Prishtina observes.
 */
const TIME_ZONE = "Europe/Belgrade";

/** A date in the business's own day, e.g. "7 gusht 2026". */
export function formatDate(value: Date | string, locale = "sq-AL"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** Date plus clock, for the admin lists where the order of events matters. */
export function formatDateTime(value: Date | string, locale = "sq-AL"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}
