"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearSessionCookie,
  createSessionCookie,
  createUser,
  findUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Locale comes from a hidden form field so messages match the page. */
function formLang(formData: FormData): Lang {
  const lang = String(formData.get("lang") ?? "sq");
  return isLang(lang) ? lang : "sq";
}

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

  if (await rateLimited("auth", AUTH_LIMIT)) {
    return { error: dict.actions.tooManyAttempts };
  }

  const parsed = loginSchema(dict).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: dict.actions.invalidCredentials };
  }

  const user = await findUser(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: dict.actions.invalidCredentials };
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

  if (await rateLimited("auth", AUTH_LIMIT)) {
    return { error: dict.actions.tooManyAttempts };
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
    return { fieldErrors };
  }

  if (await findUser(parsed.data.email)) {
    return {
      fieldErrors: { email: dict.actions.emailTaken },
    };
  }

  const user = await createUser({
    email: parsed.data.email,
    passwordHash: hashPassword(parsed.data.password),
    name: parsed.data.name,
    company: parsed.data.company || "",
    phone: parsed.data.phone,
  });
  await createSessionCookie(user);
  redirect(langHref(lang, "/llogaria"));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
