import type { NextRequest } from "next/server";
import { getAuthenticatedUserFromToken, MENU_SECTIONS, type MenuSection, SESSION_COOKIE } from "@/lib/security";

export function cleanPermissions(value: unknown): MenuSection[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((section):section is MenuSection => typeof section === "string" && MENU_SECTIONS.includes(section as MenuSection)))];
}

export async function requireAdmin(request: NextRequest) {
  const auth = await getAuthenticatedUserFromToken(request.cookies.get(SESSION_COOKIE)?.value);
  return auth.user && Boolean(auth.user.is_admin) ? auth.user : null;
}
