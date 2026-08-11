import { describe, expect, it } from "vitest";
import {
  MAX_DIMENSION,
  MIN_DIMENSION,
  formatFromExtension,
  formatFromMime,
  sniffImage,
  withinDimensionLimits,
} from "@/lib/image-sniff";

/**
 * The upload route's only real defence is that these bytes say what they say.
 * Every fixture below is built by hand rather than checked in as a binary, so
 * the test states exactly which byte carries which meaning — a checked-in photo
 * would prove the parser works on that photo and explain nothing.
 */

function bytes(...parts: (number | number[] | string)[]): Uint8Array {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") {
      for (const ch of part) flat.push(ch.charCodeAt(0));
    } else if (Array.isArray(part)) {
      flat.push(...part);
    } else {
      flat.push(part);
    }
  }
  return new Uint8Array(flat);
}

const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const le24 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(width: number, height: number): Uint8Array {
  return bytes(PNG_SIG, be32(13), "IHDR", be32(width), be32(height), [8, 6, 0, 0, 0]);
}

/**
 * A JPEG with `segments` sitting between the SOI and the frame header. Each
 * segment is `[marker, ...payload]`; the length field goes after the marker and
 * counts its own two bytes.
 */
function jpeg(
  width: number,
  height: number,
  { sof = 0xc0, segments = [] as number[][] } = {}
): Uint8Array {
  const before = segments.flatMap(([marker, ...payload]) => [
    0xff,
    marker!,
    ...be16(payload.length + 2),
    ...payload,
  ]);
  return bytes(
    [0xff, 0xd8, 0xff, 0xe0],
    be16(16),
    "JFIF\0",
    [1, 1, 0, 0, 1, 0, 1, 0, 0],
    before,
    [0xff, sof],
    be16(17), // 8 + 3 components x 3 bytes
    [8],
    be16(height),
    be16(width),
    [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
    [0xff, 0xda]
  );
}

function webpLossy(width: number, height: number): Uint8Array {
  return bytes(
    "RIFF",
    le32(0), // the container's own size claim, deliberately wrong
    "WEBP",
    "VP8 ",
    le32(24),
    [0x00, 0x00, 0x00], // frame tag; bit 0 clear = keyframe
    [0x9d, 0x01, 0x2a], // keyframe start code
    le16(width),
    le16(height)
  );
}

function webpLossless(width: number, height: number): Uint8Array {
  const packed = (width - 1) | ((height - 1) << 14);
  return bytes("RIFF", le32(0), "WEBP", "VP8L", le32(20), [0x2f], le32(packed));
}

function webpExtended(width: number, height: number): Uint8Array {
  return bytes(
    "RIFF",
    le32(0),
    "WEBP",
    "VP8X",
    le32(10),
    [0x10], // flags: alpha
    [0, 0, 0], // reserved
    le24(width - 1),
    le24(height - 1)
  );
}

describe("sniffImage — the three formats the site serves", () => {
  it("reads PNG dimensions from IHDR", () => {
    expect(sniffImage(png(1000, 750))).toEqual({ format: "png", width: 1000, height: 750 });
  });

  it("reads baseline JPEG dimensions from SOF0", () => {
    expect(sniffImage(jpeg(640, 480))).toEqual({ format: "jpeg", width: 640, height: 480 });
  });

  it("reads progressive JPEG dimensions from SOF2", () => {
    expect(sniffImage(jpeg(800, 600, { sof: 0xc2 }))).toEqual({
      format: "jpeg",
      width: 800,
      height: 600,
    });
  });

  it("walks past an EXIF segment to reach the frame header", () => {
    const exif = [0xe1, ...Array.from({ length: 300 }, () => 0x41)];
    expect(sniffImage(jpeg(120, 90, { segments: [exif] }))).toEqual({
      format: "jpeg",
      width: 120,
      height: 90,
    });
  });

  /**
   * The reason JPEG_SOF omits C4. A Huffman table before the frame is entirely
   * ordinary, and a parser that treats every 0xCx as a frame header reads its
   * dimensions out of the table and answers confident nonsense.
   */
  it("does not mistake a Huffman table (DHT, 0xC4) for a frame header", () => {
    const dht = [0xc4, ...Array.from({ length: 30 }, (_, i) => i)];
    expect(sniffImage(jpeg(300, 200, { segments: [dht] }))).toEqual({
      format: "jpeg",
      width: 300,
      height: 200,
    });
  });

  it("skips 0xFF fill bytes between segments", () => {
    const withFill = bytes(
      [0xff, 0xd8, 0xff, 0xff, 0xff, 0xc0],
      be16(17),
      [8],
      be16(48), // height comes first in a SOF segment
      be16(64),
      [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
    );
    expect(sniffImage(withFill)).toEqual({ format: "jpeg", width: 64, height: 48 });
  });

  it("reads lossy WebP (VP8 ) dimensions, masking off the scaling bits", () => {
    expect(sniffImage(webpLossy(1024, 768))).toEqual({
      format: "webp",
      width: 1024,
      height: 768,
    });
  });

  it("reads lossless WebP (VP8L) dimensions from the packed 14-bit pair", () => {
    expect(sniffImage(webpLossless(333, 512))).toEqual({
      format: "webp",
      width: 333,
      height: 512,
    });
  });

  /** The variant a modern encoder emits for anything with an alpha channel. */
  it("reads extended WebP (VP8X) canvas dimensions", () => {
    expect(sniffImage(webpExtended(2048, 1080))).toEqual({
      format: "webp",
      width: 2048,
      height: 1080,
    });
  });

  it("ignores the RIFF container's own size claim", () => {
    // le32(0) above says the file is empty; the dimensions are still read.
    expect(sniffImage(webpLossy(200, 200))?.width).toBe(200);
  });
});

describe("sniffImage — everything else is refused", () => {
  /**
   * None of these are named anywhere in image-sniff.ts. They are refused
   * because they are not one of three allowed formats, which is the property
   * worth pinning: the list below can grow without the module changing.
   */
  const refused: [string, Uint8Array][] = [
    ["an SVG", bytes('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ["an XML-prologued SVG", bytes('<?xml version="1.0"?><svg/>')],
    ["an HTML page", bytes("<!DOCTYPE html><html><body>hi</body></html>")],
    ["a Windows executable", bytes("MZ", [0x90, 0x00, 0x03, 0x00, 0x00, 0x00])],
    ["an ELF binary", bytes([0x7f], "ELF", [2, 1, 1, 0])],
    ["a shell script", bytes("#!/bin/sh\nrm -rf /\n")],
    ["a zip or jar", bytes("PK", [0x03, 0x04], [0x14, 0x00, 0x00, 0x00])],
    ["a PDF", bytes("%PDF-1.7\n")],
    ["a GIF", bytes("GIF89a", le16(10), le16(10))],
    ["a BMP", bytes("BM", le32(70), [0, 0, 0, 0])],
    ["a little-endian TIFF", bytes("II", [0x2a, 0x00], le32(8))],
    ["an empty file", new Uint8Array(0)],
    ["plain text", bytes("kjo nuk është foto")],
  ];

  for (const [what, buffer] of refused) {
    it(`refuses ${what}`, () => {
      expect(sniffImage(buffer)).toBeNull();
    });
  }

  it("refuses a PNG signature with no IHDR after it", () => {
    expect(sniffImage(bytes(PNG_SIG, be32(13), "IDAT", be32(10), be32(10)))).toBeNull();
  });

  it("refuses a PNG truncated before its dimensions", () => {
    expect(sniffImage(png(10, 10).slice(0, 20))).toBeNull();
  });

  it("refuses a JPEG whose scan starts with no frame header", () => {
    expect(sniffImage(bytes([0xff, 0xd8, 0xff, 0xda], be16(12), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it("refuses a JPEG segment whose declared length runs past the buffer", () => {
    expect(sniffImage(bytes([0xff, 0xd8, 0xff, 0xe0], be16(9000), "JFIF"))).toBeNull();
  });

  it("refuses a JPEG segment with an impossible length", () => {
    expect(sniffImage(bytes([0xff, 0xd8, 0xff, 0xe0], be16(1), [0, 0, 0, 0]))).toBeNull();
  });

  it("refuses a RIFF/WEBP container with an unknown payload", () => {
    expect(sniffImage(bytes("RIFF", le32(30), "WEBP", "AVIF", le32(10), [0, 0, 0, 0]))).toBeNull();
  });

  it("refuses a RIFF that is not WEBP", () => {
    expect(sniffImage(bytes("RIFF", le32(30), "WAVE", "fmt ", le32(16)))).toBeNull();
  });

  it("refuses lossy WebP without the keyframe start code", () => {
    const broken = webpLossy(100, 100);
    broken[23] = 0x00;
    expect(sniffImage(broken)).toBeNull();
  });

  it("refuses lossy WebP whose first frame is not a keyframe", () => {
    const interframe = webpLossy(100, 100);
    interframe[20] = 0x01;
    expect(sniffImage(interframe)).toBeNull();
  });

  it("refuses lossless WebP without its signature byte", () => {
    const broken = webpLossless(100, 100);
    broken[20] = 0x00;
    expect(sniffImage(broken)).toBeNull();
  });

  it("refuses a header that parses to a zero dimension", () => {
    expect(sniffImage(png(0, 100))).toBeNull();
    expect(sniffImage(jpeg(100, 0))).toBeNull();
  });
});

describe("withinDimensionLimits", () => {
  const at = (width: number, height: number) =>
    withinDimensionLimits({ format: "png", width, height });

  it("accepts the catalogue's own 1000x1000 photos", () => {
    expect(at(1000, 1000)).toBe(true);
  });

  it("accepts exactly the bounds", () => {
    expect(at(MIN_DIMENSION, MIN_DIMENSION)).toBe(true);
    expect(at(MAX_DIMENSION, MAX_DIMENSION)).toBe(true);
  });

  it("refuses a tracking pixel", () => {
    expect(at(1, 1)).toBe(false);
    expect(at(MIN_DIMENSION - 1, 500)).toBe(false);
  });

  it("refuses anything past the decode ceiling, on either axis", () => {
    expect(at(MAX_DIMENSION + 1, 500)).toBe(false);
    expect(at(500, MAX_DIMENSION + 1)).toBe(false);
    expect(at(5000, 5000)).toBe(false);
  });
});

describe("formatFromMime", () => {
  it("maps the three accepted types", () => {
    expect(formatFromMime("image/png")).toBe("png");
    expect(formatFromMime("image/jpeg")).toBe("jpeg");
    expect(formatFromMime("image/webp")).toBe("webp");
  });

  it("tolerates casing and a parameter, which browsers do send", () => {
    expect(formatFromMime("IMAGE/PNG")).toBe("png");
    expect(formatFromMime("image/jpeg; charset=binary")).toBe("jpeg");
  });

  it("refuses types the site cannot render", () => {
    expect(formatFromMime("image/svg+xml")).toBeNull();
    expect(formatFromMime("image/gif")).toBeNull();
    expect(formatFromMime("text/html")).toBeNull();
    expect(formatFromMime("application/octet-stream")).toBeNull();
    expect(formatFromMime("")).toBeNull();
  });
});

describe("formatFromExtension", () => {
  it("treats jpg and jpeg as one format", () => {
    expect(formatFromExtension("foto.jpg")).toBe("jpeg");
    expect(formatFromExtension("foto.jpeg")).toBe("jpeg");
  });

  it("is case-insensitive and reads only the last extension", () => {
    expect(formatFromExtension("FOTO.PNG")).toBe("png");
    expect(formatFromExtension("foto.png.webp")).toBe("webp");
  });

  it("refuses a double extension that ends badly", () => {
    expect(formatFromExtension("foto.png.svg")).toBeNull();
    expect(formatFromExtension("foto.jpg.exe")).toBeNull();
  });

  it("refuses a name with no extension", () => {
    expect(formatFromExtension("foto")).toBeNull();
    expect(formatFromExtension("")).toBeNull();
  });
});
