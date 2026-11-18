-- Livraison : accusé confirmé à distance par le client (lien SMS / e-mail), SMS « livraison prévue », livraison avec paiement en attente
alter table reservations add column if not exists confirm_token text;
alter table reservations add column if not exists confirm_sent_at timestamptz;
alter table reservations add column if not exists remote_confirm jsonb;
alter table reservations add column if not exists prevenu_at timestamptz;
alter table reservations add column if not exists paiement_en_attente boolean not null default false;
alter table reservations add column if not exists montant_du numeric;
alter table reservations add column if not exists remise_data jsonb;
create unique index if not exists reservations_confirm_token_idx on reservations (confirm_token) where confirm_token is not null;
-- Compte de test (livreur) : repérable et supprimable
alter table team_members add column if not exists is_test boolean not null default false;
