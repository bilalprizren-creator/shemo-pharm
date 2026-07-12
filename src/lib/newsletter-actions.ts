"use server";

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

export interface NewsletterFormState {
  success?: boolean;
  error?: string;
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
    return { error: "Shkruani një adresë email të vlefshme." };
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
    return { error: "Regjistrimi dështoi. Ju lutemi provoni përsëri." };
  }

  return { success: true };
}
