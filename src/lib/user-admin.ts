import type { NextRequest } from "next/server";
import { getAuthenticatedUserFromToken, MENU_SECTIONS, type MenuSection, SECURITY_CONFIRMATION_TTL_MS, SECURITY_REQUEST_HEADER, SESSION_COOKIE } from "./security";

export function cleanPermissions(value: unknown): MenuSection[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((section):section is MenuSection => typeof section === "string" && MENU_SECTIONS.includes(section as MenuSection)))];
}

export function permissionsForRole(value: unknown, isAdmin: boolean): MenuSection[] {
  if (isAdmin) return [...MENU_SECTIONS];
  return [...new Set([...cleanPermissions(value), "security" as const])];
}

export async function authenticateSecurityRequest(request: NextRequest) {
  const securityToken = request.headers.get(SECURITY_REQUEST_HEADER);
  if (securityToken) return getAuthenticatedUserFromToken(securityToken, SECURITY_CONFIRMATION_TTL_MS);
  return getAuthenticatedUserFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(request: NextRequest) {
  const auth = await authenticateSecurityRequest(request);
  return auth.user && Boolean(auth.user.is_admin) ? auth.user : null;
}
