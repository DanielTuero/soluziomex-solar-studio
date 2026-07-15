import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "./db";

export const SESSION_COOKIE = "solar_studio_session";
export const SECURITY_SESSION_COOKIE = "solar_studio_security_session";
export const SECURITY_REQUEST_HEADER = "x-solar-studio-security";
export const SECURITY_CONFIRMATION_TTL_MS = 15 * 60 * 1000;
const LEGACY_SESSION_MESSAGE = "solar-studio-unlocked";
const SESSION_VERSION = "v1";

export const MENU_SECTIONS = ["portfolio", "projects", "products", "cost_catalog", "partners", "operations", "security"] as const;
export type MenuSection = typeof MENU_SECTIONS[number];

export type SecurityState = {
  passcode_hash: string;
  passcode_enabled: number | boolean;
  session_secret: string;
};

export type AppUser = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  is_admin: number | boolean;
  is_active: number | boolean;
  last_login_at: string | null;
  created_at: string;
};

export type SessionUser = Omit<AppUser, "password_hash"> & { permissions: MenuSection[] };

export async function getSecurityState() {
  const { rows } = await query<SecurityState>(
    "SELECT passcode_hash, passcode_enabled, session_secret FROM app_security WHERE id = 1",
  );
  if (!rows[0]) throw new Error("Solar Studio security has not been initialized.");
  return rows[0];
}

export function isPasscodeEnabled(state: SecurityState) {
  return Boolean(state.passcode_enabled) && Boolean(state.passcode_hash);
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPasscode(passcode: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  try {
    const actual = scryptSync(passcode, salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function signature(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionToken(secret: string, userId: string) {
  const payload = Buffer.from(JSON.stringify({ userId, issuedAt: Date.now() })).toString("base64url");
  return `${SESSION_VERSION}.${payload}.${signature(`${SESSION_VERSION}.${payload}`, secret)}`;
}

function sessionUserId(token: string | undefined, secret: string, maxAgeMs?: number) {
  if (!token) return null;
  const [version, payload, suppliedSignature] = token.split(".");
  if (version !== SESSION_VERSION || !payload || !suppliedSignature) return null;
  const expected = Buffer.from(signature(`${version}.${payload}`, secret), "utf8");
  const actual = Buffer.from(suppliedSignature, "utf8");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {userId?:unknown;issuedAt?:unknown};
    if (typeof decoded.userId !== "string" || typeof decoded.issuedAt !== "number") return null;
    if (maxAgeMs !== undefined && (decoded.issuedAt > Date.now() || Date.now() - decoded.issuedAt > maxAgeMs)) return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

function isLegacySessionValid(token: string | undefined, secret: string) {
  if (!token) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(LEGACY_SESSION_MESSAGE).digest("hex"), "utf8");
  const actual = Buffer.from(token, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getUserByUsername(username: string) {
  const { rows } = await query<AppUser>(
    "SELECT id, username, display_name, password_hash, is_admin, is_active, last_login_at, created_at FROM app_users WHERE username = $1 COLLATE NOCASE",
    [username.trim()],
  );
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const { rows } = await query<AppUser>(
    "SELECT id, username, display_name, password_hash, is_admin, is_active, last_login_at, created_at FROM app_users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function getUserPermissions(userId: string): Promise<MenuSection[]> {
  const { rows } = await query<{section:MenuSection}>(
    "SELECT section FROM app_user_permissions WHERE user_id = $1 AND visible = true",
    [userId],
  );
  return rows.map(row => row.section).filter(section => MENU_SECTIONS.includes(section));
}

function publicUser(user: AppUser, permissions: MenuSection[]): SessionUser {
  const { password_hash: _, ...safe } = user;
  return { ...safe, permissions: Boolean(user.is_admin) ? [...MENU_SECTIONS] : [...new Set([...permissions, "security" as const])] };
}

export async function getAuthenticatedUser(token: string | undefined, state: SecurityState, maxAgeMs?: number): Promise<SessionUser | null> {
  if (!isPasscodeEnabled(state)) {
    const admin = await getUserByUsername("admin");
    return admin ? publicUser(admin, [...MENU_SECTIONS]) : {
      id: "admin", username: "admin", display_name: "Admin", is_admin: true, is_active: true,
      last_login_at: null, created_at: new Date(0).toISOString(), permissions: [...MENU_SECTIONS],
    };
  }
  let userId = sessionUserId(token, state.session_secret, maxAgeMs);
  if (!userId && maxAgeMs === undefined && isLegacySessionValid(token, state.session_secret)) userId = "admin";
  if (!userId) return null;
  const user = await getUserById(userId);
  if (!user || !Boolean(user.is_active)) return null;
  return publicUser(user, await getUserPermissions(user.id));
}

export async function getAuthenticatedUserFromToken(token: string | undefined, maxAgeMs?: number) {
  const state = await getSecurityState();
  return { state, user: await getAuthenticatedUser(token, state, maxAgeMs) };
}

export function hasSectionAccess(user: SessionUser, sections: MenuSection[]) {
  return Boolean(user.is_admin) || sections.some(section => user.permissions.includes(section));
}

export function firstAllowedPath(user: SessionUser) {
  const paths: Record<MenuSection,string> = {portfolio:"/",projects:"/projects",products:"/products",cost_catalog:"/cost-catalog",partners:"/partners",operations:"/operations",security:"/settings"};
  return paths[user.permissions[0] ?? "portfolio"];
}
