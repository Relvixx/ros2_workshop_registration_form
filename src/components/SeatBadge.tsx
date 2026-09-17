import { Users } from "lucide-react";
import { seatMessage, type SeatStatus } from "@/lib/seats";

export function SeatBadge({ seats, large = false }: { seats: SeatStatus; large?: boolean }) {
  const urgent = seats.isFull || seats.remaining <= 5;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border font-semibold ${
        seats.isFull
          ? "border-rose-700/20 bg-rose-50 text-rose-700"
          : urgent
            ? "border-amber-700/20 bg-amber-50 text-amber-700"
            : "border-mint-600/20 bg-mint-50 text-mint-600"
      } ${large ? "px-5 py-2.5 text-sm" : "px-3.5 py-1.5 text-xs"}`}
    >
      <Users className={large ? "size-4" : "size-3.5"} aria-hidden="true" />
      {seatMessage(seats)}
      {!seats.configured && (
        <span className="font-normal opacity-70">· live count connects after setup</span>
      )}
    </p>
  );
}
