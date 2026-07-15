import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, getSecurityState, isPasscodeEnabled, SESSION_COOKIE, verifyPasscode } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const state = await getSecurityState();
    if (isPasscodeEnabled(state) && !verifyPasscode(String(body.passcode ?? ""), state.passcode_hash)) {
      return NextResponse.json({ error: "That passcode is not correct." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, createSessionToken(state.session_secret), {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unable to unlock Solar Studio." }, { status: 400 });
  }
}
