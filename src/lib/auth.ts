import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Lightweight B2B auth: users live in data/users.json (gitignored),
 * sessions are signed JWTs in an HTTP-only cookie. Prices are only
 * rendered for sessions whose account status is "approved".
 *
 * NOTE: accounts from the old WordPress site cannot be migrated (no DB
 * access) — customers register anew and are approved by the SHEMO team.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET_FILE = path.join(DATA_DIR, ".auth-secret");
const COOKIE_NAME = "shemo_session";
const SESSION_DAYS = 7;

export type UserStatus = "pending" | "approved";

export interface StoredUser {
  email: string;
  passwordHash: string; // salt:hash (scrypt)
  name: string;
  company: string;
  phone: string;
  status: UserStatus;
  createdAt: string;
}

export interface Session {
  email: string;
  name: string;
  status: UserStatus;
}

function getSecret(): Uint8Array {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) return new TextEncoder().encode(fromEnv);
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(SECRET_FILE)) {
    writeFileSync(SECRET_FILE, randomBytes(32).toString("hex"), { flag: "wx" });
  }
  return new TextEncoder().encode(readFileSync(SECRET_FILE, "utf8").trim());
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

/** Demo account so price visibility can be tested before real approvals exist. */
const DEMO_USER: Omit<StoredUser, "passwordHash"> & { password: string } = {
  email: "demo@shemopharm.com",
  password: "Demo2026!",
  name: "Llogari Demo",
  company: "Barnatore Demo",
  phone: "",
  status: "approved",
  createdAt: "2026-01-01T00:00:00.000Z",
};

export function readUsers(): StoredUser[] {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(USERS_FILE)) {
    const seed: StoredUser[] = [
      {
        email: DEMO_USER.email,
        passwordHash: hashPassword(DEMO_USER.password),
        name: DEMO_USER.name,
        company: DEMO_USER.company,
        phone: DEMO_USER.phone,
        status: DEMO_USER.status,
        createdAt: DEMO_USER.createdAt,
      },
    ];
    writeFileSync(USERS_FILE, JSON.stringify(seed, null, 1));
    return seed;
  }
  try {
    return JSON.parse(readFileSync(USERS_FILE, "utf8")) as StoredUser[];
  } catch {
    return [];
  }
}

export function writeUsers(users: StoredUser[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 1));
}

export function findUser(email: string): StoredUser | undefined {
  return readUsers().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );
}

export async function createSessionCookie(user: StoredUser): Promise<void> {
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    status: user.status,
  })
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

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.email !== "string") return null;
    return {
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      status: payload.status === "approved" ? "approved" : "pending",
    };
  } catch {
    return null;
  }
}

/** The single gate for price visibility — enforced server-side everywhere. */
export function canSeePrices(session: Session | null): boolean {
  return session?.status === "approved";
}
