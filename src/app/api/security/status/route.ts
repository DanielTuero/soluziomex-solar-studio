import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getAuthenticatedUser, getSecurityState, isPasscodeEnabled, MENU_SECTIONS, SECURITY_CONFIRMATION_TTL_MS, SECURITY_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const state = await getSecurityState();
    const enabled = isPasscodeEnabled(state);
    const user = await getAuthenticatedUser(request.cookies.get(SESSION_COOKIE)?.value, state);
    const confirmedUser = await getAuthenticatedUser(request.cookies.get(SECURITY_SESSION_COOKIE)?.value, state, SECURITY_CONFIRMATION_TTL_MS);
    const securityToken = user && confirmedUser?.id === user.id ? createSessionToken(state.session_secret, user.id) : null;
    return NextResponse.json({
      enabled,
      authenticated: Boolean(user),
      user: user ? { id:user.id, username:user.username, display_name:user.display_name, is_admin:Boolean(user.is_admin) } : null,
      permissions: user?.permissions ?? (enabled ? [] : [...MENU_SECTIONS]),
      security_token: securityToken,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Solar Studio security is unavailable." }, { status: 503 });
  }
}
