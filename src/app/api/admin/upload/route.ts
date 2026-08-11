import { NextResponse, type NextRequest } from "next/server";
import {
  BlobServiceNotAvailable,
  BlobServiceRateLimited,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  put,
} from "@vercel/blob";
import { apiError, requireAdminApi } from "@/lib/api-guard";
import { randomBytes } from "node:crypto";
import {
  IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  SNIFF_BYTES,
  verifyImageBytes,
  type RejectionCode,
} from "@/lib/image-sniff";
import { blobObjectName, isAllowedImageSrc } from "@/lib/images";
import { MINUTE_MS, rateLimited } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/security-log";

/**
 * Stores a product photo, having first established that it is one.
 *
 * This used to hand the browser a signed token and let it write to the blob
 * store directly, which kept a multi-megabyte file out of the function — a real
 * benefit, paid for with the only thing that matters here: the server never saw
 * the bytes. It could check the *name* the browser proposed and the content type
 * the browser *claimed*, and nothing else. Both are typed by the caller. An
 * admin session was therefore enough to park arbitrary content at a public URL
 * under a .png name.
 *
 * So the file comes through the function now, and every question gets asked of
 * the bytes rather than of the caller:
 *
 *   - the declared content type, the filename's extension and the file's actual
 *     signature must all name the same one of PNG / JPEG / WebP. Checking that
 *     three independent claims agree is stronger than checking any one of them,
 *     and it is what stops an SVG called foto.png with a lying Content-Type;
 *   - the dimensions are read out of the header, so a decompression bomb is
 *     refused before anything tries to render it;
 *   - the stored name is sixteen random bytes plus the extension the *bytes*
 *     imply, so the caller no longer chooses where its own file lands.
 *
 * The cost is a ceiling. Vercel caps a function's request body at 4.5 MB and
 * that is not configurable, so MAX_UPLOAD_BYTES (in lib/image-sniff.ts, shared
 * with the admin form) sits well under it. Product photography in this catalogue
 * runs 30–45 KB, so the ceiling is theoretical — but if it ever genuinely binds,
 * the only way back up is client-direct uploads, and that means giving up
 * everything in the list above.
 *
 * Scale note, still true and still learned the hard way: the blob store was once
 * blocked by a bulk migration that spent two thousand free write operations in a
 * single run. This route is for the handful of photos a pharmacy adds in a month
 * — never point a bulk importer at it.
 */

/**
 * 415 for "you sent the wrong kind of thing", 422 for "the bytes are not what you
 * said they were" — the distinction matters to the panel, which tells the editor
 * to pick a different file in the first case and that renaming will not help in
 * the second.
 */
const STATUS_FOR: Record<RejectionCode, number> = {
  bad_type: 415,
  bad_ext: 415,
  not_an_image: 422,
  type_mismatch: 422,
  bad_dimensions: 422,
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const guard = await requireAdminApi(request, { mutating: true });
  if (!guard.ok) return guard.response;
  const admin = guard.value;

  if (await rateLimited("admin-upload", { limit: 30, windowMs: MINUTE_MS })) {
    return reject("rate_limited", 429, admin.email, "over the per-minute limit");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return reject("bad_type", 415, admin.email, `request was ${contentType || "untyped"}`);
  }

  // Checked before the body is touched, so an oversized upload is refused
  // without being buffered. Content-Length is caller-supplied and a chunked body
  // may omit it, which is why file.size is checked again below.
  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return reject("too_large", 413, admin.email, `content-length ${declaredLength}`);
  }

  let file: File;
  try {
    const field = (await request.formData()).get("file");
    if (!(field instanceof File)) {
      return reject("no_file", 400, admin.email, "no file field in the form");
    }
    file = field;
  } catch {
    return reject("bad_form", 400, admin.email, "multipart body would not parse");
  }

  if (file.size === 0) return reject("no_file", 400, admin.email, "empty file");
  if (file.size > MAX_UPLOAD_BYTES) {
    return reject("too_large", 413, admin.email, `${file.size} bytes`);
  }

  // The claimed type, the filename's extension and the actual signature must all
  // name the same format, and the dimensions must be sane. One shared function,
  // because the admin form runs the identical check before it uploads — see
  // verifyImageBytes.
  const verdict = verifyImageBytes({
    declaredMime: file.type,
    fileName: file.name,
    head: new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()),
  });
  if (!verdict.ok) {
    return reject(verdict.code, STATUS_FOR[verdict.code], admin.email, verdict.detail);
  }
  const { info } = verdict;

  const pathname = blobObjectName(info.format, randomBytes(16).toString("hex"));

  try {
    const blob = await put(pathname, file, {
      access: "public",
      // The name already carries 128 bits of entropy, so a suffix adds nothing —
      // and off means the URL that comes back is the name we chose.
      addRandomSuffix: false,
      // A collision at 128 bits would mean something is badly wrong; it should
      // be a loud error, not a silently replaced photo.
      allowOverwrite: false,
      // Ours, from the signature — never the browser's claim.
      contentType: IMAGE_MIME[info.format],
    });

    // The product form re-checks every image URL against the same allow list on
    // save. Checking here too means a store whose hostname has changed shows up
    // as one failed upload rather than as a product that will not save.
    if (!isAllowedImageSrc(blob.url)) {
      console.error("[upload] stored URL is not on the image allow list:", blob.url);
      return reject("store_error", 502, admin.email, "stored URL not allow-listed");
    }

    await logSecurityEvent("upload-accepted", {
      by: admin.email,
      pathname: blob.pathname,
      format: info.format,
      bytes: file.size,
      dimensions: `${info.width}x${info.height}`,
    });

    return NextResponse.json(
      { url: blob.url },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    // The provider's own error text stays in the runtime log. What crosses the
    // wire is a code, so the panel can say something true about a suspended
    // store without the answer carrying provider internals.
    console.error("[upload] the blob store refused the write:", err);

    if (err instanceof BlobStoreSuspendedError) {
      return reject("store_suspended", 503, admin.email, "store suspended");
    }
    if (err instanceof BlobServiceRateLimited) {
      return reject("store_rate_limited", 503, admin.email, "store rate limited");
    }
    if (err instanceof BlobServiceNotAvailable || err instanceof BlobStoreNotFoundError) {
      return reject("storage_unavailable", 503, admin.email, "store unavailable");
    }
    // Also the shape of a missing BLOB_READ_WRITE_TOKEN, which is a deployment
    // problem rather than something the editor can act on.
    if (err instanceof Error && /BLOB_READ_WRITE_TOKEN|No token found/i.test(err.message)) {
      return reject("storage_unavailable", 503, admin.email, "no store token configured");
    }
    return reject("store_error", 502, admin.email, "unexpected store error");
  }
}

/**
 * One place for "refuse, and write down why". `reason` goes to the log; only
 * `code` crosses the wire.
 */
async function reject(
  code: string,
  status: number,
  by: string,
  reason: string
): Promise<NextResponse> {
  await logSecurityEvent("upload-rejected", { by, code, reason });
  return apiError(code, status);
}
