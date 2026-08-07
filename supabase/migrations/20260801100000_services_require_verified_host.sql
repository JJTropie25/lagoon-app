-- Guests can only see services whose host is VERIFIED.
-- The host themselves can always see their own services (host dashboard).

DROP POLICY IF EXISTS services_select ON public.services;

CREATE POLICY services_select
  ON public.services
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hosts h
      WHERE h.id = services.host_id
        AND (
          h.verification_status = 'VERIFIED'
          OR h.guest_id = auth.uid()
        )
    )
  );
