-- Livraison par transporteur partenaire (Transports Rabouin) et véhicule livré verrouillé.
-- livraison_mode : 'neodrive' (livraison faite par NeoDrive) ou 'transporteur' (le chauffeur dépose la voiture et repart).
-- verrouillage : véhicule livré verrouillé, activé dès réception du paiement intégral.
alter table public.reservations add column if not exists livraison_mode text not null default 'neodrive';
alter table public.reservations add column if not exists verrouillage boolean not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_livraison_mode_check') then
    alter table public.reservations add constraint reservations_livraison_mode_check check (livraison_mode in ('neodrive', 'transporteur'));
  end if;
end $$;
