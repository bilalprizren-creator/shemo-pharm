"use server";

import { after } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary, type Dictionary } from "@/lib/dictionaries";
import { rateLimited, TEN_MINUTES_MS } from "@/lib/rate-limit";
import { adminNotificationAddress, sendMail, siteOrigin } from "@/lib/mail";
import { newContactMessage } from "@/lib/mail-templates";

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
 * Submissions land in the contact_messages table, are read in the admin panel
 * (/admin/mesazhet) and are announced by mail (see below). The table is the
 * record; the mail is what makes anyone look.
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
  // Time trap: filling a form this long in under 3 seconds is not human.
  //
  // The field carries how long the form was open, not when it opened. As an
  // absolute timestamp this check did the opposite of its job in both
  // directions: a bot that simply omitted the field passed, because
  // Number(null) is 0 and "now minus zero" is forty years, while a real
  // visitor whose clock ran ahead of the server got a negative difference and
  // was turned away. A duration is measured against one clock — the
  // visitor's own — so skew cancels out, and a missing field reads as 0 ms
  // and is refused.
  const openMs = Number(formData.get("elapsed"));
  if (!Number.isFinite(openMs) || openMs < 3000) {
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

  const entry = {
    name: parsed.data.name,
    company: parsed.data.company || "",
    phone: parsed.data.phone,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  };

  try {
    await storeMessage(entry);
  } catch {
    return { error: dict.actions.contactTechProblem, values };
  }

  // Deferred, and only after the row is safely written: the visitor gets their
  // confirmation without waiting on a mail provider, and a message that is in
  // the database but whose notification failed is a missed email, not a lost
  // inquiry. sendMail never throws.
  after(async () => {
    await sendMail(
      newContactMessage({
        entry,
        to: adminNotificationAddress(),
        adminUrl: `${siteOrigin()}/admin/mesazhet`,
      })
    );
  });

  return { success: true };
}
