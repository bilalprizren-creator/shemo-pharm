import Link from "next/link";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * One line under a form that collects personal data, pointing at the policy.
 *
 * `fmt()` cannot be used here because the placeholder has to become a link
 * element, not a string, so the sentence is split around `{link}` — which the
 * dictionary parity test already checks is present in both languages.
 */
export function PrivacyNotice({ dict }: { dict: Dictionary }) {
  const [before, after = ""] = dict.legal.formNotice.split("{link}");

  return (
    <p className="text-[13px] leading-relaxed text-ink-400">
      {before}
      <Link
        href={langHref(dict.lang, "/privatesia")}
        className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800"
      >
        {dict.legal.formNoticeLink}
      </Link>
      {after}
    </p>
  );
}
