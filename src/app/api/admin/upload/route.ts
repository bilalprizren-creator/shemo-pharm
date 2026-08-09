import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession, isAdmin } from "@/lib/auth";
import { MINUTE_MS, rateLimited } from "@/lib/rate-limit";

/**
 * Issues short-lived upload tokens for product photos.
 *
 * Client upload, not a server proxy: the browser sends the file straight to
 * the blob store and this route only decides whether it may. That keeps a
 * multi-megabyte photo out of the serverless function's request body, and out
 * of its memory and time budget.
 *
 * Until now the product form accepted image URLs only, so putting a new
 * product on the site with its photo needed a developer and a deploy. The
 * store is already on the next/image allow list (see src/lib/images.ts), so a
 * URL that comes back from here is renderable the moment it is saved.
 *
 * Scale note, learned the hard way: the blob store was once blocked by a bulk
 * migration that spent two thousand free write operations in a single run.
 * This route is for the handful of photos a pharmacy adds in a month — never
 * point a bulk importer at it.
 */

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

/**
 * The destination path is chosen by the caller, so it is checked here rather
 * than trusted: everything lands under products/, lowercase, with a picture
 * extension and no path traversal. handleUpload gives no way to rewrite the
 * path from the server — only to refuse it.
 */
const SAFE_PATHNAME = /^products\/[a-z0-9][a-z0-9._-]{0,79}\.(png|jpe?g|webp)$/;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // The only place authorization can live. onUploadCompleted (which
        // this route does not use) is called by the blob service, not by the
        // browser, and carries no session cookie — a check there would be
        // checking nobody.
        //
        // requireAdmin() is deliberately not used: it answers with a redirect
        // to the login page, which is the right answer for a page and a
        // confusing one for a fetch. A thrown error becomes the 401 below.
        const session = await getSession();
        if (!isAdmin(session)) throw new Error("unauthorized");

        if (await rateLimited("admin-upload", { limit: 30, windowMs: MINUTE_MS })) {
          throw new Error("rate limited");
        }
        if (!SAFE_PATHNAME.test(pathname)) throw new Error("invalid pathname");

        return {
          allowedContentTypes: ALLOWED,
          maximumSizeInBytes: MAX_BYTES,
          // Two products may well both have a photo called "kutia.jpg";
          // without the suffix the second would overwrite the first.
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "upload failed";
    const status = message === "unauthorized" ? 401 : message === "rate limited" ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
