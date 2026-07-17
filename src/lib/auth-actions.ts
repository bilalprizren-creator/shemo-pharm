"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clearSessionCookie,
  createSessionCookie,
  findUser,
  hashPassword,
  readUsers,
  verifyPassword,
  writeUsers,
  type StoredUser,
} from "@/lib/auth";
import { isLang, langHref, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Locale comes from a hidden form field so messages match the page. */
function formLang(formData: FormData): Lang {
  const lang = String(formData.get("lang") ?? "sq");
  return isLang(lang) ? lang : "sq";
}

/** Simple in-memory rate limit per IP: 10 attempts / 10 minutes. */
const attempts = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

async function rateLimited(): Promise<boolean> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

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

  if (await rateLimited()) {
    return { error: dict.actions.tooManyAttempts };
  }

  const parsed = loginSchema(dict).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: dict.actions.invalidCredentials };
  }

  const user = findUser(parsed.data.email);
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

  if (await rateLimited()) {
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

  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === parsed.data.email)) {
    return {
      fieldErrors: { email: dict.actions.emailTaken },
    };
  }

  const user: StoredUser = {
    email: parsed.data.email,
    passwordHash: hashPassword(parsed.data.password),
    name: parsed.data.name,
    company: parsed.data.company || "",
    phone: parsed.data.phone,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  writeUsers([...users, user]);
  await createSessionCookie(user);
  redirect(langHref(lang, "/llogaria"));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
