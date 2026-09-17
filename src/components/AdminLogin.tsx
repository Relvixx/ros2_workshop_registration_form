"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.code === "wrong_password" ? "Incorrect password." : "Login failed. Check server configuration and try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 sm:px-6">
      <section aria-labelledby="admin-login-heading" className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-navy-950 text-white" aria-hidden="true">
          <Lock className="size-5" />
        </span>
        <h1 id="admin-login-heading" className="mt-4 font-display text-2xl font-bold text-navy-950">Organizer Login</h1>
        <p className="mt-1 text-sm text-ink-600">Password-protected dashboard for workshop organizers.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="admin-password" className="mb-1.5 block text-sm font-bold text-navy-950">Admin password</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] outline-none transition focus:border-cobalt-500"
              aria-invalid={!!error} />
          </div>
          {error && <p role="alert" className="rounded-xl border border-rose-700/20 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
          <button type="submit" disabled={busy || !password}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-navy-950 text-base font-bold text-white transition hover:bg-cobalt-600 disabled:opacity-50">
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />} Sign in
          </button>
        </form>
      </section>
    </div>
  );
}
