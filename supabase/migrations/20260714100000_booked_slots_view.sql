-- Public view exposing only service_id + slot timestamps of non-cancelled bookings.
-- Allows guests to see which slots are taken without exposing who booked them.
create or replace view public.booked_slot_times as
  select service_id, slot_start, slot_end
  from public.bookings
  where status <> 'cancelled';

grant select on public.booked_slot_times to anon, authenticated;
