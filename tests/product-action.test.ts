import { describe, expect, it } from "vitest";
import { productActionFor } from "@/lib/product-action";
import { safeReturnPath } from "@/lib/return-path";

describe("productActionFor", () => {
  it("asks a visitor to log in", () => {
    expect(productActionFor(null)).toBe("login");
  });

  it("does not ask a logged-in partner awaiting approval to log in again", () => {
    expect(productActionFor({ status: "pending" })).toBe("pending");
  });

  it("leads an approved partner to the basket", () => {
    expect(productActionFor({ status: "approved" })).toBe("order");
  });
});

describe("safeReturnPath", () => {
  it.each([
    "/produktet/ac-cleanser-sal-wash-liquid-200ml-7732",
    "/en/produktet/aloe-vera-gel-200-ml-2086",
    "/produktet?kerko=froika&faqja=2",
  ])("accepts a path on this site: %s", (path) => {
    expect(safeReturnPath(path)).toBe(path);
  });

  it.each([
    ["an absolute URL", "https://evil.example/produktet"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash the browser reads as a slash", "/\\evil.example"],
    ["an encoded slash", "/%2F%2Fevil.example"],
    ["an encoded backslash", "/%5Cevil.example"],
    ["a scheme", "javascript:alert(1)"],
    ["the admin panel", "/admin/produktet"],
    ["the API", "/api/kerko?q=1"],
    ["a relative path", "produktet"],
    ["whitespace inside", "/produktet /x"],
    ["nothing", ""],
    ["not a string", 42],
  ])("refuses %s", (_label, value) => {
    expect(safeReturnPath(value)).toBeNull();
  });
});
