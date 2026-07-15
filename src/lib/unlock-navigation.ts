type SecurityStatus = {
  enabled?: boolean;
  authenticated?: boolean;
  security_token?: unknown;
};

export function shouldLeaveUnlockPage(state: SecurityStatus, nextPath: string) {
  if (!state.enabled) return true;
  if (nextPath.startsWith("/settings")) {
    return typeof state.security_token === "string" && state.security_token.length > 0;
  }
  return Boolean(state.authenticated);
}
