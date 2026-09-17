"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, Loader2, LogOut, Search, X } from "lucide-react";

interface Registration {
  id: string;
  registration_code: string | null;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  year: string;
  registration_status: string;
  payment_proof_status: string;
  payment_proof_uploaded_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

interface Metrics {
  capacity: number;
  confirmed: number;
  remaining: number;
  drafts: number;
  cancelled: number;
}

const statusStyle: Record<string, string> = {
  confirmed: "bg-mint-50 text-mint-600 border-mint-600/20",
  draft: "bg-amber-50 text-amber-700 border-amber-700/20",
  cancelled: "bg-ink-900/5 text-ink-600 border-line",
};

export function AdminDashboard() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proof, setProof] = useState<{ url: string; name: string; code: string | null; uploadedAt: string | null } | null>(null);
  const [proofLoading, setProofLoading] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      if (year) q.set("year", year);
      if (status) q.set("status", status);
      const r = await fetch(`/api/admin/registrations?${q.toString()}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (r.status === 401) {
          window.location.reload();
          return;
        }
        throw new Error();
      }
      setRows(j.registrations);
      setMetrics(j.metrics);
    } catch {
      setError("Could not load registrations. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [search, year, status]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const filtered = useMemo(() => rows, [rows]);

  async function viewProof(id: string) {
    setProofLoading(id);
    try {
      const r = await fetch(`/api/admin/proof?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setProof({ url: j.url, name: j.studentName, code: j.registrationCode, uploadedAt: j.uploadedAt ?? null });
    } catch {
      setError("Could not open the payment proof. Please retry.");
    } finally {
      setProofLoading(null);
    }
  }

  async function cancel(id: string, name: string) {
    if (!window.confirm(`Cancel registration for ${name}? The seat will reopen immediately.`)) return;
    const reason = window.prompt("Reason (optional):", "") ?? "";
    setCancelling(id);
    try {
      const r = await fetch("/api/admin/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reason }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      load();
    } catch {
      setError("Cancellation failed. Please retry.");
    } finally {
      setCancelling(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Organizer Dashboard</h1>
          <p className="mt-1 text-sm text-ink-600">ROS2 Workshop · 28 Sep – 02 Oct 2026 · ₹1,500</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/export"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-bold text-navy-950 shadow-card transition hover:-translate-y-px">
            <Download className="size-4" aria-hidden="true" /> CSV
          </a>
          <button type="button" onClick={logout}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-950 px-4 text-sm font-bold text-white transition hover:bg-cobalt-600">
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>

      {metrics && (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ["Capacity", metrics.capacity],
            ["Confirmed", metrics.confirmed],
            ["Remaining", metrics.remaining],
            ["Drafts", metrics.drafts],
            ["Cancelled", metrics.cancelled],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl border border-line bg-card px-4 py-3.5 shadow-card">
              <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">{k}</dt>
              <dd className="mt-0.5 font-display text-2xl font-bold text-navy-950">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone, ID, college…"
            aria-label="Search registrations"
            className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-4 text-sm outline-none transition focus:border-cobalt-500" />
        </label>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year"
            className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-cobalt-500">
            <option value="">All years</option>
            <option value="TE">TE</option>
            <option value="BE">BE</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
            className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold outline-none focus:border-cobalt-500">
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-700/20 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-card shadow-card">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <caption className="sr-only">Workshop registrations</caption>
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wider text-ink-500">
              {["Registration ID", "Student", "College · Year", "Email", "Phone", "Status", "Proof", "Registered", "Actions"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-500"><Loader2 className="mx-auto size-6 animate-spin" aria-hidden="true" /> Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-500">No registrations match.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3 font-mono text-[13px] font-bold text-navy-950">{r.registration_code ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-navy-950">{r.full_name}</td>
                  <td className="px-4 py-3 text-ink-600">{r.college} · {r.year}</td>
                  <td className="px-4 py-3 text-ink-600">{r.email}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink-600">{r.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[r.registration_status] ?? statusStyle.draft}`}>
                      {r.registration_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => viewProof(r.id)} disabled={proofLoading === r.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt-50 px-2.5 py-1.5 text-xs font-bold text-cobalt-600 transition hover:bg-cobalt-100 disabled:opacity-60">
                      {proofLoading === r.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
                      View Proof
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-600">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-4 py-3">
                    {r.registration_status !== "cancelled" ? (
                      <button type="button" onClick={() => cancel(r.id, r.full_name)} disabled={cancelling === r.id}
                        className="rounded-lg border border-rose-700/25 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60">
                        {cancelling === r.id ? "Cancelling…" : "Cancel"}
                      </button>
                    ) : (
                      <span className="text-xs text-ink-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {proof && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/70 p-4" role="dialog" aria-modal="true" aria-label="Payment proof viewer">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-display text-base font-bold text-navy-950">{proof.name}</p>
                <p className="font-mono text-xs text-ink-500">{proof.code ?? "no code"} · ₹1,500 payment proof received · link expires in ~3 min</p>
                {proof.uploadedAt && (
                  <p className="mt-0.5 text-xs text-ink-500">
                    Uploaded {new Date(proof.uploadedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setProof(null)} aria-label="Close proof viewer"
                className="grid size-9 place-items-center rounded-lg border border-line transition hover:bg-paper">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proof.url} alt={`Payment screenshot for ${proof.name}`} className="max-h-[70vh] w-full object-contain bg-navy-950" />
          </div>
        </div>
      )}
    </div>
  );
}
