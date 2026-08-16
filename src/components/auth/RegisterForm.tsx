"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Loader2, UserPlus } from "lucide-react";
import { registerAction, type AuthFormState } from "@/lib/auth-actions";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";
import { PrivacyNotice } from "@/components/legal/PrivacyNotice";
import { PasswordField } from "./PasswordField";

const initialState: AuthFormState = {};

function Field({
  id,
  label,
  error,
  optional,
  optionalLabel,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-ink-400">{optionalLabel}</span>
        )}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-gabimi` : undefined}
        className={`h-12 w-full rounded-xl border bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${
          error ? "border-red-400" : "border-ink-900/10 focus:border-brand-500"
        }`}
        {...input}
      />
      {error && (
        <p id={`${id}-gabimi`} role="alert" className="mt-1.5 text-[13px] font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function RegisterForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const fe = state.fieldErrors ?? {};
  // What was typed before the rejection. React resets the form after a submit
  // and a reset restores each field to its defaultValue — so re-rendering the
  // values here is what puts them back, with the inputs staying uncontrolled.
  const v = state.values ?? {};

  // Shown while typing rather than as a red error afterwards.
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

      <Field
        id="name"
        label={dict.contactForm.name}
        type="text"
        autoComplete="name"
        required
        defaultValue={v.name}
        error={fe.name}
      />
      <Field
        id="company"
        label={dict.contactForm.company}
        type="text"
        autoComplete="organization"
        optional
        optionalLabel={dict.common.optional}
        defaultValue={v.company}
        error={fe.company}
      />
      <Field
        id="phone"
        label={dict.contactForm.phone}
        type="tel"
        autoComplete="tel"
        required
        placeholder="+383 4x xxx xxx"
        defaultValue={v.phone}
        error={fe.phone}
      />
      <Field
        id="email"
        label={dict.auth.email}
        type="email"
        autoComplete="email"
        required
        placeholder="emri@kompania.com"
        defaultValue={v.email}
        error={fe.email}
      />
      <PasswordField
        id="password"
        label={dict.auth.password}
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={fe.password}
        labels={{ show: dict.auth.showPassword, hide: dict.auth.hidePassword }}
      />
      <PasswordField
        id="confirm"
        label={dict.auth.confirmPassword}
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={fe.confirm}
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
          <UserPlus className="size-4.5" aria-hidden />
        )}
        {dict.auth.registerButton}
      </button>

      <p className="text-center text-[13px] leading-relaxed text-ink-400">
        {dict.auth.pendingNote}
      </p>

      <div className="text-center">
        <PrivacyNotice dict={dict} />
      </div>

      <p className="text-center text-sm text-ink-500">
        {dict.auth.haveAccount}{" "}
        <Link
          href={langHref(dict.lang, "/kycu")}
          className="font-semibold text-brand-700 hover:text-brand-800"
        >
          {dict.auth.loginButton}
        </Link>
      </p>
    </form>
  );
}
