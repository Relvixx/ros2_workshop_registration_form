// Audit-only DB diagnostic. READ-ONLY (no inserts/updates/deletes).
// Loads .env.local for credentials, prints ONLY structural facts, never secrets.
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
console.log(JSON.stringify({
  envPresent: { url: !!url, anon: !!anon, service: !!service },
}));

if (!url || !service) {
  console.log(JSON.stringify({ fatal: "missing env" }));
  process.exit(0);
}

const svc = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const out = {};

// 1. settings row?
try {
  const r = await svc.from("workshop_settings").select("slug,capacity,confirmed_count,is_active");
  out.settings = r.error
    ? { error: `${r.error.code ?? ""} ${r.error.message}`.trim() }
    : { rows: r.data };
} catch (e) { out.settings = { error: String(e).slice(0, 120) }; }

// 2. counts by status (read-only)?
try {
  const r = await svc.from("workshop_registrations").select("registration_status").limit(2000);
  if (r.error) out.counts = { error: `${r.error.code ?? ""} ${r.error.message}`.trim() };
  else {
    const by = {};
    for (const row of r.data) by[row.registration_status] = (by[row.registration_status] || 0) + 1;
    out.counts = { total: r.data.length, by };
  }
} catch (e) { out.counts = { error: String(e).slice(0, 120) }; }

// 3. bucket?
try {
  const r = await svc.storage.listBuckets();
  out.buckets = r.error
    ? { error: r.error.message.slice(0, 120) }
    : (r.data || []).map((b) => ({ id: b.id, public: b.public }));
} catch (e) { out.buckets = { error: String(e).slice(0, 120) }; }

// 4. RPCs visible to anon (seat RPC) + service (all)?
try {
  const anonClient = createClient(url, anon);
  const r = await anonClient.rpc("get_seat_status", { p_slug: "ros2-workshop-2026" });
  out.rpcSeatAnon = r.error ? { error: `${r.error.code ?? ""} ${r.error.message}`.trim().slice(0, 140) } : { data: r.data };
} catch (e) { out.rpcSeatAnon = { error: String(e).slice(0, 120) }; }

console.log(JSON.stringify(out, null, 1));
