import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getSecurityState, getUserByUsername, isPasscodeEnabled, SECURITY_SESSION_COOKIE, SESSION_COOKIE, verifyPasscode } from "@/lib/security";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const state = await getSecurityState();
    const user = await getUserByUsername(String(body.username ?? "admin"));
    if (isPasscodeEnabled(state) && (!user || !Boolean(user.is_active) || !verifyPasscode(String(body.passcode ?? ""), user.password_hash))) {
      return NextResponse.json({ error: "That username or password is not correct." }, { status: 401 });
    }

    const authenticatedUser = user ?? await getUserByUsername("admin");
    if (!authenticatedUser) return NextResponse.json({ error: "The Admin account is not ready. Run npm run db:setup." }, { status: 503 });
    await query("UPDATE app_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [authenticatedUser.id]);
    const response = NextResponse.json({ ok: true, user: { username: authenticatedUser.username, display_name: authenticatedUser.display_name } });
    const token = createSessionToken(state.session_secret, authenticatedUser.id);
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    if (body.security_scope === true) response.cookies.set(SECURITY_SESSION_COOKIE, token, { httpOnly:true, sameSite:"strict", path:"/", maxAge:60 * 15 });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to unlock Solar Studio." }, { status: 400 });
  }
}
