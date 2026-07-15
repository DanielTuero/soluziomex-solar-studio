import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { database, query } from "@/lib/db";
import { createPasswordHash, getUserPermissions, MENU_SECTIONS } from "@/lib/security";
import { cleanPermissions, requireAdmin } from "@/lib/user-admin";

type UserRow = {id:string;username:string;display_name:string;is_admin:number|boolean;is_active:number|boolean;last_login_at:string|null;created_at:string};

export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin(request)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const { rows } = await query<UserRow>("SELECT id, username, display_name, is_admin, is_active, last_login_at, created_at FROM app_users ORDER BY is_admin DESC, display_name");
    const users = await Promise.all(rows.map(async user => ({ ...user, is_admin:Boolean(user.is_admin), is_active:Boolean(user.is_active), permissions: await getUserPermissions(user.id) })));
    return NextResponse.json({ users, sections: MENU_SECTIONS });
  } catch {
    return NextResponse.json({ error: "Could not load local users." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
    const body = await request.json();
    const username = String(body.username ?? "").trim().toLowerCase();
    const displayName = String(body.display_name ?? "").trim();
    const password = String(body.password ?? "");
    const permissions = cleanPermissions(body.permissions);
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) return NextResponse.json({ error: "Username must be 3–32 letters, numbers, dots, dashes, or underscores." }, { status: 400 });
    if (!displayName) return NextResponse.json({ error: "Enter the user's display name." }, { status: 400 });
    if (password.length < 4) return NextResponse.json({ error: "Use at least 4 characters for the password." }, { status: 400 });
    if (!permissions.length) return NextResponse.json({ error: "Turn on at least one menu section for this user." }, { status: 400 });
    const id = randomUUID();
    await database.transaction(async transaction => {
      await transaction.query("INSERT INTO app_users (id, username, display_name, password_hash, is_admin, is_active) VALUES ($1,$2,$3,$4,false,true)", [id, username, displayName, createPasswordHash(password)]);
      for (const section of MENU_SECTIONS) await transaction.query("INSERT INTO app_user_permissions (user_id, section, visible) VALUES ($1,$2,$3)", [id, section, permissions.includes(section) ? 1 : 0]);
      await transaction.query("INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Security', $1, $2, 'Created', 'Local user account created by administrator')", [id, displayName]);
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /UNIQUE/i.test(error.message) ? "That username already exists." : "Could not create the local user.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
