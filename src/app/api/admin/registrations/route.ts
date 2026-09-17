import { NextResponse } from "next/server";
import { WORKSHOP } from "@/config/workshop";
import { createServiceClient } from "@/lib/supabase";
import { adminDenied, isAdminRequest } from "../_helpers";

/** GET /api/admin/registrations — metrics + filterable registration table. */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return adminDenied();
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "db_not_configured" }, { status: 503 });

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 80);
  const year = url.searchParams.get("year");
  const status = url.searchParams.get("status");

  let query = service
    .from("workshop_registrations")
    .select(
      "id, registration_code, full_name, email, phone, college, year, registration_status, payment_proof_status, payment_proof_uploaded_at, confirmed_at, cancelled_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (year === "TE" || year === "BE") query = query.eq("year", year);
  if (status === "draft" || status === "confirmed" || status === "cancelled") {
    query = query.eq("registration_status", status);
  }
  if (search) {
    // Strip PostgREST `or`-filter metacharacters (,%_()") so search can't
    // break the query or inject filter logic.
    const safe = search.replace(/[%_,()"']/g, "").slice(0, 80);
    const like = `%${safe}%`;
    query = query.or(
      `full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},registration_code.ilike.${like},college.ilike.${like}`,
    );
  }

  const [rows, settings] = await Promise.all([
    query,
    service.from("workshop_settings").select("capacity, confirmed_count").eq("slug", WORKSHOP.slug).maybeSingle(),
  ]);
  if (rows.error) return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });

  const counts = await service
    .from("workshop_registrations")
    .select("registration_status")
    .limit(2000);
  const by: Record<string, number> = { draft: 0, confirmed: 0, cancelled: 0 };
  if (!counts.error && counts.data) {
    for (const r of counts.data) {
      const s = (r as { registration_status: string }).registration_status;
      if (s in by) by[s] += 1;
    }
  }

  const capacity = Number(settings.data?.capacity) || WORKSHOP.capacity;
  const confirmed = Number(settings.data?.confirmed_count) || 0;

  return NextResponse.json({
    ok: true,
    code: "ok",
    metrics: {
      capacity,
      confirmed,
      remaining: Math.max(0, capacity - confirmed),
      drafts: by.draft,
      cancelled: by.cancelled,
    },
    registrations: rows.data ?? [],
  });
}
