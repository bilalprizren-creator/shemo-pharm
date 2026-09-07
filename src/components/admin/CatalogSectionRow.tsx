"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CircleAlert, CircleCheck, Loader2, Trash2 } from "lucide-react";
import {
  deleteCatalogSectionAction,
  updateCatalogSectionAction,
  type AdminFormState,
} from "@/lib/admin-actions";
import type { AdminCatalogSection } from "@/lib/admin-data";

const initialState: AdminFormState = {};

const cell =
  "h-9 rounded-lg border border-ink-900/10 bg-white px-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

/**
 * One printed section. Its own form and its own action state, so a rejected
 * save — a number and name another section already carries — reports next to
 * the row that caused it rather than at the top of a table of sixty-three.
 *
 * The delete button is a second form in a second cell, and it only exists for
 * an empty section: the foreign key is ON DELETE SET NULL, so deleting one that
 * still holds products would take every one of them out of the catalogue
 * without a word. The action re-checks that; this only hides a button that
 * could do nothing.
 */
export function CatalogSectionRow({ section }: { section: AdminCatalogSection }) {
  const [state, formAction, pending] = useActionState(
    updateCatalogSectionAction,
    initialState
  );
  const [delState, deleteAction, deleting] = useActionState(
    deleteCatalogSectionAction,
    initialState
  );

  return (
    <tr className="border-b border-ink-900/4 align-middle last:border-0">
      <td className="px-3 py-2">
        <Link
          href={`/admin/katalogu/${section.id}`}
          className="block truncate text-sm font-medium text-ink-900 hover:text-brand-700"
          title={section.name}
        >
          {section.catalogNo} {section.name}
        </Link>
        <span className="block truncate font-mono text-[11px] text-ink-400">
          /{section.slug}
        </span>
      </td>
      <td className="px-3 py-2 text-sm tabular-nums text-ink-500">
        {section.productCount}
        {/* Two different absences, and they are not the same number: one is not
            printed, the other is not sold. A product can be either without
            being the other. */}
        {section.visibleCount < section.productCount && (
          <span
            className="ml-1 text-xs text-ink-400"
            title="Të fshehura nga katalogu i shtypur"
          >
            ({section.productCount - section.visibleCount} pa u shtypur)
          </span>
        )}
        {section.shopHiddenCount > 0 && (
          <span
            className="ml-1 text-xs text-ink-400"
            title="Të fshehura nga dyqani, por ende në katalog"
          >
            ({section.shopHiddenCount} jashtë dyqanit)
          </span>
        )}
        {section.visibleCount === 0 && (
          <span
            className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
            title="Seksionet pa asnjë produkt të shtypshëm nuk shfaqen fare në shemo-katalog.com"
          >
            nuk shfaqet
          </span>
        )}
      </td>
      <td className="px-3 py-2" colSpan={3}>
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={section.id} />
          <input
            name="catalogNo"
            defaultValue={section.catalogNo}
            aria-label={`Numri për ${section.name}`}
            className={`${cell} w-20`}
          />
          <input
            name="name"
            defaultValue={section.name}
            aria-label={`Emri për ${section.name}`}
            className={`${cell} w-56`}
          />
          <input
            name="sort"
            type="number"
            min={0}
            max={9999}
            defaultValue={section.sort}
            aria-label={`Renditja për ${section.name}`}
            className={`${cell} w-20`}
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Ruaj
          </button>

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
        </form>
      </td>
      <td className="px-3 py-2 text-right">
        {section.productCount === 0 && (
          <form action={deleteAction}>
            <input type="hidden" name="id" value={section.id} />
            <button
              type="submit"
              disabled={deleting}
              title={`Fshi seksionin ${section.catalogNo} ${section.name}`}
              className="rounded-full p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              <span className="sr-only">Fshi</span>
            </button>
            {delState.error && (
              <span role="alert" className="block text-xs font-medium text-red-700">
                {delState.error}
              </span>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}
