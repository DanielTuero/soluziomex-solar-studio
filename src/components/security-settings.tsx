"use client";

import { useEffect, useState } from "react";
import { Check, Database, KeyRound, ShieldCheck } from "lucide-react";

export function SecuritySettings() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/security/status", { cache: "no-store" }).then((response) => response.json()).then((state) => {
      setEnabled(Boolean(state.enabled));
      setLoading(false);
    });
  }, []);

  async function toggle() {
    setLoading(true);
    setMessage("");
    const next = !enabled;
    const response = await fetch("/api/security/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const result = await response.json();
    if (response.ok) {
      setEnabled(result.enabled);
      setMessage(result.enabled ? "Passcode entry is enabled." : "Passcode entry is disabled.");
    } else {
      setMessage(result.error || "Could not update this setting.");
    }
    setLoading(false);
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Workspace settings</p><h1>Security</h1><p>Control access to Solar Studio and its local project database.</p></div></div>
      <div className="settings-grid">
        <section className="card security-card">
          <div className="security-heading"><span><ShieldCheck size={23} /></span><div><h2>Passcode on app launch</h2><p>Ask for your passcode whenever Solar Studio is opened from the desktop icon.</p></div></div>
          <div className="security-setting">
            <div><strong>{enabled ? "Protection enabled" : "Protection disabled"}</strong><span>{enabled ? "The desktop launcher locks the workspace before opening it." : "The desktop launcher opens the workspace directly."}</span></div>
            <button type="button" className={`switch ${enabled ? "on" : ""}`} onClick={toggle} disabled={loading} role="switch" aria-checked={enabled}><span /></button>
          </div>
          {message && <div className="settings-message"><Check size={14} />{message}</div>}
        </section>
        <aside className="card security-info">
          <KeyRound size={19} /><h3>Local protection</h3><p>Your passcode is stored as a one-way cryptographic hash, not readable text.</p>
          <div><Database size={15} /><span>This setting and your project data remain in the local Solar Studio database.</span></div>
        </aside>
      </div>
    </>
  );
}
