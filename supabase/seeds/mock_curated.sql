-- =============================================================
-- mock_curated.sql  —  Lagoon curated testing seed  (v4)
-- Run AFTER migration 20260628100000_services_extra_columns.sql
--
-- ~118 curated services across 9 Italian destinations.
-- Categories: rest, shower, storage, focus, tavolo, charge.
-- Each service has description, image, amenities, slots (90 days),
-- and 2 mock reviews.
-- =============================================================

BEGIN;

-- Ensure all categories (including focus/tavolo/charge) are allowed
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_check;
ALTER TABLE public.services ADD CONSTRAINT services_category_check
  CHECK (category IN ('rest', 'shower', 'storage', 'focus', 'tavolo', 'charge'));

-- ============================================================
-- 1. CLEAN OLD DATA  (FK-safe order: children before parents)
-- ============================================================

-- Reviews from mock seeds
DELETE FROM public.service_reviews WHERE booking_id IS NULL AND guest_id IS NULL;

-- Slots for mock services only (mock hosts have guest_id IS NULL)
DELETE FROM public.service_slots
WHERE service_id IN (
  SELECT s.id FROM public.services s
  WHERE s.host_id IN (SELECT id FROM public.hosts WHERE guest_id IS NULL)
);

-- Services from mock hosts only
DELETE FROM public.services
WHERE host_id IN (SELECT id FROM public.hosts WHERE guest_id IS NULL);

-- Placeholder hosts (now safe — no services reference them)
DELETE FROM public.hosts WHERE guest_id IS NULL;

-- ============================================================
-- 2. HOSTS
-- ============================================================
INSERT INTO public.hosts (id, display_name) VALUES
  ('b0100000-0000-0000-0000-000000000001'::uuid, 'Lagoon Roma'),
  ('b0100000-0000-0000-0000-000000000002'::uuid, 'Lagoon Venezia'),
  ('b0100000-0000-0000-0000-000000000003'::uuid, 'Lagoon Firenze'),
  ('b0100000-0000-0000-0000-000000000004'::uuid, 'Lagoon Napoli'),
  ('b0100000-0000-0000-0000-000000000005'::uuid, 'Lagoon Milano'),
  ('b0100000-0000-0000-0000-000000000006'::uuid, 'Lagoon Amalfi'),
  ('b0100000-0000-0000-0000-000000000007'::uuid, 'Lagoon Palermo'),
  ('b0100000-0000-0000-0000-000000000008'::uuid, 'Lagoon Cagliari'),
  ('b0100000-0000-0000-0000-000000000009'::uuid, 'Lagoon Bari')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. SERVICES
-- columns: title, category, price_eur, location, city, region,
--          lat, lon, rating, distance_meters, description,
--          image_url, amenities, cancellation_minutes, section, host_id
-- ============================================================
INSERT INTO public.services (
  title, category, price_eur,
  location, city, region,
  latitude, longitude, rating, distance_meters,
  description, image_url, amenities,
  cancellation_minutes, section, host_id
) VALUES

-- ══════════════════════════════════════════════════════════════
--  VENEZIA  (14 services — the flagship destination)
-- ══════════════════════════════════════════════════════════════
-- REST × 5
(
  'Bàcaro del Riposo',
  'rest', 28.00,
  'Sestiere San Polo 812, Venezia', 'Venezia', 'Veneto',
  45.4376, 12.3344, 0.0, 230,
  'Un''isola di pace nel caos di Rialto. Cabine in stile veneziano con luce dorata e suoni d''acqua in sottofondo. Un''esperienza sensoriale unica nel cuore della Serenissima.',
  '["https://picsum.photos/seed/vz-bacaro/800/500","https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"towels_included":true,"quiet_location":true,"toilet_access":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Pod dei Dogi',
  'rest', 32.00,
  'Riva degli Schiavoni 4196, Venezia', 'Venezia', 'Veneto',
  45.4340, 12.3483, 0.0, 160,
  'Cabine di lusso con vista sul Bacino di San Marco. Arredi ispirati al Palazzo Ducale: velluto blu, lampade in vetro di Murano e profumazione al legno di sandalo.',
  '["https://picsum.photos/seed/vz-pod-dogi/800/500","https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"towels_included":true,"toilet_access":true,"quiet_location":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Serenissima Rest Pod',
  'rest', 22.00,
  'Rio Terà dei Nomboli, Venezia', 'Venezia', 'Veneto',
  45.4331, 12.3265, 0.0, 480,
  'Pod privati a 10 minuti da Piazza San Marco. Ventilazione silenziosa, coperta di pile e presa USB-C. Ideali per ricaricarsi dopo le calli.',
  '["https://picsum.photos/seed/vz-serenissima/800/500"]',
  '{"sofa_or_bed":"sofa","blanket":true}',
  60, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Nido di Cannaregio',
  'rest', 20.00,
  'Fondamenta della Sensa 3236, Venezia', 'Venezia', 'Veneto',
  45.4473, 12.3270, 0.0, 720,
  'Lontano dal turismo di massa, nel tranquillo sestiere di Cannaregio. Capsule riposanti con blackout totale e musica ambientale. Ideali per un sonnellino pomeridiano.',
  '["https://picsum.photos/seed/vz-cannaregio/800/500"]',
  '{"sofa_or_bed":"bed","blanket":true,"quiet_location":true}',
  60, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Rifugio di Dorsoduro',
  'rest', 24.00,
  'Zattere ai Gesuati 782, Venezia', 'Venezia', 'Veneto',
  45.4293, 12.3276, 0.0, 390,
  'Sull''isola di Dorsoduro, con affaccio sulla Giudecca. Cabine minimaliste e silenziose, perfette dopo la visita alla Galleria dell''Accademia.',
  '["https://picsum.photos/seed/vz-dorsoduro/800/500","https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80"]',
  '{"sofa_or_bed":"sofa","blanket":true,"quiet_location":true}',
  60, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),

-- SHOWER × 5
(
  'Docce Acqua Alta',
  'shower', 9.00,
  'Salizzada San Lio 5540, Venezia', 'Venezia', 'Veneto',
  45.4368, 12.3382, 0.0, 310,
  'Docce calde in pieno centro storico. Asciugamani di spugna, prodotti biologici e phon professionale inclusi. Indispensabili dopo ore di cammino tra le calli.',
  '["https://picsum.photos/seed/vz-acqua-alta/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Bagni della Fenice',
  'shower', 10.00,
  'Campiello della Fenice 1936, Venezia', 'Venezia', 'Veneto',
  45.4334, 12.3323, 0.0, 250,
  'A due passi dal Teatro La Fenice. Box doccia ampie con marmo veneziano, kit toilette di lusso e phon Dyson. Il refresh più elegante di Venezia.',
  '["https://picsum.photos/seed/vz-fenice/800/500","https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Refresh Rialto',
  'shower', 8.00,
  'Ruga degli Orefici 103, Venezia', 'Venezia', 'Veneto',
  45.4387, 12.3358, 0.0, 200,
  'Vicino al Ponte di Rialto. Box moderni con gel e asciugamano inclusi. Perfetti per chi visita il mercato del pesce la mattina presto.',
  '["https://picsum.photos/seed/vz-refresh-rialto/800/500"]',
  '{"towels_included":true,"soap_included":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Idro San Marco',
  'shower', 9.00,
  'Calle Larga XXII Marzo 2395, Venezia', 'Venezia', 'Veneto',
  45.4329, 12.3366, 0.0, 140,
  'A 50 metri da Piazza San Marco. Docce rapide e impeccabili per i turisti più esigenti. Phon professionale e prodotti premium.',
  '["https://picsum.photos/seed/vz-idro-san-marco/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Docce Ferrovia',
  'shower', 7.00,
  'Lista di Spagna 220, Venezia', 'Venezia', 'Veneto',
  45.4411, 12.3198, 0.0, 80,
  'All''uscita della Stazione Santa Lucia. Docce veloci con acqua sempre calda, sapone incluso. Ideali prima di imbarcarsi o dopo il treno.',
  '["https://picsum.photos/seed/vz-ferrovia/800/500"]',
  '{"soap_included":true,"towels_included":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),

-- STORAGE × 4
(
  'Locker Serenissima',
  'storage', 7.00,
  'Piazzale Roma, Venezia', 'Venezia', 'Veneto',
  45.4382, 12.3206, 0.0, 90,
  'Il deposito più comodo di Venezia, all''uscita del bus e del people mover. Locker XL per trolley grandi, apertura dalle 7 alle 23.',
  '["https://picsum.photos/seed/vz-locker-serenissima/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Safe Bags Arsenale',
  'storage', 8.00,
  'Campo dell''Arsenale 2162, Venezia', 'Venezia', 'Veneto',
  45.4305, 12.3554, 0.0, 560,
  'Deposito sicuro vicino all''Arsenale e alla Biennale. Locker numerati con QR code, capaci fino a zaini grandi.',
  '["https://picsum.photos/seed/vz-safe-arsenale/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Armadietti San Marco',
  'storage', 9.00,
  'Procuratie Vecchie 105, Venezia', 'Venezia', 'Veneto',
  45.4341, 12.3384, 0.0, 120,
  'Proprio sotto i portici di Piazza San Marco. Lascia la valigia e visita il Palazzo Ducale o il Museo Correr senza pensieri.',
  '["https://picsum.photos/seed/vz-armadietti-sm/800/500","https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  VENEZIA EXTRA  (+9 services — Venice total ~22)
-- ══════════════════════════════════════════════════════════════
(
  'Pausa della Salute',
  'rest', 27.00,
  'Campo della Salute 1, Venezia', 'Venezia', 'Veneto',
  45.4305, 12.3327, 0.0, 310,
  'Di fronte alla splendida Basilica della Salute. Cabine panoramiche con affaccio sul Canal Grande. L''unico posto dove riposarsi con vista su uno dei più bei scorci di Venezia.',
  '["https://picsum.photos/seed/vz-salute/800/500","https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"quiet_location":true,"toilet_access":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Pod del Ghetto',
  'rest', 23.00,
  'Campo del Ghetto Nuovo 2911, Venezia', 'Venezia', 'Veneto',
  45.4447, 12.3270, 0.0, 540,
  'Nel cuore del Ghetto Ebraico, il più antico d''Europa. Pod silenziosi, atmosfera storica unica. Idéale dopo la visita al Museo Ebraico.',
  '["https://picsum.photos/seed/vz-ghetto/800/500"]',
  '{"sofa_or_bed":"bed","quiet_location":true,"blanket":true}',
  60, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Rifugio dell''Arsenale',
  'rest', 21.00,
  'Fondamenta dell''Arsenale 2169, Venezia', 'Venezia', 'Veneto',
  45.4295, 12.3571, 0.0, 620,
  'Nel quartiere Castello, lontano dalle folle. Pod accoglienti vicino all''antico Arsenale navale. Zona tranquilla, autentica, veneziana.',
  '["https://picsum.photos/seed/vz-arsenale-rest/800/500"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  60, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Nido di Giudecca',
  'rest', 25.00,
  'Fondamenta San Biagio 800, Giudecca', 'Venezia', 'Veneto',
  45.4268, 12.3319, 0.0, 890,
  'Sull''isola della Giudecca, lontana dal turismo di massa. Pod con vista sul canale e profumi di salsedine. Un''esperienza veneziana autentica e riservata.',
  '["https://picsum.photos/seed/vz-giudecca/800/500","https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&q=80"]',
  '{"sofa_or_bed":"bed","quiet_location":true,"blanket":true}',
  60, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Bagni del Ghetto',
  'shower', 8.50,
  'Calle del Ghetto Vecchio 1138, Venezia', 'Venezia', 'Veneto',
  45.4444, 12.3262, 0.0, 560,
  'Nel quartiere del Ghetto, tranquillo e fuori dai circuiti turistici. Docce ampie, prodotti naturali. Ottimo dopo i mercatini di Cannaregio.',
  '["https://picsum.photos/seed/vz-bagni-ghetto/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Refresh Giudecca',
  'shower', 8.00,
  'Fondamenta San Giacomo 212, Giudecca', 'Venezia', 'Veneto',
  45.4262, 12.3331, 0.0, 1100,
  'Sull''isola della Giudecca, a 5 minuti di vaporetto da Zattere. Box freschi con acqua depurata e kit toilette completo.',
  '["https://picsum.photos/seed/vz-giudecca-shower/800/500"]',
  '{"soap_included":true,"towels_included":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Docce Santa Marta',
  'shower', 7.50,
  'Fondamenta Santa Marta 2285, Venezia', 'Venezia', 'Veneto',
  45.4282, 12.3196, 0.0, 730,
  'In zona universitaria Ca'' Foscari. Docce economiche frequentate anche dagli studenti. Sempre disponibili, aperte dalle 8 alle 21.',
  '["https://picsum.photos/seed/vz-santa-marta/800/500"]',
  '{"soap_included":true}',
  15, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Locker del Ghetto',
  'storage', 6.50,
  'Campo del Ghetto Nuovo, Venezia', 'Venezia', 'Veneto',
  45.4449, 12.3268, 0.0, 570,
  'Deposito nel quartiere Cannaregio-Ghetto. Ideale per visitare la zona in libertà. Locker compatti e sicuri.',
  '["https://picsum.photos/seed/vz-locker-ghetto/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Depot Giardini Biennale',
  'storage', 8.50,
  'Viale Garibaldi 1260, Venezia', 'Venezia', 'Veneto',
  45.4280, 12.3588, 0.0, 740,
  'A due passi dai Giardini della Biennale. Locker XL per trolley, ideali per i visitatori della Biennale Arte o Architettura.',
  '["https://picsum.photos/seed/vz-depot-biennale/800/500","https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&q=80"]',
  '{}', 15, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  ROMA  (12 services)
-- ══════════════════════════════════════════════════════════════
-- REST × 4
(
  'Suite del Viaggiatore',
  'rest', 24.00,
  'Via Cavour 47, Roma', 'Roma', 'Lazio',
  41.8947, 12.4912, 0.0, 190,
  'Un''oasi di relax a due passi dal Colosseo. Lettino ergonomico, luci soffuse e aria condizionata silenziosa. La soluzione perfetta per ricaricarsi dopo una mattinata ai Fori Imperiali.',
  '["https://picsum.photos/seed/rm-suite-viaggiatore/800/500","https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"towels_included":true,"toilet_access":true,"quiet_location":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Nap Corner Termini',
  'rest', 19.00,
  'Via Giolitti 34, Roma', 'Roma', 'Lazio',
  41.9013, 12.5024, 0.0, 80,
  'Adiacente alla Stazione Termini. Pod insonorizzati con poltrona reclinabile e presa USB. Ideale per chi ha ore di attesa tra i treni.',
  '["https://picsum.photos/seed/rm-nap-termini/800/500"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Trastevere Rest Pod',
  'rest', 21.00,
  'Via della Lungaretta 12, Roma', 'Roma', 'Lazio',
  41.8893, 12.4718, 0.0, 340,
  'Nel cuore di Trastevere, lontano dal traffico. Capsule private con illuminazione circadiana e musica ambientale. Ottimo come pausa pranzo.',
  '["https://picsum.photos/seed/rm-trastevere-rest/800/500"]',
  '{"sofa_or_bed":"bed","blanket":true,"quiet_location":true}',
  60, NULL, 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Pausa Vaticano',
  'rest', 22.00,
  'Borgo Sant''Angelo 28, Roma', 'Roma', 'Lazio',
  41.9022, 12.4609, 0.0, 310,
  'A cinque minuti dai Musei Vaticani. Pod con tenda oscurante, materasso memory e profumazione al cedro. Perfetto tra la Cappella Sistina e Castel Sant''Angelo.',
  '["https://picsum.photos/seed/rm-pausa-vaticano/800/500","https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80"]',
  '{"sofa_or_bed":"bed","quiet_location":true,"blanket":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
-- SHOWER × 4
(
  'Docce del Colosseo',
  'shower', 8.00,
  'Via dei Fori Imperiali 22, Roma', 'Roma', 'Lazio',
  41.8925, 12.4853, 0.0, 150,
  'Docce impeccabili a pochi metri dall''Arco di Costantino. Asciugamano, sapone bio e phon inclusi. Perfette dopo il tour dei Fori.',
  '["https://picsum.photos/seed/rm-docce-colosseo/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Fresh Stop Navona',
  'shower', 7.00,
  'Piazza Navona 3, Roma', 'Roma', 'Lazio',
  41.8992, 12.4731, 0.0, 260,
  'Refresh veloce nel cuore barocco di Roma. Box moderni, acqua sempre calda e gel all''arancia incluso.',
  '["https://picsum.photos/seed/rm-fresh-navona/800/500"]',
  '{"soap_included":true,"towels_included":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Bagni di Trastevere',
  'shower', 7.50,
  'Viale di Trastevere 60, Roma', 'Roma', 'Lazio',
  41.8861, 12.4706, 0.0, 420,
  'Docce fresche nel rione più bohémien di Roma. Kit completo incluso. Aperto fino alle 21:00, anche la domenica.',
  '["https://picsum.photos/seed/rm-bagni-trastevere/800/500"]',
  '{"towels_included":true,"soap_included":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Refresh Termini',
  'shower', 8.00,
  'Piazza dei Cinquecento 12, Roma', 'Roma', 'Lazio',
  41.9001, 12.5011, 0.0, 65,
  'Direttamente nella Stazione Termini. Box privati con phon, prodotti biologici e asciugamano in microfibra. Funzionano H24.',
  '["https://picsum.photos/seed/rm-refresh-termini/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true,"open_24h":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
-- STORAGE × 4
(
  'Armadietto 1870',
  'storage', 6.00,
  'Piazza dei Cinquecento 1, Roma', 'Roma', 'Lazio',
  41.9008, 12.5019, 0.0, 60,
  'Deposito bagagli sicuro di fronte a Termini. Locker digitali e sorveglianza H24. Ideale per chi parte o arriva in treno.',
  '["https://picsum.photos/seed/rm-armadietto-1870/800/500"]',
  '{"open_24h":true}', 15, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Safe Bags Vaticano',
  'storage', 5.50,
  'Borgo Pio 15, Roma', 'Roma', 'Lazio',
  41.9015, 12.4562, 0.0, 410,
  'Lascia le valigie e visita i Musei Vaticani senza pensieri. Locker fino a trolley 28", accesso con QR.',
  '["https://picsum.photos/seed/rm-safe-vaticano/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Depot Colosseo',
  'storage', 6.50,
  'Via Labicana 114, Roma', 'Roma', 'Lazio',
  41.8896, 12.4948, 0.0, 280,
  'Deposito sicuro vicino al Colosseo e al Palatino. Ideale per i visitatori dei parchi archeologici. QR code, zero file.',
  '["https://picsum.photos/seed/rm-depot-colosseo/800/500"]',
  '{}', 15, 'around', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Custodia Navona',
  'storage', 5.00,
  'Via del Governo Vecchio 39, Roma', 'Roma', 'Lazio',
  41.8985, 12.4726, 0.0, 340,
  'Deposito nel quartiere di Campo de'' Fiori. Piccolo, economico e sicuro. Perfetto per i turisti che girano a piedi il centro storico.',
  '["https://picsum.photos/seed/rm-custodia-navona/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000001'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  FIRENZE  (9 services)
-- ══════════════════════════════════════════════════════════════
(
  'Il Salotto degli Uffizi',
  'rest', 26.00,
  'Via dei Castellani 3, Firenze', 'Firenze', 'Toscana',
  43.7681, 11.2558, 0.0, 150,
  'A due passi dalla Galleria degli Uffizi. Cabine con arredi in legno, tessuti naturali e profumazione all''iris — il fiore simbolo di Firenze.',
  '["https://picsum.photos/seed/fi-salotto-uffizi/800/500","https://images.unsplash.com/photo-1541943181603-d8fe267a5dcf?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"quiet_location":true,"toilet_access":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Relax Ponte Vecchio',
  'rest', 21.00,
  'Borgo San Jacopo 14, Firenze', 'Firenze', 'Toscana',
  43.7680, 11.2528, 0.0, 280,
  'In Oltrarno, il lato autentico di Firenze. Pod con cortile interno, cuscini di lavanda e profumo di cedro. Lontano dalla folla.',
  '["https://picsum.photos/seed/fi-relax-ponte/800/500"]',
  '{"sofa_or_bed":"sofa","quiet_location":true,"blanket":true}',
  60, 'around', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Pod del Bargello',
  'rest', 20.00,
  'Via del Proconsolo 4, Firenze', 'Firenze', 'Toscana',
  43.7707, 11.2571, 0.0, 210,
  'A 50 metri dal Museo Nazionale del Bargello. Pod spaziosi con poltrona ergonomica, ottimi per una pausa da una visita all''altra.',
  '["https://picsum.photos/seed/fi-pod-bargello/800/500"]',
  '{"sofa_or_bed":"sofa"}',
  30, NULL, 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Docce Santa Croce',
  'shower', 8.00,
  'Via dei Benci 11, Firenze', 'Firenze', 'Toscana',
  43.7689, 11.2601, 0.0, 320,
  'Box ampie e luminose nel quartiere Santa Croce. Asciugamano in bambù, gel bio e phon inclusi. Apertura fino alle 20:00.',
  '["https://picsum.photos/seed/fi-docce-santa-croce/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Bagni della Signoria',
  'shower', 9.00,
  'Via dei Calzaiuoli 18, Firenze', 'Firenze', 'Toscana',
  43.7709, 11.2556, 0.0, 180,
  'A due passi da Piazza della Signoria. Docce premium con phon Dyson e prodotti biologici toscani. Il miglior refresh del centro.',
  '["https://picsum.photos/seed/fi-bagni-signoria/800/500","https://images.unsplash.com/photo-1541943181603-d8fe267a5dcf?w=800&q=80"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Refresh SMN',
  'shower', 7.00,
  'Via della Scala 2, Firenze', 'Firenze', 'Toscana',
  43.7745, 11.2490, 0.0, 110,
  'Vicino alla Stazione Santa Maria Novella. Docce veloci con asciugamano e sapone inclusi. Ideali prima di salire sul treno.',
  '["https://picsum.photos/seed/fi-refresh-smn/800/500"]',
  '{"towels_included":true,"soap_included":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Borsetteria Fiorentina',
  'storage', 6.50,
  'Piazza Santa Maria Novella 18, Firenze', 'Firenze', 'Toscana',
  43.7745, 11.2493, 0.0, 420,
  'Deposito sicuro vicino alla stazione SMN. Visita la città a mani libere con codice digitale e assicurazione inclusa.',
  '["https://picsum.photos/seed/fi-borsetteria/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Locker degli Uffizi',
  'storage', 7.00,
  'Via dei Georgofili 6, Firenze', 'Firenze', 'Toscana',
  43.7680, 11.2554, 0.0, 130,
  'Deposito a pochi passi dall''ingresso degli Uffizi. Lascia i bagagli, visita la galleria, riprendi tutto in 30 secondi.',
  '["https://picsum.photos/seed/fi-locker-uffizi/800/500"]',
  '{}', 15, 'around', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Depot Santa Maria Novella',
  'storage', 5.50,
  'Via della Scala 41, Firenze', 'Firenze', 'Toscana',
  43.7753, 11.2484, 0.0, 95,
  'Direttamente all''interno della stazione. Locker compatti e sicuri per chi transita da Firenze. Gestione con smartphone.',
  '["https://picsum.photos/seed/fi-depot-smn/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000003'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  NAPOLI  (9 services)
-- ══════════════════════════════════════════════════════════════
(
  'Pausa Reale',
  'rest', 20.00,
  'Via Toledo 200, Napoli', 'Napoli', 'Campania',
  40.8427, 14.2519, 0.0, 270,
  'Nel salotto di Napoli, su Via Toledo. Pod con materasso memory foam, blackout totale e aria purificata. Ricaricati prima di tornare al centro storico UNESCO.',
  '["https://picsum.photos/seed/na-pausa-reale/800/500","https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80"]',
  '{"sofa_or_bed":"bed","quiet_location":true,"blanket":true,"towels_included":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Casa Partenopea',
  'rest', 16.00,
  'Spaccanapoli 44, Napoli', 'Napoli', 'Campania',
  40.8496, 14.2573, 0.0, 410,
  'In pieno Spaccanapoli, a due passi dalla Cappella Sansevero. Ambiente caldo, prezzi onesti. Un riposino partenopeo autentico.',
  '["https://picsum.photos/seed/na-casa-partenopea/800/500"]',
  '{"sofa_or_bed":"sofa"}',
  30, NULL, 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Pod del Lungomare',
  'rest', 18.00,
  'Via Caracciolo 10, Napoli', 'Napoli', 'Campania',
  40.8295, 14.2452, 0.0, 480,
  'Sul lungomare Caracciolo con vista sul Golfo di Napoli e il Vesuvio. Pod con finestra panoramica e profumi marini. Un lusso accessibile.',
  '["https://picsum.photos/seed/na-pod-lungomare/800/500","https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&q=80"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  60, 'around', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Docce di Toledo',
  'shower', 7.00,
  'Via Chiaia 8, Napoli', 'Napoli', 'Campania',
  40.8380, 14.2494, 0.0, 190,
  'Box moderni nel cuore dello shopping napoletano. Saponi al limone di Sorrento, acqua sempre calda.',
  '["https://picsum.photos/seed/na-docce-toledo/800/500"]',
  '{"soap_included":true,"towels_included":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Bagni Partenopei',
  'shower', 8.00,
  'Piazza del Gesù Nuovo 7, Napoli', 'Napoli', 'Campania',
  40.8508, 14.2536, 0.0, 330,
  'Docce fresche a due passi dalla famosa piazza del Gesù. Phon e kit toilette completo. Consigliati dopo una visita al MANN.',
  '["https://picsum.photos/seed/na-bagni-partenopei/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Refresh Chiaia',
  'shower', 7.50,
  'Via dei Mille 48, Napoli', 'Napoli', 'Campania',
  40.8347, 14.2476, 0.0, 410,
  'Nel quartiere Chiaia, il più elegante di Napoli. Docce rapide e profumate, prodotti al cedro inclusi.',
  '["https://picsum.photos/seed/na-refresh-chiaia/800/500"]',
  '{"soap_included":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Depot Spaccanapoli',
  'storage', 5.00,
  'Via San Biagio dei Librai 39, Napoli', 'Napoli', 'Campania',
  40.8502, 14.2587, 0.0, 360,
  'Nel cuore antico di Napoli. Ideale per esplorare i vicoli storici senza valigie. Custodia assicurata.',
  '["https://picsum.photos/seed/na-depot-spacca/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Armadietti Garibaldi',
  'storage', 5.50,
  'Piazza Garibaldi 98, Napoli', 'Napoli', 'Campania',
  40.8526, 14.2723, 0.0, 75,
  'Proprio nella stazione centrale di Napoli. Locker capaci, apertura con codice personale. Zero attese.',
  '["https://picsum.photos/seed/na-armadietti-garibaldi/800/500"]',
  '{}', 15, 'around', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Locker Toledo',
  'storage', 6.00,
  'Via Toledo 132, Napoli', 'Napoli', 'Campania',
  40.8418, 14.2513, 0.0, 220,
  'Deposito nella via dello shopping più famosa di Napoli. Lascia i sacchetti e continua a fare acquisti a mani libere.',
  '["https://picsum.photos/seed/na-locker-toledo/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000004'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  MILANO  (9 services)
-- ══════════════════════════════════════════════════════════════
(
  'Lounge Duomo',
  'rest', 32.00,
  'Via Torino 6, Milano', 'Milano', 'Lombardia',
  45.4642, 9.1873, 4.9, 130,
  'Il riposo di lusso a pochi passi dal Duomo. Suite-pod con seduta ergonomica, presa USB-C e acqua minerale inclusa. Il servizio più esclusivo di Milano.',
  '["https://picsum.photos/seed/mi-lounge-duomo/800/500","https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"quiet_location":true,"towels_included":true,"toilet_access":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Nap Milano Centrale',
  'rest', 25.00,
  'Via Vittor Pisani 2, Milano', 'Milano', 'Lombardia',
  45.4844, 9.2013, 4.5, 80,
  'Adiacente alla Stazione Centrale. Pod privati insonorizzati con blackout totale. Perfetti tra un treno e l''altro.',
  '["https://picsum.photos/seed/mi-nap-centrale/800/500"]',
  '{"sofa_or_bed":"bed","quiet_location":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Pod di Brera',
  'rest', 28.00,
  'Via Fiori Chiari 10, Milano', 'Milano', 'Lombardia',
  45.4733, 9.1855, 4.7, 550,
  'Nel quartiere delle gallerie d''arte. Pod minimalisti in stile milanese con materasso premium. La pausa ideale tra una vernissage e l''altra.',
  '["https://picsum.photos/seed/mi-pod-brera/800/500","https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800&q=80"]',
  '{"sofa_or_bed":"bed","quiet_location":true,"blanket":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Pausa Navigli',
  'rest', 22.00,
  'Ripa di Porta Ticinese 55, Milano', 'Milano', 'Lombardia',
  45.4532, 9.1788, 4.4, 920,
  'Sull''alzaia dei Navigli. Pod accoglienti con vista sul canale. Ideali per ricaricarsi prima dell''aperitivo serale.',
  '["https://picsum.photos/seed/mi-pausa-navigli/800/500"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Refresh Stazione Centrale',
  'shower', 9.00,
  'Piazza Duca d''Aosta 1, Milano', 'Milano', 'Lombardia',
  45.4853, 9.2019, 4.6, 70,
  'Docce ampie con acqua purificata, accappatoio e kit da toilette completo. Ideali prima di un meeting o dopo un lungo viaggio.',
  '["https://picsum.photos/seed/mi-refresh-centrale/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Docce di Brera',
  'shower', 9.50,
  'Via Solferino 8, Milano', 'Milano', 'Lombardia',
  45.4730, 9.1859, 4.7, 580,
  'Docce di design nel quartiere Brera. Prodotti Acqua di Parma e phon Dyson. Il refresh più cool di Milano.',
  '["https://picsum.photos/seed/mi-docce-brera/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Bagni Porta Nuova',
  'shower', 8.00,
  'Via Melchiorre Gioia 22, Milano', 'Milano', 'Lombardia',
  45.4858, 9.1952, 4.4, 340,
  'Nel distretto finanziario di Porta Nuova. Box moderni, veloci, sempre puliti. Ideali per i professionisti.',
  '["https://picsum.photos/seed/mi-bagni-portanuova/800/500"]',
  '{"towels_included":true,"soap_included":true}',
  15, NULL, 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Storage Brera',
  'storage', 8.00,
  'Via Solferino 12, Milano', 'Milano', 'Lombardia',
  45.4733, 9.1861, 4.5, 560,
  'Deposito nel quartiere Brera. Apertura con app, zero code da ricordare. Ideale per chi visita le gallerie.',
  '["https://picsum.photos/seed/mi-storage-brera/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Locker Duomo',
  'storage', 9.00,
  'Galleria Vittorio Emanuele II, Milano', 'Milano', 'Lombardia',
  45.4656, 9.1896, 4.6, 180,
  'Sotto la Galleria più famosa d''Italia. Locker eleganti a 50 metri dal Duomo. Sorveglianza continua.',
  '["https://picsum.photos/seed/mi-locker-duomo/800/500","https://images.unsplash.com/photo-1513581166391-887a96ddeafd?w=800&q=80"]',
  '{}', 15, 'around', 'b0100000-0000-0000-0000-000000000005'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  POSITANO / COSTIERA AMALFITANA  (8 services)
-- ══════════════════════════════════════════════════════════════
(
  'Suite Azzurra',
  'rest', 35.00,
  'Via Marina Grande 42, Positano', 'Positano', 'Campania',
  40.6283, 14.4854, 0.0, 380,
  'Vista mozzafiato sul Mar Tirreno dalla terrazza privata. Pod con finestra panoramica, materasso premium e profumazione agli agrumi di Sorrento.',
  '["https://picsum.photos/seed/am-suite-azzurra/800/500","https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80"]',
  '{"sofa_or_bed":"bed","blanket":true,"quiet_location":true,"toilet_access":true,"towels_included":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Terrazza Positano',
  'rest', 29.00,
  'Via Cristoforo Colombo 38, Positano', 'Positano', 'Campania',
  40.6290, 14.4838, 0.0, 290,
  'Pausa relax in terrazza panoramica sulla baia. Cabine luminose con profumi mediterranei e coperta in lino.',
  '["https://picsum.photos/seed/am-terrazza-positano/800/500","https://images.unsplash.com/photo-1570394562-92ab0e4b3ab3?w=800&q=80"]',
  '{"sofa_or_bed":"sofa","quiet_location":true,"blanket":true}',
  60, 'around', 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Pod del Sentiero degli Dei',
  'rest', 25.00,
  'Via Nocelle 12, Praiano', 'Praiano', 'Campania',
  40.6198, 14.5208, 0.0, 650,
  'Al punto di arrivo del leggendario Sentiero degli Dei. Pod riposanti per gli escursionisti stanchi. Relax totale dopo la camminata.',
  '["https://picsum.photos/seed/am-sentiero-dei/800/500"]',
  '{"sofa_or_bed":"bed","blanket":true,"towels_included":true}',
  60, NULL, 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Docce Fresh Sea',
  'shower', 10.00,
  'Spiaggia Grande, Positano', 'Positano', 'Campania',
  40.6271, 14.4872, 0.0, 120,
  'Docce private direttamente sul lungomare. Kit premium con shampoo anti-salsedine e idratante corpo.',
  '["https://picsum.photos/seed/am-fresh-sea/800/500","https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=800&q=80"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Bagni della Costiera',
  'shower', 9.00,
  'Lungomare dei Cavalieri 8, Amalfi', 'Amalfi', 'Campania',
  40.6342, 14.6021, 0.0, 210,
  'Direttamente sul porto di Amalfi. Docce con acqua dolce dopo il mare, phon incluso. Essenziali per i bagnanti.',
  '["https://picsum.photos/seed/am-bagni-costiera/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Refresh Amalfi',
  'shower', 8.00,
  'Via Lorenzo d''Amalfi 9, Amalfi', 'Amalfi', 'Campania',
  40.6338, 14.6015, 0.0, 290,
  'Nel centro storico di Amalfi. Box freschi e puliti, prodotti locali all''agrume costiero.',
  '["https://picsum.photos/seed/am-refresh-amalfi/800/500"]',
  '{"soap_included":true,"towels_included":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Coast Locker Positano',
  'storage', 7.00,
  'Viale Pasitea 224, Positano', 'Positano', 'Campania',
  40.6305, 14.4827, 0.0, 350,
  'Deposito vicino all''imbarcadero dei traghetti. Ottimo per i day-tripper da Napoli o Sorrento.',
  '["https://picsum.photos/seed/am-coast-locker/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000006'::uuid
),
(
  'Depot Amalfi',
  'storage', 6.50,
  'Via dei Mulini 4, Amalfi', 'Amalfi', 'Campania',
  40.6340, 14.6025, 0.0, 180,
  'Vicino ai traghetti per Salerno e Napoli. Deposito compatto, aperto dalle 8 alle 20.',
  '["https://picsum.photos/seed/am-depot-amalfi/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000006'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  PALERMO  (8 services)
-- ══════════════════════════════════════════════════════════════
(
  'Riposo dei Normanni',
  'rest', 18.00,
  'Via Vittorio Emanuele 316, Palermo', 'Palermo', 'Sicilia',
  38.1140, 13.3578, 0.0, 240,
  'A due passi dalla Cattedrale di Palermo. Cabine con aria condizionata silenziosa — sollievo nel caldo siciliano. Atmosfera ispirata all''architettura arabo-normanna.',
  '["https://picsum.photos/seed/pa-riposo-normanni/800/500","https://images.unsplash.com/photo-1572550985050-8b1b8da1dcc6?w=800&q=80"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Ballarò Rest Stop',
  'rest', 15.00,
  'Piazza del Carmine, Palermo', 'Palermo', 'Sicilia',
  38.1118, 13.3540, 0.0, 430,
  'Nel vivace mercato Ballarò. Sosta autentica tra i profumi dello street food palermitano. Pod semplici, puliti e a prezzi accessibili.',
  '["https://picsum.photos/seed/pa-ballaro-rest/800/500"]',
  '{"sofa_or_bed":"sofa"}',
  30, NULL, 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Pod della Kalsa',
  'rest', 17.00,
  'Via Alloro 6, Palermo', 'Palermo', 'Sicilia',
  38.1139, 13.3668, 0.0, 380,
  'Nel quartiere storico della Kalsa, vicino alla Galleria Regionale. Pod freschi con ventilazione silenziosa, ideali per una pausa culturale.',
  '["https://picsum.photos/seed/pa-pod-kalsa/800/500"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Docce Porto Felice',
  'shower', 7.00,
  'Via Francesco Crispi 55, Palermo', 'Palermo', 'Sicilia',
  38.1202, 13.3625, 0.0, 180,
  'Vicino al porto della Cala. Box moderni e freschi dopo i mercati storici. Gel al limone siciliano incluso.',
  '["https://picsum.photos/seed/pa-docce-porto/800/500"]',
  '{"soap_included":true,"towels_included":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Bagni Arabo-Normanni',
  'shower', 8.00,
  'Via Bandiera 14, Palermo', 'Palermo', 'Sicilia',
  38.1148, 13.3589, 0.0, 260,
  'Box eleganti vicino al Palazzo dei Normanni. Prodotti biologici siciliani, phon e asciugamano inclusi.',
  '["https://picsum.photos/seed/pa-bagni-normanni/800/500","https://images.unsplash.com/photo-1572550985050-8b1b8da1dcc6?w=800&q=80"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Refresh Ballarò',
  'shower', 6.50,
  'Piazza Ballarò 22, Palermo', 'Palermo', 'Sicilia',
  38.1121, 13.3547, 0.0, 490,
  'Docce economiche nel mercato storico. Acqua sempre calda, ambiente autentico e accessibile.',
  '["https://picsum.photos/seed/pa-refresh-ballaro/800/500"]',
  '{"soap_included":true}',
  15, NULL, 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Armadietti Vucciria',
  'storage', 5.00,
  'Via Roma 44, Palermo', 'Palermo', 'Sicilia',
  38.1181, 13.3637, 0.0, 280,
  'Deposito nel centro storico. Ideale per esplorare Vucciria e Capo. Sorveglianza elettronica tutto il giorno.',
  '["https://picsum.photos/seed/pa-armadietti-vucc/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000007'::uuid
),
(
  'Locker del Capo',
  'storage', 5.50,
  'Via Beati Paoli 12, Palermo', 'Palermo', 'Sicilia',
  38.1161, 13.3572, 0.0, 340,
  'Deposito nell''omonimo mercato del Capo. Lascia i sacchetti e prosegui la visita al Teatro Massimo.',
  '["https://picsum.photos/seed/pa-locker-capo/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000007'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  CAGLIARI  (6 services)
-- ══════════════════════════════════════════════════════════════
(
  'Pod del Castello',
  'rest', 20.00,
  'Via Università 40, Cagliari', 'Cagliari', 'Sardegna',
  39.2175, 9.1108, 4.5, 310,
  'Nel quartiere medievale del Castello, con le sue torri e i panorami mozzafiato. Pod con vista sul golfo e aria condizionata silenziosa.',
  '["https://picsum.photos/seed/ca-pod-castello/800/500","https://images.unsplash.com/photo-1568386453619-84c3ff4b43c5?w=800&q=80"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000008'::uuid
),
(
  'Pausa Marina',
  'rest', 17.00,
  'Via Roma 83, Cagliari', 'Cagliari', 'Sardegna',
  39.2161, 9.1174, 4.3, 180,
  'Sul lungomare di Cagliari, a due passi dal porto. Pod freschi con vista sulla baia, ideali per una sosta tra traghetto e spiaggia.',
  '["https://picsum.photos/seed/ca-pausa-marina/800/500"]',
  '{"sofa_or_bed":"sofa"}',
  30, 'around', 'b0100000-0000-0000-0000-000000000008'::uuid
),
(
  'Docce Marina',
  'shower', 7.50,
  'Via Sassari 16, Cagliari', 'Cagliari', 'Sardegna',
  39.2153, 9.1131, 4.5, 230,
  'Vicino al porto e al lungomare. Docce con acqua dolce, ideali dopo il mare. Asciugamano e gel sardo inclusi.',
  '["https://picsum.photos/seed/ca-docce-marina/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000008'::uuid
),
(
  'Refresh Porto',
  'shower', 7.00,
  'Viale Regina Elena 4, Cagliari', 'Cagliari', 'Sardegna',
  39.2148, 9.1183, 4.3, 140,
  'Adiacente al porto dei traghetti. Docce rapide per i passeggeri in transito. Sapone incluso, phon su richiesta.',
  '["https://picsum.photos/seed/ca-refresh-porto/800/500"]',
  '{"soap_included":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000008'::uuid
),
(
  'Safe Bags Cagliari',
  'storage', 5.50,
  'Via Roma 99, Cagliari', 'Cagliari', 'Sardegna',
  39.2157, 9.1180, 4.3, 160,
  'Deposito bagagli vicino al porto. Locker capienti per trolley e zaini. Ideale per i day-tripper dalla terraferma.',
  '["https://picsum.photos/seed/ca-safe-bags/800/500"]',
  '{}', 15, 'recently', 'b0100000-0000-0000-0000-000000000008'::uuid
),
(
  'Locker Castello',
  'storage', 5.00,
  'Piazza Palazzo 1, Cagliari', 'Cagliari', 'Sardegna',
  39.2172, 9.1109, 4.1, 290,
  'Nel quartiere Castello. Deposito compatto e sicuro per visitare il bastione di Saint Remy senza il peso dei bagagli.',
  '["https://picsum.photos/seed/ca-locker-castello/800/500"]',
  '{}', 15, NULL, 'b0100000-0000-0000-0000-000000000008'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  BARI  (5 services)
-- ══════════════════════════════════════════════════════════════
(
  'Pod della Muraglia',
  'rest', 19.00,
  'Corso Vittorio Emanuele II 46, Bari', 'Bari', 'Puglia',
  41.1255, 16.8668, 0.0, 260,
  'Nella città vecchia di Bari, tra i vicoli della muraglia medievale. Pod freschi e ben arredati, ottimi dopo la visita alla Basilica di San Nicola.',
  '["https://picsum.photos/seed/ba-pod-muraglia/800/500","https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800&q=80"]',
  '{"sofa_or_bed":"sofa","quiet_location":true}',
  60, 'recently', 'b0100000-0000-0000-0000-000000000009'::uuid
),
(
  'Pausa Adriatica',
  'rest', 17.00,
  'Lungomare Nazario Sauro 10, Bari', 'Bari', 'Puglia',
  41.1238, 16.8706, 0.0, 310,
  'Sul lungomare adriatico. Pod con vista mare e profumi salmastri del sud. Ricaricati prima dell''aperitivo in città.',
  '["https://picsum.photos/seed/ba-pausa-adriatica/800/500"]',
  '{"sofa_or_bed":"sofa"}',
  30, 'around', 'b0100000-0000-0000-0000-000000000009'::uuid
),
(
  'Docce San Nicola',
  'shower', 7.00,
  'Via Sparano da Bari 120, Bari', 'Bari', 'Puglia',
  41.1265, 16.8686, 0.0, 340,
  'Box moderni nel centro dello shopping barese. Prodotti al fior di arancio pugliese, phon incluso.',
  '["https://picsum.photos/seed/ba-docce-nicola/800/500"]',
  '{"towels_included":true,"soap_included":true,"hair_dryer":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000009'::uuid
),
(
  'Armadietti Centrale',
  'storage', 5.50,
  'Piazza Aldo Moro 1, Bari', 'Bari', 'Puglia',
  41.1278, 16.8707, 0.0, 95,
  'Direttamente nella Stazione Centrale di Bari. Locker capaci, apertura digitale H24.',
  '["https://picsum.photos/seed/ba-armadietti-centrale/800/500"]',
  '{"open_24h":true}', 15, 'recently', 'b0100000-0000-0000-0000-000000000009'::uuid
),
(
  'Depot Fiera del Levante',
  'storage', 6.00,
  'Lungomare Starita 2, Bari', 'Bari', 'Puglia',
  41.1194, 16.8641, 0.0, 480,
  'Vicino alla Fiera del Levante e al quartiere Japigia. Ideale per eventi, congressi e fiere.',
  '["https://picsum.photos/seed/ba-depot-fiera/800/500"]',
  '{}', 15, 'around', 'b0100000-0000-0000-0000-000000000009'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  FOCUS — workspace pods  (10 services)
-- ══════════════════════════════════════════════════════════════
(
  'WorkPod Rialto',
  'focus', 12.00,
  'Ruga Rialto 623, Venezia', 'Venezia', 'Veneto',
  45.4380, 12.3357, 0.0, 220,
  'Postazione di lavoro privata a due passi dal Mercato di Rialto. Scrivania, sedia ergonomica, WiFi fibra e presa 220V. Perfetta per smart-worker e nomadi digitali.',
  '["https://picsum.photos/seed/vz-workpod-rialto/800/500"]',
  '{"wifi":true,"power_outlet":true,"monitor":false}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Focus Corner San Marco',
  'focus', 14.00,
  'Calle Vallaresso 1332, Venezia', 'Venezia', 'Veneto',
  45.4318, 12.3391, 0.0, 180,
  'Box di lavoro silenziosi con vista sul Canal Grande. WiFi dedicato, scrivania ampia e illuminazione regolabile. Per chi lavora in viaggio.',
  '["https://picsum.photos/seed/vz-focus-sanmarco/800/500"]',
  '{"wifi":true,"power_outlet":true,"monitor":false}',
  30, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Desk Colosseo',
  'focus', 11.00,
  'Via Labicana 2, Roma', 'Roma', 'Lazio',
  41.8908, 12.4922, 0.0, 220,
  'Workspace privato vicino al Colosseo. WiFi 1 Gbps, sedie ergonomiche e silenzio assoluto. Ideale per call e focus work.',
  '["https://picsum.photos/seed/rm-desk-colosseo/800/500"]',
  '{"wifi":true,"power_outlet":true,"monitor":false}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Focus Hub Termini',
  'focus', 10.00,
  'Via Marsala 55, Roma', 'Roma', 'Lazio',
  41.9008, 12.5028, 0.0, 75,
  'Postazioni in co-working a 5 minuti da Termini. WiFi, prese e coffe station inclusa. Slot da 1 ora a mezza giornata.',
  '["https://picsum.photos/seed/rm-focus-termini/800/500"]',
  '{"wifi":true,"power_outlet":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'WorkDesk Duomo',
  'focus', 15.00,
  'Via Torino 2, Milano', 'Milano', 'Lombardia',
  45.4641, 9.1880, 4.8, 120,
  'Postazione premium a 50 metri dal Duomo. Scrivania in legno, sedia Herman Miller e monitor esterno disponibile su richiesta. Il top del focus work milanese.',
  '["https://picsum.photos/seed/mi-workdesk-duomo/800/500"]',
  '{"wifi":true,"power_outlet":true,"monitor":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Focus Brera',
  'focus', 13.00,
  'Via dell''Orso 16, Milano', 'Milano', 'Lombardia',
  45.4726, 9.1858, 4.6, 530,
  'Workspace in stile industrial-chic nel cuore di Brera. WiFi ultraveloce, mood music, caffè incluso. Per chi lavora con stile.',
  '["https://picsum.photos/seed/mi-focus-brera/800/500"]',
  '{"wifi":true,"power_outlet":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Studio degli Uffizi',
  'focus', 11.00,
  'Via dei Leoni 7, Firenze', 'Firenze', 'Toscana',
  43.7685, 11.2562, 0.0, 180,
  'Postazione di lavoro a due passi dagli Uffizi. WiFi, prese e ambiente raccolto. Ideale per studiosi, accademici e viaggiatori con laptop.',
  '["https://picsum.photos/seed/fi-studio-uffizi/800/500"]',
  '{"wifi":true,"power_outlet":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Desk Toledo',
  'focus', 10.00,
  'Via Chiaia 4, Napoli', 'Napoli', 'Campania',
  40.8375, 14.2497, 0.0, 170,
  'Workspace privato nel centro di Napoli. WiFi, illuminazione LED e silenzio garantito. A due passi da Via Toledo.',
  '["https://picsum.photos/seed/na-desk-toledo/800/500"]',
  '{"wifi":true,"power_outlet":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Focus Spaccanapoli',
  'focus', 9.00,
  'Via B. Croce 30, Napoli', 'Napoli', 'Campania',
  40.8497, 14.2567, 0.0, 390,
  'Piccolo workspace nel cuore storico di Napoli. Ideale per studenti e freelance. WiFi stabile e sedie comode.',
  '["https://picsum.photos/seed/na-focus-spacca/800/500"]',
  '{"wifi":true,"power_outlet":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'WorkPod Arsenale',
  'focus', 12.00,
  'Via Garibaldi 1100, Venezia', 'Venezia', 'Veneto',
  45.4281, 12.3565, 0.0, 700,
  'Postazione tranquilla nel sestiere Castello. WiFi e prese 220V. Lontano dal caos turistico, vicino alla Biennale.',
  '["https://picsum.photos/seed/vz-workpod-arsenale/800/500"]',
  '{"wifi":true,"power_outlet":true}',
  30, NULL, 'b0100000-0000-0000-0000-000000000002'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  TAVOLO — table/dining reservations  (10 services)
-- ══════════════════════════════════════════════════════════════
(
  'Tavolo della Serenissima',
  'tavolo', 8.00,
  'Sestiere San Polo 429, Venezia', 'Venezia', 'Veneto',
  45.4372, 12.3340, 0.0, 250,
  'Prenota il tuo posto a sedere in un bàcaro storico a San Polo. Cicchetti e ombre di vino garantiti. Senza prenotazione rischi di restare in piedi!',
  '["https://picsum.photos/seed/vz-tavolo-serenissima/800/500"]',
  '{"seats":2,"outdoor":false}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Posto a Rialto',
  'tavolo', 7.00,
  'Campo de la Pescaria, Venezia', 'Venezia', 'Veneto',
  45.4393, 12.3356, 0.0, 190,
  'Tavolo riservato con vista sul Canal Grande vicino al mercato del pesce. Atmosfera veneziana autentica.',
  '["https://picsum.photos/seed/vz-posto-rialto/800/500"]',
  '{"seats":4,"outdoor":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Tavolo dei Fori',
  'tavolo', 9.00,
  'Via Sacra 18, Roma', 'Roma', 'Lazio',
  41.8929, 12.4857, 0.0, 160,
  'Posto riservato con vista sui Fori Imperiali. Pranzo o spuntino con vista sulla Roma antica. Prenotazione obbligatoria.',
  '["https://picsum.photos/seed/rm-tavolo-fori/800/500"]',
  '{"seats":2,"outdoor":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Tavolino Trastevere',
  'tavolo', 8.00,
  'Vicolo del Cinque 11, Roma', 'Roma', 'Lazio',
  41.8890, 12.4717, 0.0, 360,
  'Posto garantito in osteria nel cuore di Trastevere. Niente code, niente stress. Cucina romana autentica.',
  '["https://picsum.photos/seed/rm-tavolino-trastevere/800/500"]',
  '{"seats":2,"outdoor":false}',
  30, 'around', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Tavolo Navigli',
  'tavolo', 10.00,
  'Alzaia Naviglio Grande 40, Milano', 'Milano', 'Lombardia',
  45.4528, 9.1783, 4.5, 890,
  'Posto riservato su terrazza affacciata sul Naviglio Grande. Perfetto per aperitivo o cena informale con vista sul canale.',
  '["https://picsum.photos/seed/mi-tavolo-navigli/800/500"]',
  '{"seats":4,"outdoor":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Tavolo Brera',
  'tavolo', 9.00,
  'Via Madonnina 7, Milano', 'Milano', 'Lombardia',
  45.4730, 9.1845, 4.6, 560,
  'Reservazione tavolo in bistrot di design a Brera. Menu della tradizione meneghina, vini naturali. Posto garantito anche nel weekend.',
  '["https://picsum.photos/seed/mi-tavolo-brera/800/500"]',
  '{"seats":2,"outdoor":false}',
  30, 'around', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Posto all''Oltrarno',
  'tavolo', 8.00,
  'Piazza Santo Spirito 9, Firenze', 'Firenze', 'Toscana',
  43.7651, 11.2507, 0.0, 410,
  'Tavolo in osteria fiorentina in Oltrarno. Ribollita, pappa al pomodoro e vino locale. Prenota e siediti senza attese.',
  '["https://picsum.photos/seed/fi-posto-oltrarno/800/500"]',
  '{"seats":2,"outdoor":true}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Tavolo Santa Croce',
  'tavolo', 7.00,
  'Borgo Santa Croce 31, Firenze', 'Firenze', 'Toscana',
  43.7689, 11.2616, 0.0, 340,
  'Posto in trattoria vicino a Santa Croce. Cucina toscana tradizionale, prezzi onesti, posto garantito senza fila.',
  '["https://picsum.photos/seed/fi-tavolo-santacroce/800/500"]',
  '{"seats":2,"outdoor":false}',
  30, NULL, 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Tavolo Spaccanapoli',
  'tavolo', 7.00,
  'Via dei Tribunali 94, Napoli', 'Napoli', 'Campania',
  40.8513, 14.2592, 0.0, 320,
  'Posto riservato in pizzeria storica sulla Decumano Maggiore. Pizza napoletana verace, posto garantito anche nelle ore di punta.',
  '["https://picsum.photos/seed/na-tavolo-spacca/800/500"]',
  '{"seats":2,"outdoor":false}',
  30, 'recently', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Tavolino Chiaia',
  'tavolo', 9.00,
  'Piazza dei Martiri 30, Napoli', 'Napoli', 'Campania',
  40.8347, 14.2476, 0.0, 410,
  'Tavolo in wine bar nel quartiere chic di Chiaia. Aperitivo napoletano, salumi e formaggi locali. Niente attese.',
  '["https://picsum.photos/seed/na-tavolino-chiaia/800/500"]',
  '{"seats":2,"outdoor":true}',
  30, 'around', 'b0100000-0000-0000-0000-000000000004'::uuid
),

-- ══════════════════════════════════════════════════════════════
--  CHARGE — device charging stations  (10 services)
-- ══════════════════════════════════════════════════════════════
(
  'Ricarica San Marco',
  'charge', 3.00,
  'Procuratie Nuove 56, Venezia', 'Venezia', 'Veneto',
  45.4340, 12.3381, 0.0, 130,
  'Stazione di ricarica rapida sotto i portici di San Marco. USB-A, USB-C e presa Schuko. Tieni il telefono carico mentre visiti la Basilica.',
  '["https://picsum.photos/seed/vz-ricarica-sanmarco/800/500"]',
  '{"usb_a":true,"usb_c":true,"schuko":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Charge Rialto',
  'charge', 2.50,
  'Campo San Polo 2168, Venezia', 'Venezia', 'Veneto',
  45.4367, 12.3313, 0.0, 310,
  'Ricarica veloce a San Polo. 4 porte USB-C e 2 Schuko. Lascia caricare mentre fai shopping o prendi un caffè.',
  '["https://picsum.photos/seed/vz-charge-rialto/800/500"]',
  '{"usb_a":true,"usb_c":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000002'::uuid
),
(
  'Power Stop Colosseo',
  'charge', 3.00,
  'Via Celio Vibenna 1, Roma', 'Roma', 'Lazio',
  41.8887, 12.4898, 0.0, 190,
  'Ricarica smartphone e tablet vicino al Colosseo. USB-C PD 65W e USB-A 12W. Non restare a secco durante la visita ai Fori.',
  '["https://picsum.photos/seed/rm-powerstop-colosseo/800/500"]',
  '{"usb_a":true,"usb_c":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Charge Hub Termini',
  'charge', 2.50,
  'Via Giovanni Giolitti 6, Roma', 'Roma', 'Lazio',
  41.9012, 12.5021, 0.0, 70,
  'Stazione di ricarica in Stazione Termini. Funziona H24. USB-C, USB-A e presa standard. Ideale in attesa del treno.',
  '["https://picsum.photos/seed/rm-charge-termini/800/500"]',
  '{"usb_a":true,"usb_c":true,"schuko":true,"open_24h":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000001'::uuid
),
(
  'Powerbank Duomo',
  'charge', 4.00,
  'Piazza del Duomo 1, Milano', 'Milano', 'Lombardia',
  45.4654, 9.1880, 4.7, 100,
  'Ricarica premium a 20 metri dal Duomo. USB-C 100W, USB-A e Wireless Qi 15W. Per iPhone e Android, nessun cavo necessario.',
  '["https://picsum.photos/seed/mi-powerbank-duomo/800/500"]',
  '{"usb_a":true,"usb_c":true,"wireless_qi":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Charge Centrale',
  'charge', 3.00,
  'Piazza Duca d''Aosta 2, Milano', 'Milano', 'Lombardia',
  45.4852, 9.2018, 4.5, 65,
  'Stazione di ricarica in Stazione Centrale. USB-C e USB-A ad alta potenza. Aperta H24, ideale tra i treni.',
  '["https://picsum.photos/seed/mi-charge-centrale/800/500"]',
  '{"usb_a":true,"usb_c":true,"open_24h":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000005'::uuid
),
(
  'Carica SMN',
  'charge', 2.50,
  'Piazza Santa Maria Novella 1, Firenze', 'Firenze', 'Toscana',
  43.7745, 11.2491, 0.0, 100,
  'Ricarica veloce alla stazione di Firenze. USB-C e USB-A, sempre disponibili. Perfetta prima di salire sul treno.',
  '["https://picsum.photos/seed/fi-carica-smn/800/500"]',
  '{"usb_a":true,"usb_c":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Power Uffizi',
  'charge', 3.00,
  'Piazzale degli Uffizi 3, Firenze', 'Firenze', 'Toscana',
  43.7680, 11.2553, 0.0, 140,
  'Stazione di ricarica a due passi dagli Uffizi. USB-C PD e USB-A. Non perdere foto storiche per batteria scarica.',
  '["https://picsum.photos/seed/fi-power-uffizi/800/500"]',
  '{"usb_a":true,"usb_c":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000003'::uuid
),
(
  'Ricarica Garibaldi',
  'charge', 2.00,
  'Piazza Garibaldi 80, Napoli', 'Napoli', 'Campania',
  40.8524, 14.2720, 0.0, 80,
  'Stazione di ricarica nella stazione centrale di Napoli. USB-A e USB-C. Funziona H24, zero code.',
  '["https://picsum.photos/seed/na-ricarica-garibaldi/800/500"]',
  '{"usb_a":true,"usb_c":true,"open_24h":true}',
  15, 'recently', 'b0100000-0000-0000-0000-000000000004'::uuid
),
(
  'Charge Toledo',
  'charge', 2.50,
  'Via Toledo 88, Napoli', 'Napoli', 'Campania',
  40.8413, 14.2511, 0.0, 230,
  'Colonnina di ricarica su Via Toledo, la strada più vivace di Napoli. USB-C e USB-A. Ricarica mentre fai shopping.',
  '["https://picsum.photos/seed/na-charge-toledo/800/500"]',
  '{"usb_a":true,"usb_c":true}',
  15, 'around', 'b0100000-0000-0000-0000-000000000004'::uuid
);

-- ============================================================
-- 4. SERVICE SLOTS  (next 90 days, 09:00–18:00, every 30 min)
-- ============================================================
INSERT INTO public.service_slots (service_id, slot_start, slot_end)
SELECT
  s.id,
  date_trunc('day', now()) + (d.n * INTERVAL '1 day')
    + make_interval(hours => h.h, mins => m.m)          AS slot_start,
  date_trunc('day', now()) + (d.n * INTERVAL '1 day')
    + make_interval(hours => h.h, mins => m.m + 30)     AS slot_end
FROM public.services s
CROSS JOIN generate_series(0, 89)   AS d(n)
CROSS JOIN generate_series(9, 17)   AS h(h)
CROSS JOIN (VALUES (0), (30))       AS m(m)
WHERE s.host_id IN (SELECT id FROM public.hosts WHERE guest_id IS NULL);

-- ============================================================
-- 5. MOCK REVIEWS  (2 per service)
-- ============================================================

-- First review for each service
INSERT INTO public.service_reviews (
  service_id, booking_id, guest_id,
  rating_10, description, author_name, host_reply, created_at
)
SELECT
  s.id,
  NULL, NULL,
  CASE ((ROW_NUMBER() OVER (ORDER BY s.created_at, s.id) - 1) % 8)::int
    WHEN 0 THEN 9  WHEN 1 THEN 8  WHEN 2 THEN 10
    WHEN 3 THEN 9  WHEN 4 THEN 8  WHEN 5 THEN 10
    WHEN 6 THEN 7  ELSE 9
  END,
  CASE ((ROW_NUMBER() OVER (ORDER BY s.created_at, s.id) - 1) % 8)::int
    WHEN 0 THEN 'Servizio impeccabile, cabine pulitissime. Lo consiglio a tutti i viaggiatori!'
    WHEN 1 THEN 'Posizione perfetta, a due passi dai punti di interesse. Ottimo per una pausa veloce.'
    WHEN 2 THEN 'Esperienza fantastica! Non me lo aspettavo così bello. Tornerò sicuramente.'
    WHEN 3 THEN 'Molto comodo e accessibile. Prezzi giusti per la qualità offerta.'
    WHEN 4 THEN 'Ideale per chi viaggia con bagagli numerosi. Personale disponibile e gentile.'
    WHEN 5 THEN 'Super pulito, moderno e ben posizionato. Consigliatissimo a tutti.'
    WHEN 6 THEN 'Buona esperienza complessiva. Il prezzo è corretto per il servizio offerto.'
    ELSE 'Perfetto per ricaricarsi. Ambiente tranquillo e riposante, tornerò!'
  END,
  (ARRAY['Marco B.','Sara C.','Luca M.','Elena R.','Paolo F.','Giulia V.','Andrea N.','Chiara P.'])
    [((ROW_NUMBER() OVER (ORDER BY s.created_at, s.id) - 1) % 8 + 1)::int],
  CASE ((ROW_NUMBER() OVER (ORDER BY s.created_at, s.id) - 1) % 4)::int
    WHEN 0 THEN 'Grazie mille! Ci vediamo presto. 😊'
    WHEN 1 THEN 'Ti aspettiamo di nuovo!'
    ELSE NULL
  END,
  now() - ((55 + ((ROW_NUMBER() OVER (ORDER BY s.created_at, s.id) - 1) % 40))::int || ' days')::interval
FROM public.services s
WHERE s.host_id IN (SELECT id FROM public.hosts WHERE guest_id IS NULL);

-- Second review for each service (different modulo offset)
INSERT INTO public.service_reviews (
  service_id, booking_id, guest_id,
  rating_10, description, author_name, host_reply, created_at
)
SELECT
  s.id,
  NULL, NULL,
  CASE ((ROW_NUMBER() OVER (ORDER BY s.id DESC) - 1) % 8)::int
    WHEN 0 THEN 8  WHEN 1 THEN 9  WHEN 2 THEN 9
    WHEN 3 THEN 10 WHEN 4 THEN 9  WHEN 5 THEN 8
    WHEN 6 THEN 10 ELSE 8
  END,
  CASE ((ROW_NUMBER() OVER (ORDER BY s.id DESC) - 1) % 8)::int
    WHEN 0 THEN 'Ottimo servizio! Personale cordiale e struttura ben tenuta.'
    WHEN 1 THEN 'Ci tornerò sicuramente. Comodo, pulito e al giusto prezzo.'
    WHEN 2 THEN 'Mi aspettavo meno e invece è stato sorprendentemente buono!'
    WHEN 3 THEN 'Il migliore della zona. Lo consiglio a chi visita la città.'
    WHEN 4 THEN 'Pratico e funzionale. Esattamente quello che cercavo durante il giro turistico.'
    WHEN 5 THEN 'Ben posizionato e pulitissimo. Ottimo per una pausa veloce.'
    WHEN 6 THEN 'Servizio professionale, struttura moderna. Prezzi onesti.'
    ELSE 'Consigliato! Una vera oasi di relax nel caos della città.'
  END,
  (ARRAY['Riccardo T.','Marta G.','Davide A.','Sofia L.','Francesco B.','Valentina M.','Simone R.','Alessia C.'])
    [((ROW_NUMBER() OVER (ORDER BY s.id DESC) - 1) % 8 + 1)::int],
  CASE ((ROW_NUMBER() OVER (ORDER BY s.id DESC) - 1) % 5)::int
    WHEN 0 THEN 'Grazie per la recensione, ci fa molto piacere!'
    ELSE NULL
  END,
  now() - ((10 + ((ROW_NUMBER() OVER (ORDER BY s.id DESC) - 1) % 45))::int || ' days')::interval
FROM public.services s
WHERE s.host_id IN (SELECT id FROM public.hosts WHERE guest_id IS NULL);

-- Calcola il rating come media diretta delle rating_10 (scala 0-10, coerente con la UI)
UPDATE public.services s
SET rating = (
  SELECT ROUND(AVG(sr.rating_10)::numeric, 1)
  FROM public.service_reviews sr
  WHERE sr.service_id = s.id
)
WHERE s.host_id IN (SELECT id FROM public.hosts WHERE guest_id IS NULL);

COMMIT;

