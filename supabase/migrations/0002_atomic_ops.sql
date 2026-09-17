-- Atomic seat operations — V1
-- finalize_registration: the ONLY path that consumes a seat. Uses SELECT ...
-- FOR UPDATE on the workshop_settings row so concurrent final-seat submits
-- serialize: exactly one succeeds, the other gets workshop_full.
-- cancel_registration: atomically frees a confirmed seat (never below zero).

-- ---------------------------------------------------------------------------
-- finalize_registration(p_draft_id, p_token_hash)
-- Returns jsonb: { ok, code, outcome, registration_code?, confirmed_at? }
-- outcome: confirmed | already_confirmed | workshop_full | duplicate |
--          invalid_draft | proof_missing
-- ---------------------------------------------------------------------------
create or replace function public.finalize_registration(p_draft_id uuid, p_token_hash text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings workshop_settings%rowtype;
  v_reg workshop_registrations%rowtype;
  v_code text;
  v_seq integer;
  v_dup integer;
begin
  -- 1. Lock the capacity row first (consistent lock order everywhere).
  select * into v_settings
    from workshop_settings
   where slug = 'ros2-workshop-2026'
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'misconfigured', 'outcome', 'invalid_draft');
  end if;

  -- 2. Lock the draft row.
  select * into v_reg
    from workshop_registrations
   where id = p_draft_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found', 'outcome', 'invalid_draft');
  end if;

  -- 3. Resume-token check (when the draft carries a token hash).
  if v_reg.resume_token_hash is not null
     and (p_token_hash is null or p_token_hash <> v_reg.resume_token_hash) then
    return jsonb_build_object('ok', false, 'code', 'unauthorized', 'outcome', 'invalid_draft');
  end if;

  -- 4. Idempotency: already finalized => return existing confirmation.
  if v_reg.registration_status = 'confirmed' then
    return jsonb_build_object(
      'ok', true, 'code', 'ok',
      'outcome', 'already_confirmed',
      'registration_code', v_reg.registration_code,
      'confirmed_at', v_reg.confirmed_at
    );
  end if;

  -- 5. Only drafts can be finalized.
  if v_reg.registration_status <> 'draft' then
    return jsonb_build_object('ok', false, 'code', 'not_draft', 'outcome', 'invalid_draft');
  end if;

  -- 6. Proof must exist.
  if v_reg.payment_proof_path is null then
    return jsonb_build_object('ok', false, 'code', 'proof_missing', 'outcome', 'proof_missing');
  end if;

  -- 7. Defensive duplicate sweep (unique partial indexes are the primary guard).
  select count(*) into v_dup
    from workshop_registrations
   where id <> v_reg.id
     and registration_status in ('draft', 'confirmed')
     and (email_normalized = v_reg.email_normalized
          or phone_normalized = v_reg.phone_normalized);
  if v_dup > 0 then
    return jsonb_build_object('ok', false, 'code', 'duplicate', 'outcome', 'duplicate');
  end if;

  -- 8. Capacity check — under the row lock, so this is race-safe.
  if not v_settings.is_active
     or v_settings.confirmed_count >= v_settings.capacity then
    return jsonb_build_object('ok', false, 'code', 'workshop_full', 'outcome', 'workshop_full');
  end if;

  -- 9. Generate the human-readable code from a sequence (gap-tolerant).
  v_seq := nextval('public.registration_seq');
  v_code := 'ROS2-2026-' || lpad(v_seq::text, 4, '0');

  update workshop_registrations
     set registration_status = 'confirmed',
         registration_code = v_code,
         payment_proof_status = 'submitted_unverified',
         confirmed_at = now()
   where id = v_reg.id;

  update workshop_settings
     set confirmed_count = confirmed_count + 1
   where slug = 'ros2-workshop-2026';

  return jsonb_build_object(
    'ok', true, 'code', 'ok',
    'outcome', 'confirmed',
    'registration_code', v_code,
    'confirmed_at', now()
  );
end;
$$;

revoke all on function public.finalize_registration(uuid, text) from public;
-- No grant to anon/authenticated: only the service-role server calls it.

-- ---------------------------------------------------------------------------
-- cancel_registration(p_registration_id, p_reason)
-- Idempotent. Decrements confirmed_count only when a confirmed row is
-- cancelled, clamped at zero.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_registration(p_registration_id uuid, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings workshop_settings%rowtype;
  v_reg workshop_registrations%rowtype;
begin
  select * into v_settings
    from workshop_settings
   where slug = 'ros2-workshop-2026'
   for update;

  select * into v_reg
    from workshop_registrations
   where id = p_registration_id
   for update;

  if v_settings.slug is null then
    return jsonb_build_object('ok', false, 'code', 'misconfigured');
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_reg.registration_status = 'cancelled' then
    return jsonb_build_object('ok', true, 'code', 'ok', 'outcome', 'already_cancelled');
  end if;

  if v_reg.registration_status = 'confirmed' then
    update workshop_registrations
       set registration_status = 'cancelled',
           cancelled_at = now(),
           cancellation_reason = nullif(p_reason, '')
     where id = p_registration_id;

    update workshop_settings
       set confirmed_count = greatest(0, confirmed_count - 1)
     where slug = 'ros2-workshop-2026';

    return jsonb_build_object('ok', true, 'code', 'ok', 'outcome', 'cancelled_confirmed');
  end if;

  -- Draft cancellation frees no seat but retires the row so email/phone reuse works.
  update workshop_registrations
     set registration_status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = nullif(p_reason, '')
   where id = p_registration_id;

  return jsonb_build_object('ok', true, 'code', 'ok', 'outcome', 'cancelled_draft');
end;
$$;

revoke all on function public.cancel_registration(uuid, text) from public;
