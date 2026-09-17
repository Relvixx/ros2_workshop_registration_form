import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { csvCell } from "@/lib/validation";
import { adminDenied, isAdminRequest } from "../_helpers";

const COLUMNS = [
  "registration_code",
  "full_name",
  "email",
  "phone",
  "college",
  "year",
  "registration_status",
  "payment_proof_status",
  "confirmed_at",
  "created_at",
] as const;

/** GET /api/admin/export — protected CSV download (formula-injection safe). */
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return adminDenied();
  const service = createServiceClient();
  if (!service) return NextResponse.json({ ok: false, code: "db_not_configured" }, { status: 503 });

  const { data, error } = await service
    .from("workshop_registrations")
    .select(COLUMNS.join(","))
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ ok: false, code: "server_error" }, { status: 500 });

  const lines = [COLUMNS.join(",")];
  for (const row of data ?? []) {
    const r = row as unknown as Record<string, unknown>;
    lines.push(COLUMNS.map((c) => csvCell((r[c] as string | null) ?? "")).join(","));
  }
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ros2-workshop-registrations.csv"',
      "Cache-Control": "no-store",
    },
  });
}
