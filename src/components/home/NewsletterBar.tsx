"use client";

import { useActionState } from "react";
import { CircleCheck, Loader2, Mail } from "lucide-react";
import {
  subscribeAction,
  type NewsletterFormState,
} from "@/lib/newsletter-actions";

const initialState: NewsletterFormState = {};

export function NewsletterBar() {
  const [state, formAction, pending] = useActionState(subscribeAction, initialState);

  return (
    <section aria-labelledby="newsletter-titulli" className="bg-brand-700">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-8 lg:flex-row lg:justify-between lg:px-6">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            <Mail className="size-5.5" aria-hidden />
          </span>
          <div>
            <h2 id="newsletter-titulli" className="text-lg font-bold text-white">
              Qëndroni të informuar
            </h2>
            <p className="text-sm text-white/70">
              Abonohuni për produktet e reja dhe njoftimet e SHEMO PHARM.
            </p>
          </div>
        </div>

        {state.success ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white"
          >
            <CircleCheck className="size-5 text-accent-300" aria-hidden />
            Faleminderit! Jeni abonuar me sukses.
          </p>
        ) : (
          <form action={formAction} className="w-full max-w-md">
            <div className="flex">
              <label htmlFor="newsletter-email" className="sr-only">
                Adresa juaj e email-it
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                placeholder="Email juaj"
                className="h-12 w-full rounded-l-lg border-0 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-400"
              />
              <div className="hidden" aria-hidden="true">
                <label htmlFor="newsletter-website">Mos e plotësoni</label>
                <input
                  id="newsletter-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="flex h-12 shrink-0 items-center gap-2 rounded-r-lg bg-accent-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-70"
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Abonohu
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
