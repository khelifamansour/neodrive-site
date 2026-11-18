-- Registre clients : numéro de série (VIN) et avis Google par réservation
alter table reservations add column if not exists vin text;
alter table reservations add column if not exists avis_google text;
alter table reservations add column if not exists avis_at date;

-- Suivi après livraison : date du message « prendre des nouvelles » et de la demande d'avis (envoyés à la main par WhatsApp)
alter table reservations add column if not exists nouvelles_at timestamptz;
alter table reservations add column if not exists avis_demande_at timestamptz;
