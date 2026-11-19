-- Remise du véhicule avec paiement en attente (réserve de propriété) : document signé par le client, distinct de l'accusé final.
alter table reservations add column if not exists reserve_path text;
alter table reservations add column if not exists reserve_token text;
alter table reservations add column if not exists reserve_data jsonb;
alter table reservations add column if not exists reserve_due date;
create unique index if not exists reservations_reserve_token_idx on reservations (reserve_token) where reserve_token is not null;
