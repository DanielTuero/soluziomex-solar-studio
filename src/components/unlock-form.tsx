"use client";

import { FormEvent, useEffect, useState } from "react";
import { Database, LockKeyhole, SunMedium } from "lucide-react";

export function UnlockForm() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/security/status", { cache: "no-store" }).then((response) => response.json()).then((state) => {
      if (!state.enabled || state.authenticated) window.location.replace("/");
    }).catch(() => setError("The local database is still starting. Try again in a moment."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/security/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to unlock Solar Studio.");
      window.location.replace("/");
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
        <h1>Welcome back, Admin</h1>
        <p className="unlock-copy">Enter your passcode to connect to the local project database.</p>
        <form onSubmit={submit}>
          <label htmlFor="passcode">Passcode</label>
          <input id="passcode" type="password" autoFocus autoComplete="current-password" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Enter your passcode" required />
          {error && <div className="unlock-error" role="alert">{error}</div>}
          <button className="button primary" disabled={loading}>{loading ? "Unlocking…" : "Unlock Solar Studio"}</button>
        </form>
        <div className="unlock-local"><Database size={14} /><span>Your project data stays on this computer.</span></div>
      </section>
    </main>
  );
}
