-- Carte grise préparée avant la livraison : lien personnel par réservation (/carte-grise/preparer/<jeton>, sans connexion).
-- Étape 1 : pièce d'identité + justificatif de domicile ; étape 2 (après chargement / livraison) : photo de la plaque VIN + mandat signé au doigt.
alter table public.reservations add column if not exists cg_prep_token text;
create unique index if not exists reservations_cg_prep_token_key on public.reservations (cg_prep_token) where cg_prep_token is not null;
create index if not exists carte_grise_dossiers_reservation_id_idx on public.carte_grise_dossiers (reservation_id);
