import "server-only";
import { SITE } from "@/lib/site";
import type { Lang } from "@/lib/i18n";

/**
 * Outbound transactional mail — the only file in the project that knows which
 * provider is used. Delivery goes to Resend's HTTP API with plain fetch; no
 * SDK, in keeping with the rest of the codebase.
 *
 * Sending is best-effort by design: sendMail never throws and never rejects.
 * Registration, approval and every other caller must survive a missing API
 * key, a provider outage or a rejected recipient completely untouched — a
 * customer is never blocked because an email did not go out.
 *
 * Moving to SMTP later means rewriting deliver() and the env reads inside it.
 * Nothing outside this file changes.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "SHEMO PHARM <onboarding@resend.dev>";

export interface MailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * The site's own origin, for links inside emails.
 *
 * An env var rather than the request headers: mail is sent from `after()` and
 * from the admin panel, where the customer's request is long gone or never
 * existed — and a Host header is the classic way a verification link gets
 * pointed at someone else's server.
 */
export function siteOrigin(): string {
  const configured = process.env.APP_ORIGIN?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // Injected by Vercel: the stable production domain, not the per-deployment URL.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;

  if (process.env.NODE_ENV !== "production") {
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  console.error("[mail] APP_ORIGIN is not set — falling back to the SITE domain.");
  return SITE.domain;
}

/** The absolute link that verifies a mailbox. `lang` rides in the URL, not in
 *  the token: the token is about identity, the language about presentation. */
export function verificationUrl(token: string, lang: Lang): string {
  const params = new URLSearchParams({ token, lang });
  return `${siteOrigin()}/api/verifiko-email?${params}`;
}

/**
 * The absolute link that opens the "choose a new password" form.
 *
 * Unlike the verification link this points at a page rather than an API route:
 * the token cannot do anything on its own, it only unlocks a form the customer
 * still has to fill in.
 */
export function passwordResetUrl(token: string, lang: Lang): string {
  const path = lang === "sq" ? "" : `/${lang}`;
  return `${siteOrigin()}${path}/rikthe-fjalekalimin?token=${encodeURIComponent(token)}`;
}

/** Where "a new partner registered" goes. ADMIN_EMAIL already exists in env. */
export function adminNotificationAddress(): string {
  return (
    process.env.MAIL_ADMIN_TO?.trim() ||
    process.env.ADMIN_EMAIL?.trim() ||
    SITE.emails[0]
  );
}

async function deliver(msg: MailMessage, apiKey: string): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM?.trim() || DEFAULT_FROM,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
    // A hung provider must not eat the whole function budget.
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

/** Sends a message and reports whether it actually went out. Never throws. */
export async function sendMail(msg: MailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = Array.isArray(msg.to) ? msg.to.join(", ") : msg.to;

  if (!apiKey) {
    console.warn(`[mail] RESEND_API_KEY not set — skipped "${msg.subject}" to ${to}`);
    // Dev only: the plain-text body carries the verification link, which makes
    // the whole flow testable from the terminal. Never in production — that
    // link is a bearer token.
    if (process.env.NODE_ENV !== "production") console.warn(`\n${msg.text}\n`);
    return false;
  }

  try {
    await deliver(msg, apiKey);
    return true;
  } catch (err) {
    console.error(`[mail] failed "${msg.subject}" to ${to}:`, err);
    return false;
  }
}
