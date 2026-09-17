// Audit step: seed the workshop settings row using the EXACT statement from
// supabase/migrations/0001_init.sql (idempotent). Required for launch; the
// live project has 0 participant rows, so this is safe.
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
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const r = await svc.from("workshop_settings").upsert(
  { slug: "ros2-workshop-2026", capacity: 30, confirmed_count: 0, is_active: true },
  { onConflict: "slug", ignoreDuplicates: true },
);
if (r.error) {
  console.log(JSON.stringify({ seeded: false, error: `${r.error.code ?? ""} ${r.error.message}`.trim().slice(0, 160) }));
} else {
  const v = await svc.from("workshop_settings").select("slug,capacity,confirmed_count,is_active").eq("slug", "ros2-workshop-2026").maybeSingle();
  console.log(JSON.stringify({ seeded: true, row: v.data, error: v.error ? v.error.message.slice(0, 120) : null }));
}
