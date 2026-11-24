-- « Boucler la boucle » : un véhicule (VIN) suivi de l'usine au client, et une facture pour chaque vente.
-- Page fondateur : /stock-facturation. Rien n'est supprimé ; le script peut être rejoué sans effet de bord.

-- 1. STOCK : shipment_vehicles reste la source unique par VIN (portail usine, conteneurs, suivi voiture par voiture).
-- Import en masse : un VIN peut être chargé sans conteneur connu (shipment_id vide, rattaché plus tard).
alter table shipment_vehicles alter column shipment_id drop not null;
alter table shipment_vehicles add column if not exists model text;
alter table shipment_vehicles add column if not exists color text;
alter table shipment_vehicles add column if not exists defect boolean not null default false;
alter table shipment_vehicles add column if not exists defect_note text;
alter table shipment_vehicles add column if not exists reservation_id bigint references reservations(id) on delete set null;
alter table shipment_vehicles add column if not exists source text; -- portail | import | livraison | carte grise
-- status : 'commandée' (nouveau, pas encore embarquée) | 'en mer' | 'au port' | 'au dépôt' | 'chargée' | 'livrée'
-- depot : hub (lamasquere, gennevilliers, dls, fos, boran, le-havre)
create unique index if not exists shipment_vehicles_vin_noship_key on shipment_vehicles (vin) where shipment_id is null;
create index if not exists shipment_vehicles_reservation_idx on shipment_vehicles (reservation_id);

-- 2. CARTE GRISE : VIN lu automatiquement sur le COC / les documents, rapprochement stock + réservation.
alter table carte_grise_dossiers add column if not exists vin text;
alter table carte_grise_dossiers add column if not exists vin_check_ok boolean;
alter table carte_grise_dossiers add column if not exists vin_source text;
alter table carte_grise_dossiers add column if not exists reservation_id bigint references reservations(id) on delete set null;
alter table carte_grise_dossiers add column if not exists vehicle_id bigint references shipment_vehicles(id) on delete set null;
alter table carte_grise_dossiers add column if not exists match_note text;
alter table carte_grise_dossiers add column if not exists analysed_at timestamptz;
alter table carte_grise_dossiers add column if not exists founder_notified_at timestamptz;

-- 3. FACTURES DE VENTE (comptabilité interne, fondateur seulement).
-- Brouillon : sans numéro. « Valider » attribue le numéro suivant FA-AAAA-NNNN (compteur par année, jamais réutilisé,
-- sans trou parmi les factures validées) et fige la facture : une facture validée ne peut plus être modifiée ni supprimée.
create table if not exists sales_invoices (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reservation_id bigint unique references reservations(id) on delete restrict,
  vehicle_id bigint references shipment_vehicles(id) on delete set null,
  vin text,
  status text not null default 'brouillon' check (status in ('brouillon', 'validée')),
  number text unique,
  year int,
  seq int,
  issued_at date,
  delivered_at date,
  client_name text,
  client_address text,
  client_email text,
  client_phone text,
  lines jsonb not null default '[]'::jsonb, -- [{label, ttc}] montants TTC
  suggested_ttc numeric,
  retained_ttc numeric,
  adjust_reason text,
  total_ht numeric,
  tva numeric,
  total_ttc numeric,
  pdf_path text,
  validated_at timestamptz,
  notes text,
  unique (year, seq)
);
alter table sales_invoices enable row level security;
create index if not exists sales_invoices_status_idx on sales_invoices (status, issued_at);

create table if not exists sales_invoice_counters (year int primary key, last int not null default 0);
alter table sales_invoice_counters enable row level security;

-- Une facture validée est figée (seuls le PDF et les notes peuvent encore être complétés) et ne se supprime pas.
create or replace function sales_invoices_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'validée' then raise exception 'Facture validée % : suppression interdite', old.number; end if;
    return old;
  end if;
  if old.status = 'validée' and (
    new.status is distinct from old.status or new.number is distinct from old.number or new.seq is distinct from old.seq or new.year is distinct from old.year
    or new.issued_at is distinct from old.issued_at or new.lines is distinct from old.lines or new.total_ht is distinct from old.total_ht
    or new.tva is distinct from old.tva or new.total_ttc is distinct from old.total_ttc or new.client_name is distinct from old.client_name
    or new.client_address is distinct from old.client_address or new.vin is distinct from old.vin or new.retained_ttc is distinct from old.retained_ttc) then
    raise exception 'Facture validée % : modification interdite', old.number;
  end if;
  if old.status = 'brouillon' and new.number is not null and new.status <> 'validée' then
    raise exception 'Un brouillon ne porte pas de numéro';
  end if;
  return new;
end $$;
drop trigger if exists sales_invoices_guard on sales_invoices;
create trigger sales_invoices_guard before update or delete on sales_invoices for each row execute function sales_invoices_guard();

-- Validation atomique : verrou sur le compteur de l'année, numéro suivant, facture figée. Rejouer sur une facture déjà validée ne change rien.
create or replace function validate_sales_invoice(p_id bigint) returns sales_invoices language plpgsql as $$
declare inv sales_invoices; y int; n int;
begin
  select * into inv from sales_invoices where id = p_id for update;
  if not found then raise exception 'Facture introuvable'; end if;
  if inv.status = 'validée' then return inv; end if;
  if coalesce(inv.total_ttc, 0) <= 0 then raise exception 'Montant de la facture manquant'; end if;
  if coalesce(trim(inv.client_name), '') = '' then raise exception 'Nom du client manquant'; end if;
  y := extract(year from (now() at time zone 'Europe/Paris'))::int;
  insert into sales_invoice_counters (year, last) values (y, 0) on conflict (year) do nothing;
  update sales_invoice_counters set last = last + 1 where year = y returning last into n;
  update sales_invoices set status = 'validée', year = y, seq = n, number = 'FA-' || y || '-' || lpad(n::text, 4, '0'),
    issued_at = (now() at time zone 'Europe/Paris')::date, validated_at = now(), updated_at = now()
  where id = p_id returning * into inv;
  return inv;
end $$;
revoke all on function validate_sales_invoice(bigint) from public, anon, authenticated;
grant execute on function validate_sales_invoice(bigint) to service_role;

-- 4. RATTRAPAGE (idempotent).
-- 4a. Lien stock ↔ réservation par le VIN déjà saisi sur la réservation.
update shipment_vehicles v set reservation_id = r.id, updated_at = now()
from reservations r
where r.vin = v.vin and v.reservation_id is null and r.statut <> 'Annulée';

-- 4b. Brouillons de facture pour les voitures déjà livrées (réservation livrée), sans numéro.
-- Montant suggéré : total de la réservation, sinon barème (véhicule + livraison selon le département + carte grise 150 €), TTC.
with src as (
  select r.*,
    case when r.modele ilike '%plus%' then 5990 when r.modele ilike '%essenti%' then 3990 else 4990 end as grid_vehicle,
    coalesce(r.delivery_price, case
      when r.departement in ('31','81','82','32','09') then 450
      when r.departement in ('11','12','46','47','33','65','66','34','30','40','24','19','87','15') then 590
      when r.departement in ('75','92','93','94','95','77','78','91','13','69','63','16','17','86') then 690
      when r.departement ~ '^[0-9]{2}$' and r.departement not in ('20') then 790
      else 0 end) as liv
  from reservations r
  where (r.livre_at is not null or r.statut = 'Livrée') and r.statut <> 'Annulée'
    and not exists (select 1 from sales_invoices s where s.reservation_id = r.id)
), amounts as (
  select src.*, 150 as cg,
    case when src.total is not null and src.total - src.liv - 150 > 0 then src.total - src.liv - 150 else src.grid_vehicle end as veh
  from src
)
insert into sales_invoices (reservation_id, vehicle_id, vin, status, delivered_at, client_name, client_address, client_email, client_phone, lines, suggested_ttc, retained_ttc, total_ht, tva, total_ttc, notes)
select a.id,
  (select v.id from shipment_vehicles v where v.vin = a.vin order by v.id limit 1),
  a.vin, 'brouillon', coalesce(a.livre_at::date, a.updated_at::date),
  trim(coalesce(a.prenom, '') || ' ' || coalesce(a.nom, '')),
  trim(both ', ' from concat_ws(', ', nullif(a.adresse, ''), nullif(trim(coalesce(a.code_postal, '') || ' ' || coalesce(a.ville, '')), ''))),
  nullif(a.email, ''), nullif(a.telephone, ''),
  jsonb_build_array(
    jsonb_build_object('key', 'vehicule', 'label', 'Véhicule ' || coalesce(nullif(a.modele, ''), 'NeoDrive Confort'), 'ttc', a.veh),
    jsonb_build_object('key', 'livraison', 'label', 'Livraison à domicile', 'ttc', a.liv),
    jsonb_build_object('key', 'carte_grise', 'label', 'Carte grise (démarches d''immatriculation)', 'ttc', a.cg)),
  a.veh + a.liv + a.cg, a.veh + a.liv + a.cg,
  round((a.veh + a.liv + a.cg) / 1.2, 2), (a.veh + a.liv + a.cg) - round((a.veh + a.liv + a.cg) / 1.2, 2), a.veh + a.liv + a.cg,
  'Brouillon créé au rattrapage du 24/11/2026' || case when a.total is null then ' (montant suggéré d''après le barème : pas de total sur la réservation)' else '' end
from amounts a
on conflict (reservation_id) do nothing;
