import { NextResponse } from "next/server";
import { WORKSHOP } from "@/config/workshop";
import { generateResumeToken, hashResumeToken, resumeTokenMatches } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { DUPLICATE_MESSAGE, validateDetails, WORKSHOP_FULL_MESSAGE } from "@/lib/validation";

const noDb = () =>
  NextResponse.json(
    { ok: false, code: "db_not_configured", message: "Registration backend is not configured yet. Please try again later." },
    { status: 503 },
  );

/** POST /api/registrations/draft — validate details, duplicate-check, create draft. */
export async function POST(req: Request) {
  const service = createServiceClient();
  if (!service) return noDb();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const validated = validateDetails(body);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, code: "invalid", errors: validated.errors }, { status: 422 });
  }
  const d = validated.data;

  // Advisory capacity gate (authoritative check happens atomically at confirm).
  const settings = await service
    .from("workshop_settings")
    .select("capacity, confirmed_count, is_active")
    .eq("slug", WORKSHOP.slug)
    .maybeSingle();
  if (!settings.error && settings.data) {
    const remaining = Number(settings.data.capacity) - Number(settings.data.confirmed_count);
    if (!settings.data.is_active || remaining <= 0) {
      return NextResponse.json({ ok: false, code: "workshop_full", message: WORKSHOP_FULL_MESSAGE }, { status: 409 });
    }
  }

  // Privacy-safe duplicate check (never reveal which field or whose record).
  const dup = await service
    .from("workshop_registrations")
    .select("id")
    .in("registration_status", ["draft", "confirmed"])
    .or(`email_normalized.eq.${d.emailNormalized},phone_normalized.eq.${d.phoneNormalized}`)
    .limit(1);
  if (!dup.error && dup.data && dup.data.length > 0) {
    return NextResponse.json({ ok: false, code: "duplicate", message: DUPLICATE_MESSAGE }, { status: 409 });
  }

  const token = generateResumeToken();
  const insert = await service
    .from("workshop_registrations")
    .insert({
      full_name: d.fullName,
      email: d.email,
      email_normalized: d.emailNormalized,
      phone: d.phone,
      phone_normalized: d.phoneNormalized,
      college: d.college,
      year: d.year,
      resume_token_hash: hashResumeToken(token),
      payment_amount: WORKSHOP.feeAmount,
    })
    .select("id, created_at")
    .single();

  if (insert.error || !insert.data) {
    // A concurrent duplicate insert hits the partial unique index.
    if (insert.error && insert.error.code === "23505") {
      return NextResponse.json({ ok: false, code: "duplicate", message: DUPLICATE_MESSAGE }, { status: 409 });
    }
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, code: "ok", draftId: insert.data.id, token });
  res.cookies.set("ros2_draft", insert.data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return res;
}

/** GET /api/registrations/draft?id=...&token=... — resume a draft after refresh. */
export async function GET(req: Request) {
  const service = createServiceClient();
  if (!service) return noDb();
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !token) {
    return NextResponse.json({ ok: false, code: "invalid_draft" }, { status: 404 });
  }
  const row = await service
    .from("workshop_registrations")
    .select("id, full_name, email, phone, college, year, registration_status, payment_proof_path, registration_code, confirmed_at, resume_token_hash")
    .eq("id", id)
    .maybeSingle();
  if (row.error || !row.data || !resumeTokenMatches(row.data.resume_token_hash, token)) {
    return NextResponse.json({ ok: false, code: "invalid_draft" }, { status: 404 });
  }
  const { resume_token_hash: _omit, ...draft } = row.data;
  return NextResponse.json({ ok: true, code: "ok", draft });
}
