"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

export interface ShareLinkLabels {
  /** Button label. */
  share: string;
  /** Accessible name — says *what* gets shared, which "Ndaje" alone does not. */
  hint: string;
  /** Confirmation once the link is on the clipboard. */
  copied: string;
  /** Heads the fallback field, for browsers that refuse the clipboard. */
  copyManually: string;
  close: string;
}

/**
 * Sends this listing exactly as it is being looked at.
 *
 * Everything the page is filtered by already lives in the URL — the search
 * term, the sort, the stock filter, a brand's product type, the page number —
 * so what is worth sharing is simply the current address. What was missing was
 * a way to get at it: on a phone the address bar shows a truncated host and
 * selecting the full URL out of it is fiddly, and in an app's in-app browser
 * (this catalog is reached from Facebook and Instagram) there is often no
 * address bar at all. So the address is read at click time from
 * window.location — never from props, which would go stale the moment a filter
 * changed the URL without remounting this button.
 *
 * Three routes to the same link, in order of how well they fit the device:
 * the system share sheet (which is what puts it into WhatsApp or Viber), the
 * clipboard, and finally a field holding the link, selected and ready to copy.
 */
export function ShareLink({ labels }: { labels: ShareLinkLabels }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const confirmCopied = () => {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);
  };

  const onClick = async () => {
    const url = window.location.href;
    setManual(null);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (err) {
        // Dismissing the sheet is a decision, not a failure: leave the page
        // alone. Anything else — no permission, an in-app browser with no
        // share target — falls through to the clipboard below.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      confirmCopied();
    } catch {
      setManual(url);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={labels.hint}
        className="flex min-h-10 items-center gap-2 rounded-lg border border-ink-900/10 bg-white px-3.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-brand-400"
      >
        {copied ? (
          <Check className="size-4 text-brand-600" aria-hidden />
        ) : (
          <Share2 className="size-4 text-brand-600" aria-hidden />
        )}
        {copied ? labels.copied : labels.share}
      </button>

      {/* The label above changes to "copied", which a screen reader does not
          announce on its own — this says it out loud, once. */}
      <p aria-live="polite" className="sr-only">
        {copied ? labels.copied : ""}
      </p>

      {/* A popover hanging off the button would run off the left edge of a
          320px phone whenever the button sits near it, so below `sm` this is a
          bar pinned to the viewport instead. */}
      {manual !== null && (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl border border-ink-900/10 bg-white p-3 shadow-drawer sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:shadow-card">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink-900">
              {labels.copyManually}
            </span>
            <button
              type="button"
              onClick={() => setManual(null)}
              className="text-sm font-medium text-ink-400 hover:text-ink-700"
            >
              {labels.close}
            </button>
          </div>
          <input
            readOnly
            autoFocus
            value={manual}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={labels.copyManually}
            className="h-10 w-full rounded-lg border border-ink-900/10 bg-ink-900/3 px-3 text-sm text-ink-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        </div>
      )}
    </div>
  );
}
