"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, Loader2, UserPlus } from "lucide-react";
import { registerAction, type AuthFormState } from "@/lib/auth-actions";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

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
  const fe = state.fieldErrors ?? {};

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
        error={fe.name}
      />
      <Field
        id="company"
        label={dict.contactForm.company}
        type="text"
        autoComplete="organization"
        optional
        optionalLabel={dict.common.optional}
        error={fe.company}
      />
      <Field
        id="phone"
        label={dict.contactForm.phone}
        type="tel"
        autoComplete="tel"
        required
        placeholder="+383 4x xxx xxx"
        error={fe.phone}
      />
      <Field
        id="email"
        label={dict.auth.email}
        type="email"
        autoComplete="email"
        required
        placeholder="emri@kompania.com"
        error={fe.email}
      />
      <Field
        id="password"
        label={dict.auth.password}
        type="password"
        autoComplete="new-password"
        required
        error={fe.password}
      />
      <Field
        id="confirm"
        label={dict.auth.confirmPassword}
        type="password"
        autoComplete="new-password"
        required
        error={fe.confirm}
      />

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
