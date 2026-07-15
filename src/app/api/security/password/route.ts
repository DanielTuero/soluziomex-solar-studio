import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createPasswordHash, createSessionToken, getUserById, SECURITY_SESSION_COOKIE, SESSION_COOKIE, verifyPasscode } from "@/lib/security";
import { authenticateSecurityRequest } from "@/lib/user-admin";

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateSecurityRequest(request);
    if (!auth.user) return NextResponse.json({ error: "Sign in before changing your password." }, { status: 401 });
    const body = await request.json();
    const current = String(body.current_password ?? "");
    const next = String(body.new_password ?? "");
    if (next.length < 4) return NextResponse.json({ error: "Use at least 4 characters for the new password." }, { status: 400 });
    const stored = await getUserById(auth.user.id);
    if (!stored || !verifyPasscode(current, stored.password_hash)) return NextResponse.json({ error: "Your current password is not correct." }, { status: 401 });

    const passwordHash = createPasswordHash(next);
    await query("UPDATE app_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [passwordHash, stored.id]);
    let secret = auth.state.session_secret;
    if (Boolean(stored.is_admin)) {
      secret = randomBytes(32).toString("hex");
      await query("UPDATE app_security SET passcode_hash = $1, passcode_enabled = true, session_secret = $2, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [passwordHash, secret]);
    }
    await query("INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Security', $1, $2, 'Updated', 'Account password changed')", [stored.id, stored.display_name]);
    const token = createSessionToken(secret, stored.id);
    const response = NextResponse.json({ changed: true, security_token: token });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly:true, sameSite:"lax", path:"/", maxAge:60*60*24*30 });
    response.cookies.set(SECURITY_SESSION_COOKIE, token, { httpOnly:true, sameSite:"strict", path:"/", maxAge:60*15 });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not change the password." }, { status: 500 });
  }
}
