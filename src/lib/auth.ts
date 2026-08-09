import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { isLang, type Lang } from "@/lib/i18n";

/**
 * B2B auth: users live in the Postgres `users` table, sessions are signed
 * JWTs in an HTTP-only cookie. Prices are only rendered for sessions whose
 * account status is "approved"; the admin panel is gated on role "admin".
 */

const COOKIE_NAME = "shemo_session";
const SESSION_DAYS = 7;

export type UserStatus = "pending" | "approved";
export type UserRole = "customer" | "admin";

export interface StoredUser {
  id: number;
  email: string;
  passwordHash: string; // salt:hash (scrypt)
  name: string;
  company: string;
  phone: string;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
  /** When the mailbox was proven. null = not verified yet. */
  emailVerifiedAt: string | null;
  /** Locale chosen at registration, for mail sent outside a request. */
  lang: Lang;
}

export interface Session {
  email: string;
  name: string;
  status: UserStatus;
  role: UserRole;
  emailVerified: boolean;
}

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  company: string;
  phone: string;
  status: string;
  role: string;
  created_at: string | Date;
  email_verified_at: string | Date | null;
  lang: string | null;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Add it to .env.local (and to the Vercel project env)."
    );
  }
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  // timingSafeEqual throws on a length mismatch, and Buffer.from silently
  // truncates at the first non-hex character — so a hash that was written by
  // something other than hashPassword (a hand-edited row, a botched import)
  // would turn a wrong password into a 500 error page instead of "wrong
  // password". Check the decoded length first and refuse the login quietly.
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== 64) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, expected);
}

function mapUser(r: UserRow): StoredUser {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    company: r.company,
    phone: r.phone,
    status: r.status === "approved" ? "approved" : "pending",
    role: r.role === "admin" ? "admin" : "customer",
    createdAt:
      r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    emailVerifiedAt: r.email_verified_at
      ? r.email_verified_at instanceof Date
        ? r.email_verified_at.toISOString()
        : String(r.email_verified_at)
      : null,
    lang: r.lang && isLang(r.lang) ? r.lang : "sq",
  };
}

export async function findUser(email: string): Promise<StoredUser | undefined> {
  const rows = (await sql`
    SELECT * FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  `) as UserRow[];
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  name: string;
  company: string;
  phone: string;
  lang: Lang;
}

/**
 * Creates a customer account with status "pending" (awaits admin approval).
 * verification_sent_at starts at now(): the mail goes out with this insert,
 * so the resend cooldown has to start counting from here.
 */
export async function createUser(data: NewUser): Promise<StoredUser> {
  const rows = (await sql`
    INSERT INTO users (email, password_hash, name, company, phone, status, role,
                       lang, verification_sent_at)
    VALUES (${data.email.trim().toLowerCase()}, ${data.passwordHash}, ${data.name},
            ${data.company}, ${data.phone}, 'pending', 'customer',
            ${data.lang}, now())
    RETURNING *
  `) as UserRow[];
  return mapUser(rows[0]);
}

/**
 * Email verification.
 *
 * The link carries a signed token rather than a row in a token table: the
 * signature already proves the address, and a link that dies with a rotated
 * AUTH_SECRET is the safe direction. `sub` is the address being proven, so a
 * stale token can never verify a different one.
 *
 * Session cookies and verification links are signed with the same key, so both
 * carry a `purpose` claim and each side rejects the other's tokens.
 */
const VERIFY_PURPOSE = "verify-email";

export async function signVerificationToken(email: string): Promise<string> {
  return new SignJWT({ purpose: VERIFY_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email.trim().toLowerCase())
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

export type VerificationToken =
  | { ok: true; email: string }
  | { ok: false; reason: "expired" | "invalid" };

export async function readVerificationToken(
  token: string
): Promise<VerificationToken> {
  if (!token) return { ok: false, reason: "invalid" };
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== VERIFY_PURPOSE || typeof payload.sub !== "string") {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, email: payload.sub };
  } catch (err) {
    const expired = (err as { code?: string })?.code === "ERR_JWT_EXPIRED";
    return { ok: false, reason: expired ? "expired" : "invalid" };
  }
}

/** Flips the address to verified. Re-clicking a link reports "already". */
export async function markEmailVerified(
  email: string
): Promise<"verified" | "already" | "unknown"> {
  const address = email.trim().toLowerCase();
  const rows = (await sql`
    UPDATE users SET email_verified_at = now()
    WHERE email = ${address} AND email_verified_at IS NULL
    RETURNING id
  `) as { id: number }[];
  if (rows.length > 0) return "verified";
  return (await findUser(address)) ? "already" : "unknown";
}

/**
 * Password reset.
 *
 * Same shape as the verification link and for the same reason — no token table,
 * the signature is the proof. Two differences, both because this token hands
 * over the account rather than confirming a mailbox:
 *
 *   - one hour instead of twenty-four;
 *   - a fingerprint of the password hash rides along in `pw`, so the link stops
 *     working the moment the password changes. That makes it single-use in
 *     practice: a link already spent, or one from before a password change,
 *     verifies its signature and is still refused. It also invalidates every
 *     outstanding link at once if a customer requests several.
 */
const RESET_PURPOSE = "reset-password";

/** Short, non-reversible tag for a password hash. Not a secret — it only has to
 *  change when the hash does, and it never leaves our own signed token. */
function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function signResetToken(user: {
  email: string;
  passwordHash: string;
}): Promise<string> {
  return new SignJWT({
    purpose: RESET_PURPOSE,
    pw: passwordFingerprint(user.passwordHash),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.email.trim().toLowerCase())
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());
}

export type ResetToken =
  | { ok: true; email: string }
  | { ok: false; reason: "expired" | "invalid" | "used" };

/**
 * Verifies a reset link and confirms it still matches the account's current
 * password. "used" is reported separately from "invalid" so the page can say
 * the link has already been spent instead of implying it was forged.
 */
export async function readResetToken(token: string): Promise<ResetToken> {
  if (!token) return { ok: false, reason: "invalid" };
  let email: string;
  let fingerprint: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      payload.purpose !== RESET_PURPOSE ||
      typeof payload.sub !== "string" ||
      typeof payload.pw !== "string"
    ) {
      return { ok: false, reason: "invalid" };
    }
    email = payload.sub;
    fingerprint = payload.pw;
  } catch (err) {
    const expired = (err as { code?: string })?.code === "ERR_JWT_EXPIRED";
    return { ok: false, reason: expired ? "expired" : "invalid" };
  }

  const user = await findUser(email);
  if (!user) return { ok: false, reason: "invalid" };
  if (passwordFingerprint(user.passwordHash) !== fingerprint) {
    return { ok: false, reason: "used" };
  }
  return { ok: true, email };
}

/** Writes the new password. Returns false if the address vanished meanwhile. */
export async function setPassword(email: string, password: string): Promise<boolean> {
  const rows = (await sql`
    UPDATE users SET password_hash = ${hashPassword(password)}
    WHERE email = ${email.trim().toLowerCase()}
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

/**
 * Reserves the right to send a reset mail to this address, at most once every
 * two minutes — the same per-address guard the verification mail uses, and for
 * the same reason. Returns false for an address that does not exist, which the
 * caller must not reveal.
 */
export async function claimPasswordResetSend(email: string): Promise<boolean> {
  const rows = (await sql`
    UPDATE users SET reset_sent_at = now()
    WHERE email = ${email.trim().toLowerCase()}
      AND (reset_sent_at IS NULL
           OR reset_sent_at < now() - interval '2 minutes')
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

/**
 * Reserves the right to send a verification mail to this address, at most
 * once every two minutes. Guard and write are one statement on purpose: the
 * IP limiter in rate-limit.ts lives in one instance's memory, so on Vercel it
 * cannot stop two instances from both mailing the same mailbox.
 */
export async function claimVerificationSend(email: string): Promise<boolean> {
  const rows = (await sql`
    UPDATE users SET verification_sent_at = now()
    WHERE email = ${email.trim().toLowerCase()}
      AND email_verified_at IS NULL
      AND (verification_sent_at IS NULL
           OR verification_sent_at < now() - interval '2 minutes')
    RETURNING id
  `) as { id: number }[];
  return rows.length > 0;
}

/**
 * Signs the session cookie. Only the email is stored: it identifies the user,
 * and everything else (name, status, role) is looked up live in getSession().
 * Putting authorization state in the token would let it go stale.
 */
export async function createSessionCookie(user: { email: string }): Promise<void> {
  const token = await new SignJWT({ email: user.email, purpose: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * The current session, memoized per request.
 *
 * The cookie proves *who* the visitor is; status and role are read fresh from
 * the database on every request so an approval, a downgrade or a deleted
 * account takes effect immediately. Trusting the JWT's own status claim would
 * mean an admin approval only reached the customer after they logged out and
 * back in — the token lives for SESSION_DAYS.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    // Verification links are signed with the same secret. Without this check a
    // verification token pasted into the cookie would authenticate. Cookies
    // issued before the claim existed have no `purpose` and still pass, so the
    // rollover logs nobody out.
    if (payload.purpose !== undefined && payload.purpose !== "session") return null;
    if (typeof payload.email !== "string") return null;
    const user = await findUser(payload.email);
    if (!user) return null; // account deleted since the token was issued
    return {
      email: user.email,
      name: user.name,
      status: user.status,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    };
  } catch {
    return null;
  }
});

/** The single gate for price visibility — enforced server-side everywhere. */
export function canSeePrices(session: Session | null): boolean {
  return session?.status === "approved";
}

export function isAdmin(session: Session | null): boolean {
  return session?.role === "admin";
}

/**
 * Admin-only guard for the DAL. Call at the top of every admin page, layout,
 * Server Action and route handler — layouts do not re-render on navigation,
 * so authorization must be re-checked close to each data access / mutation.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!isAdmin(session)) {
    redirect("/admin/login");
  }
  return session as Session;
}
