"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { CircleAlert, ImageUp, Loader2 } from "lucide-react";

/**
 * Uploads a photo to the blob store and hands back its public URL.
 *
 * A companion to the URL textarea rather than a replacement for it: URLs that
 * already exist (the 2 049 photos in public/products, anything still on the
 * old site) stay perfectly good, and this only removes the need for a
 * developer when the photo exists nowhere yet.
 *
 * The file never passes through our server — see the route at
 * /api/admin/upload for why.
 */

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * What to tell the editor when an upload fails.
 *
 * This used to answer "Ngarkimi dështoi. Provoni përsëri." to everything, which
 * is the worst possible answer to the failure that actually happened: the blob
 * store hit its free-tier write limit and was suspended, and no amount of
 * retrying was ever going to change that. The provider says so plainly; the
 * panel should too.
 *
 * The session case cannot be read off a status code, because @vercel/blob
 * replaces any non-OK answer from our token route with a fixed string — so 401
 * (session expired), 429 (rate limited) and 400 (name refused) all arrive here
 * looking identical, and the message names the likely causes instead of
 * pretending to know. Anything unrecognised shows the provider's own words:
 * this is an internal tool, and an editor who can quote the real error gets
 * help faster than one who can only say it did not work.
 *
 * Exported for tests.
 */
export function uploadErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";

  if (/suspended|store has been suspended/i.test(raw)) {
    return "Depoja e fotove (Vercel Blob) është e pezulluar, prandaj ngarkimet e reja nuk pranohen. Fotot ekzistuese nuk preken. Kontaktoni zhvilluesin — riprovimi nuk ndihmon.";
  }
  if (/quota|limit exceeded|too large|maximum/i.test(raw)) {
    return "Depoja e fotove e ka arritur kufirin. Kontaktoni zhvilluesin — riprovimi nuk ndihmon.";
  }
  if (/retrieve the client token/i.test(raw)) {
    return "Serveri nuk e lejoi ngarkimin. Ka gjasa që sesioni ka skaduar — rifreskoni faqen dhe kyçuni sërish.";
  }
  if (/failed to fetch|network/i.test(raw)) {
    return "Lidhja u ndërpre gjatë ngarkimit. Kontrolloni internetin dhe provoni përsëri.";
  }
  return raw ? `Ngarkimi dështoi: ${raw}` : "Ngarkimi dështoi. Provoni përsëri.";
}

/**
 * The blob path for a chosen file. Mirrors the pattern the upload route
 * enforces, so a rejected name is caught here with a readable message rather
 * than as a 400 from the token endpoint.
 */
function blobPath(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = (dot > 0 ? fileName.slice(dot + 1) : "").toLowerCase();
  if (!["png", "jpg", "jpeg", "webp"].includes(ext)) return null;

  const cleaned = stem
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+|-+$/g, "")
    .slice(0, 60);

  return `products/${cleaned || "foto"}.${ext}`;
}

export function ImageUploadField({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const tooBig = Array.from(files).find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" është më e madhe se 5 MB.`);
      return;
    }

    setBusy(true);
    try {
      // Sequential, not parallel: each file needs its own token from our
      // route, and a pharmacy adds photos one or two at a time.
      for (const file of Array.from(files)) {
        const path = blobPath(file.name);
        if (!path) {
          setError(`"${file.name}": lejohen vetëm PNG, JPG ose WebP.`);
          break;
        }
        const blob = await upload(path, file, {
          access: "public",
          handleUploadUrl: "/api/admin/upload",
        });
        onUploaded(blob.url);
      }
    } catch (err) {
      // Logged as well as shown: the panel gets a sentence, the console keeps
      // the whole error for whoever is asked to look at it.
      console.error("[upload] failed:", err);
      setError(uploadErrorMessage(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        // Not part of the form data: the file goes to the blob store, and what
        // the form submits is the URL this puts into the textarea.
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
        id="foto-upload"
      />
      <label
        htmlFor="foto-upload"
        aria-disabled={busy}
        className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-dashed px-4 py-2 text-sm font-semibold transition-colors ${
          busy
            ? "cursor-wait border-ink-900/15 text-ink-400"
            : "border-brand-300 text-brand-700 hover:border-brand-500 hover:bg-brand-50"
        }`}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <ImageUp className="size-4" aria-hidden />
        )}
        {busy ? "Duke ngarkuar…" : "Ngarko foto"}
      </label>
      <p className="mt-1 text-xs text-ink-400">
        PNG, JPG ose WebP, deri në 5 MB. URL-ja shtohet automatikisht më lart.
      </p>
      {error && (
        <p role="alert" className="mt-1 flex items-start gap-1.5 text-xs font-medium text-red-700">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
