"use client";

import { useActionState, useState } from "react";
import { CircleAlert, Loader2, LogIn } from "lucide-react";
import { adminLoginAction, type AdminFormState } from "@/lib/admin-actions";
import { PasswordField } from "@/components/auth/PasswordField";

const initialState: AdminFormState = {};

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);
  // PasswordField is controlled, so the typed password survives a rejected
  // submit instead of being cleared by React's form reset — which matters
  // most here, where a long admin password gets retyped otherwise.
  const [password, setPassword] = useState("");

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

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-900">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-12 w-full rounded-xl border border-ink-900/10 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          placeholder="admin@shemopharm.com"
        />
      </div>

      {/* Albanian literals rather than dict lookups: the admin panel is
          single-language and does not carry the dictionaries. */}
      <PasswordField
        id="password"
        label="Fjalëkalimi"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        labels={{ show: "Shfaq fjalëkalimin", hide: "Fshih fjalëkalimin" }}
      />

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
        Kyçu
      </button>
    </form>
  );
}
