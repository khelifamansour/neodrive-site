-- Livraison : numéro de série saisi par le livreur, confirmation du paiement par le fondateur, accusé de réception signé par le client
alter table reservations add column if not exists paiement_confirme_at timestamptz;
alter table reservations add column if not exists livre_at timestamptz;
alter table reservations add column if not exists vin_photo_path text;
alter table reservations add column if not exists accuse_path text;
alter table reservations add column if not exists accuse_token text;
alter table reservations add column if not exists accuse_data jsonb;
create unique index if not exists reservations_accuse_token_idx on reservations (accuse_token) where accuse_token is not null;
