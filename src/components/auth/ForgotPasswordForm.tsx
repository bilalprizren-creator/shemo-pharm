"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, Loader2, Send } from "lucide-react";
import { requestPasswordResetAction, type AuthFormState } from "@/lib/auth-actions";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

const initialState: AuthFormState = {};

/**
 * Asks for the address a reset link should go to.
 *
 * On success the form is replaced by the confirmation rather than left open:
 * the answer is the same for an address with an account and one without, and
 * a still-armed submit button invites the visitor to try another address to
 * see whether the wording changes. It does not.
 */
export function ForgotPasswordForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initialState
  );

  const backToLogin = (
    <p className="text-center text-sm">
      <Link
        href={langHref(dict.lang, "/kycu")}
        className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {dict.auth.backToLogin}
      </Link>
    </p>
  );

  if (state.success) {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-accent-50 px-4 py-3 text-sm font-medium text-accent-900"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.success}
        </p>
        {backToLogin}
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <input type="hidden" name="lang" value={dict.lang} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-900">
          {dict.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.values?.email}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          className="h-12 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          placeholder="emri@kompania.com"
        />
        {state.fieldErrors?.email && (
          <p className="mt-1.5 text-sm text-red-700">{state.fieldErrors.email}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4.5" aria-hidden />
        )}
        {dict.auth.forgotButton}
      </button>

      {backToLogin}
    </form>
  );
}
