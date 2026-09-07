import { describe, expect, it } from "vitest";
import { moveInOrder } from "@/lib/catalog-order";

/**
 * The order a printed section runs in is edited a step at a time in
 * /admin/katalogu, and what the button posts is this function plus a renumber
 * of the whole section. Both ends and the absent id matter: a form can be
 * submitted twice before the page catches up, and the second post must not
 * wrap the first product round to the bottom.
 */
describe("moveInOrder", () => {
  const ids = [11, 22, 33, 44];

  it("swaps a product with the one above it", () => {
    expect(moveInOrder(ids, 33, "up")).toEqual([11, 33, 22, 44]);
  });

  it("swaps a product with the one below it", () => {
    expect(moveInOrder(ids, 22, "down")).toEqual([11, 33, 22, 44]);
  });

  it("leaves the first product where it is when it is pushed up", () => {
    expect(moveInOrder(ids, 11, "up")).toEqual(ids);
  });

  it("leaves the last product where it is when it is pushed down", () => {
    expect(moveInOrder(ids, 44, "down")).toEqual(ids);
  });

  it("ignores a product that is not in the section", () => {
    expect(moveInOrder(ids, 99, "up")).toEqual(ids);
  });

  it("does not touch the list it was given", () => {
    const original = [...ids];
    moveInOrder(ids, 22, "down");
    expect(ids).toEqual(original);
  });

  it("has nothing to do in a section of one", () => {
    expect(moveInOrder([7], 7, "down")).toEqual([7]);
  });
});
