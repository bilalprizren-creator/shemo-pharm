"use server";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";

export interface ContactFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Locale comes from a hidden form field so messages match the page. */
function formLang(formData: FormData): Lang {
  const lang = String(formData.get("lang") ?? "sq");
  return isLang(lang) ? lang : "sq";
}

function schema(dict: Dictionary) {
  return z.object({
    name: z.string().trim().min(2, dict.actions.vName),
    company: z.string().trim().max(120).optional().or(z.literal("")),
    phone: z.string().trim().min(6, dict.actions.vPhone),
    email: z.string().trim().toLowerCase().email(dict.actions.vEmail),
    subject: z.string().trim().min(2, dict.actions.vSubject).max(160),
    message: z.string().trim().min(10, dict.actions.vMessage).max(4000),
  });
}

const MESSAGES_FILE = path.join(process.cwd(), "data", "messages.json");

/**
 * TODO(SMTP): no email credentials exist yet, so submissions are stored in
 * data/messages.json. Wire this up to the business inbox (e.g. nodemailer or
 * a transactional service) once SMTP details are provided — the form and
 * validation stay unchanged.
 */
function storeMessage(entry: Record<string, string>): void {
  mkdirSync(path.dirname(MESSAGES_FILE), { recursive: true });
  let messages: unknown[] = [];
  if (existsSync(MESSAGES_FILE)) {
    try {
      messages = JSON.parse(readFileSync(MESSAGES_FILE, "utf8"));
    } catch {
      messages = [];
    }
  }
  messages.push({ ...entry, receivedAt: new Date().toISOString() });
  writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 1));
}

export async function contactAction(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const dict = getDictionary(formLang(formData));

  // Honeypot: real users never fill this hidden field.
  if (formData.get("website")) {
    return { success: true }; // silently drop bot submissions
  }
  // Time trap: submitting a long form in under 3 seconds is not human.
  const startedAt = Number(formData.get("startedAt"));
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 3000) {
    return { error: dict.actions.sendFailed };
  }

  const parsed = schema(dict).safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  try {
    storeMessage({
      name: parsed.data.name,
      company: parsed.data.company || "",
      phone: parsed.data.phone,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
  } catch {
    return { error: dict.actions.contactTechProblem };
  }

  return { success: true };
}
