import { NextRequest, NextResponse } from "next/server";
import { firstAllowedPath, getAuthenticatedUser, getSecurityState, hasSectionAccess, type MenuSection, SECURITY_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/security";

const OPEN_PATHS = new Set(["/unlock", "/api/security/status", "/api/security/unlock", "/api/security/launch"]);

function requiredSections(path: string): MenuSection[] | null {
  if (path === "/") return ["portfolio"];
  if (path.startsWith("/projects")) return ["projects"];
  if (path.startsWith("/products")) return ["products"];
  if (path.startsWith("/cost-catalog")) return ["cost_catalog"];
  if (path.startsWith("/partners")) return ["partners"];
  if (path.startsWith("/operations")) return ["operations"];
  if (path.startsWith("/settings") || path.startsWith("/api/security/")) return ["security"];
  if (path.startsWith("/api/backups") || path.startsWith("/api/audit")) return ["operations"];
  if (path.startsWith("/api/products")) return ["products", "projects"];
  if (path.startsWith("/api/cost-catalog")) return ["cost_catalog", "projects"];
  if (path.startsWith("/api/partners") || path.startsWith("/api/quotes")) return ["partners", "projects"];
  if (path.startsWith("/api/projects") || path.startsWith("/api/items") || path.startsWith("/api/costs")) return ["portfolio", "projects"];
  return null;
}

function requiresSecurityConfirmation(path: string) {
  return path.startsWith("/settings") || (path.startsWith("/api/security/") && !OPEN_PATHS.has(path));
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (OPEN_PATHS.has(path)) return NextResponse.next();

  try {
    const state = await getSecurityState();
    const user = await getAuthenticatedUser(request.cookies.get(SESSION_COOKIE)?.value, state);
    if (user) {
      if (requiresSecurityConfirmation(path)) {
        const confirmedUser = await getAuthenticatedUser(request.cookies.get(SECURITY_SESSION_COOKIE)?.value, state);
        if (!confirmedUser || confirmedUser.id !== user.id) {
          if (path.startsWith("/api/")) return NextResponse.json({ error: "Confirm your password before changing security settings." }, { status: 401 });
          const confirmUrl = request.nextUrl.clone();
          confirmUrl.pathname = "/unlock";
          confirmUrl.search = "";
          confirmUrl.searchParams.set("next", path);
          return NextResponse.redirect(confirmUrl);
        }
      }
      const sections = requiredSections(path);
      if (!sections || hasSectionAccess(user, sections)) return NextResponse.next();
      if (path.startsWith("/api/")) return NextResponse.json({ error: "Your account does not have access to this section." }, { status: 403 });
      return NextResponse.redirect(new URL(firstAllowedPath(user), request.url));
    }
  } catch {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Solar Studio security is unavailable." }, { status: 503 });
  }

  if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in to access the local database." }, { status: 401 });
  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.search = "";
  unlockUrl.searchParams.set("next", path);
  return NextResponse.redirect(unlockUrl);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|solar-studio.ico).*)"] };
