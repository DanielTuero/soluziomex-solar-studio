import { NextRequest, NextResponse } from "next/server";
import { getSecurityState, isPasscodeEnabled, isSessionValid, SESSION_COOKIE } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const state = await getSecurityState();
    const enabled = isPasscodeEnabled(state);
    const authenticated = !enabled || isSessionValid(request.cookies.get(SESSION_COOKIE)?.value, state.session_secret);
    return NextResponse.json({ enabled, authenticated });
  } catch {
    return NextResponse.json({ error: "Solar Studio security is unavailable." }, { status: 503 });
  }
}
