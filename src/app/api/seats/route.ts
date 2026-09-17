import { NextResponse } from "next/server";
import { WORKSHOP } from "@/config/workshop";
import { createAnonClient } from "@/lib/supabase";
import { SEAT_FALLBACK, type SeatStatus } from "@/lib/seats";

export async function GET() {
  const fallback: SeatStatus = { ...SEAT_FALLBACK };
  const client = createAnonClient();
  if (!client) return NextResponse.json(fallback);
  try {
    // Prefer the locked-down RPC (aggregate only); fall back to direct read.
    const { data, error } = await client.rpc("get_seat_status", { p_slug: WORKSHOP.slug });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) {
      const capacity = Number(row.capacity) || WORKSHOP.capacity;
      const confirmed = Math.max(0, Number(row.confirmed) || 0);
      const remaining = Math.max(0, Number(row.remaining ?? capacity - confirmed));
      return NextResponse.json({
        capacity,
        confirmed,
        remaining,
        isFull: Boolean(row.is_full) || remaining <= 0,
        configured: true,
      } satisfies SeatStatus);
    }
    const res = await client
      .from("workshop_settings")
      .select("capacity, confirmed_count")
      .eq("slug", WORKSHOP.slug)
      .maybeSingle();
    if (res.error || !res.data) return NextResponse.json(fallback);
    const capacity = Number(res.data.capacity) || WORKSHOP.capacity;
    const confirmed = Math.max(0, Number(res.data.confirmed_count) || 0);
    const remaining = Math.max(0, capacity - confirmed);
    return NextResponse.json({
      capacity,
      confirmed,
      remaining,
      isFull: remaining <= 0,
      configured: true,
    } satisfies SeatStatus);
  } catch {
    return NextResponse.json(fallback);
  }
}
