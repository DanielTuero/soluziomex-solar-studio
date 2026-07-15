import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSecurityState, isPasscodeEnabled } from "@/lib/security";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.enabled !== "boolean") {
      return NextResponse.json({ error: "Choose whether passcode entry is enabled." }, { status: 400 });
    }
    const current = await getSecurityState();
    if (body.enabled && !current.passcode_hash) {
      return NextResponse.json({ error: "Set a passcode before enabling this protection." }, { status: 400 });
    }
    await query("UPDATE app_security SET passcode_enabled = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1", [body.enabled ? 1 : 0]);
    const state = await getSecurityState();
    return NextResponse.json({ enabled: isPasscodeEnabled(state) });
  } catch {
    return NextResponse.json({ error: "Could not update the security setting." }, { status: 500 });
  }
}
