import { WORKSHOP } from "@/config/workshop";

export function Footer() {
  return (
    <footer className="border-t border-line bg-navy-950 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">{WORKSHOP.titleShort}</p>
          <p className="mt-1 text-sm text-white/70">{WORKSHOP.subtitle}</p>
          <p className="mt-3 text-sm text-white/70">
            {WORKSHOP.organizer}
            <br />
            {WORKSHOP.institute}
          </p>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wider text-white/50">Workshop</p>
          <ul className="mt-3 space-y-2 text-white/80">
            <li>{WORKSHOP.datesLabel}</li>
            <li>{WORKSHOP.modeLabel}</li>
            <li>{WORKSHOP.audienceLong}</li>
            <li>
              {WORKSHOP.feeLabelPerStudent} · {WORKSHOP.capacity} seats
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-bold uppercase tracking-wider text-white/50">Contact</p>
          <ul className="mt-3 space-y-2 text-white/80">
            <li>
              {WORKSHOP.organizers.coordinator.role}: {WORKSHOP.organizers.coordinator.name}
            </li>
            {WORKSHOP.organizers.studentCoordinators.map((c) => (
              <li key={c.phone}>
                {c.name} ·{" "}
                <a className="underline underline-offset-2" href={`tel:+91${c.phone}`}>
                  +91 {c.phone}
                </a>
              </li>
            ))}
            <li>Training partner: {WORKSHOP.trainingPartner}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-white/50 sm:px-6">
          Registration is confirmed only after payment proof submission, subject to the 30-seat
          limit. Payment screenshots are accepted as proof of payment and are not bank-verified.
        </p>
      </div>
    </footer>
  );
}
