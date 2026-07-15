import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { query } from "@/lib/db";

export const SESSION_COOKIE = "solar_studio_session";
const SESSION_MESSAGE = "solar-studio-unlocked";

export type SecurityState = {
  passcode_hash: string;
  passcode_enabled: number | boolean;
  session_secret: string;
};

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

export function createSessionToken(secret: string) {
  return createHmac("sha256", secret).update(SESSION_MESSAGE).digest("hex");
}

export function isSessionValid(token: string | undefined, secret: string) {
  if (!token) return false;
  const expected = Buffer.from(createSessionToken(secret), "utf8");
  const actual = Buffer.from(token, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
