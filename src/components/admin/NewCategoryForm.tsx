"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Loader2, Plus } from "lucide-react";
import { createCategoryAction, type AdminFormState } from "@/lib/admin-actions";

const initialState: AdminFormState = {};

const cell =
  "h-10 rounded-lg border border-ink-900/10 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

/**
 * Creates an empty category. It starts with no products — assigning them is
 * done from the product form, which is also the only place the counts can be
 * kept honest.
 */
export function NewCategoryForm({
  parentOptions,
}: {
  parentOptions: { id: number; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createCategoryAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-4 rounded-2xl border border-ink-900/8 bg-white p-4"
    >
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">
        Kategori e re
      </h2>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <div>
          <input
            name="name"
            required
            placeholder="Emri i kategorisë"
            aria-label="Emri i kategorisë"
            className={`${cell} w-56`}
          />
          {state.fieldErrors?.name && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-700">
              {state.fieldErrors.name}
            </p>
          )}
        </div>
        <select name="kind" defaultValue="type" aria-label="Lloji" className={`${cell} w-36`}>
          <option value="type">Lloj produkti</option>
          <option value="brand">Markë</option>
        </select>
        <select
          name="parent"
          defaultValue="0"
          aria-label="Kategoria prind"
          className={`${cell} w-48`}
        >
          <option value="0">— pa prind —</option>
          {parentOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          name="sort"
          type="number"
          min={0}
          max={9999}
          defaultValue={0}
          aria-label="Renditja"
          className={`${cell} w-20`}
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          Krijo
        </button>
      </div>

      {state.success && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
          <CircleCheck className="size-4" aria-hidden />
          {state.success}
        </p>
      )}
      {state.error && (
        <p
          role="alert"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700"
        >
          <CircleAlert className="size-4" aria-hidden />
          {state.error}
        </p>
      )}
    </form>
  );
}
