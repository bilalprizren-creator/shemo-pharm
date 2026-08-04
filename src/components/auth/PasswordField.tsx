"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Password input with a show/hide toggle.
 *
 * Controlled on purpose: React resets the form after a rejected submit, and
 * holding the value in client state means a typo can be fixed instead of
 * retyped — while the password itself never travels back from the server the
 * way the other preserved fields do.
 */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  labels,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete: "current-password" | "new-password";
  labels: { show: string; hide: string };
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-gabimi` : undefined}
          className={`h-12 w-full rounded-xl border bg-white pl-4 pr-12 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${
            error ? "border-red-400" : "border-ink-900/10 focus:border-brand-500"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? labels.hide : labels.show}
          title={visible ? labels.hide : labels.show}
          className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-700"
        >
          {visible ? (
            <EyeOff className="size-4.5" aria-hidden />
          ) : (
            <Eye className="size-4.5" aria-hidden />
          )}
        </button>
      </div>
      {error && (
        <p
          id={`${id}-gabimi`}
          role="alert"
          className="mt-1.5 text-[13px] font-medium text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
