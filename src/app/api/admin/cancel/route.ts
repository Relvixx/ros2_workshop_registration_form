import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { adminDenied, isAdminRequest } from "../_helpers";

/** POST /api/admin/cancel — atomically cancel + reopen the seat via RPC. */
export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return adminDenied();
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "db_not_configured" }, { status: 503 });

  let body: { id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const { data, error } = await service.rpc("cancel_registration", {
    p_registration_id: body.id,
    p_reason: (body.reason ?? "").slice(0, 300),
  });
  if (error) return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  return NextResponse.json({ ok: true, code: "ok", result: data });
}
