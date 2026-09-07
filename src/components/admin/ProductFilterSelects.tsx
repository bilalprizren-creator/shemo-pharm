"use client";

export interface AdminFilterSelect {
  /** Query-string key, e.g. "stoku". */
  name: string;
  label: string;
  /** The value the URL currently carries. */
  value: string;
  options: readonly { readonly value: string; readonly label: string }[];
}

/**
 * The filter dropdowns for the product table.
 *
 * They sit inside the page's own GET form rather than pushing to the router, so
 * the search box and both filters are submitted together and no hidden fields
 * are needed to stop one from dropping the others. `faqja` is not a field of
 * that form, which is exactly right: changing a filter should land on page one.
 *
 * The only thing client-side here is submitting on change. Without JavaScript
 * the selects still work — the form's "Filtro" button is the fallback, and it is
 * also the search button, so it is not a control that exists only for that case.
 */
export function ProductFilterSelects({
  filters,
}: {
  filters: readonly AdminFilterSelect[];
}) {
  return (
    <>
      {filters.map((f) => (
        <label key={f.name} className="flex items-center gap-1.5 text-sm text-ink-500">
          <span className="sr-only lg:not-sr-only">{f.label}</span>
          <select
            name={f.name}
            defaultValue={f.value}
            aria-label={f.label}
            onChange={(e) => {
              // Only when the choice actually differs from what the URL already
              // carries. A select that is unmounted while still focused — which
              // is what "Pastro filtrat" does to the one you just used — fires a
              // parting change event, and without this guard that event submits
              // the form a second time, landing on ?kerko=&stoku=&dukshmeria=
              // instead of the clean path the link pointed at.
              if (e.currentTarget.value === f.value) return;
              e.currentTarget.form?.requestSubmit();
            }}
            className="h-11 rounded-xl border border-ink-900/10 bg-white px-2.5 text-sm font-medium text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
}
