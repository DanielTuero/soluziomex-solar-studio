import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getSecurityState, isPasscodeEnabled, MENU_SECTIONS, SESSION_COOKIE } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const state = await getSecurityState();
    const enabled = isPasscodeEnabled(state);
    const user = await getAuthenticatedUser(request.cookies.get(SESSION_COOKIE)?.value, state);
    return NextResponse.json({
      enabled,
      authenticated: Boolean(user),
      user: user ? { id:user.id, username:user.username, display_name:user.display_name, is_admin:Boolean(user.is_admin) } : null,
      permissions: user?.permissions ?? (enabled ? [] : [...MENU_SECTIONS]),
    });
  } catch {
    return NextResponse.json({ error: "Solar Studio security is unavailable." }, { status: 503 });
  }
}
