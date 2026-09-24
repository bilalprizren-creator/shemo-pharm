"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { updateCategoryAction, type AdminFormState } from "@/lib/admin-actions";
import type { AdminCategory } from "@/lib/admin-data";

const initialState: AdminFormState = {};

const cell =
  "h-9 rounded-lg border border-ink-900/10 bg-white px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

/**
 * One editable category. Its own form and its own action state, so a rejected
 * save (a category dropped under itself, say) reports next to the row that
 * caused it instead of at the top of a table of ninety.
 *
 * The catalog `name` is shown but not editable — it is the value the import
 * wrote and what several scripts still match on. What the site displays is
 * `display_name`, which is exactly what this edits.
 */
export function CategoryRow({
  category,
  parentOptions,
}: {
  category: AdminCategory;
  /** Every category that may serve as a parent (itself excluded). */
  parentOptions: { id: number; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    updateCategoryAction,
    initialState
  );

  // One <form> per row, referenced by its `id` from inputs that live in other
  // <td>s (the HTML5 `form=` attribute) rather than wrapping them — a <form>
  // cannot legally contain <td> siblings of its own <tr>. That is what lets
  // each field sit under its own column header instead of all four being
  // flexed together under one merged "Emri i shfaqur · lloji · prindi ·
  // renditja" header, which is what this replaces.
  const formId = `category-${category.id}`;
  const feedbackId = `${formId}-feedback`;

  return (
    <tr className="border-b border-ink-900/4 align-middle last:border-0">
      <td className="px-3 py-2">
        <form id={formId} action={formAction}>
          <input type="hidden" name="id" value={category.id} />
        </form>
        <div style={{ paddingLeft: category.depth * 16 }}>
          <span className="block truncate text-sm font-medium text-ink-900" title={category.name}>
            {category.name}
          </span>
          <span className="block truncate font-mono text-[11px] text-ink-400">
            /{category.slug}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-sm tabular-nums text-ink-500">{category.count}</td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="displayName"
          defaultValue={category.displayName ?? ""}
          placeholder={category.name}
          aria-label={`Emri i shfaqur për ${category.name}`}
          aria-describedby={feedbackId}
          className={`${cell} w-full min-w-[11rem]`}
        />
      </td>
      <td className="px-3 py-2">
        <select
          form={formId}
          name="kind"
          defaultValue={category.kind}
          aria-label={`Lloji për ${category.name}`}
          className={`${cell} w-full min-w-[8rem]`}
        >
          <option value="type">Lloj produkti</option>
          <option value="brand">Markë</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <select
          form={formId}
          name="parent"
          defaultValue={String(category.parent)}
          aria-label={`Kategoria prind për ${category.name}`}
          className={`${cell} w-full min-w-[11rem]`}
        >
          <option value="0">— pa prind —</option>
          {parentOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          form={formId}
          name="sort"
          type="number"
          min={0}
          max={9999}
          defaultValue={category.sort}
          aria-label={`Renditja për ${category.name}`}
          className={`${cell} w-20`}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            form={formId}
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Ruaj
          </button>

          <span id={feedbackId}>
            {state.success && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
                <CircleCheck className="size-3.5" aria-hidden />
                {state.success}
              </span>
            )}
            {(state.error || state.fieldErrors) && (
              <span
                role="alert"
                className="inline-flex items-center gap-1 text-xs font-medium text-red-700"
              >
                <CircleAlert className="size-3.5" aria-hidden />
                {state.error ?? Object.values(state.fieldErrors ?? {})[0]}
              </span>
            )}
          </span>
        </div>
      </td>
    </tr>
  );
}
