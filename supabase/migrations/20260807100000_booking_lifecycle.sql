-- Booking lifecycle: add columns, normalize statuses, add constraint, update view

-- 1. New columns
alter table public.bookings
  add column if not exists checked_out_at timestamptz,
  add column if not exists cancellation_reason text;

-- 2. Normalize existing status values before adding constraint
update public.bookings set status = 'confirmed'          where status = 'reserved';
update public.bookings set status = 'cancelled_by_guest' where status = 'cancelled';

-- 3. Update booked_slot_times view to exclude both cancel variants
create or replace view public.booked_slot_times as
  select service_id, slot_start, slot_end
  from public.bookings
  where status not in ('cancelled_by_guest', 'cancelled_by_host');

grant select on public.booked_slot_times to anon, authenticated;

-- 4. Add CHECK constraint (only after data is normalized)
alter table public.bookings
  drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'pending_payment',
      'confirmed',
      'checked_in',
      'completed',
      'cancelled_by_guest',
      'cancelled_by_host'
    )
  );
