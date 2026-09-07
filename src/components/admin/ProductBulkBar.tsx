"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { BookOpen, BookX, Eye, EyeOff } from "lucide-react";
import {
  bulkPlaceInCatalogAction,
  bulkProductVisibilityAction,
} from "@/lib/admin-actions";
import type { CatalogSectionOption } from "@/components/admin/ProductForm";

/**
 * Bulk editing for the product table.
 *
 * The two sites are one deployment with one product table, and what separates
 * them is two boolean columns — `hidden` for the shop, `catalog_hidden` for
 * shemo-katalog.com. Deciding that the shop sells one part of the range and the
 * printed catalogue shows another is therefore a matter of setting those columns
 * over a few hundred rows at a time, which is not a thing anyone will do with a
 * per-row button pressed two thousand times.
 *
 * The row checkboxes are plain server-rendered inputs carrying `form="…"`, not
 * children of this form: the table cells already hold the per-row toggle forms,
 * and a form inside a form is not something HTML has. Browsers submit
 * form-associated controls wherever they sit in the DOM, and `new FormData(form)`
 * — which is how React collects a server action's arguments — reads them the
 * same way, so the selection arrives without a line of wiring.
 */

/** Every mounted piece of the bar, so one can tell the others to recount. */
const listeners = new Set<() => void>();

function inputs(formId: string): HTMLInputElement[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="ids"][form="${CSS.escape(formId)}"]`
    )
  );
}

/**
 * How many rows are ticked right now, read from the DOM rather than held in
 * React state — the checkboxes are rendered on the server and are not this
 * component's to own. `change` covers a click on any of them; the listener set
 * covers "select all", which sets `.checked` in script and therefore fires
 * nothing at all.
 */
function useSelectedCount(formId: string): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const read = () => setCount(inputs(formId).filter((el) => el.checked).length);
    read();
    listeners.add(read);
    document.addEventListener("change", read);
    return () => {
      listeners.delete(read);
      document.removeEventListener("change", read);
    };
  }, [formId]);
  return count;
}

function setAll(formId: string, checked: boolean): void {
  for (const el of inputs(formId)) el.checked = checked;
  for (const l of listeners) l();
}

/**
 * The header checkbox: ticks every row on this page, and shows a dash while
 * only some of them are ticked.
 */
export function ProductSelectAll({
  formId,
  pageCount,
}: {
  formId: string;
  pageCount: number;
}) {
  const count = useSelectedCount(formId);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && count < pageCount;
  }, [count, pageCount]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={pageCount > 0 && count === pageCount}
      onChange={(e) => setAll(formId, e.currentTarget.checked)}
      aria-label="Zgjidh të gjitha në këtë faqe"
      className="size-4 cursor-pointer rounded border-ink-900/25 text-brand-600 focus:ring-brand-500/40"
    />
  );
}

/**
 * Empties the selection once the action has actually finished.
 *
 * The checkboxes are uncontrolled DOM state, so a revalidated page comes back
 * with them still ticked — pointing at rows whose flags have already been
 * changed. Clearing on submit instead would race React's own collection of the
 * form data; waiting for pending to fall back to false does not.
 */
function ClearWhenDone({ onDone }: { onDone: () => void }) {
  const { pending } = useFormStatus();
  const was = useRef(false);
  useEffect(() => {
    if (was.current && !pending) onDone();
    was.current = pending;
  }, [pending, onDone]);
  return null;
}

function BarButton({
  name,
  value,
  formAction,
  children,
  tone = "plain",
}: {
  name?: string;
  value?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  tone?: "plain" | "danger";
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
          : "border-ink-900/10 bg-white text-ink-700 hover:border-brand-300 hover:text-ink-900"
      }`}
    >
      {children}
    </button>
  );
}

export function ProductBulkBar({
  formId,
  pageCount,
  total,
  filter,
  sections,
}: {
  formId: string;
  /** Rows on this page — what the header checkbox ticks. */
  pageCount: number;
  /** Rows the filter matches in total — what "all matching" reaches. */
  total: number;
  /** productFilterFields() — mirrored so a bulk write hits what the table listed. */
  filter: Record<string, string>;
  sections: CatalogSectionOption[];
}) {
  const count = useSelectedCount(formId);
  const [allWanted, setAllMatching] = useState(false);
  // Derived, not stored: "all matching" describes a selection the table cannot
  // show, so it must not outlive the selection it was ticked next to — and the
  // count it depends on lives in the DOM, where an effect would only be able to
  // chase it one render late.
  const all = allWanted && count > 0;
  const affected = all ? total : count;

  const clear = useCallback(() => {
    setAll(formId, false);
    setAllMatching(false);
  }, [formId]);

  const confirmLarge = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      if (
        affected > 25 &&
        !window.confirm(`Do të ndryshoni ${affected} produkte. Të vazhdohet?`)
      ) {
        e.preventDefault();
      }
    },
    [affected]
  );

  return (
    <form
      id={formId}
      action={bulkProductVisibilityAction}
      onSubmit={confirmLarge}
      hidden={count === 0}
      className="sticky bottom-4 z-30 mt-4"
    >
      {/* The filter as the table read it, under the same keys the URL uses.
          Only consulted when "all matching" is on — otherwise the ticked ids
          say everything — but always sent, because it is also what tells the
          action which section page to refresh. */}
      {Object.entries(filter).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {all && <input type="hidden" name="scope" value="all" />}
      <ClearWhenDone onDone={clear} />

      <div className="rounded-2xl border border-ink-900/10 bg-white p-3 shadow-lg shadow-ink-900/10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm font-semibold text-ink-900">
            {affected} {affected === 1 ? "produkt" : "produkte"}
            <span className="font-normal text-ink-500">
              {all ? " (të gjitha që përputhen)" : " të zgjedhura"}
            </span>
          </p>

          {total > pageCount && (
            <label className="flex items-center gap-1.5 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => setAllMatching(e.currentTarget.checked)}
                className="size-4 cursor-pointer rounded border-ink-900/25 text-brand-600 focus:ring-brand-500/40"
              />
              Zgjidh të gjitha {total} që përputhen
            </label>
          )}

          <button
            type="button"
            onClick={clear}
            className="text-sm font-semibold text-ink-500 hover:text-ink-900"
          >
            Pastro zgjedhjen
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-900/8 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Dyqani
            </span>
            <BarButton name="op" value="shop-show">
              <Eye className="size-3.5" aria-hidden />
              Shfaq
            </BarButton>
            <BarButton name="op" value="shop-hide" tone="danger">
              <EyeOff className="size-3.5" aria-hidden />
              Fshih
            </BarButton>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Katalogu
            </span>
            <BarButton name="op" value="catalog-show">
              <BookOpen className="size-3.5" aria-hidden />
              Shfaq
            </BarButton>
            <BarButton name="op" value="catalog-hide" tone="danger">
              <BookX className="size-3.5" aria-hidden />
              Fshih
            </BarButton>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Seksioni
            </span>
            {/* Defaults to "" so the button does nothing until a section is
                actually chosen — the action returns on an empty value. */}
            <select
              name="sectionId"
              defaultValue=""
              aria-label="Seksioni i katalogut të shtypur"
              className="h-8 max-w-56 rounded-lg border border-ink-900/10 bg-white px-2 text-xs font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
            >
              <option value="">Zgjidhni seksionin…</option>
              <option value="none">— Hiq nga seksioni —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <BarButton formAction={bulkPlaceInCatalogAction}>Vendos</BarButton>
          </div>
        </div>
      </div>
    </form>
  );
}
