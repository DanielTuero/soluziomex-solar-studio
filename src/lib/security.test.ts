import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test, vi } from "vitest";

describe("local user security", () => {
  let security: typeof import("./security");
  let state: import("./security").SecurityState;

  beforeAll(async () => {
    const directory = await mkdtemp(join(tmpdir(), "solar-studio-security-"));
    process.env.SOLAR_STUDIO_DATA_PATH = join(directory, "solar-studio.db");
    const db = await import("./db");
    security = await import("./security");
    const hash = security.createPasswordHash("correct-passcode");
    await db.query("CREATE TABLE app_security (id integer PRIMARY KEY, passcode_hash text, passcode_enabled boolean, session_secret text)");
    await db.query("CREATE TABLE app_users (id text PRIMARY KEY, username text, display_name text, password_hash text, is_admin boolean, is_active boolean, last_login_at text, created_at text)");
    await db.query("CREATE TABLE app_user_permissions (user_id text, section text, visible boolean)");
    await db.query("INSERT INTO app_security VALUES (1,$1,1,'test-secret')", [hash]);
    await db.query("INSERT INTO app_users VALUES ('user-1','maria','María',$1,0,1,NULL,CURRENT_TIMESTAMP)", [hash]);
    await db.query("INSERT INTO app_user_permissions VALUES ('user-1','projects',1)");
    state = await security.getSecurityState();
  });

  test("requires the correct password", () => {
    expect(security.verifyPasscode("correct-passcode", state.passcode_hash)).toBe(true);
    expect(security.verifyPasscode("wrong", state.passcode_hash)).toBe(false);
  });

  test("resolves a signed session to the active user's permissions", async () => {
    const token = security.createSessionToken(state.session_secret, "user-1");
    const user = await security.getAuthenticatedUser(token, state);
    expect(user?.username).toBe("maria");
    expect(user?.permissions).toEqual(["projects", "security"]);
    expect(await security.getAuthenticatedUser(`${token}x`, state)).toBeNull();
  });

  test("expires short-lived security confirmation tokens", async () => {
    const issuedAt = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(issuedAt);
    const token = security.createSessionToken(state.session_secret, "user-1");
    vi.spyOn(Date, "now").mockReturnValue(issuedAt + security.SECURITY_CONFIRMATION_TTL_MS + 1);
    expect(await security.getAuthenticatedUser(token, state, security.SECURITY_CONFIRMATION_TTL_MS)).toBeNull();
    vi.restoreAllMocks();
  });
});
