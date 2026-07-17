"use client";

import { useActionState } from "react";
import { CircleCheck, Loader2, Mail } from "lucide-react";
import {
  subscribeAction,
  type NewsletterFormState,
} from "@/lib/newsletter-actions";
import type { Dictionary } from "@/lib/dictionaries";

const initialState: NewsletterFormState = {};

export function NewsletterBar({ dict }: { dict: Dictionary }) {
  const [state, formAction, pending] = useActionState(subscribeAction, initialState);

  return (
    <section aria-labelledby="newsletter-titulli" className="px-4 pb-14 lg:px-6 lg:pb-20">
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-plum-900 px-6 py-10 shadow-float lg:flex-row lg:justify-between lg:px-12">
        <div
          aria-hidden
          className="absolute -right-20 -top-24 size-72 rounded-full bg-accent-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-16 size-64 rounded-full bg-brand-400/20 blur-3xl"
        />
        <div className="relative flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
            <Mail className="size-5.5" aria-hidden />
          </span>
          <div>
            <h2
              id="newsletter-titulli"
              className="font-display text-xl font-bold tracking-tight text-white"
            >
              {dict.home.newsletterTitle}
            </h2>
            <p className="text-sm text-white/70">{dict.home.newsletterSub}</p>
          </div>
        </div>

        {state.success ? (
          <p
            role="status"
            className="relative flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white"
          >
            <CircleCheck className="size-5 text-accent-300" aria-hidden />
            {dict.home.newsletterSuccess}
          </p>
        ) : (
          <form action={formAction} className="relative w-full max-w-md">
            <div className="flex rounded-full bg-white p-1.5 shadow-lg shadow-plum-950/20">
              <label htmlFor="newsletter-email" className="sr-only">
                {dict.home.newsletterEmailLabel}
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                placeholder={dict.home.newsletterPlaceholder}
                className="h-10 w-full rounded-full border-0 bg-transparent px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <div className="hidden" aria-hidden="true">
                <label htmlFor="newsletter-website">{dict.common.honeypotLabel}</label>
                <input
                  id="newsletter-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <input type="hidden" name="lang" value={dict.lang} />
              <button
                type="submit"
                disabled={pending}
                className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-accent-500 px-6 text-sm font-semibold text-plum-950 transition-colors hover:bg-accent-400 disabled:opacity-70"
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {dict.home.newsletterButton}
              </button>
            </div>
            {state.error && (
              <p role="alert" className="mt-2 text-sm font-medium text-red-200">
                {state.error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
