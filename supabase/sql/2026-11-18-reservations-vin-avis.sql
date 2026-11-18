-- Registre clients : numéro de série (VIN) et avis Google par réservation
alter table reservations add column if not exists vin text;
alter table reservations add column if not exists avis_google text;
alter table reservations add column if not exists avis_at date;
