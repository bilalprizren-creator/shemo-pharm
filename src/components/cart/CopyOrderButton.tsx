"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Copies the order text to the clipboard.
 *
 * The mail channel is a `mailto:` link, which does nothing at all in a browser
 * with no mail client registered — the common case on a desktop — and the site
 * cannot tell. So rather than declare success, the panel offers the text.
 *
 * Falls back to selecting a hidden textarea and asking the document to copy it,
 * because navigator.clipboard is unavailable on plain http, which is how this
 * gets tested on a phone against a dev server.
 */
export function CopyOrderButton({
  text,
  labels,
}: {
  text: string;
  labels: { copy: string; copied: string };
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
      } finally {
        area.remove();
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-900/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-brand-400 hover:text-brand-700"
    >
      {copied ? (
        <Check className="size-4 text-accent-600" aria-hidden />
      ) : (
        <Copy className="size-4 text-brand-600" aria-hidden />
      )}
      {copied ? labels.copied : labels.copy}
    </button>
  );
}
