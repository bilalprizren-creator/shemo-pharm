"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Loader2, Plus } from "lucide-react";
import { createCatalogSectionAction, type AdminFormState } from "@/lib/admin-actions";

const initialState: AdminFormState = {};

const cell =
  "h-10 rounded-lg border border-ink-900/10 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

/**
 * Creates an empty printed section. It stays invisible on shemo-katalog.com
 * until something is placed in it — the catalogue drops sections with no
 * products rather than printing a numbered heading over nothing.
 *
 * `sort` is what orders the catalogue, not the number: the printed run is
 * 6.4, 6.1, 6.3, 6.5, and the number is only what the paper edition shows.
 */
export function NewCatalogSectionForm() {
  const [state, formAction, pending] = useActionState(
    createCatalogSectionAction,
    initialState
  );

  return (
    <form
      action={formAction}
      className="mt-4 rounded-2xl border border-ink-900/8 bg-white p-4"
    >
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">
        Seksion i ri
      </h2>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <div>
          <input
            name="catalogNo"
            required
            placeholder="Nr. (6.7)"
            aria-label="Numri i seksionit"
            className={`${cell} w-28`}
          />
          {state.fieldErrors?.catalogNo && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-700">
              {state.fieldErrors.catalogNo}
            </p>
          )}
        </div>
        <div>
          <input
            name="name"
            required
            placeholder="Emri i seksionit"
            aria-label="Emri i seksionit"
            className={`${cell} w-56`}
          />
          {state.fieldErrors?.name && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-700">
              {state.fieldErrors.name}
            </p>
          )}
        </div>
        <input
          name="sort"
          type="number"
          min={0}
          max={9999}
          defaultValue={0}
          aria-label="Renditja"
          title="Vendi i seksionit në katalog — numri më i vogël vjen i pari"
          className={`${cell} w-24`}
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
