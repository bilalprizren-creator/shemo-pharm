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
