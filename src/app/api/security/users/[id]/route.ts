import { NextRequest, NextResponse } from "next/server";
import { database, query } from "@/lib/db";
import { createPasswordHash, MENU_SECTIONS } from "@/lib/security";
import { cleanPermissions, requireAdmin } from "@/lib/user-admin";

export async function PUT(request: NextRequest, { params }: {params:Promise<{id:string}>}) {
  try {
    if (!await requireAdmin(request)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const { id } = await params;
    if (id === "admin") return NextResponse.json({ error: "Use the password form to update the Admin account." }, { status: 400 });
    const body = await request.json();
    const displayName = String(body.display_name ?? "").trim();
    const permissions = cleanPermissions(body.permissions);
    const active = body.is_active !== false;
    const password = String(body.password ?? "");
    if (!displayName) return NextResponse.json({ error: "Enter the user's display name." }, { status: 400 });
    if (password && password.length < 4) return NextResponse.json({ error: "Use at least 4 characters for the new password." }, { status: 400 });
    if (active && !permissions.length) return NextResponse.json({ error: "An active user needs access to at least one menu section." }, { status: 400 });
    await database.transaction(async transaction => {
      await transaction.query(`UPDATE app_users SET display_name=$1, is_active=$2, updated_at=CURRENT_TIMESTAMP${password ? ", password_hash=$3" : ""} WHERE id=${password ? "$4" : "$3"}`, password ? [displayName,active?1:0,createPasswordHash(password),id] : [displayName,active?1:0,id]);
      for (const section of MENU_SECTIONS) await transaction.query("INSERT INTO app_user_permissions (user_id, section, visible) VALUES ($1,$2,$3) ON CONFLICT (user_id, section) DO UPDATE SET visible=excluded.visible", [id,section,permissions.includes(section)?1:0]);
      await transaction.query("INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Security', $1, $2, 'Updated', 'Local user access and profile updated')", [id,displayName]);
    });
    return NextResponse.json({ updated:true });
  } catch {
    return NextResponse.json({ error: "Could not update the local user." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: {params:Promise<{id:string}>}) {
  try {
    if (!await requireAdmin(request)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const { id } = await params;
    if (id === "admin") return NextResponse.json({ error: "The Admin account cannot be deleted." }, { status: 400 });
    await query("DELETE FROM app_users WHERE id = $1", [id]);
    return new Response(null, { status:204 });
  } catch {
    return NextResponse.json({ error: "Could not delete the local user." }, { status: 400 });
  }
}
