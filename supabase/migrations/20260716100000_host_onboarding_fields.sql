-- Host onboarding: business identity, tier, verification status, enabled services.

ALTER TABLE public.hosts
  ADD COLUMN IF NOT EXISTS business_name         text,
  ADD COLUMN IF NOT EXISTS tax_id                text,
  ADD COLUMN IF NOT EXISTS business_address      text,
  ADD COLUMN IF NOT EXISTS business_phone        text,
  ADD COLUMN IF NOT EXISTS host_tier             text CHECK (host_tier IN (
                                                   'COMMERCIAL_STORE',
                                                   'FOOD_AND_COWORKING',
                                                   'CERTIFIED_ACCOMMODATION',
                                                   'SPORT_CENTER'
                                                 )),
  ADD COLUMN IF NOT EXISTS verification_status   text NOT NULL DEFAULT 'PENDING_VERIFICATION'
                                                   CHECK (verification_status IN (
                                                     'PENDING_VERIFICATION',
                                                     'VERIFIED',
                                                     'REJECTED'
                                                   )),
  ADD COLUMN IF NOT EXISTS cin_cir_number        text,
  ADD COLUMN IF NOT EXISTS document_url          text,
  ADD COLUMN IF NOT EXISTS self_cert_accepted    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enabled_categories    text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_complete   boolean NOT NULL DEFAULT false;

-- Hosts with guest_id IS NULL are mock hosts — mark them verified and complete so they don't trigger onboarding.
UPDATE public.hosts
SET verification_status  = 'VERIFIED',
    onboarding_complete  = true
WHERE guest_id IS NULL;

-- Existing real hosts: mark onboarding complete + verified so they keep working without going through the wizard.
UPDATE public.hosts
SET verification_status  = 'VERIFIED',
    onboarding_complete  = true,
    enabled_categories   = ARRAY['rest','shower','storage','focus','tavolo','charge']
WHERE guest_id IS NOT NULL;
