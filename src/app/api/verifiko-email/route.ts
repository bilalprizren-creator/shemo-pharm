import { NextRequest, NextResponse } from "next/server";
import { markEmailVerified, readVerificationToken } from "@/lib/auth";
import { isLang, langHref } from "@/lib/i18n";

/**
 * Where the link in the verification email lands.
 *
 * It lives under /api on purpose: the matcher in src/proxy.ts skips `api`, so
 * the one URL this project sends out and can never re-issue is neither
 * locale-rewritten nor redirected. The state change happens here and the
 * outcome is handed to the localized page — a Server Component must not
 * mutate while rendering.
 *
 * No session is created here. Clicking a link out of an inbox proves the
 * mailbox, and nothing more.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const raw = request.nextUrl.searchParams.get("lang") ?? "sq";
  const lang = isLang(raw) ? raw : "sq";

  let state: "ok" | "tashme" | "skaduar" | "gabim" = "gabim";
  const parsed = await readVerificationToken(token);

  if (parsed.ok) {
    try {
      const result = await markEmailVerified(parsed.email);
      state = result === "verified" ? "ok" : result === "already" ? "tashme" : "gabim";
    } catch (err) {
      // e.g. the migration has not been run against this database yet
      console.error("[verify] could not mark the address verified:", err);
      state = "gabim";
    }
  } else if (parsed.reason === "expired") {
    state = "skaduar";
  }

  // Built from the incoming URL, not from APP_ORIGIN: a misconfigured origin
  // must never bounce a real visitor onto a different host.
  const url = request.nextUrl.clone();
  url.pathname = langHref(lang, "/verifikimi");
  url.search = `?gjendja=${state}`;
  return NextResponse.redirect(url, 303);
}
