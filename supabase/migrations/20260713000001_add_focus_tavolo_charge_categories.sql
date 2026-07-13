-- Extend services.category CHECK constraint to include focus, tavolo, charge

alter table public.services
  drop constraint if exists services_category_check;

alter table public.services
  add constraint services_category_check
    check (category in ('rest', 'shower', 'storage', 'focus', 'tavolo', 'charge'));
