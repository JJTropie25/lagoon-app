-- Atomic delete+insert for service slots, runs as SECURITY DEFINER
-- to bypass RLS on service_slots while still verifying host ownership.
CREATE OR REPLACE FUNCTION replace_service_slots(
  p_service_id UUID,
  p_rows       JSONB   -- [{slot_start: ISO, slot_end: ISO}, ...]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
    JOIN public.hosts h ON h.id = s.host_id
    WHERE s.id = p_service_id
      AND h.guest_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  DELETE FROM public.service_slots WHERE service_id = p_service_id;

  IF jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO public.service_slots (service_id, slot_start, slot_end)
    SELECT
      p_service_id,
      (elem->>'slot_start')::timestamptz,
      (elem->>'slot_end')::timestamptz
    FROM jsonb_array_elements(p_rows) AS elem;
  END IF;
END;
$$;
