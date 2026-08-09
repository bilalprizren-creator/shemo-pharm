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
      // The route answers 401 for a session that has expired mid-edit, which
      // is the likeliest failure here — say so instead of "something failed".
      const message = err instanceof Error ? err.message : "";
      setError(
        /401|unauthorized/i.test(message)
          ? "Sesioni skadoi. Rifreskoni faqen dhe kyçuni sërish."
          : "Ngarkimi dështoi. Provoni përsëri."
      );
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
