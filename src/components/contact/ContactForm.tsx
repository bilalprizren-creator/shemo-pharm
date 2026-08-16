"use client";

import { useActionState, useEffect, useRef } from "react";
import { CircleAlert, CircleCheck, Loader2, Send } from "lucide-react";
import { contactAction, type ContactFormState } from "@/lib/contact-actions";
import type { Dictionary } from "@/lib/dictionaries";
import { PrivacyNotice } from "@/components/legal/PrivacyNotice";

const initialState: ContactFormState = {};

function Field({
  id,
  label,
  error,
  optional,
  optionalLabel,
  textarea,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  textarea?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const cls = `w-full rounded-xl border bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 ${
    error ? "border-red-400" : "border-ink-900/10 focus:border-brand-500"
  }`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-ink-400">{optionalLabel}</span>
        )}
      </label>
      {textarea ? (
        <textarea
          id={id}
          name={id}
          rows={5}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-gabimi` : undefined}
          className={`${cls} py-3`}
          {...(input as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-gabimi` : undefined}
          className={`${cls} h-12`}
          {...(input as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && (
        <p id={`${id}-gabimi`} role="alert" className="mt-1.5 text-[13px] font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(contactAction, initialState);
  const openedAt = useRef(0);
  const fe = state.fieldErrors ?? {};
  // What was typed before the rejection. React resets the form after a submit,
  // and a reset restores each field to its defaultValue — so re-rendering the
  // values here is what puts them back, with the inputs staying uncontrolled.
  const v = state.values ?? {};

  // Mount time for the spam time-trap. Kept in a ref rather than a hidden
  // field: what the server checks is how long the form was open, and both
  // readings then come from this browser's clock, so a clock that disagrees
  // with the server cannot get a real visitor rejected.
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const submit = (formData: FormData) => {
    formData.set("elapsed", String(Date.now() - openedAt.current));
    return formAction(formData);
  };

  if (state.success) {
    return (
      <div
        role="status"
        className="flex flex-col items-center rounded-2xl border border-brand-200 bg-brand-50 px-6 py-12 text-center"
      >
        <CircleCheck className="size-10 text-brand-600" aria-hidden />
        <h3 className="mt-4 text-lg font-bold text-ink-900">
          {dict.contactForm.successTitle}
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">
          {dict.contactForm.successText}
        </p>
      </div>
    );
  }

  return (
    <form action={submit} noValidate className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {/* Spam protection: honeypot; the time trap rides along in submit() */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">{dict.common.honeypotLabel}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="lang" value={dict.lang} />

      <div className="grid gap-4 sm:grid-cols-2">
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
          label={dict.contactForm.email}
          type="email"
          autoComplete="email"
          required
          placeholder="emri@kompania.com"
          defaultValue={v.email}
          error={fe.email}
        />
      </div>
      <Field
        id="subject"
        label={dict.contactForm.subject}
        type="text"
        required
        placeholder={dict.contactForm.subjectPlaceholder}
        defaultValue={v.subject}
        error={fe.subject}
      />
      <Field
        id="message"
        label={dict.contactForm.message}
        textarea
        required
        placeholder={dict.contactForm.messagePlaceholder}
        defaultValue={v.message}
        error={fe.message}
      />

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4.5" aria-hidden />
        )}
        {dict.contactForm.submit}
      </button>

      <PrivacyNotice dict={dict} />
    </form>
  );
}
