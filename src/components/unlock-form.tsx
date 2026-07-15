"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, LockKeyhole, SunMedium } from "lucide-react";

export function UnlockForm({nextPath="/"}:{nextPath?:string}) {
  const [username, setUsername] = useState("admin");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/security/status", { cache: "no-store" }).then((response) => response.json()).then((state) => {
      if (!state.enabled || state.authenticated) window.location.replace(nextPath);
    }).catch(() => setError("The local database is still starting. Try again in a moment."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/security/unlock", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, passcode, security_scope: nextPath.startsWith("/settings") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to unlock Solar Studio.");
      window.location.replace(nextPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to unlock Solar Studio.");
      setPasscode("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="unlock-page">
      <section className="unlock-panel">
        <div className="unlock-brand"><span><SunMedium size={27} /></span><div><strong>Solar Studio</strong><small>by Soluziomex</small></div></div>
        <div className="unlock-icon"><LockKeyhole size={26} /></div>
        <p className="eyebrow">Protected local workspace</p>
        <h1>Welcome back</h1>
        <p className="unlock-copy">Sign in with your local Solar Studio account.</p>
        <form onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <input id="username" autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" required />
          <label htmlFor="passcode" className="unlock-password-label">Password</label>
          <input id="passcode" type="password" autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Enter your password" required />
          {error && <div className="unlock-error" role="alert">{error}</div>}
          <button className="button primary" disabled={loading}>{loading ? "Signing in…" : "Sign in to Solar Studio"}</button>
        </form>
        <div className="unlock-local"><Database size={14} /><span>Your project data stays on this computer.</span></div>
      </section>
    </main>
  );
}
