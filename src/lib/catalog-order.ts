/**
 * Ordering arithmetic for the printed catalogue.
 *
 * Its own module for two reasons: it is pure, so it can be tested without a
 * database, and admin-actions.ts is a `"use server"` file where every export
 * becomes a POST-reachable endpoint — a helper exported from there would be
 * one more thing on the wire for no reason.
 *
 * Positions are written as 1..n rather than nudged by one, because
 * `catalog_sort` arrived from the printed edition with duplicates in it: the
 * import numbered products per section, and two products sharing a number sort
 * by id after that. Swapping two numbers that happen to be equal would move
 * nothing, so every move renumbers the whole section instead.
 */

/**
 * One id moved a single step through an ordered list.
 *
 * Returns a copy unchanged when the id is not in the list, or is already at the
 * end it is being pushed towards — the buttons for those cases are not rendered,
 * but a form can still be posted twice before the page catches up.
 */
export function moveInOrder(
  ids: readonly number[],
  id: number,
  dir: "up" | "down"
): number[] {
  const out = [...ids];
  const from = out.indexOf(id);
  if (from === -1) return out;
  const to = dir === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= out.length) return out;
  [out[from], out[to]] = [out[to], out[from]];
  return out;
}
