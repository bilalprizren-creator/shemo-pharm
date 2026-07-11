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

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
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

const GENERIC_ERROR = "Email-i ose fjalëkalimi është i pasaktë.";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Shkruani një email të vlefshëm."),
  password: z.string().min(1, "Shkruani fjalëkalimin."),
});

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (await rateLimited()) {
    return { error: "Shumë tentativa. Provoni përsëri pas disa minutash." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const user = findUser(parsed.data.email);
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: GENERIC_ERROR };
  }

  await createSessionCookie(user);
  redirect("/llogaria");
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Shkruani emrin dhe mbiemrin."),
    company: z.string().trim().max(120).optional().or(z.literal("")),
    phone: z.string().trim().min(6, "Shkruani numrin e telefonit."),
    email: z.string().trim().toLowerCase().email("Shkruani një email të vlefshëm."),
    password: z.string().min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Fjalëkalimet nuk përputhen.",
    path: ["confirm"],
  });

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (await rateLimited()) {
    return { error: "Shumë tentativa. Provoni përsëri pas disa minutash." };
  }

  const parsed = registerSchema.safeParse({
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
      fieldErrors: { email: "Ekziston një llogari me këtë email. Provoni të kyçeni." },
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
  redirect("/llogaria");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}
