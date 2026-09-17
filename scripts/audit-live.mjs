// FINAL AUDIT live end-to-end test. Runs against the PUBLIC + ADMIN HTTP APIs
// exactly as browsers would. Uses ONLY obviously-fake audit identities.
// SAFETY: aborts unless the project is EMPTY (0 registration rows) at start.
// Ends with FULL cleanup (cancel via RPC, hard-delete test rows, wipe test
// storage objects) and verifies pristine state. Prints statuses/counts only.
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

const BASE = process.argv[2] || "http://localhost:3202";
const results = [];
const ok = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond, extra: String(extra).slice(0, 160) });
  if (!cond) console.log(`FAIL: ${name} ${extra}`);
};

const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// 1x1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function api(method, path, { body, cookie, form } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
  const r = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* csv etc */ }
  return { status: r.status, json, text, headers: r.headers };
}

const seats = async () => (await api("GET", "/api/seats")).json;
const count = async () => (await svc.from("workshop_settings").select("confirmed_count").eq("slug", "ros2-workshop-2026").maybeSingle()).data?.confirmed_count;

// ---- SAFETY GATE: project must be empty ----
{
  const rows = await svc.from("workshop_registrations").select("id").limit(5);
  if ((rows.data || []).length > 0) {
    console.log(JSON.stringify({ aborted: "project is NOT empty — refusing live mutation tests" }));
    process.exit(2);
  }
  console.log("safety-gate: project empty, proceeding");
}

const WORDS = ["Alpha","Bravo","Charlie","Delta","Echo","Foxtrot","Golf","Hotel","India","Juliet","Kilo","Lima","Mike","November","Oscar","Papa","Quebec","Romeo","Sierra","Tango","Uniform","Victor","Whiskey","Xray","Yankee","Zulu","Ace","Bolt","Comet","Drift","Ember","Flint"];
const D = (n) => ({
  fullName: `Audit Test ${WORDS[n - 1]}`, // server name rule: letters/spaces only, no digits
  email: `audit-t${String(n).padStart(2, "0")}@example.invalid`,
  phone: `61${String(10000000 + n).slice(0, 8)}`,
  college: "Audit College",
  year: n % 2 ? "TE" : "BE",
});
const mkDraft = async (n) => (await api("POST", "/api/registrations/draft", { body: D(n) }));
const upload = async (id, token, buf = PNG, name = "pay.png", type = "image/png") => {
  const f = new FormData();
  f.append("draftId", id); f.append("token", token);
  f.append("file", new Blob([buf], { type }), name);
  return api("POST", "/api/registrations/proof", { form: f });
};
const confirm = async (id, token) => api("POST", "/api/registrations/confirm", { body: { draftId: id, token } });

// ---- Phase 1: validation, duplicates, proof rules, idempotency ----
{
  let r = await api("POST", "/api/registrations/draft", { body: { ...D(1), email: "not-an-email" } });
  ok("invalid-email→422", r.status === 422 && r.json?.code === "invalid", r.status);

  r = await api("POST", "/api/registrations/draft", { body: { ...D(1), phone: "12345" } });
  ok("invalid-phone→422", r.status === 422, r.status);

  r = await mkDraft(1);
  ok("valid-draft→200 + token", r.status === 200 && !!r.json?.draftId && (r.json?.token || "").length === 64, r.status);
  const t1 = { id: r.json.draftId, token: r.json.token };

  r = await api("POST", "/api/registrations/draft", { body: { ...D(2), email: D(1).email } });
  ok("dup-email→409 privacy-safe", r.status === 409 && /already exists/.test(r.json?.message || "") && !/audit-t01/i.test(r.json?.message || ""), r.status);

  r = await api("POST", "/api/registrations/draft", { body: { ...D(2), phone: D(1).phone } });
  ok("dup-phone→409", r.status === 409, r.status);

  r = await api("GET", `/api/registrations/draft?id=${t1.id}&token=${t1.token}`);
  ok("draft-resume→200", r.status === 200 && r.json?.draft?.id === t1.id, r.status);

  r = await api("GET", `/api/registrations/draft?id=${t1.id}&token=wrong`);
  ok("draft-bad-token→404", r.status === 404, r.status);

  r = await confirm(t1.id, t1.token);
  ok("confirm-without-proof→422", r.status === 422 && r.json?.code === "proof_missing", `${r.status} ${r.json?.code}`);
  ok("draft-does-not-consume-seat", (await count()) === 0, await count());

  r = await upload(t1.id, t1.token, Buffer.from("hello"), "note.txt", "text/plain");
  ok("bad-filetype→422", r.status === 422, r.status);

  r = await upload(t1.id, t1.token, Buffer.alloc(6 * 1024 * 1024), "big.png", "image/png");
  ok("oversize→413", r.status === 413, r.status);

  r = await upload(t1.id, t1.token);
  ok("valid-proof→200", r.status === 200 && !!r.json?.proofPath && r.json.proofPath.startsWith(`${t1.id}/`), `${r.status} ${r.json?.proofPath}`);
  ok("proof-path-has-no-pii", !/audit|example|61\d{8}/i.test(r.json?.proofPath || "x"), r.json?.proofPath);

  r = await confirm(t1.id, t1.token);
  ok("confirm→200 + code", r.status === 200 && /^ROS2-2026-\d{4}$/.test(r.json?.registrationCode || ""), `${r.status} ${r.json?.registrationCode}`);
  const code1 = r.json.registrationCode;

  r = await confirm(t1.id, t1.token);
  ok("re-confirm→already_confirmed same code", r.status === 200 && r.json?.outcome === "already_confirmed" && r.json?.registrationCode === code1, `${r.status} ${r.json?.outcome}`);

  const parallel = await Promise.all([confirm(t1.id, t1.token), confirm(t1.id, t1.token), confirm(t1.id, t1.token)]);
  ok("3x-parallel-confirm→same code, no double count", parallel.every((p) => p.status === 200 && p.json?.registrationCode === code1) && (await count()) === 1, `count=${await count()}`);

  r = await mkDraft(2);
  const t2holder = r.status === 200 ? { id: r.json.draftId, token: r.json.token } : null;
  ok("second identity draft ok", !!t2holder, r.status);
  r = await api("POST", "/api/registrations/draft", { body: { ...D(3), email: D(1).email } });
  ok("dup-email-after-confirm→409", r.status === 409, r.status);

  // anon isolation WITH a live row + stored object present
  const ar = await anon.from("workshop_registrations").select("id").limit(10);
  ok("anon-cannot-list-registrations", !ar.error && (ar.data || []).length === 0, `rows=${(ar.data || []).length}`);
  const al = await anon.storage.from("payment-proofs").list(t1.id);
  ok("anon-cannot-list-proofs", (al.data || []).length === 0, `items=${(al.data || []).length}`);
  const s1 = await seats();
  ok("seats-configured-after-seed", s1.configured === true && s1.confirmed === 1 && s1.remaining === 29, JSON.stringify(s1));

  // stash t1 + t2 draft for later phases
  globalThis.__t1 = t1; globalThis.__t2 = t2holder;
}

// ---- Phase 2: fill to EXACTLY 29 (T01 + T02 + n=3..29), race for seat 30 ----
let winner, loser;
{
  // T02 draft was created in Phase 1 but never confirmed — confirm it now.
  {
    const t2 = globalThis.__t2;
    const u = await upload(t2.id, t2.token);
    const c = await confirm(t2.id, t2.token);
    ok("fill-confirm-T02", u.status === 200 && c.status === 200, `${u.status}/${c.status}`);
  }
  for (let n = 3; n <= 29; n++) {
    const d = await mkDraft(n);
    if (d.status !== 200) { ok(`fill-draft-${n}`, false, d.status); break; }
    const u = await upload(d.json.draftId, d.json.token);
    if (u.status !== 200) { ok(`fill-upload-${n}`, false, u.status); break; }
    const c = await confirm(d.json.draftId, d.json.token);
    if (c.status !== 200) { ok(`fill-confirm-${n}`, false, `${c.status} ${c.json?.code}`); break; }
  }
  ok("prefill-to-29", (await count()) === 29, `count=${await count()}`);

  const rA = await mkDraft(30), rB = await mkDraft(31);
  ok("racer-drafts-created", rA.status === 200 && rB.status === 200, `${rA.status}/${rB.status}`);
  const A = { id: rA.json.draftId, token: rA.json.token }, B = { id: rB.json.draftId, token: rB.json.token };
  ok("racer-proofs-uploaded", (await upload(A.id, A.token)).status === 200 && (await upload(B.id, B.token)).status === 200, "");

  const [cA, cB] = await Promise.all([confirm(A.id, A.token), confirm(B.id, B.token)]);
  const wins = [cA.status === 200, cB.status === 200].filter(Boolean).length;
  ok("final-seat-race→exactly-1-wins", wins === 1, `A=${cA.status}/${cA.json?.code || cA.json?.outcome} B=${cB.status}/${cB.json?.code || cB.json?.outcome}`);
  winner = cA.status === 200 ? { ...A, code: cA.json.registrationCode } : { ...B, code: cB.json.registrationCode };
  loser = cA.status === 200 ? B : A;
  const loserRes = cA.status === 200 ? cB : cA;
  ok("loser-gets-workshop_full", loserRes.status === 409 && loserRes.json?.code === "workshop_full", `${loserRes.status} ${loserRes.json?.code}`);
  ok("count-is-30", (await count()) === 30, `count=${await count()}`);

  const retry = await confirm(loser.id, loser.token);
  ok("31st-confirm-rejected", retry.status === 409, retry.status);

  const nd = await mkDraft(32);
  ok("new-draft-when-full→409", nd.status === 409 && nd.json?.code === "workshop_full", `${nd.status} ${nd.json?.code}`);

  const s = await seats();
  ok("seats-full", s.isFull === true && s.remaining === 0 && s.confirmed === 30, JSON.stringify(s));
}

// ---- Phase 3: admin live ----
let adminCookie = "";
{
  let r = await api("POST", "/api/admin/login", { body: { password: "definitely-wrong-password" } });
  ok("admin-wrong-password→401", r.status === 401, r.status);

  r = await api("POST", "/api/admin/login", { body: { password: process.env.ADMIN_PASSWORD } });
  ok("admin-login→200 + httpOnly cookie", r.status === 200, r.status);
  const setCookie = r.headers.get("set-cookie") || "";
  ok("cookie-flags", /httponly/i.test(setCookie) && /samesite=lax/i.test(setCookie), setCookie.slice(0, 120));
  adminCookie = setCookie.split(";")[0];

  r = await api("GET", "/api/admin/registrations", { cookie: adminCookie });
  ok("admin-list→200 + metrics", r.status === 200 && r.json?.metrics?.confirmed === 30 && r.json?.metrics?.remaining === 0 && (r.json?.registrations || []).length === 31, `${r.status} confirmed=${r.json?.metrics?.confirmed} rows=${(r.json?.registrations || []).length}`);

  r = await api("GET", `/api/admin/registrations?search=${encodeURIComponent("audit-t05")}`, { cookie: adminCookie });
  ok("admin-search", r.status === 200 && (r.json?.registrations || []).length >= 1, `${r.status} rows=${(r.json?.registrations || []).length}`);

  r = await api("GET", "/api/admin/registrations?search=%2C%28%29%22", { cookie: adminCookie });
  ok("admin-search-metachars-safe", r.status === 200, r.status);

  r = await api("GET", `/api/admin/proof?id=${winner.id}`, { cookie: adminCookie });
  ok("admin-proof→signed-url + timestamp", r.status === 200 && !!r.json?.url && r.json?.expiresIn === 180 && !!r.json?.uploadedAt, `${r.status} expiresIn=${r.json?.expiresIn}`);

  const csv = await api("GET", "/api/admin/export", { cookie: adminCookie });
  const lines = csv.text.trim().split("\n");
  ok("admin-csv→header + 31 rows", csv.status === 200 && lines[0].startsWith("registration_code,full_name,email") && lines.length === 32, `${csv.status} lines=${lines.length}`);

  r = await api("POST", "/api/admin/cancel", { cookie: adminCookie, body: { id: winner.id, reason: "audit test" } });
  ok("admin-cancel-winner→200 + seat reopens", r.status === 200 && (await count()) === 29, `${r.status} count=${await count()}`);
}

// ---- Phase 4: cancel rest via admin, then full cleanup ----
{
  const all = await svc.from("workshop_registrations").select("id,registration_status,email").limit(100);
  for (const row of all.data || []) {
    if (!/^audit-t\d+@example\.invalid$/.test(row.email)) { ok("cleanup-abort-non-audit-row", false, row.email); process.exit(3); }
    if (row.registration_status !== "cancelled") {
      await api("POST", "/api/admin/cancel", { cookie: adminCookie, body: { id: row.id, reason: "audit cleanup" } });
    }
  }
  ok("all-cancelled-count-0", (await count()) === 0, `count=${await count()}`);

  const remaining = await svc.from("workshop_registrations").select("id,payment_proof_path");
  const ids = (remaining.data || []).map((r) => r.id);
  const paths = (remaining.data || []).map((r) => r.payment_proof_path).filter(Boolean);
  // remove storage objects (group by folder prefix)
  for (const p of paths) { await svc.storage.from("payment-proofs").remove([p]); }
  if (ids.length) { await svc.from("workshop_registrations").delete().in("id", ids); }

  const verify = await svc.from("workshop_registrations").select("id").limit(5);
  const vcount = await count();
  const bucket = await svc.storage.from("payment-proofs").list();
  // list top-level prefixes; remove any stragglers
  for (const item of bucket.data || []) {
    if (item.id) await svc.storage.from("payment-proofs").remove([item.name]);
    else { const sub = await svc.storage.from("payment-proofs").list(item.name); for (const f of sub.data || []) await svc.storage.from("payment-proofs").remove([`${item.name}/${f.name}`]); }
  }
  const bucket2 = await svc.storage.from("payment-proofs").list();
  ok("cleanup-rows-gone", (verify.data || []).length === 0, `rows=${(verify.data || []).length}`);
  ok("cleanup-count-0", vcount === 0, `count=${vcount}`);
  ok("cleanup-bucket-empty", (bucket2.data || []).length === 0, `items=${(bucket2.data || []).length}`);

  await api("DELETE", "/api/admin/login", { cookie: adminCookie });
}

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.map((f) => f.name) }));
if (failed.length) process.exit(1);
console.log("AUDIT-LIVE: all assertions passed, project restored to pristine state");
