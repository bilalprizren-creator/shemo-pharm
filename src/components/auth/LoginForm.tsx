"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, Loader2, LogIn } from "lucide-react";
import { loginAction, type AuthFormState } from "@/lib/auth-actions";
import { langHref } from "@/lib/i18n";
import type { Dictionary } from "@/lib/dictionaries";

const initialState: AuthFormState = {};

export function LoginForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

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
          className="h-12 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          placeholder="emri@kompania.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-ink-900">
          {dict.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
        ) : (
          <LogIn className="size-4.5" aria-hidden />
        )}
        {dict.auth.loginButton}
      </button>

      <p className="text-center text-sm text-ink-500">
        {dict.auth.noAccount}{" "}
        <Link
          href={langHref(dict.lang, "/regjistrohu")}
          className="font-semibold text-brand-700 hover:text-brand-800"
        >
          {dict.auth.registerButton}
        </Link>
      </p>
    </form>
  );
}
