"use client";

import { useRef, useState } from "react";
import { CircleAlert, ImageUp, Loader2 } from "lucide-react";
import {
  ACCEPTED_MIME,
  MAX_DIMENSION,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  MIN_DIMENSION,
  SNIFF_BYTES,
  verifyImageBytes,
} from "@/lib/image-sniff";

/**
 * Uploads a photo and hands back its public URL.
 *
 * A companion to the URL textarea rather than a replacement for it: URLs that
 * already exist (the 2 049 photos in public/products, anything still on the
 * old site) stay perfectly good, and this only removes the need for a
 * developer when the photo exists nowhere yet.
 *
 * The file now goes to our own /api/admin/upload, which checks what it actually
 * is before storing it — see that route for why it stopped going straight to the
 * blob store. Two consequences here: the size cap is lower (the platform limits a
 * function's request body), and the answers this component has to read are ours,
 * so they can finally be specific.
 */

const ACCEPT = ACCEPTED_MIME.join(",");

/* ----------------------------- what to say ------------------------------- */

// Shared by both message functions below, so a condition cannot be described one
// way when it arrives as a status code and another way when it arrives thrown.
const MSG_SUSPENDED =
  "Depoja e fotove (Vercel Blob) është e pezulluar, prandaj ngarkimet e reja nuk pranohen. Fotot ekzistuese nuk preken. Kontaktoni zhvilluesin — riprovimi nuk ndihmon.";
const MSG_QUOTA =
  "Depoja e fotove e ka arritur kufirin. Kontaktoni zhvilluesin — riprovimi nuk ndihmon.";
const MSG_SESSION =
  "Serveri nuk e lejoi ngarkimin. Ka gjasa që sesioni ka skaduar — rifreskoni faqen dhe kyçuni sërish.";
const MSG_NETWORK =
  "Lidhja u ndërpre gjatë ngarkimit. Kontrolloni internetin dhe provoni përsëri.";
const MSG_GENERIC = "Ngarkimi dështoi. Provoni përsëri.";

/**
 * What to tell the editor when an upload fails.
 *
 * This used to answer "Ngarkimi dështoi. Provoni përsëri." to everything, which
 * is the worst possible answer to the failure that actually happened: the blob
 * store hit its free-tier write limit and was suspended, and no amount of
 * retrying was ever going to change that. The provider says so plainly; the
 * panel should too.
 *
 * This now handles only errors that were *thrown* — a dropped connection, a
 * response that would not parse. Anything the server answered deliberately comes
 * back with a status and a code and goes through uploadStatusMessage instead,
 * which is the part that used to be impossible: the old client-direct uploader
 * replaced any non-OK answer from our token route with one fixed string, so 401,
 * 429 and 400 all arrived looking identical and the message could only name the
 * likely causes. Anything still unrecognised shows the provider's own words: this
 * is an internal tool, and an editor who can quote the real error gets help
 * faster than one who can only say it did not work.
 *
 * Exported for tests.
 */
export function uploadErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";

  if (/suspended|store has been suspended/i.test(raw)) {
    return MSG_SUSPENDED;
  }
  if (/quota|limit exceeded|too large|maximum/i.test(raw)) {
    return MSG_QUOTA;
  }
  if (/retrieve the client token/i.test(raw)) {
    return MSG_SESSION;
  }
  if (/failed to fetch|network/i.test(raw)) {
    return MSG_NETWORK;
  }
  return raw ? `Ngarkimi dështoi: ${raw}` : MSG_GENERIC;
}

/**
 * What to tell the editor when the server refused, deliberately.
 *
 * The codes are the closed set the route answers with; each one is a different
 * thing for the editor to do about it, which is the entire reason the upload
 * stopped going straight to the store. The two that must never end in "provoni
 * përsëri" are the permanent ones — a suspended store and a file that is not an
 * image do not improve on a second attempt.
 *
 * Exported for tests.
 */
export function uploadStatusMessage(status: number, code?: string): string {
  switch (code) {
    case "store_suspended":
      return MSG_SUSPENDED;
    case "store_rate_limited":
    case "storage_unavailable":
      return MSG_QUOTA;
    case "unauthorized":
      return MSG_SESSION;
    case "bad_origin":
      return "Kërkesa nuk u pranua nga serveri. Rifreskoni faqen dhe provoni përsëri.";
    case "rate_limited":
      return "Shumë ngarkime njëherësh. Pritni një minutë dhe provoni përsëri.";
    case "too_large":
      return `Fotoja është më e madhe se ${MAX_UPLOAD_LABEL}. Zvogëlojeni dhe provoni përsëri.`;
    case "bad_type":
    case "bad_ext":
      return "Lejohen vetëm PNG, JPG ose WebP.";
    case "not_an_image":
    case "type_mismatch":
      return "Skedari nuk është foto PNG, JPG ose WebP e vlefshme, pavarësisht emrit.";
    case "bad_dimensions":
      return `Përmasat e fotos nuk pranohen: duhet të jenë mes ${MIN_DIMENSION} dhe ${MAX_DIMENSION} piksela.`;
    case "no_file":
    case "bad_form":
      return "Skedari nuk arriti i plotë. Provoni përsëri.";
    default:
      // A status we know the meaning of, with a code we do not.
      if (status === 401 || status === 403) return MSG_SESSION;
      if (status === 429) return "Shumë ngarkime njëherësh. Provoni përsëri pas një minute.";
      if (status >= 500) return MSG_QUOTA;
      return MSG_GENERIC;
  }
}

export function ImageUploadField({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    // Both checks below are courtesy, not enforcement: they save a round trip
    // and give a friendlier sentence than a status code. The server repeats them
    // — and adds the ones that need the bytes — because it is the only place a
    // check counts.
    const tooBig = Array.from(files).find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" është më e madhe se ${MAX_UPLOAD_LABEL}.`);
      return;
    }

    setBusy(true);
    try {
      // Sequential, not parallel: a pharmacy adds photos one or two at a time,
      // and the route's per-minute limit is not worth racing.
      for (const file of Array.from(files)) {
        // The route's own check, run here first — the identical function, so the
        // verdict cannot differ from the one the server would give. A wrong file
        // is refused before a single byte goes over the wire, and the editor reads
        // the same sentence they would have read after the round trip.
        const verdict = verifyImageBytes({
          declaredMime: file.type,
          fileName: file.name,
          head: new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()),
        });
        if (!verdict.ok) {
          setError(`"${file.name}": ${uploadStatusMessage(0, verdict.code)}`);
          break;
        }

        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body,
          // The route requires an Origin that matches, and refuses a request
          // that arrives without the session cookie.
          credentials: "same-origin",
        });

        if (!response.ok) {
          const code = await readErrorCode(response);
          console.error("[upload] refused:", response.status, code);
          setError(uploadStatusMessage(response.status, code));
          break;
        }

        const { url } = (await response.json()) as { url?: string };
        if (!url) {
          setError(MSG_GENERIC);
          break;
        }
        onUploaded(url);
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
        // Not part of the form data: the file is posted to the upload route, and
        // what this form submits is the URL that comes back, in the textarea.
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
        PNG, JPG ose WebP, deri në {MAX_UPLOAD_LABEL}. URL-ja shtohet automatikisht më lart.
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

/**
 * The route always answers a refusal with `{ error: "<code>" }`, but a failure
 * in front of it (a proxy, a platform 413 before our code runs) will not — so a
 * body that is not our JSON must not become an exception on top of an error.
 */
async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: unknown };
    return typeof body.error === "string" ? body.error : undefined;
  } catch {
    return undefined;
  }
}
