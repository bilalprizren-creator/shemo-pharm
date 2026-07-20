import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

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
}

export interface Session {
  email: string;
  name: string;
  status: UserStatus;
  role: UserRole;
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
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
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
}

/** Creates a customer account with status "pending" (awaits admin approval). */
export async function createUser(data: NewUser): Promise<StoredUser> {
  const rows = (await sql`
    INSERT INTO users (email, password_hash, name, company, phone, status, role)
    VALUES (${data.email.trim().toLowerCase()}, ${data.passwordHash}, ${data.name},
            ${data.company}, ${data.phone}, 'pending', 'customer')
    RETURNING *
  `) as UserRow[];
  return mapUser(rows[0]);
}

/**
 * Signs the session cookie. Only the email is stored: it identifies the user,
 * and everything else (name, status, role) is looked up live in getSession().
 * Putting authorization state in the token would let it go stale.
 */
export async function createSessionCookie(user: { email: string }): Promise<void> {
  const token = await new SignJWT({ email: user.email })
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
    if (typeof payload.email !== "string") return null;
    const user = await findUser(payload.email);
    if (!user) return null; // account deleted since the token was issued
    return {
      email: user.email,
      name: user.name,
      status: user.status,
      role: user.role,
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
