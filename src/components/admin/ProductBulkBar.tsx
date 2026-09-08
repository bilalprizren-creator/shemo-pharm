"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";
import { BookOpen, BookX, Eye, EyeOff, Loader2 } from "lucide-react";
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
 * The row checkboxes carry `form="…"` rather than sitting inside this form: the
 * table cells beside them already hold the per-row toggle forms, and a form
 * inside a form is not something HTML has. Browsers submit form-associated
 * controls wherever they sit in the DOM, and `new FormData(form)` — which is how
 * React collects a server action's arguments — reads them the same way.
 *
 * What they cannot be is uncontrolled. A server action revalidates the page, and
 * the rows come back re-rendered with every box empty: the ticks are DOM state
 * and the new render does not know about them. That is why the selection lives
 * in the little store below instead, outside the subtree that gets replaced —
 * a press on "hide from the shop" leaves the same nineteen products ticked and
 * ready for "hide from the catalogue", which is the whole point of a bulk bar.
 */

/* ------------------------------ Selection -------------------------------- */

let selected: ReadonlySet<number> = new Set();
const listeners = new Set<() => void>();

function publish(next: ReadonlySet<number>): void {
  selected = next;
  for (const l of listeners) l();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The store's snapshot must be referentially stable between real changes. */
const snapshot = () => selected;
const serverSnapshot = (): ReadonlySet<number> => EMPTY;
const EMPTY: ReadonlySet<number> = new Set();

function useSelected(): ReadonlySet<number> {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

function toggle(id: number, on: boolean): void {
  const next = new Set(selected);
  if (on) next.add(id);
  else next.delete(id);
  publish(next);
}

function setMany(ids: readonly number[], on: boolean): void {
  const next = new Set(selected);
  for (const id of ids) {
    if (on) next.add(id);
    else next.delete(id);
  }
  publish(next);
}

const boxClass =
  "size-4 cursor-pointer rounded border-ink-900/25 text-brand-600 focus:ring-brand-500/40";

/**
 * One row's checkbox. Controlled by the store, so it comes back ticked after
 * the page revalidates, and `name="ids"` so the browser still submits it.
 */
export function ProductRowCheckbox({
  id,
  formId,
  label,
}: {
  id: number;
  formId: string;
  label: string;
}) {
  const sel = useSelected();
  const on = sel.has(id);
  const ref = useRef<HTMLInputElement>(null);

  /*
   * Write the value onto the element as well, every commit.
   *
   * `checked` alone is not enough here. A server action revalidates the route
   * and the row markup is swapped underneath this input; the element comes back
   * unticked while React still holds `true` from the render before, sees no
   * change in the prop, and so writes nothing. The result is a bar that
   * correctly says nineteen are selected above a table where none look it, and
   * a form that submits no ids at all — which is exactly the state this was
   * meant to fix. Asserting the DOM is cheap and removes the whole class of
   * disagreement.
   */
  useEffect(() => {
    if (ref.current && ref.current.checked !== on) ref.current.checked = on;
  });

  return (
    <input
      ref={ref}
      type="checkbox"
      name="ids"
      value={id}
      form={formId}
      checked={on}
      onChange={(e) => toggle(id, e.currentTarget.checked)}
      aria-label={label}
      className={boxClass}
    />
  );
}

/**
 * The header checkbox: ticks every row on this page, and shows a dash while
 * only some of them are ticked.
 */
export function ProductSelectAll({ pageIds }: { pageIds: readonly number[] }) {
  const sel = useSelected();
  const onPage = pageIds.filter((id) => sel.has(id)).length;
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = onPage > 0 && onPage < pageIds.length;
    }
  }, [onPage, pageIds.length]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={pageIds.length > 0 && onPage === pageIds.length}
      onChange={(e) => setMany(pageIds, e.currentTarget.checked)}
      aria-label="Zgjidh të gjitha në këtë faqe"
      className={boxClass}
    />
  );
}

/*
 * The selection deliberately survives an action.
 *
 * It used to empty itself once the write finished, on the reasoning that the
 * ticked rows now pointed at products whose flags had already changed. That
 * reasoning ignored what the bar is actually for: deciding where a group
 * belongs usually takes more than one press. Taking a brand out of the shop and
 * out of the printed catalogue is two buttons on one selection, and clearing
 * between them meant ticking nineteen boxes again to finish the thought.
 *
 * Nothing is lost by keeping it. The buttons set an absolute value rather than
 * toggling, so pressing one twice writes the same state twice; the row icons
 * change under the selection as feedback; and "Pastro zgjedhjen" is right
 * there for when the group really is done with.
 */

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
  /**
   * Disabled while the form is in flight.
   *
   * "Hide 400 products" is a slow round trip with no sign anything is
   * happening, which is an invitation to press it again — and the second press
   * was a second full bulk write. useFormStatus reads the pending state of the
   * form this button submits, which is why it has to be its own component.
   */
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-progress disabled:opacity-60 ${
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
          : "border-ink-900/10 bg-white text-ink-700 hover:border-brand-300 hover:text-ink-900"
      }`}
    >
      {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function ProductBulkBar({
  formId,
  pageIds,
  total,
  filter,
  sections,
}: {
  formId: string;
  /** The ids this page lists, in order — the selection is pruned to them. */
  pageIds: readonly number[];
  /** Rows the filter matches in total — what "all matching" reaches. */
  total: number;
  /** productFilterFields() — mirrored so a bulk write hits what the table listed. */
  filter: Record<string, string>;
  sections: CatalogSectionOption[];
}) {
  const sel = useSelected();
  const selectedHere = pageIds.filter((id) => sel.has(id));
  const count = selectedHere.length;
  const [allWanted, setAllMatching] = useState(false);
  // Derived, not stored: "all matching" describes a selection the table cannot
  // show, so it must not outlive the selection it was ticked next to.
  const all = allWanted && count > 0;
  const affected = all ? total : count;

  /*
   * Anything ticked that this page no longer lists is dropped.
   *
   * The store outlives a render, which is the point, but it must not outlive
   * the table: change the filter, turn the page, or hide the products a
   * visibility filter was selecting for, and the ids that vanished from the
   * table would otherwise still be in the next write — editing products
   * nobody can see. Keyed on the page's own ids, so a revalidation that
   * returns the same rows changes nothing and the selection survives it.
   */
  const pageKey = pageIds.join(",");
  useEffect(() => {
    const here = new Set(pageKey ? pageKey.split(",").map(Number) : []);
    const kept = [...selected].filter((id) => here.has(id));
    if (kept.length !== selected.size) publish(new Set(kept));
  }, [pageKey]);

  const clear = useCallback(() => {
    publish(new Set());
    setAllMatching(false);
  }, []);

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

      <div className="rounded-2xl border border-ink-900/10 bg-white p-3 shadow-lg shadow-ink-900/10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="text-sm font-semibold text-ink-900">
            {affected} {affected === 1 ? "produkt" : "produkte"}
            <span className="font-normal text-ink-500">
              {all ? " (të gjitha që përputhen)" : " të zgjedhura"}
            </span>
          </p>

          {total > pageIds.length && (
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
