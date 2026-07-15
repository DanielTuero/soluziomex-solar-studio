import { describe, expect, test } from "vitest";
import { shouldLeaveUnlockPage } from "./unlock-navigation";

describe("unlock navigation", () => {
  test("keeps an authenticated workspace user on the Security password screen", () => {
    expect(shouldLeaveUnlockPage({ enabled:true, authenticated:true, security_token:null }, "/settings")).toBe(false);
  });

  test("enters Security only after its confirmation token exists", () => {
    expect(shouldLeaveUnlockPage({ enabled:true, authenticated:true, security_token:"confirmed" }, "/settings")).toBe(true);
  });

  test("skips the password screen for an ordinary authenticated section", () => {
    expect(shouldLeaveUnlockPage({ enabled:true, authenticated:true, security_token:null }, "/projects")).toBe(true);
  });
});
