-- ROS2 Workshop registration schema — V1
-- Tables: workshop_settings (capacity singleton row), workshop_registrations.
-- All privileged writes go through SECURITY DEFINER RPCs below; RLS denies
-- direct anon access to registration rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- workshop_settings: one row per workshop slug; row lock (FOR UPDATE) on this
-- row serializes final seat consumption.
-- ---------------------------------------------------------------------------
create table if not exists public.workshop_settings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  capacity integer not null check (capacity > 0),
  confirmed_count integer not null default 0 check (confirmed_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registration sequence for human-readable codes ROS2-2026-0001 ...
create sequence if not exists public.registration_seq start 1;

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),

  registration_code text unique,

  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null,
  email_normalized text not null,
  phone text not null,
  phone_normalized text not null check (phone_normalized ~ '^[6-9][0-9]{9}$'),
  college text not null check (char_length(college) between 2 and 150),
  year text not null check (year in ('TE', 'BE')),

  -- Resume token: only the SHA-256 hash is stored; the token itself lives
  -- in the student's browser (localStorage) + HttpOnly draft cookie.
  resume_token_hash text,

  payment_amount integer not null default 1500,
  payment_proof_path text,
  payment_proof_uploaded_at timestamptz,
  payment_proof_status text not null default 'not_submitted'
    check (payment_proof_status in ('not_submitted', 'submitted_unverified', 'invalid')),

  registration_status text not null default 'draft'
    check (registration_status in ('draft', 'confirmed', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,

  constraint chk_confirm_consistency check (
    (registration_status <> 'confirmed') or
    (registration_code is not null and confirmed_at is not null and payment_proof_path is not null)
  )
);

-- Prevent duplicate ACTIVE (draft or confirmed) registrations by email or phone.
-- Cancelled rows are excluded so a cancelled seat can genuinely be re-taken.
create unique index if not exists uq_reg_active_email
  on public.workshop_registrations (email_normalized)
  where registration_status in ('draft', 'confirmed');

create unique index if not exists uq_reg_active_phone
  on public.workshop_registrations (phone_normalized)
  where registration_status in ('draft', 'confirmed');

create index if not exists idx_reg_status on public.workshop_registrations (registration_status);
create index if not exists idx_reg_year on public.workshop_registrations (year);
create index if not exists idx_reg_created on public.workshop_registrations (created_at desc);

-- Seed the workshop settings row (idempotent).
insert into public.workshop_settings (slug, capacity, confirmed_count, is_active)
values ('ros2-workshop-2026', 30, 0, true)
on conflict (slug) do nothing;

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_settings_touch on public.workshop_settings;
create trigger trg_settings_touch
  before update on public.workshop_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_registrations_touch on public.workshop_registrations;
create trigger trg_registrations_touch
  before update on public.workshop_registrations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: deny everything to anon/authenticated by default.
-- The Next.js server uses the service-role key (bypasses RLS) inside API
-- routes that enforce their own validation + authorization.
-- A narrow SECURITY DEFINER function exposes ONLY aggregate seat counts.
-- ---------------------------------------------------------------------------
alter table public.workshop_settings enable row level security;
alter table public.workshop_registrations enable row level security;

-- No policies => no direct access for anon/authenticated roles.

create or replace function public.get_seat_status(p_slug text)
returns table (capacity integer, confirmed integer, remaining integer, is_full boolean)
language sql stable security definer set search_path = public as $$
  select s.capacity,
         s.confirmed_count,
         greatest(0, s.capacity - s.confirmed_count),
         (s.confirmed_count >= s.capacity)
    from workshop_settings s
   where s.slug = p_slug;
$$;

revoke all on function public.get_seat_status(text) from public;
grant execute on function public.get_seat_status(text) to anon, authenticated;
