import { describe, expect, it } from "vitest";
import { verifyImageBytes, type RejectionCode } from "@/lib/image-sniff";
import { uploadStatusMessage } from "@/components/admin/ImageUploadField";

/**
 * The rule the upload route and the admin form now share.
 *
 * The point of these cases is agreement: the browser refuses a file before
 * uploading it, and it must reach the same verdict the server would. A client
 * check that is merely *similar* to the server's is worse than none — it either
 * blocks files the server would have taken, or waves through files it refuses.
 * Both sides call this function, so these cases cover both.
 */

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function png(width: number, height: number): Uint8Array {
  return new Uint8Array([
    ...PNG_SIG,
    ...be32(13),
    ...[..."IHDR"].map((c) => c.charCodeAt(0)),
    ...be32(width),
    ...be32(height),
    8, 6, 0, 0, 0,
  ]);
}

const jpegBytes = new Uint8Array([
  0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0x64,
  0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
]);

const svgBytes = new Uint8Array([..."<svg xmlns=\"x\"><script/></svg>"].map((c) => c.charCodeAt(0)));

const verify = (declaredMime: string, fileName: string, head: Uint8Array) =>
  verifyImageBytes({ declaredMime, fileName, head });

describe("verifyImageBytes — accepts genuine files", () => {
  it("accepts a PNG that says it is a PNG", () => {
    const v = verify("image/png", "kutia.png", png(1000, 1000));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.info).toEqual({ format: "png", width: 1000, height: 1000 });
  });

  it("accepts a JPEG under either extension", () => {
    expect(verify("image/jpeg", "kutia.jpg", jpegBytes).ok).toBe(true);
    expect(verify("image/jpeg", "kutia.jpeg", jpegBytes).ok).toBe(true);
  });

  it("tolerates an uppercase filename and a parameterised content type", () => {
    expect(verify("image/png; charset=binary", "KUTIA.PNG", png(200, 200)).ok).toBe(true);
  });
});

describe("verifyImageBytes — the three claims must agree", () => {
  const cases: [string, RejectionCode, () => ReturnType<typeof verify>][] = [
    ["a type the site cannot render", "bad_type", () => verify("image/gif", "a.gif", png(50, 50))],
    ["no content type at all", "bad_type", () => verify("", "a.png", png(50, 50))],
    ["an SVG declared as SVG", "bad_type", () => verify("image/svg+xml", "a.svg", svgBytes)],
    ["a name with no extension", "bad_ext", () => verify("image/png", "kutia", png(50, 50))],
    ["extension disagreeing with the type", "bad_ext", () => verify("image/png", "a.webp", png(50, 50))],
    ["a double extension ending badly", "bad_ext", () => verify("image/png", "a.png.svg", png(50, 50))],
    ["an SVG wearing a .png name", "not_an_image", () => verify("image/png", "a.png", svgBytes)],
    ["a JPEG wearing a .png name", "type_mismatch", () => verify("image/png", "a.png", jpegBytes)],
    ["a decompression bomb", "bad_dimensions", () => verify("image/png", "a.png", png(9000, 9000))],
    ["a tracking pixel", "bad_dimensions", () => verify("image/png", "a.png", png(1, 1))],
  ];

  for (const [what, code, run] of cases) {
    it(`refuses ${what} with ${code}`, () => {
      const v = run();
      expect(v.ok).toBe(false);
      if (!v.ok) expect(v.code).toBe(code);
    });
  }

  it("keeps the reason out of the code, so nothing internal reaches the caller", () => {
    const v = verify("image/png", "secret-supplier-list.png", svgBytes);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      // detail is for the log and may name the file; the code never does.
      expect(v.detail).toContain("secret-supplier-list.png");
      expect(v.code).toBe("not_an_image");
    }
  });
});

describe("every rejection has something to say to the editor", () => {
  const codes: RejectionCode[] = [
    "bad_type",
    "bad_ext",
    "not_an_image",
    "type_mismatch",
    "bad_dimensions",
  ];

  it("maps each code to a real sentence, not the fallback", () => {
    const fallback = uploadStatusMessage(400, "something-nobody-defined");
    for (const code of codes) {
      const message = uploadStatusMessage(0, code);
      expect(message).not.toBe(fallback);
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toContain(code);
    }
  });

  /**
   * The client passes status 0 for a locally caught rejection, since no response
   * exists. The message must come from the code and not fall through to a
   * status-based guess.
   */
  it("answers from the code even with no HTTP status", () => {
    expect(uploadStatusMessage(0, "bad_dimensions")).toContain("piksela");
    expect(uploadStatusMessage(0, "not_an_image")).toContain("pavarësisht emrit");
  });
});
