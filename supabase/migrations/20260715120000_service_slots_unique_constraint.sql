-- Prevent duplicate (service_id, slot_start) rows in service_slots.
-- Clean existing duplicates first (keep lowest ctid per pair), then add constraint.

DELETE FROM public.service_slots a
USING public.service_slots b
WHERE a.ctid > b.ctid
  AND a.service_id = b.service_id
  AND a.slot_start = b.slot_start;

ALTER TABLE public.service_slots
  DROP CONSTRAINT IF EXISTS service_slots_unique_slot;

ALTER TABLE public.service_slots
  ADD CONSTRAINT service_slots_unique_slot UNIQUE (service_id, slot_start);
