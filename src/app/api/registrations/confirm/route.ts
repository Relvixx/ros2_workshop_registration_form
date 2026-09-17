import { NextResponse } from "next/server";
import { WORKSHOP } from "@/config/workshop";
import { hashResumeToken } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { DUPLICATE_MESSAGE, WORKSHOP_FULL_MESSAGE } from "@/lib/validation";

/**
 * POST /api/registrations/confirm — atomic finalization.
 * The ONLY seat-consuming path: calls the finalize_registration RPC which
 * locks the settings row (FOR UPDATE), checks capacity, and finalizes
 * idempotently. Double-submit returns the existing confirmation.
 */
export async function POST(req: Request) {
  const service = createServiceClient();
  if (!service) {
    return NextResponse.json({ ok: false, code: "db_not_configured" }, { status: 503 });
  }

  let body: { draftId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }
  const draftId = body.draftId ?? "";
  const token = body.token ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(draftId) || !token) {
    return NextResponse.json({ ok: false, code: "invalid_draft" }, { status: 404 });
  }

  const { data, error } = await service.rpc("finalize_registration", {
    p_draft_id: draftId,
    p_token_hash: hashResumeToken(token),
  });
  if (error) {
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }

  const result = data as {
    ok: boolean;
    code: string;
    outcome?: string;
    registration_code?: string;
    confirmed_at?: string;
  };

  if (result.ok) {
    const res = NextResponse.json({
      ok: true,
      code: "ok",
      outcome: result.outcome,
      registrationCode: result.registration_code,
      confirmedAt: result.confirmed_at,
      workshop: {
        title: WORKSHOP.titleShort,
        dates: WORKSHOP.datesLabel,
        mode: WORKSHOP.mode,
        fee: WORKSHOP.feeLabel,
      },
    });
    res.cookies.delete("ros2_draft");
    return res;
  }

  switch (result.code) {
    case "workshop_full":
      return NextResponse.json({ ok: false, code: "workshop_full", message: WORKSHOP_FULL_MESSAGE }, { status: 409 });
    case "duplicate":
      return NextResponse.json({ ok: false, code: "duplicate", message: DUPLICATE_MESSAGE }, { status: 409 });
    case "proof_missing":
      return NextResponse.json({ ok: false, code: "proof_missing", message: "Please upload your payment screenshot first." }, { status: 422 });
    case "unauthorized":
    case "not_found":
    case "not_draft":
      return NextResponse.json({ ok: false, code: "invalid_draft" }, { status: 404 });
    default:
      return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }
}
