import { describe, expect, it } from "vitest";
import { uploadErrorMessage } from "@/components/admin/ImageUploadField";

/**
 * The upload failed for a week with "Ngarkimi dështoi. Provoni përsëri." — the
 * one instruction that could not possibly work, because the blob store had been
 * suspended for exceeding its free-tier write limit. These pin the mapping so
 * the panel never again answers a permanent condition with "try again".
 */
describe("uploadErrorMessage", () => {
  it("names a suspended store and says retrying will not help", () => {
    const msg = uploadErrorMessage(
      new Error("Vercel Blob: This store has been suspended.")
    );
    expect(msg).toMatch(/pezulluar/);
    expect(msg).toMatch(/riprovimi nuk ndihmon/i);
    expect(msg).not.toMatch(/Provoni përsëri\.$/);
  });

  it("points at the session when our token route refused", () => {
    // @vercel/blob collapses 401, 429 and 400 from our route into this one
    // string, so the message names the likely cause rather than inventing one.
    const msg = uploadErrorMessage(
      new Error("Vercel Blob: Failed to  retrieve the client token")
    );
    expect(msg).toMatch(/sesioni/i);
  });

  it("distinguishes a dropped connection, which is worth retrying", () => {
    expect(uploadErrorMessage(new TypeError("Failed to fetch"))).toMatch(
      /provoni përsëri/i
    );
  });

  it("shows the provider's own words when it recognises nothing", () => {
    expect(uploadErrorMessage(new Error("Something odd happened"))).toBe(
      "Ngarkimi dështoi: Something odd happened"
    );
  });

  it("falls back cleanly when there is no message at all", () => {
    expect(uploadErrorMessage(undefined)).toBe("Ngarkimi dështoi. Provoni përsëri.");
    expect(uploadErrorMessage("a string, not an Error")).toBe(
      "Ngarkimi dështoi. Provoni përsëri."
    );
  });
});
