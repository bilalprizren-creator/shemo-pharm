import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { MINUTE_MS, rateLimited } from "@/lib/rate-limit";

/**
 * TEMPORARY — delete once the missing-photos question is settled.
 *
 * Every product photo on the katalog-preview deployment renders as a broken
 * image, and opening the file directly answers 404 — while the same file is in
 * the branch on GitHub and the same code serves it locally. That leaves exactly
 * two candidates, and both live in the deploy step rather than in the code:
 * the deployment was built from a different commit than the branch head, or it
 * carries the commit but not the file. Neither is visible from the outside; this
 * route makes both visible in one request.
 *
 *   commit  — which commit this deployment actually is (VERCEL_GIT_COMMIT_SHA).
 *             The branch head is ea87d2a; anything else means a stale build.
 *   files   — the deployment fetching its own static assets. 200 on the plain
 *             photo and 404 on the -cutout one is the smoking gun for a build
 *             that predates the cut-outs; 404 on both means public/products is
 *             missing altogether; 401 on both means deployment protection is
 *             answering instead of the CDN.
 *   db      — the path the database hands the renderer, i.e. the file the page
 *             asks for. The shop and the catalogue read the image path out of
 *             Postgres, so a database ahead of the deployment shows up here.
 */
const SAMPLE = "0108-tensiometer-digjital-ye660d-me-adapter-comfort-0108";

async function statusOf(url: string): Promise<number | string> {
  try {
    // HEAD is enough — nothing here needs the bytes, only whether they exist.
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.status;
  } catch (error) {
    return error instanceof Error ? error.message : "fetch failed";
  }
}

export async function GET(request: Request) {
  // A debug route still answers to the whole internet; the ceiling is low
  // because nothing legitimate calls this in a loop.
  if (await rateLimited("deploy-info", { limit: 20, windowMs: MINUTE_MS })) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  const origin = new URL(request.url).origin;
  const [cutout, plain] = await Promise.all([
    statusOf(`${origin}/products/${SAMPLE}-cutout.webp`),
    statusOf(`${origin}/products/${SAMPLE}.webp`),
  ]);

  let dbImages: unknown = null;
  let dbError: string | null = null;
  try {
    const rows = await sql`SELECT images FROM products WHERE sku = '0108' LIMIT 1`;
    dbImages = rows[0]?.images ?? null;
  } catch (error) {
    dbError = error instanceof Error ? error.message : "query failed";
  }

  return NextResponse.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "not on vercel",
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? null,
      files: {
        [`/products/${SAMPLE}-cutout.webp`]: cutout,
        [`/products/${SAMPLE}.webp`]: plain,
      },
      db: { images: dbImages, error: dbError },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
