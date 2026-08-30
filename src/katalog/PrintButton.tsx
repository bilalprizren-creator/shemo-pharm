"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { fmt } from "@/lib/i18n";

/**
 * Print if nothing further has loaded for this long. Not a deadline for the
 * whole run — a full catalogue is 1 733 photos and can legitimately take a
 * couple of minutes — but a way out when one request hangs for good.
 */
const STALL_MS = 30_000;

interface Progress {
  total: number;
  done: number;
}

function measure(): Progress {
  const images = Array.from(
    document.querySelectorAll<HTMLImageElement>(".print-sheet img")
  );
  // `complete` turns true on failure as well as success, which is what we want:
  // one broken photo must not hold the dialog shut.
  return { total: images.length, done: images.filter((image) => image.complete).length };
}

/**
 * Opens the browser's print dialog, where "Save as PDF" produces the catalogue
 * as a file. That is the whole PDF pipeline: no Puppeteer, no stored artifact,
 * and nothing that can go stale against the database.
 *
 * It waits first. `window.print()` freezes whatever the page looks like at that
 * instant, and a full run is 1 733 images the browser is still fetching — fired
 * straight away it produced a PDF of empty boxes. So the click queues, and the
 * dialog opens once every image has settled.
 *
 * The count is on show the whole time rather than only while queued, because
 * Ctrl+P cannot be held back — `beforeprint` has no way to wait — and somebody
 * who reaches for it deserves to see that the page is not ready yet.
 */
export function PrintButton({
  label,
  waitingLabel,
  progressLabel,
}: {
  label: string;
  waitingLabel: string;
  progressLabel: string;
}) {
  /** null until the first measurement, so a click in that gap does not read an
   *  empty page as a finished one. */
  const [progress, setProgress] = useState<Progress | null>(null);
  const [queued, setQueued] = useState(false);

  // Polled rather than listened for: one pass over `complete` every 300 ms is
  // cheaper than binding load and error handlers to 1 733 elements, and it also
  // counts the images that were already in the cache before this ran.
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const next = measure();
      setProgress(next);
      if (next.done < next.total) timer = window.setTimeout(tick, 300);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const ready = progress !== null && progress.done >= progress.total;

  useEffect(() => {
    if (!queued) return;
    // Ready means go, and the zero delay is not a formality: it lets React paint
    // the waiting label before the dialog freezes the page. Not ready means this
    // is the stall escape hatch, rearmed on every change to the count, so it
    // fires only once the run has genuinely stopped moving.
    const timer = window.setTimeout(
      () => {
        setQueued(false);
        window.print();
      },
      ready ? 0 : STALL_MS
    );
    return () => window.clearTimeout(timer);
  }, [queued, ready, progress]);

  const onClick = useCallback(() => setQueued(true), []);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={queued}
        className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-progress"
      >
        <Printer className="size-4" aria-hidden />
        {queued ? waitingLabel : label}
      </button>
      {progress !== null && !ready && (
        <span className="text-sm text-ink-500" aria-live="polite">
          {fmt(progressLabel, { done: progress.done, total: progress.total })}
        </span>
      )}
    </div>
  );
}
