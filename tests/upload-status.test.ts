import { describe, expect, it } from "vitest";
import { uploadStatusMessage } from "@/components/admin/ImageUploadField";
import { MAX_DIMENSION, MAX_UPLOAD_LABEL, MIN_DIMENSION } from "@/lib/image-sniff";

/**
 * The upload route answers a refusal with a status and a code from a closed set.
 * This is the half of that contract the editor actually reads.
 *
 * The property worth pinning, and the reason the sibling test file exists: a
 * permanent failure must never be described as something to try again. The old
 * client-direct uploader could not tell these apart at all — the SDK replaced
 * every non-OK answer from our token route with one fixed string — so an editor
 * facing a suspended store was told to retry, forever.
 */

const PERMANENT = ["store_suspended", "storage_unavailable", "store_rate_limited"];
const RETRYABLE = ["rate_limited", "no_file", "bad_form", "bad_origin"];

describe("uploadStatusMessage", () => {
  it("names the suspended store, and does not suggest retrying", () => {
    const message = uploadStatusMessage(503, "store_suspended");
    expect(message).toContain("pezulluar");
    expect(message).toContain("riprovimi nuk ndihmon");
    expect(message).not.toMatch(/provoni përsëri/i);
  });

  it("never tells the editor to retry a permanent failure", () => {
    for (const code of PERMANENT) {
      expect(uploadStatusMessage(503, code)).not.toMatch(/provoni përsëri/i);
    }
  });

  it("does tell the editor to retry a transient one", () => {
    for (const code of RETRYABLE) {
      expect(uploadStatusMessage(429, code)).toMatch(/provoni përsëri/i);
    }
  });

  it("points an expired session at logging in again", () => {
    expect(uploadStatusMessage(401, "unauthorized")).toContain("kyçuni sërish");
  });

  it("quotes the real size cap, so the message cannot drift from the route", () => {
    expect(uploadStatusMessage(413, "too_large")).toContain(MAX_UPLOAD_LABEL);
  });

  it("names the three accepted formats when the type is wrong", () => {
    for (const code of ["bad_type", "bad_ext"]) {
      const message = uploadStatusMessage(415, code);
      expect(message).toContain("PNG");
      expect(message).toContain("JPG");
      expect(message).toContain("WebP");
    }
  });

  /**
   * The message an editor sees when the signature check catches a file whose
   * name and content type both lied. It has to say that the name was not the
   * problem, or the obvious next move is to rename it and try again.
   */
  it("explains that a renamed file is still not an image", () => {
    for (const code of ["not_an_image", "type_mismatch"]) {
      expect(uploadStatusMessage(422, code)).toContain("pavarësisht emrit");
    }
  });

  it("gives the real dimension bounds rather than just refusing", () => {
    // Read from the module rather than written out, so the sentence cannot drift
    // away from the limit the route actually enforces.
    const message = uploadStatusMessage(422, "bad_dimensions");
    expect(message).toContain(String(MIN_DIMENSION));
    expect(message).toContain(String(MAX_DIMENSION));
  });

  it("falls back on the status alone when the code is unknown or missing", () => {
    expect(uploadStatusMessage(401, undefined)).toContain("kyçuni sërish");
    expect(uploadStatusMessage(429, "something-new")).toMatch(/provoni përsëri/i);
    expect(uploadStatusMessage(500, undefined)).toContain("kufirin");
    expect(uploadStatusMessage(400, undefined)).toBe("Ngarkimi dështoi. Provoni përsëri.");
  });

  it("never leaks the code itself into what the editor reads", () => {
    for (const code of [...PERMANENT, ...RETRYABLE, "not_an_image", "bad_dimensions"]) {
      expect(uploadStatusMessage(400, code)).not.toContain(code);
      expect(uploadStatusMessage(400, code)).not.toContain("_");
    }
  });
});
