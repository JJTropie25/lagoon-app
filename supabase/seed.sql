-- Massive mock dataset:
-- 10 services per category (rest, shower, storage, focus, tavolo, charge) for each Italian regional capital (20 cities).
-- Total rows inserted: 1200.

with capoluoghi(city, province, region, latitude, longitude) as (
  values
    ('Roma', 'RM', 'Lazio', 41.9028, 12.4964),
    ('Milano', 'MI', 'Lombardia', 45.4642, 9.1900),
    ('Napoli', 'NA', 'Campania', 40.8518, 14.2681),
    ('Torino', 'TO', 'Piemonte', 45.0703, 7.6869),
    ('Palermo', 'PA', 'Sicilia', 38.1157, 13.3615),
    ('Genova', 'GE', 'Liguria', 44.4056, 8.9463),
    ('Bologna', 'BO', 'Emilia-Romagna', 44.4949, 11.3426),
    ('Firenze', 'FI', 'Toscana', 43.7696, 11.2558),
    ('Bari', 'BA', 'Puglia', 41.1171, 16.8719),
    ('Cagliari', 'CA', 'Sardegna', 39.2238, 9.1217),
    ('Venezia', 'VE', 'Veneto', 45.4408, 12.3155),
    ('Trieste', 'TS', 'Friuli-Venezia Giulia', 45.6495, 13.7768),
    ('Perugia', 'PG', 'Umbria', 43.1107, 12.3908),
    ('Ancona', 'AN', 'Marche', 43.6158, 13.5189),
    ('L''Aquila', 'AQ', 'Abruzzo', 42.3498, 13.3995),
    ('Potenza', 'PZ', 'Basilicata', 40.6401, 15.8050),
    ('Catanzaro', 'CZ', 'Calabria', 38.9098, 16.5877),
    ('Trento', 'TN', 'Trentino-Alto Adige', 46.0748, 11.1217),
    ('Aosta', 'AO', 'Valle d''Aosta', 45.7370, 7.3201),
    ('Campobasso', 'CB', 'Molise', 41.5595, 14.6594)
),
categories(category, label_it, base_price, category_bias) as (
  values
    ('rest', 'Riposo', 17, 0),
    ('shower', 'Doccia', 7, 1),
    ('storage', 'Deposito', 6, 2),
    ('focus', 'Focus', 10, 3),
    ('tavolo', 'Tavolo', 8, 4),
    ('charge', 'Ricarica', 4, 5)
),
generated as (
  select
    c.city,
    c.province,
    c.region,
    c.latitude,
    c.longitude,
    k.category,
    k.label_it,
    k.base_price,
    k.category_bias,
    g.i as ordinal
  from capoluoghi c
  cross join categories k
  cross join generate_series(1, 10) as g(i)
)
insert into public.services (
  title,
  category,
  price_eur,
  location,
  city,
  region,
  latitude,
  longitude,
  rating,
  distance_meters,
  section,
  image_url
)
select
  concat(label_it, ' ', city, ' ', lpad(ordinal::text, 2, '0')) as title,
  category,
  (base_price + ((ordinal - 1) % 5) + case when category = 'rest' then 2 else 0 end)::int as price_eur,
  concat(city, ', ', province) as location,
  city,
  region,
  (latitude + ((ordinal - 5.5) * 0.0015))::double precision as latitude,
  (longitude + ((ordinal - 5.5) * 0.0015))::double precision as longitude,
  least(5.0, 3.8 + ((ordinal % 7) * 0.2) + (case when category = 'rest' then 0.2 else 0 end))::numeric(3,1) as rating,
  (150 + ordinal * 95 + category_bias * 40)::int as distance_meters,
  case
    when ordinal <= 2 then 'recently'
    when ordinal <= 4 then 'around'
    else null
  end as section,
  '["https://picsum.photos/seed/' || category || ordinal::text || '/600/400"]' as image_url
from generated;
