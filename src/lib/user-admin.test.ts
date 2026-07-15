import { describe, expect, test } from "vitest";
import { MENU_SECTIONS } from "./security";
import { cleanPermissions, permissionsForRole } from "./user-admin";

describe("user roles", () => {
  test("cleans unknown and duplicate menu permissions", () => {
    expect(cleanPermissions(["projects", "unknown", "projects"])).toEqual(["projects"]);
  });

  test("always lets collaborators reach their password settings", () => {
    expect(permissionsForRole(["projects"], false)).toEqual(["projects", "security"]);
    expect(permissionsForRole([], false)).toEqual(["security"]);
  });

  test("gives administrators every menu section", () => {
    expect(permissionsForRole([], true)).toEqual([...MENU_SECTIONS]);
  });
});
