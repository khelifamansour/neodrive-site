-- Heures et frais du chauffeur : données structurées d'un événement de tournée
-- (frais : type, montant, jour ; correction : jour, minutes ajoutées ou retirées).
alter table public.tour_events add column if not exists data jsonb;
