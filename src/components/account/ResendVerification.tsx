"use client";

import { useActionState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { resendVerificationAction, type AuthFormState } from "@/lib/auth-actions";
import type { Dictionary } from "@/lib/dictionaries";

const initialState: AuthFormState = {};

/** "Send the verification link again", from the account page or the
 *  verification result page. Requires a session — see resendVerificationAction. */
export function ResendVerification({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(
    resendVerificationAction,
    initialState
  );

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="lang" value={dict.lang} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-300 bg-white px-4 py-2 text-[13px] font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-50 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <MailCheck className="size-4" aria-hidden />
        )}
        {dict.accountPage.resendButton}
      </button>

      {state.error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="mt-2 text-[13px] font-medium text-brand-800">
          {state.success}
        </p>
      )}
    </form>
  );
}
