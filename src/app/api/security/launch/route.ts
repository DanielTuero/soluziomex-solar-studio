import { NextRequest, NextResponse } from "next/server";
import { getSecurityState, isPasscodeEnabled, SECURITY_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let destination = "/unlock";
  try {
    const state = await getSecurityState();
    if (!isPasscodeEnabled(state)) destination = "/";
  } catch {
    destination = "/unlock";
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  response.cookies.set(SECURITY_SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
