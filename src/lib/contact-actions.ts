"use server";

import { z } from "zod";
import { sql } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";

export interface ContactFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Echoed back so a rejected form keeps what the visitor already typed —
   *  losing a 4000-character message to a short subject is the worst of it. */
  values?: Record<string, string>;
}

/** Locale comes from a hidden form field so messages match the page. */
function formLang(formData: FormData): Lang {
  const lang = String(formData.get("lang") ?? "sq");
  return isLang(lang) ? lang : "sq";
}

const KEPT_FIELDS = ["name", "company", "phone", "email", "subject", "message"] as const;

/** Raw values, straight off the FormData — zod trims and lowercases, and on
 *  most failure paths there is no parsed data to read from at all. */
function keptValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    KEPT_FIELDS.map((k) => [k, String(formData.get(k) ?? "")])
  );
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

/**
 * Submissions land in the contact_messages table and are read in the admin
 * panel (/admin/mesazhet). Outbound mail now exists (src/lib/mail.ts), so
 * forwarding a copy to the business inbox is a few lines away — left off on
 * purpose until someone decides they want the duplicate in their inbox.
 */
async function storeMessage(entry: {
  name: string;
  company: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  await sql`
    INSERT INTO contact_messages (name, company, phone, email, subject, message)
    VALUES (${entry.name}, ${entry.company}, ${entry.phone}, ${entry.email},
            ${entry.subject}, ${entry.message})
  `;
}

export async function contactAction(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const dict = getDictionary(formLang(formData));
  const values = keptValues(formData);

  // Honeypot and time trap stop naive bots; the limit stops a patient one from
  // filling contact_messages.
  if (await rateLimited("contact", { limit: 5, windowMs: TEN_MINUTES_MS })) {
    return { error: dict.actions.tooManyAttempts, values };
  }

  // Honeypot: real users never fill this hidden field. Returns success without
  // values — a bot gets nothing back, and no human ever sees this path.
  if (formData.get("website")) {
    return { success: true }; // silently drop bot submissions
  }
  // Time trap: submitting a long form in under 3 seconds is not human.
  const startedAt = Number(formData.get("startedAt"));
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 3000) {
    return { error: dict.actions.sendFailed, values };
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
    return { fieldErrors, values };
  }

  try {
    await storeMessage({
      name: parsed.data.name,
      company: parsed.data.company || "",
      phone: parsed.data.phone,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
  } catch {
    return { error: dict.actions.contactTechProblem, values };
  }

  return { success: true };
}
