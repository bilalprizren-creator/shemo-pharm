"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert, Loader2, UserPlus } from "lucide-react";
import { registerAction, type AuthFormState } from "@/lib/auth-actions";

const initialState: AuthFormState = {};

function Field({
  id,
  label,
  error,
  optional,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-400">(opsionale)</span>}
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

export function RegisterForm() {
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

      <Field
        id="name"
        label="Emri dhe mbiemri"
        type="text"
        autoComplete="name"
        required
        error={fe.name}
      />
      <Field
        id="company"
        label="Kompania ose barnatorja"
        type="text"
        autoComplete="organization"
        optional
        error={fe.company}
      />
      <Field
        id="phone"
        label="Numri i telefonit"
        type="tel"
        autoComplete="tel"
        required
        placeholder="+383 4x xxx xxx"
        error={fe.phone}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        placeholder="emri@kompania.com"
        error={fe.email}
      />
      <Field
        id="password"
        label="Fjalëkalimi"
        type="password"
        autoComplete="new-password"
        required
        error={fe.password}
      />
      <Field
        id="confirm"
        label="Përsërit fjalëkalimin"
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
        Regjistrohu
      </button>

      <p className="text-center text-[13px] leading-relaxed text-ink-400">
        Pas regjistrimit, llogaria juaj kërkon verifikim nga ekipi i SHEMO PHARM
        përpara se çmimet të bëhen të dukshme.
      </p>

      <p className="text-center text-sm text-ink-500">
        Keni llogari?{" "}
        <Link href="/kycu" className="font-semibold text-brand-700 hover:text-brand-800">
          Kyçu
        </Link>
      </p>
    </form>
  );
}
