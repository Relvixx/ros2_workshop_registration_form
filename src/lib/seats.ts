import { WORKSHOP } from "@/config/workshop";
import { createAnonClient } from "./supabase";

export interface SeatStatus {
  capacity: number;
  confirmed: number;
  remaining: number;
  isFull: boolean;
  configured: boolean;
}

/** Offline-safe fallback so the UI never breaks without Supabase env. */
export const SEAT_FALLBACK: SeatStatus = {
  capacity: WORKSHOP.capacity,
  confirmed: 0,
  remaining: WORKSHOP.capacity,
  isFull: false,
  configured: false,
};

export async function getSeatStatus(): Promise<SeatStatus> {
  const client = createAnonClient();
  if (!client) return SEAT_FALLBACK;
  try {
    // Use the locked-down aggregate RPC (RLS denies direct table reads).
    const { data, error } = await client.rpc("get_seat_status", { p_slug: WORKSHOP.slug });
    const row = Array.isArray(data) ? data[0] : data;
    if (!error && row) {
      const capacity = Number((row as { capacity?: unknown }).capacity) || WORKSHOP.capacity;
      const confirmed = Math.max(0, Number((row as { confirmed?: unknown }).confirmed) || 0);
      const remainingRaw = (row as { remaining?: unknown }).remaining;
      const remaining = Math.max(0, Number(remainingRaw ?? capacity - confirmed));
      const isFull = Boolean((row as { is_full?: unknown }).is_full) || remaining <= 0;
      return { capacity, confirmed, remaining, isFull, configured: true };
    }
    return { ...SEAT_FALLBACK };
  } catch {
    return { ...SEAT_FALLBACK };
  }
}

export function seatMessage(status: SeatStatus): string {
  if (status.isFull) return "Workshop Full";
  if (status.remaining <= 5) return `Only ${status.remaining} seat${status.remaining === 1 ? "" : "s"} remaining`;
  return `${status.confirmed} / ${status.capacity} seats filled`;
}
