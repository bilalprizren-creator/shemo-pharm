"use server";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { isLang, type Lang } from "@/lib/i18n";
import { getDictionary } from "@/lib/dictionaries";

export interface NewsletterFormState {
  success?: boolean;
  error?: string;
}

/** Locale comes from a hidden form field so messages match the page. */
function formLang(formData: FormData): Lang {
  const lang = String(formData.get("lang") ?? "sq");
  return isLang(lang) ? lang : "sq";
}

const SUBSCRIBERS_FILE = path.join(process.cwd(), "data", "newsletter.json");

/**
 * TODO(SMTP/marketing): subscriptions are stored locally until the business
 * connects a mailing tool. The form and validation stay unchanged.
 */
export async function subscribeAction(
  _prev: NewsletterFormState,
  formData: FormData
): Promise<NewsletterFormState> {
  const dict = getDictionary(formLang(formData));

  // Honeypot — bots fill the hidden field, humans never do.
  if (formData.get("website")) {
    return { success: true };
  }

  const parsed = z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: dict.actions.newsletterInvalid };
  }

  try {
    mkdirSync(path.dirname(SUBSCRIBERS_FILE), { recursive: true });
    let subscribers: { email: string; subscribedAt: string }[] = [];
    if (existsSync(SUBSCRIBERS_FILE)) {
      try {
        subscribers = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf8"));
      } catch {
        subscribers = [];
      }
    }
    if (!subscribers.some((s) => s.email === parsed.data)) {
      subscribers.push({
        email: parsed.data,
        subscribedAt: new Date().toISOString(),
      });
      writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribers, null, 1));
    }
  } catch {
    return { error: dict.actions.newsletterFailed };
  }

  return { success: true };
}
