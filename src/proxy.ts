import { NextRequest, NextResponse } from "next/server";
import { getSecurityState, isPasscodeEnabled, isSessionValid, SESSION_COOKIE } from "@/lib/security";

const OPEN_PATHS = new Set([
  "/unlock",
  "/api/security/status",
  "/api/security/unlock",
  "/api/security/launch",
]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (OPEN_PATHS.has(path)) return NextResponse.next();

  try {
    const state = await getSecurityState();
    if (!isPasscodeEnabled(state) || isSessionValid(request.cookies.get(SESSION_COOKIE)?.value, state.session_secret)) {
      return NextResponse.next();
    }
  } catch {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Solar Studio security is unavailable." }, { status: 503 });
    }
  }

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Unlock Solar Studio to access the local database." }, { status: 401 });
  }

  const unlockUrl = request.nextUrl.clone();
  unlockUrl.pathname = "/unlock";
  unlockUrl.search = "";
  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|solar-studio.ico).*)"],
};
