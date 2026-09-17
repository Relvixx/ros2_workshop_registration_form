// Audit probes part 1 — safe probes: RPC existence, RLS policies, anon isolation.
// Prints structural facts only. No secrets, no PII.
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvFile(new URL("../.env.local", import.meta.url));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const svc = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const anonC = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const out = {};

// NOTE: pg catalog views are not exposed via PostgREST, so RLS posture is
// Anon read on registrations must return [] (deny-by-default, no error).
try {
  const r = await anonC.from("workshop_registrations").select("id").limit(1);
  out.anonRegRead = { error: r.error ? `${r.error.code ?? ""} ${r.error.message}`.trim().slice(0, 120) : null, rows: (r.data || []).length };
} catch (e) { out.anonRegRead = { error: String(e).slice(0, 120) }; }

// anon storage list on private bucket must fail
try {
  const r = await anonC.storage.from("payment-proofs").list();
  out.anonStorageList = { error: r.error ? r.error.message.slice(0, 140) : null, items: r.data ? r.data.length : 0 };
} catch (e) { out.anonStorageList = { error: String(e).slice(0, 120) }; }

// finalize_registration existence probe (bogus UUID -> safe: returns before any write)
try {
  const r = await svc.rpc("finalize_registration", { p_draft_id: "00000000-0000-0000-0000-000000000000", p_token_hash: "x" });
  out.finalizeProbe = r.error ? { error: `${r.error.code ?? ""} ${r.error.message}`.trim().slice(0, 160) } : { data: r.data };
} catch (e) { out.finalizeProbe = { error: String(e).slice(0, 120) }; }

// cancel_registration existence probe (bogus UUID -> safe: returns before any write)
try {
  const r = await svc.rpc("cancel_registration", { p_registration_id: "00000000-0000-0000-0000-000000000000", p_reason: null });
  out.cancelProbe = r.error ? { error: `${r.error.code ?? ""} ${r.error.message}`.trim().slice(0, 160) } : { data: r.data };
} catch (e) { out.cancelProbe = { error: String(e).slice(0, 120) }; }

console.log(JSON.stringify(out, null, 1));
