import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { adminDenied, isAdminRequest } from "../_helpers";

/** GET /api/admin/proof?id=... — short-lived signed URL for a private proof. */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return adminDenied();
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "db_not_configured" }, { status: 503 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const row = await service
    .from("workshop_registrations")
    .select("id, full_name, registration_code, payment_proof_path, payment_proof_uploaded_at")
    .eq("id", id)
    .maybeSingle();
  if (row.error || !row.data?.payment_proof_path) {
    return NextResponse.json({ ok: false, code: "not_found" }, { status: 404 });
  }
  const signed = await service.storage
    .from("payment-proofs")
    .createSignedUrl(row.data.payment_proof_path, 180);
  if (signed.error || !signed.data?.signedUrl) {
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    code: "ok",
    url: signed.data.signedUrl,
    registrationCode: row.data.registration_code,
    studentName: row.data.full_name,
    uploadedAt: row.data.payment_proof_uploaded_at,
    expiresIn: 180,
  });
}
