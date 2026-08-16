import { Info } from "lucide-react";
import type { Dictionary } from "@/lib/dictionaries";
import { Breadcrumbs } from "@/components/catalog/Breadcrumbs";

/**
 * The privacy policy and the terms of use are the same page with different
 * prose, so they share one component: heading, intro, then numbered sections of
 * paragraphs. Both documents live in the dictionary, which means the parity
 * test in tests/dictionaries.test.ts catches a section added in one language
 * and forgotten in the other — the failure mode a legal text can least afford.
 */
export interface LegalSection {
  readonly heading: string;
  readonly body: readonly string[];
}

export function LegalPage({
  title,
  intro,
  sections,
  dict,
}: {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
  dict: Dictionary;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-6 lg:py-12">
      <Breadcrumbs items={[{ label: title }]} dict={dict} />

      <h1 className="mt-6 text-3xl font-extrabold text-ink-900 sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-ink-400">
        {dict.legal.lastUpdatedLabel} {dict.legal.lastUpdated}
      </p>

      {/* Removed once the text has been through legal review — see sq.ts. */}
      <p className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        <Info className="mt-0.5 size-4.5 shrink-0" aria-hidden />
        {dict.legal.draftNotice}
      </p>

      <p className="mt-6 text-lg leading-relaxed text-ink-500">{intro}</p>

      <div className="mt-10 space-y-9">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold text-ink-900">{section.heading}</h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="leading-relaxed text-ink-500">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
