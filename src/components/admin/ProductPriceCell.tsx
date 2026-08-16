"use client";

import { useActionState, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { updateProductPriceAction, type AdminFormState } from "@/lib/admin-actions";

const initialState: AdminFormState = {};

/**
 * One editable price, in the table row it belongs to.
 *
 * Its own form and its own action state, for the reason CategoryRow gives: a
 * rejected save has to report next to the row that caused it, not at the top of
 * a table of fifty. Nothing else about the product is touched, so a price round
 * costs one field and one key per article instead of a trip through the edit
 * form.
 *
 * `type="text"` rather than the `type="number"` the full form uses: number
 * inputs put spinners in every row of a dense table, and — worse — a browser
 * reads "12,50" out of one as the empty string, silently discarding the price a
 * comma-decimal keyboard just produced. parsePriceEuros takes either form.
 */
export function ProductPriceCell({
  id,
  name,
  priceCents,
}: {
  id: number;
  /** Only for the labels — fifty identical fields are indistinguishable aloud. */
  name: string;
  priceCents: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateProductPriceAction,
    initialState
  );

  const saved = (priceCents / 100).toFixed(2);
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  // The server answers with "10.50" for a price typed as "10,50", so the field
  // has to follow what came back — otherwise it would sit marked as unsaved
  // forever, and the Save button would stay lit for a change already made.
  if (lastSaved !== saved) {
    setLastSaved(saved);
    setValue(saved);
  }

  const dirty = value.trim() !== saved;
  const error = state.error ?? Object.values(state.fieldErrors ?? {})[0];

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-1">
        <input
          name="price"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={`Çmimi për ${name}`}
          className="h-9 w-20 rounded-lg border border-ink-900/10 bg-white px-2 text-right text-sm tabular-nums text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <span className="text-sm text-ink-400" aria-hidden>
          €
        </span>
        <button
          type="submit"
          disabled={!dirty || pending}
          title="Ruaj çmimin"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-ink-900/6 disabled:text-ink-300"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
          <span className="sr-only">Ruaj çmimin për {name}</span>
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-1 flex items-start gap-1 text-[11px] font-medium leading-tight text-red-700"
        >
          <CircleAlert className="mt-px size-3 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {state.success && !dirty && !error && (
        <p className="mt-1 text-[11px] font-medium text-brand-700" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
