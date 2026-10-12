-- Security hardening.
--
-- 1. hosts rows are readable only by their owner. They hold tax id, business
--    address, phone and Stripe ids, and were previously readable by anyone
--    holding the public anon key.
-- 2. App users can no longer set their own verification_status (except back to
--    PENDING_VERIFICATION on onboarding resubmit) or Stripe fields. Those are
--    written by edge functions (service_role) or from the Supabase dashboard.
-- 3. services visibility ("host is VERIFIED, or it's my own listing") moves to a
--    SECURITY DEFINER helper, since guests can no longer read hosts directly.
-- 4. Guests get the host's phone through get_host_contact_for_booking(), only
--    for their own bookings.
-- 5. bookings get a definitive policy set (any older or dashboard-created
--    policies are dropped first) plus a guard trigger:
--      - guests insert only pending_payment/pending or confirmed/cash bookings
--      - guests may delete only their own unpaid pending_payment bookings
--      - hosts may move their bookings confirmed -> checked_in -> completed and
--        touch nothing else; cancellations and payment updates go through edge
--        functions.
-- 6. Mock hosts (no owner) are marked VERIFIED so demo listings are visible.

-- ── 1. hosts: owner-only access ────────────────────────────────────────────
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'hosts' loop
    execute format('drop policy %I on public.hosts', p.policyname);
  end loop;
end $$;

create policy hosts_select_own on public.hosts
  for select using (guest_id = auth.uid());

create policy hosts_insert_own on public.hosts
  for insert with check (guest_id = auth.uid());

create policy hosts_update_own on public.hosts
  for update using (guest_id = auth.uid()) with check (guest_id = auth.uid());

-- ── 2. hosts: protect admin-managed columns ────────────────────────────────
create or replace function public.hosts_protect_admin_fields()
returns trigger
language plpgsql
as $$
begin
  -- service_role (edge functions) and postgres (dashboard) are trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verification_status        := 'PENDING_VERIFICATION';
    new.stripe_account_id          := null;
    new.stripe_onboarding_complete := false;
    new.stripe_charges_enabled     := false;
    new.stripe_payouts_enabled     := false;
    new.stripe_details_submitted   := false;
    new.stripe_onboarding_at       := null;
    return new;
  end if;

  new.guest_id := old.guest_id;
  if new.verification_status is distinct from old.verification_status
     and new.verification_status <> 'PENDING_VERIFICATION' then
    new.verification_status := old.verification_status;
  end if;
  new.stripe_account_id          := old.stripe_account_id;
  new.stripe_onboarding_complete := old.stripe_onboarding_complete;
  new.stripe_charges_enabled     := old.stripe_charges_enabled;
  new.stripe_payouts_enabled     := old.stripe_payouts_enabled;
  new.stripe_details_submitted   := old.stripe_details_submitted;
  new.stripe_onboarding_at       := old.stripe_onboarding_at;
  return new;
end;
$$;

drop trigger if exists hosts_protect_admin_fields on public.hosts;
create trigger hosts_protect_admin_fields
  before insert or update on public.hosts
  for each row execute function public.hosts_protect_admin_fields();

-- ── 3. services visibility ─────────────────────────────────────────────────
create or replace function public.host_is_listable(p_host_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hosts h
    where h.id = p_host_id
      and (h.verification_status = 'VERIFIED' or h.guest_id = auth.uid())
  );
$$;

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select using (public.host_is_listable(host_id));

-- ── 4. host contact for a guest's own booking ──────────────────────────────
create or replace function public.get_host_contact_for_booking(p_booking_id uuid)
returns table (phone_country_code text, phone_number text)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when h.phone_number is not null then h.phone_country_code else p.phone_country_code end,
    coalesce(h.phone_number, p.phone_number)
  from public.bookings b
  join public.services s on s.id = b.service_id
  join public.hosts h    on h.id = s.host_id
  left join public.profiles p on p.id = h.guest_id
  where b.id = p_booking_id
    and b.guest_id = auth.uid();
$$;

revoke all on function public.get_host_contact_for_booking(uuid) from public, anon;
grant execute on function public.get_host_contact_for_booking(uuid) to authenticated;

-- ── 5. bookings: definitive policies + guard ───────────────────────────────
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'bookings' loop
    execute format('drop policy %I on public.bookings', p.policyname);
  end loop;
end $$;

create policy bookings_select_own on public.bookings
  for select using (guest_id = auth.uid());

create policy bookings_select_host_services on public.bookings
  for select using (
    exists (
      select 1 from public.services s
      join public.hosts h on h.id = s.host_id
      where s.id = bookings.service_id and h.guest_id = auth.uid()
    )
  );

create policy bookings_insert_own on public.bookings
  for insert with check (guest_id = auth.uid());

create policy bookings_delete_own_unpaid on public.bookings
  for delete using (
    guest_id = auth.uid()
    and status = 'pending_payment'
    and payment_status in ('pending', 'failed')
  );

create policy bookings_update_host_services on public.bookings
  for update
  using (
    exists (
      select 1 from public.services s
      join public.hosts h on h.id = s.host_id
      where s.id = bookings.service_id and h.guest_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.services s
      join public.hosts h on h.id = s.host_id
      where s.id = bookings.service_id and h.guest_id = auth.uid()
    )
  );

create or replace function public.bookings_guard()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.payment_status = 'cash' then
      new.status := 'confirmed';
    elsif new.payment_status = 'pending' then
      new.status := 'pending_payment';
    else
      raise exception 'Invalid payment_status for a new booking: %', new.payment_status;
    end if;
    new.checked_in_at       := null;
    new.checked_out_at      := null;
    new.cancellation_reason := null;
    return new;
  end if;

  -- UPDATE (only hosts reach here, via bookings_update_host_services)
  if (to_jsonb(new) - array['status', 'checked_in_at', 'checked_out_at'])
     is distinct from
     (to_jsonb(old) - array['status', 'checked_in_at', 'checked_out_at']) then
    raise exception 'Only check-in / check-out can be changed from the app';
  end if;
  if new.status is distinct from old.status and not (
       (old.status = 'confirmed'  and new.status = 'checked_in') or
       (old.status = 'checked_in' and new.status = 'completed')
     ) then
    raise exception 'Booking status change % -> % not allowed', old.status, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_guard on public.bookings;
create trigger bookings_guard
  before insert or update on public.bookings
  for each row execute function public.bookings_guard();

-- ── 6. mock hosts visible ──────────────────────────────────────────────────
update public.hosts
set verification_status = 'VERIFIED',
    onboarding_complete = true
where guest_id is null;
