/**
 * What a file actually is, read from its own bytes.
 *
 * The admin uploader used to hand the browser a token and let it write straight
 * to the blob store, which meant the only thing our server ever saw about a
 * photo was the name and the content type the browser claimed for it. Both are
 * typed by the caller and neither is evidence. This module supplies the
 * evidence: the first bytes of the file, matched against the three formats the
 * site can actually render.
 *
 * An allow list of three, not a deny list of the dangerous ones. That is the
 * whole point — an SVG (which is a script container), an HTML page, a Windows
 * executable, an ELF binary, a shell script, a zip, a PDF: none of them are
 * rejected by name here, they are rejected because they are not a PNG, a JPEG
 * or a WebP. A deny list has to be extended every time somebody invents a new
 * way to be dangerous; this does not.
 *
 * No dependencies, and deliberately no `server-only`: everything here is pure
 * byte arithmetic, which is exactly what wants a unit test rather than a
 * deployment. `sharp` would answer the same question, but it is a native binary
 * that this project only installs to run one migration script, and paying its
 * cold start on every photo upload to learn what ninety lines of header parsing
 * already tell us is a bad trade.
 */

export type ImageFormat = "png" | "jpeg" | "webp";

export interface ImageInfo {
  format: ImageFormat;
  width: number;
  height: number;
}

/** The content type to store the object with — ours, not the browser's claim. */
export const IMAGE_MIME: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** The extension to name the object with, likewise. */
export const IMAGE_EXT: Record<ImageFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

/** The declared content types the upload route accepts, in the same order. */
export const ACCEPTED_MIME: readonly string[] = Object.values(IMAGE_MIME);

/**
 * The largest photo the upload route accepts.
 *
 * Vercel caps a function's whole request body at 4.5 MB and that is not
 * configurable, so this sits well under it rather than on the edge — over the
 * platform limit the request never reaches our code and the caller gets an
 * opaque failure. Lives here, next to the other upload constraints, so the route
 * and the field in the admin form cannot disagree about it.
 */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** The same number as the editor should read it. */
export const MAX_UPLOAD_LABEL = "2 MB";

/**
 * Dimension bounds. The floor rejects the 1x1 tracking pixels and stray
 * favicons that get dragged into a product form by accident; the ceiling caps
 * the decode cost of anything the site will later hand to next/image, at
 * 4096 x 4096 = 16.7 megapixels. Product photography here is 1000 x 1000.
 */
export const MIN_DIMENSION = 16;
export const MAX_DIMENSION = 4096;

/**
 * How much of the file to look at. A JPEG's frame header sits after however
 * many EXIF, ICC and comment segments the camera felt like writing, so it is
 * not at a fixed offset — but 64 KB is far past anything a real encoder
 * produces, and a file that hides its dimensions further in than that is not a
 * case worth accommodating.
 */
export const SNIFF_BYTES = 64 * 1024;

/* ------------------------------ byte readers ------------------------------ */

// Every reader is bounds-checked and returns null past the end, so a truncated
// file is a rejection rather than a NaN that survives into a dimension check.

function u16be(b: Uint8Array, at: number): number | null {
  if (at + 2 > b.length) return null;
  return (b[at]! << 8) | b[at + 1]!;
}

function u32be(b: Uint8Array, at: number): number | null {
  if (at + 4 > b.length) return null;
  // >>> 0 keeps a high bit set from turning the result negative.
  return ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0;
}

function u16le(b: Uint8Array, at: number): number | null {
  if (at + 2 > b.length) return null;
  return b[at]! | (b[at + 1]! << 8);
}

function u24le(b: Uint8Array, at: number): number | null {
  if (at + 3 > b.length) return null;
  return b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);
}

function u32le(b: Uint8Array, at: number): number | null {
  if (at + 4 > b.length) return null;
  return (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;
}

function startsWith(b: Uint8Array, sig: readonly number[], at = 0): boolean {
  if (at + sig.length > b.length) return false;
  for (let i = 0; i < sig.length; i += 1) if (b[at + i] !== sig[i]) return false;
  return true;
}

/** Compares a four-character tag without allocating a string per attempt. */
function ascii(b: Uint8Array, at: number, tag: string): boolean {
  if (at + tag.length > b.length) return false;
  for (let i = 0; i < tag.length; i += 1) {
    if (b[at + i] !== tag.charCodeAt(i)) return false;
  }
  return true;
}

/* --------------------------------- PNG ----------------------------------- */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/**
 * PNG puts its dimensions in IHDR, which the format requires to be the first
 * chunk — so this needs no chunk walking. The length and type are checked as
 * well as the signature: eight matching magic bytes followed by something that
 * is not an IHDR is not a PNG anybody can decode, and accepting it would mean
 * trusting whatever came after.
 */
function sniffPng(b: Uint8Array): ImageInfo | null {
  if (!startsWith(b, PNG_SIGNATURE)) return null;
  if (u32be(b, 8) !== 13) return null; // IHDR's length is fixed at 13
  if (!ascii(b, 12, "IHDR")) return null;

  const width = u32be(b, 16);
  const height = u32be(b, 20);
  if (width === null || height === null) return null;
  return { format: "png", width, height };
}

/* --------------------------------- JPEG ---------------------------------- */

/**
 * Start Of Frame markers — the segments that carry the dimensions.
 *
 * C4, C8 and CC are deliberately absent. They sit inside the Cx range and look
 * like they belong (C4 is the Huffman table, CC the arithmetic coding
 * conditioning, C8 a reserved extension), but they are not frame headers, and
 * reading dimensions out of a Huffman table is the standard bug in a hand
 * rolled JPEG parser. A DHT segment before the frame is completely ordinary,
 * so this is not a theoretical distinction.
 */
const JPEG_SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

/** Markers that stand alone — no length, no payload to skip over. */
const JPEG_STANDALONE = new Set([0xd8, 0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7]);

function sniffJpeg(b: Uint8Array): ImageInfo | null {
  if (!startsWith(b, [0xff, 0xd8, 0xff])) return null;

  let p = 2;
  while (p + 1 < b.length) {
    if (b[p] !== 0xff) return null; // lost marker sync — not a file we trust

    // Any number of 0xFF fill bytes may precede a marker.
    let marker = b[p + 1]!;
    while (marker === 0xff) {
      p += 1;
      if (p + 1 >= b.length) return null;
      marker = b[p + 1]!;
    }

    if (JPEG_STANDALONE.has(marker)) {
      p += 2;
      continue;
    }
    // Start of scan or end of image: the entropy-coded data begins and no frame
    // header was found on the way. Refuse rather than guess.
    if (marker === 0xda || marker === 0xd9) return null;

    const length = u16be(b, p + 2);
    if (length === null || length < 2) return null; // the length counts itself

    if (JPEG_SOF.has(marker)) {
      // p+4 is the sample precision; the dimensions follow it, height first.
      const height = u16be(b, p + 5);
      const width = u16be(b, p + 7);
      if (width === null || height === null) return null;
      return { format: "jpeg", width, height };
    }

    p += 2 + length;
  }
  return null;
}

/* --------------------------------- WebP ----------------------------------- */

/**
 * WebP is a RIFF container with three different payloads, and a photo saved by
 * a modern tool can be any of them: VP8 for plain lossy, VP8L for lossless,
 * VP8X for the extended form used whenever there is an alpha channel or an ICC
 * profile. Handling only the first — the shape every tutorial shows — would
 * reject perfectly good transparent PNG-to-WebP conversions.
 *
 * The RIFF size field at bytes 4..7 is read by nobody here. It is the file's
 * own claim about its length, and this module is in the business of not
 * believing the file about anything it can check directly.
 */
function sniffWebp(b: Uint8Array): ImageInfo | null {
  if (!ascii(b, 0, "RIFF") || !ascii(b, 8, "WEBP")) return null;

  // Lossy. Note the trailing space: the FourCC is four characters.
  if (ascii(b, 12, "VP8 ")) {
    // Bit 0 of the frame tag is the frame type; an interframe cannot be first.
    if (b.length <= 20 || (b[20]! & 1) !== 0) return null;
    if (!startsWith(b, [0x9d, 0x01, 0x2a], 23)) return null; // keyframe start code
    const w = u16le(b, 26);
    const h = u16le(b, 28);
    if (w === null || h === null) return null;
    // The top two bits of each are horizontal/vertical scaling, not size.
    return { format: "webp", width: w & 0x3fff, height: h & 0x3fff };
  }

  // Lossless: one signature byte, then width and height packed as 14 bits each,
  // stored one less than their real value.
  if (ascii(b, 12, "VP8L")) {
    if (b.length <= 20 || b[20] !== 0x2f) return null;
    const bits = u32le(b, 21);
    if (bits === null) return null;
    return {
      format: "webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }

  // Extended: a flags byte, three reserved, then the canvas size as two 24-bit
  // little-endian values, each also stored one less than its real value.
  if (ascii(b, 12, "VP8X")) {
    const w = u24le(b, 24);
    const h = u24le(b, 27);
    if (w === null || h === null) return null;
    return { format: "webp", width: w + 1, height: h + 1 };
  }

  return null;
}

/* -------------------------------- the gate -------------------------------- */

/**
 * The format and true dimensions of `bytes`, or null if it is not one of the
 * three formats this site serves.
 *
 * Null is the answer for everything else, and that includes every file type
 * requirement five names: `<svg`, `<?xml`, `<!DOCTYPE html`, `MZ`, `\x7fELF`,
 * `#!`, `PK\x03\x04`, `%PDF`, `GIF8`, `BM`, `II*\0`. None of them is listed
 * anywhere in this file — they fail because they are not on the allow list.
 */
export function sniffImage(bytes: Uint8Array): ImageInfo | null {
  const info = sniffPng(bytes) ?? sniffJpeg(bytes) ?? sniffWebp(bytes);
  if (!info) return null;
  // A zero or absurd dimension means the header parsed but says nothing usable.
  if (!Number.isInteger(info.width) || !Number.isInteger(info.height)) return null;
  if (info.width <= 0 || info.height <= 0) return null;
  return info;
}

/** Whether a sniffed image is within the bounds the site is willing to serve. */
export function withinDimensionLimits(info: ImageInfo): boolean {
  return (
    info.width >= MIN_DIMENSION &&
    info.height >= MIN_DIMENSION &&
    info.width <= MAX_DIMENSION &&
    info.height <= MAX_DIMENSION
  );
}

/** The format a declared content type claims, or null if it claims none of them. */
export function formatFromMime(mime: string): ImageFormat | null {
  const value = mime.trim().toLowerCase().split(";")[0]!.trim();
  for (const [format, expected] of Object.entries(IMAGE_MIME)) {
    if (expected === value) return format as ImageFormat;
  }
  return null;
}

/**
 * The format a filename's extension claims, or null. Used only to check that
 * the name, the declared type and the bytes all tell the same story — the name
 * itself never reaches the blob store.
 */
export function formatFromExtension(fileName: string): ImageFormat | null {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (ext === "png") return "png";
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  if (ext === "webp") return "webp";
  return null;
}

/* ------------------------- the rule, in one place ------------------------- */

/**
 * Why a file was refused. These are exactly the codes the upload route answers
 * with and the keys the admin form turns into sentences, so the set is closed and
 * shared rather than restated on each side.
 */
export type RejectionCode =
  | "bad_type"
  | "bad_ext"
  | "not_an_image"
  | "type_mismatch"
  | "bad_dimensions";

export type ImageVerdict =
  | { ok: true; info: ImageInfo }
  /** `detail` is for the server log — never for the caller. */
  | { ok: false; code: RejectionCode; detail: string };

/**
 * The whole upload rule, given a file's claimed type, its name and its leading
 * bytes.
 *
 * One function, called by both sides. The route calls it because that is the only
 * place a check counts; the admin form calls it *before* uploading, so an editor
 * who picks the wrong file is told at once instead of waiting for a round trip to
 * find out. Because it is literally the same code, the two answers cannot
 * disagree — and disagreement is what makes client-side validation worse than
 * none: a browser that accepts what the server refuses, or refuses what the
 * server would have taken.
 *
 * The three claims must agree. Each alone is weak — the content type and the
 * filename are both typed by the caller, and the bytes alone would happily let a
 * JPEG be stored as .png — so agreement is the check, with the bytes as tiebreak.
 */
export function verifyImageBytes({
  declaredMime,
  fileName,
  head,
}: {
  declaredMime: string;
  fileName: string;
  head: Uint8Array;
}): ImageVerdict {
  const declared = formatFromMime(declaredMime);
  if (!declared) {
    return { ok: false, code: "bad_type", detail: `declared ${declaredMime || "nothing"}` };
  }

  const byName = formatFromExtension(fileName);
  if (!byName) return { ok: false, code: "bad_ext", detail: `named ${fileName}` };
  if (byName !== declared) {
    return { ok: false, code: "bad_ext", detail: `${fileName} declared as ${declaredMime}` };
  }

  const info = sniffImage(head);
  if (!info) {
    return { ok: false, code: "not_an_image", detail: `${fileName} is not a PNG/JPEG/WebP` };
  }
  if (info.format !== declared) {
    return {
      ok: false,
      code: "type_mismatch",
      detail: `${fileName} declared ${declared}, is ${info.format}`,
    };
  }
  if (!withinDimensionLimits(info)) {
    return {
      ok: false,
      code: "bad_dimensions",
      detail: `${info.width}x${info.height} outside ${MIN_DIMENSION}..${MAX_DIMENSION}`,
    };
  }

  return { ok: true, info };
}
