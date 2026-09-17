import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { WORKSHOP } from "@/config/workshop";
import { resumeTokenMatches } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { isAllowedProofFile, proofExtension } from "@/lib/validation";

/**
 * POST /api/registrations/proof — multipart upload of the payment screenshot.
 * Fields: draftId, token, file. Stored in the PRIVATE `payment-proofs` bucket
 * at <draftId>/<random>.<ext>. Replaces any previous proof for the draft.
 */
export async function POST(req: Request) {
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, code: "db_not_configured" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const draftId = String(form.get("draftId") ?? "");
  const token = String(form.get("token") ?? "");
  const file = form.get("file");

  if (!/^[0-9a-f-]{36}$/i.test(draftId) || !token) {
    return NextResponse.json({ ok: false, code: "invalid_draft" }, { status: 404 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, code: "proof_missing", message: "Please upload your payment screenshot." }, { status: 422 });
  }
  if (file.size > WORKSHOP.proofMaxBytes) {
    return NextResponse.json({ ok: false, code: "file_too_large", message: "Screenshot must be under 5 MB." }, { status: 413 });
  }
  if (!isAllowedProofFile(file.name, file.type)) {
    return NextResponse.json(
      { ok: false, code: "invalid_file", message: "Only JPG, PNG or WEBP screenshots are accepted." },
      { status: 422 },
    );
  }

  const row = await service
    .from("workshop_registrations")
    .select("id, registration_status, payment_proof_path, resume_token_hash")
    .eq("id", draftId)
    .maybeSingle();
  if (row.error || !row.data || !resumeTokenMatches(row.data.resume_token_hash, token)) {
    return NextResponse.json({ ok: false, code: "invalid_draft" }, { status: 404 });
  }
  if (row.data.registration_status !== "draft") {
    return NextResponse.json({ ok: false, code: "already_finalized" }, { status: 409 });
  }

  const ext = proofExtension(file.name);
  const objectPath = `${draftId}/${randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await service.storage
    .from("payment-proofs")
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });
  if (upload.error) {
    return NextResponse.json({ ok: false, code: "upload_failed", message: "Upload failed. Please try again." }, { status: 500 });
  }

  // Remove the previous proof object (replacement flow) — best effort.
  const previous = row.data.payment_proof_path as string | null;
  if (previous && previous !== objectPath) {
    await service.storage.from("payment-proofs").remove([previous]);
  }

  const update = await service
    .from("workshop_registrations")
    .update({
      payment_proof_path: objectPath,
      payment_proof_uploaded_at: new Date().toISOString(),
      payment_proof_status: "submitted_unverified",
    })
    .eq("id", draftId)
    .eq("registration_status", "draft");
  if (update.error) {
    await service.storage.from("payment-proofs").remove([objectPath]);
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code: "ok", proofPath: objectPath });
}
