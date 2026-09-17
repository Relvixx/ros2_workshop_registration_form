import Link from "next/link";
import { Bot } from "lucide-react";
import { WORKSHOP } from "@/config/workshop";
import { getSeatStatus } from "@/lib/seats";

export async function Header() {
  const seats = await getSeatStatus();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="ROS2 Workshop home">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-950 text-white" aria-hidden="true">
            <Bot className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold text-navy-950">
              {WORKSHOP.titleShort}
            </span>
            <span className="block truncate text-xs text-ink-500">
              {WORKSHOP.organizer} · MET
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
          <Link
            href="/#curriculum"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:text-navy-950 md:block"
          >
            Curriculum
          </Link>
          <Link
            href="/#trainers"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:text-navy-950 md:block"
          >
            Trainers
          </Link>
          <Link
            href="/#faq"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:text-navy-950 md:block"
          >
            FAQ
          </Link>
          {seats.isFull ? (
            <span
              className="inline-flex h-11 items-center rounded-xl bg-ink-900/5 px-5 text-sm font-bold text-ink-600"
              aria-disabled="true"
            >
              Workshop Full
            </span>
          ) : (
            <Link
              href="/register"
              className="inline-flex h-11 items-center rounded-xl bg-cobalt-600 px-5 text-sm font-bold text-white shadow-card transition hover:-translate-y-px hover:bg-navy-900"
            >
              Register Now
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
