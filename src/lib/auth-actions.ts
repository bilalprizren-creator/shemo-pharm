"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  claimVerificationSend,
  clearSessionCookie,
  createSessionCookie,
  createUser,
  findUser,
  getSession,
  hashPassword,
  signVerificationToken,
  verifyPassword,
} from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";
import { adminNotificationAddress, sendMail, siteOrigin, verificationUrl } from "@/lib/mail";
import { newRegistrationMessage, verifyEmailMessage } from "@/lib/mail-templates";

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

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
