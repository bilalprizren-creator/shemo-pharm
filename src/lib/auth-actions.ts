"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  claimPasswordResetSend,
  claimVerificationSend,
  createSessionCookie,
  endSession,
  createUser,
  findUser,
  getSession,
  hashPassword,
  readResetToken,
  setPassword,
  signResetToken,
  signVerificationToken,
  verifyPassword,
} from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";
import {
  adminNotificationAddress,
  passwordResetUrl,
  sendMail,
  siteOrigin,
  verificationUrl,
} from "@/lib/mail";
import {
  newRegistrationMessage,
  resetPasswordMessage,
  verifyEmailMessage,
} from "@/lib/mail-templates";

export interface AuthFormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so a rejected form keeps what the customer already typed. */
  values?: Record<string, string>;
}

/** Locale comes from a hidden form field so messages match the page. */
function formLang(formData: FormData): Lang {
  const lang = String(formData.get("lang") ?? "sq");
  return isLang(lang) ? lang : "sq";
}

/**
 * The raw, untransformed values to re-render after a rejection. Read off the
 * FormData rather than parsed.data: zod trims and lowercases, and on most
 * failure paths there is no parsed.data at all. Passwords are never included.
 */
function keptValues(
  formData: FormData,
  keys: readonly string[]
): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}

const REGISTER_KEPT = ["name", "company", "phone", "email"] as const;

/** Per IP: 10 login/registration attempts per 10 minutes. */
const AUTH_LIMIT = { limit: 10, windowMs: TEN_MINUTES_MS };

function loginSchema(dict: Dictionary) {
  return z.object({
    email: z.string().trim().toLowerCase().email(dict.actions.vEmail),
    password: z.string().min(1, dict.actions.vPassword),
  });
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const lang = formLang(formData);
  const dict = getDictionary(lang);

  const values = keptValues(formData, ["email"]);

  if (await rateLimited("auth", AUTH_LIMIT)) {
    return { error: dict.actions.tooManyAttempts, values };
  }

  const parsed = loginSchema(dict).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: dict.actions.invalidCredentials, values };
  }

  const user = await findUser(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: dict.actions.invalidCredentials, values };
  }

  await createSessionCookie(user);
  redirect(langHref(lang, "/llogaria"));
}

function registerSchema(dict: Dictionary) {
  return z
    .object({
      name: z.string().trim().min(2, dict.actions.vName),
      company: z.string().trim().max(120).optional().or(z.literal("")),
      phone: z.string().trim().min(6, dict.actions.vPhone),
      email: z.string().trim().toLowerCase().email(dict.actions.vEmail),
      password: z.string().min(8, dict.actions.vPasswordMin),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: dict.actions.vPasswordMatch,
      path: ["confirm"],
    });
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const lang = formLang(formData);
  const dict = getDictionary(lang);
  const values = keptValues(formData, REGISTER_KEPT);

  if (await rateLimited("auth", AUTH_LIMIT)) {
    return { error: dict.actions.tooManyAttempts, values };
  }

  const parsed = registerSchema(dict).safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values };
  }

  if (await findUser(parsed.data.email)) {
    return {
      fieldErrors: { email: dict.actions.emailTaken },
      values,
    };
  }

  const user = await createUser({
    email: parsed.data.email,
    passwordHash: hashPassword(parsed.data.password),
    name: parsed.data.name,
    company: parsed.data.company || "",
    phone: parsed.data.phone,
    lang,
  });

  const url = verificationUrl(await signVerificationToken(user.email), lang);
  // after() runs once the response is on its way, so the customer is not kept
  // waiting on two provider round-trips. Both sends are best-effort: sendMail
  // never throws, and a registration must never fail over an email.
  after(async () => {
    await sendMail(
      verifyEmailMessage({ dict, name: user.name, to: user.email, url })
    );
    await sendMail(
      newRegistrationMessage({
        user,
        to: adminNotificationAddress(),
        adminUrl: `${siteOrigin()}/admin/kerkesat`,
      })
    );
  });

  await createSessionCookie(user);
  redirect(langHref(lang, "/llogaria"));
}

/**
 * Sends the verification link again, from the account page. Awaited rather
 * than deferred: the customer is watching the button and needs the answer.
 */
export async function resendVerificationAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const lang = formLang(formData);
  const dict = getDictionary(lang);

  const session = await getSession();
  if (!session) return { error: dict.actions.sendFailed };

  if (await rateLimited("verify", { limit: 5, windowMs: TEN_MINUTES_MS })) {
    return { error: dict.actions.tooManyAttempts };
  }

  // Covers both "already verified" and "sent moments ago" — the banner that
  // holds this button is not rendered for a verified account anyway.
  if (!(await claimVerificationSend(session.email))) {
    return { error: dict.actions.verifyWait };
  }

  const url = verificationUrl(await signVerificationToken(session.email), lang);
  await sendMail(
    verifyEmailMessage({ dict, name: session.name, to: session.email, url })
  );
  // Reported as sent even if the provider refused: the customer must not be
  // shown provider internals, and the failure is in the server log.
  return { success: dict.actions.verifySent };
}

/**
 * Step one of a reset: mail a link to the address, if it belongs to an account.
 *
 * Always reports the same success, whatever happened. A form that answered
 * "no such account" would be a free tool for reading the customer list out of
 * the site one address at a time, and this one is open to anybody. The two
 * limiters are on top of that: per IP against a scripted sweep, and per address
 * in the database against repeatedly mailing one mailbox — a cooldown the IP
 * limiter cannot enforce, since it lives in one instance's memory.
 */
export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const lang = formLang(formData);
  const dict = getDictionary(lang);
  const values = keptValues(formData, ["email"]);

  if (await rateLimited("reset-request", { limit: 5, windowMs: TEN_MINUTES_MS })) {
    return { error: dict.actions.tooManyAttempts, values };
  }

  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .safeParse(formData.get("email"));
  if (!parsed.success) {
    return { fieldErrors: { email: dict.actions.vEmail }, values };
  }

  const user = await findUser(parsed.data);
  if (user && (await claimPasswordResetSend(user.email))) {
    const url = passwordResetUrl(await signResetToken(user), lang);
    // Deferred like the registration mail: the answer below does not depend on
    // the provider, and it must not depend on its latency either — a request
    // that takes visibly longer for a real address leaks the same thing the
    // uniform message is there to hide.
    after(async () => {
      await sendMail(
        resetPasswordMessage({ dict, name: user.name, to: user.email, url })
      );
    });
  }

  return { success: dict.actions.resetSent };
}

/** Step two: the token proved the address, so accept a new password for it. */
export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const lang = formLang(formData);
  const dict = getDictionary(lang);

  if (await rateLimited("reset-submit", AUTH_LIMIT)) {
    return { error: dict.actions.tooManyAttempts };
  }

  const parsed = z
    .object({
      password: z.string().min(8, dict.actions.vPasswordMin),
      confirm: z.string(),
    })
    .refine((v) => v.password === v.confirm, {
      message: dict.actions.vPasswordMatch,
      path: ["confirm"],
    })
    .safeParse({
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  // Re-read rather than trusting anything the page decided: this form has been
  // sitting open in a browser, and the link may have expired or been spent in
  // the meantime.
  const token = await readResetToken(String(formData.get("token") ?? ""));
  if (!token.ok) return { error: dict.actions.resetLinkDead };

  if (!(await setPassword(token.email, parsed.data.password))) {
    return { error: dict.actions.resetLinkDead };
  }

  // Signed in straight away — the customer just proved both the mailbox and the
  // new password, and sending them to a login form to retype it is pure
  // ceremony.
  //
  // setPassword() has just revoked every session for this account, which is the
  // point of a reset. This new cookie survives that revocation because both
  // sides are whole seconds and it is issued at or after the revocation instant
  // — see sessionRevoked() in lib/session-cookie.ts, where the boundary is
  // deliberate rather than incidental.
  const user = await findUser(token.email);
  if (user) await createSessionCookie(user);
  redirect(langHref(lang, "/llogaria"));
}

export async function logoutAction(): Promise<void> {
  // endSession, not clearSessionCookie: the cookie is a signed JWT, so deleting
  // the browser's copy left any other copy valid for the rest of its week.
  await endSession();
  redirect("/");
}
