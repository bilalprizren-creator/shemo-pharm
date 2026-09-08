"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import type { AdminFormState } from "@/lib/admin-actions";

const initialState: AdminFormState = {};

export type AdminActionFn = (
  prev: AdminFormState,
  formData: FormData
) => Promise<AdminFormState>;

/**
 * A single admin operation, with proof that it happened.
 *
 * Twelve actions in this panel returned void and returned early on a bad id.
 * The page then re-rendered identically, so "done" and "nothing happened" were
 * the same picture — the editor's only recourse was to press it again and hope.
 * ProductPriceCell, CategoryRow and CatalogSectionRow already solved this with
 * useActionState; this is that treatment for the buttons that are just a button.
 *
 * `confirm` turns it into the two-step control DeleteProductButton was, which
 * was hard-wired to one action and one set of Albanian labels. Deleting a
 * customer account, a message and an order all went through with no question
 * asked, while deleting a *product* asked twice.
 */
export function AdminAction({
  action,
  fields,
  label,
  confirmLabel,
  cancelLabel = "Anulo",
  icon,
  className,
  confirmClassName,
  title,
}: {
  action: AdminActionFn;
  /** Hidden inputs the action reads out of the form. */
  fields: Record<string, string | number>;
  label: ReactNode;
  /** When given, the first press asks and the second one acts. */
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: ReactNode;
  className: string;
  /** Styling for the armed state; falls back to `className`. */
  confirmClassName?: string;
  title?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [armed, setArmed] = useState(false);
  const error = state.error ?? Object.values(state.fieldErrors ?? {})[0];

  if (confirmLabel && !armed) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setArmed(true)}
          title={title}
          className={className}
        >
          {icon}
          {label}
        </button>
        <Message error={error} success={state.success} />
      </div>
    );
  }

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button
          type="submit"
          disabled={pending}
          title={title}
          className={`${confirmLabel ? (confirmClassName ?? className) : className} disabled:opacity-60`}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
          {confirmLabel ?? label}
        </button>
        {confirmLabel && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="rounded-full border border-ink-900/10 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-tint"
          >
            {cancelLabel}
          </button>
        )}
      </form>
      <Message error={error} success={state.success} />
    </div>
  );
}

function Message({ error, success }: { error?: string; success?: string }) {
  if (error) {
    return (
      <p
        role="alert"
        className="mt-1 flex items-start gap-1 text-[11px] font-medium leading-tight text-red-700"
      >
        <CircleAlert className="mt-px size-3 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-brand-700">
        <Check className="size-3 shrink-0" aria-hidden />
        {success}
      </p>
    );
  }
  return null;
}
