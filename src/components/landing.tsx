import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  Cpu,
  HandCoins,
  MapPin,
  ScanLine,
  ShipWheel,
  Users,
  Waypoints,
} from "lucide-react";
import { CURRICULUM, FAQS, ROBOTRY_INSTITUTIONS, TECH_STACK, WORKSHOP } from "@/config/workshop";
import { TRAINERS } from "@/config/trainers";
import { seatMessage, type SeatStatus } from "@/lib/seats";
import { SeatBadge } from "./SeatBadge";
import { Reveal } from "./Reveal";

function SectionHeading({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <Reveal>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cobalt-600">{eyebrow}</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-navy-950 sm:text-3xl">{title}</h2>
      {lede && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600">{lede}</p>}
    </Reveal>
  );
}

export function Hero({ seats }: { seats: SeatStatus }) {
  const facts = [
    { icon: CalendarDays, label: WORKSHOP.datesLabel },
    { icon: MapPin, label: `${WORKSHOP.mode} · ${WORKSHOP.audience}` },
    { icon: HandCoins, label: WORKSHOP.feeLabelPerStudent },
    { icon: Users, label: `Only ${WORKSHOP.capacity} seats` },
  ];
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div className="bg-blueprint absolute inset-0" aria-hidden="true" />
      {/* subtle LiDAR arcs */}
      <svg
        className="pointer-events-none absolute -right-24 -top-24 size-[420px] opacity-20"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        {[40, 65, 90, 115].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} stroke="#7aa2ff" strokeWidth="1" strokeDasharray="6 7" className="animate-dash" />
        ))}
        <circle cx="100" cy="100" r="4" fill="#7aa2ff" />
        <line x1="100" y1="100" x2="190" y2="45" stroke="#7aa2ff" strokeWidth="1.5" />
      </svg>
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <p className="animate-rise text-xs font-bold uppercase tracking-[0.2em] text-white/60">
          {WORKSHOP.organizer} presents
        </p>
        <h1 className="mt-4 max-w-3xl animate-rise font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
          Unlocking Robotics with Robot Operating System{" "}
          <span className="bg-gradient-to-r from-[#7aa2ff] to-[#e08bb8] bg-clip-text text-transparent">
            ROS2
          </span>
        </h1>
        <p className="mt-4 max-w-2xl animate-rise text-base leading-relaxed text-white/75 sm:text-lg">
          {WORKSHOP.subtitle} — practical learning across ROS2, simulation, robot design, SLAM,
          navigation, hardware communication and computer vision.
        </p>
        <ul className="mt-6 flex max-w-2xl animate-rise flex-wrap gap-2" aria-label="Workshop quick facts">
          {facts.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[13px] font-semibold text-white/90"
            >
              <Icon className="size-4 text-[#9db8ff]" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex animate-rise flex-wrap items-center gap-3">
          {seats.isFull ? (
            <span className="inline-flex h-12 items-center rounded-xl bg-white/10 px-7 text-base font-bold text-white/70">
              Workshop Full
            </span>
          ) : (
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-cobalt-500 px-7 text-base font-bold text-white shadow-lift transition hover:-translate-y-px hover:bg-cobalt-600"
            >
              Register Now <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          )}
          <Link
            href="#curriculum"
            className="inline-flex h-12 items-center rounded-xl border border-white/20 px-7 text-base font-semibold text-white/90 transition hover:bg-white/10"
          >
            Explore Curriculum
          </Link>
        </div>
        <div className="mt-6 animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85" role="status">
            <span className={`size-2 rounded-full ${seats.isFull ? "bg-rose-400" : "bg-emerald-400"}`} aria-hidden="true" />
            {seatMessage(seats)}
          </p>
        </div>
      </div>
    </section>
  );
}

export function AboutStrip() {
  const points = [
    { icon: Cpu, title: "Hands-on exposure", text: "Every concept is applied immediately through guided implementation." },
    { icon: Waypoints, title: "Real robotics tools", text: "ROS2, Gazebo, RViz2, Nav2 and hardware — not just slides." },
    { icon: ShipWheel, title: "Fundamentals to demo", text: "A step-by-step path from setup to a working hardware demonstration." },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="about-heading">
      <SectionHeading
        eyebrow="About the workshop"
        title="Practical robotics experience, not just theory"
        lede="This 5-day workshop introduces Robotics and ROS2 from the ground up. Concepts are introduced step-by-step and immediately applied through hands-on projects, so you leave with practical, real-world robotics experience."
      />
      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {points.map(({ icon: Icon, title, text }, i) => (
          <Reveal key={title} className={`rounded-2xl border border-line bg-card p-6 shadow-card`} >
            <span className="grid size-11 place-items-center rounded-xl bg-cobalt-50 text-cobalt-600" aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <h3 id={i === 0 ? "about-heading" : undefined} className="mt-4 font-display text-base font-bold text-navy-950">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export function Curriculum() {
  return (
    <section id="curriculum" className="border-y border-line bg-white scroll-mt-20" aria-labelledby="curriculum-heading">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeading
          eyebrow="5-day learning journey"
          title="From first principles to a working robot demo"
          lede="Each day builds on the previous one — setup, core concepts, simulation, navigation, then hardware. Tap a day to see the topics."
        />
        <ol className="mt-8 space-y-3">
          {CURRICULUM.map((day) => (
            <Reveal as="li" key={day.day} className="overflow-hidden rounded-2xl border border-line bg-paper shadow-card">
              <details className="group" name="curriculum-days">
                <summary className="flex cursor-pointer list-none items-center gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-950 font-display text-sm font-bold text-white" aria-hidden="true">
                    D{day.day}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-bold text-navy-950 sm:text-lg">
                      Day {day.day} — {day.title}
                    </span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">{day.summary}</span>
                  </span>
                  <ChevronDown className="size-5 shrink-0 text-ink-500 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ul className="grid gap-x-8 gap-y-2 border-t border-line px-5 py-5 pl-[4.75rem] sm:grid-cols-2 sm:px-6 sm:pl-[5.25rem]">
                  {day.topics.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-mint-600" aria-hidden="true" />
                      <span className="font-mono text-[13px]">{t}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function TechStack() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="stack-heading">
      <SectionHeading
        eyebrow="Tools & technologies"
        title="The stack you'll actually touch"
        lede="Guided, hands-on exposure across the modern ROS2 toolchain — from simulation to hardware communication."
      />
      <Reveal>
        <ul className="mt-8 flex flex-wrap gap-2.5" aria-label="Technologies covered">
          {TECH_STACK.map((t) => (
            <li
              key={t}
              className="rounded-xl border border-line bg-card px-4 py-2.5 font-mono text-sm font-semibold text-navy-900 shadow-card transition hover:-translate-y-px hover:shadow-lift"
            >
              {t}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

export function Trainers() {
  const [featured, ...rest] = TRAINERS;
  return (
    <section id="trainers" className="border-y border-line bg-white scroll-mt-20" aria-labelledby="trainers-heading">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <SectionHeading
          eyebrow="Trainers"
          title="Learn from people building robots"
          lede="Sessions are led by the Robotry team — a founder-scale robotics educator alongside two ROS2 practitioners working on navigation, simulation and embedded systems."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Reveal className="overflow-hidden rounded-2xl border border-line bg-navy-950 text-white shadow-card lg:row-span-1">
            <article className="flex h-full flex-col">
              <div className="relative h-72 w-full sm:h-80">
                {featured.image ? (
                  <Image src={featured.image} alt={`Portrait of ${featured.name}`} fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 33vw" />
                ) : (
                  <FallbackPortrait initials={featured.initials} name={featured.name} />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9db8ff]">{featured.role}</p>
                <h3 className="mt-1 font-display text-xl font-bold">{featured.name}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{featured.bio}</p>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${featured.name} focus areas`}>
                  {featured.focus.map((f) => (
                    <li key={f} className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">{f}</li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>
          {rest.map((t) => (
            <Reveal key={t.slug} className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
              <article className="flex h-full flex-col">
                <div className="relative h-64 w-full">
                  {t.image ? (
                    <Image src={t.image} alt={`Portrait of ${t.name}`} fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 33vw" loading="lazy" />
                  ) : (
                    <FallbackPortrait initials={t.initials} name={t.name} />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cobalt-600">{t.role}</p>
                  <h3 className="mt-1 font-display text-xl font-bold text-navy-950">{t.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{t.bio}</p>
                  <ul className="mt-4 flex flex-wrap gap-2" aria-label={`${t.name} focus areas`}>
                    {t.focus.map((f) => (
                      <li key={f} className="rounded-full bg-cobalt-50 px-3 py-1 text-xs font-semibold text-navy-800">{f}</li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FallbackPortrait({ initials, name }: { initials: string; name: string }) {
  return (
    <div className="grid h-full w-full place-items-center bg-navy-800" role="img" aria-label={`Portrait placeholder for ${name}`}>
      <span className="grid size-20 place-items-center rounded-full bg-white/10 font-display text-2xl font-bold text-white" aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

export function Robotry() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="robotry-heading">
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
        <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
          <div className="bg-navy-950 p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9db8ff]">Training partner</p>
            <h2 id="robotry-heading" className="mt-2 font-display text-2xl font-bold">Robotry</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              An initiative by Aryan Jagushte focused on practical robotics education — ROS, AI and
              hands-on engineering that bridges theoretical learning with real-world implementation.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Through workshops and seminars at universities, Robotry gives students real-world
              insights and industry-relevant skills, from robot design and programming to navigation
              and automation.
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <h3 className="font-display text-base font-bold text-navy-950">
              Past ROS2 / robotics workshops conducted at institutions including…
            </h3>
            <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {ROBOTRY_INSTITUTIONS.map((name) => (
                <li key={name} className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
                  <ScanLine className="mt-0.5 size-4 shrink-0 text-cobalt-600" aria-hidden="true" />
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Also present at ROSCon India, Bengaluru 2024 and Pune 2025 events.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Details({ seats }: { seats: SeatStatus }) {
  const rows: Array<[string, string]> = [
    ["Dates", WORKSHOP.datesLabel],
    ["Duration", `${WORKSHOP.durationLabel} · ${WORKSHOP.modeLabel}`],
    ["Audience", WORKSHOP.audienceLong],
    ["Fee", WORKSHOP.feeLabelPerStudent],
    ["Seats", `${WORKSHOP.capacity} confirmed maximum · ${seatMessage(seats)}`],
    ["Venue", `${WORKSHOP.institute} · ${WORKSHOP.mode}`],
  ];
  return (
    <section className="border-y border-line bg-white" aria-labelledby="details-heading">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Workshop details" title="Everything in one place" />
          <dl className="mt-6 overflow-hidden rounded-2xl border border-line">
            {rows.map(([k, v], i) => (
              <div key={k} className={`grid grid-cols-[110px_1fr] gap-3 px-5 py-3.5 text-sm sm:grid-cols-[140px_1fr] ${i % 2 ? "bg-white" : "bg-paper"}`}>
                <dt className="font-bold text-navy-950">{k}</dt>
                <dd className="text-ink-600">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <SectionHeading eyebrow="Organizers" title="Conducted & coordinated by" />
          <ul className="mt-6 space-y-3">
            {[
              WORKSHOP.organizers.coordinator,
              WORKSHOP.organizers.hod,
              WORKSHOP.organizers.principal,
            ].map((o) => (
              <li key={o.name} className="rounded-2xl border border-line bg-paper px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">{o.role}</p>
                <p className="mt-0.5 font-display text-base font-bold text-navy-950">{o.name}</p>
              </li>
            ))}
            <li className="rounded-2xl border border-line bg-paper px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Student coordinators</p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {WORKSHOP.organizers.studentCoordinators.map((c) => (
                  <li key={c.phone} className="text-ink-600">
                    <span className="font-semibold text-navy-950">{c.name}</span> ·{" "}
                    <a className="font-semibold text-cobalt-600 underline underline-offset-2" href={`tel:+91${c.phone}`}>
                      +91 {c.phone}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 scroll-mt-20" aria-labelledby="faq-heading">
      <SectionHeading eyebrow="FAQ" title="Questions students ask" />
      <div className="mt-8 grid gap-3 lg:grid-cols-2">
        {FAQS.map((f) => (
          <Reveal key={f.q} className="h-fit overflow-hidden rounded-2xl border border-line bg-card shadow-card">
            <details className="group" name="faq">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-display text-[15px] font-bold text-navy-950 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="size-5 shrink-0 text-ink-500 transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-ink-600">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FinalCta({ seats }: { seats: SeatStatus }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 sm:pb-20" aria-labelledby="cta-heading">
      <Reveal className="relative overflow-hidden rounded-3xl bg-navy-950 px-6 py-12 text-center text-white shadow-lift sm:px-12 sm:py-16">
        <div className="bg-blueprint absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative">
          <SeatBadge seats={seats} />
          <h2 id="cta-heading" className="mx-auto mt-4 max-w-xl font-display text-2xl font-bold sm:text-4xl">
            5 days. Real robots. {WORKSHOP.capacity} seats.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
            {WORKSHOP.datesLabel} · {WORKSHOP.mode} · {WORKSHOP.feeLabelPerStudent}. Registration
            takes about a minute — your seat locks when your payment proof is submitted.
          </p>
          {seats.isFull ? (
            <span className="mt-7 inline-flex h-12 items-center rounded-xl bg-white/10 px-8 text-base font-bold text-white/70">
              Workshop Full
            </span>
          ) : (
            <Link
              href="/register"
              className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-cobalt-500 px-8 text-base font-bold text-white transition hover:-translate-y-px hover:bg-cobalt-600"
            >
              Register Now <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </Reveal>
    </section>
  );
}
