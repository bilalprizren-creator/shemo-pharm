"use client";

import { useActionState, useState } from "react";
import { Check, CircleAlert, KeyRound, Loader2 } from "lucide-react";
import { resetPasswordAction, type AuthFormState } from "@/lib/auth-actions";
import { fmt } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { PasswordField } from "./PasswordField";

const initialState: AuthFormState = {};

/**
 * The second half of a reset: the link already proved the address, so all that
 * is left is choosing the password. The token rides along in a hidden field and
 * is checked again server-side — this form can sit open in a browser for as
 * long as it likes, and by the time it is submitted the link may have expired
 * or been spent elsewhere.
 */
export function ResetPasswordForm({
  dict,
  token,
  email,
}: {
  dict: Dictionary;
  token: string;
  email: string;
}) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const rules = [
    { ok: password.length >= 8, text: dict.auth.ruleMinChars },
    { ok: password.length > 0 && password === confirm, text: dict.auth.ruleMatch },
  ];

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
      <input type="hidden" name="token" value={token} />
      {/* Not submitted — password managers need a username field next to a
          new-password one to offer saving the change against the right account. */}
      <input
        type="email"
        value={email}
        autoComplete="username"
        readOnly
        hidden
        aria-hidden
        tabIndex={-1}
      />

      <PasswordField
        id="password"
        label={dict.auth.newPassword}
        value={password}
        onChange={setPassword}
        error={state.fieldErrors?.password}
        autoComplete="new-password"
        labels={{ show: dict.auth.showPassword, hide: dict.auth.hidePassword }}
      />

      <PasswordField
        id="confirm"
        label={dict.auth.confirmPassword}
        value={confirm}
        onChange={setConfirm}
        error={state.fieldErrors?.confirm}
        autoComplete="new-password"
        labels={{ show: dict.auth.showPassword, hide: dict.auth.hidePassword }}
      />

      {(password || confirm) && (
        <ul className="space-y-1" aria-live="polite">
          {rules.map((r) => (
            <li
              key={r.text}
              className={`flex items-center gap-1.5 text-[13px] ${
                r.ok ? "font-medium text-accent-700" : "text-ink-400"
              }`}
            >
              <span
                className={`flex size-4 items-center justify-center rounded-full ${
                  r.ok ? "bg-accent-100 text-accent-700" : "bg-ink-900/6"
                }`}
              >
                {r.ok && <Check className="size-3" aria-hidden />}
              </span>
              {r.text}
            </li>
          ))}
        </ul>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
        ) : (
          <KeyRound className="size-4.5" aria-hidden />
        )}
        {dict.auth.newPasswordButton}
      </button>

      <p className="text-center text-xs text-ink-400">
        {fmt(dict.auth.newPasswordSub, { email })}
      </p>
    </form>
  );
}
