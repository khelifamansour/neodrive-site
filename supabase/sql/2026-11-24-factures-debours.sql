-- Décisions du fondateur (24/11/2026). Rejouable sans effet de bord.

-- A. Les 45 voitures en cours de dédouanement (dossiers conteneurs 1 à 4) sont toutes des NeoDrive Confort.
update shipment_vehicles set model = 'NeoDrive Confort', updated_at = now()
where shipment_id in (1, 2, 3, 4) and (model is null or model = '');

-- B. Carte grise 150 € sur les factures : 100 € de débours (sans TVA) + 50 € de frais de mise en route / gestion (TVA 20 %).
-- Brouillons seulement (une facture validée est figée) : la ligne « carte_grise » est remplacée par les deux lignes, totaux recalculés.
with d as (
  select id, lines,
    (select coalesce(jsonb_agg(l order by ord), '[]'::jsonb) from jsonb_array_elements(lines) with ordinality as e(l, ord) where l->>'key' <> 'carte_grise') as others
  from sales_invoices
  where status = 'brouillon' and exists (select 1 from jsonb_array_elements(lines) l where l->>'key' = 'carte_grise')
), n as (
  select id, others || jsonb_build_array(
    jsonb_build_object('key', 'carte_grise_debours', 'label', 'Carte grise : frais d''immatriculation refacturés à l''euro près (débours – non soumis à TVA)', 'ttc', 100, 'debours', true),
    jsonb_build_object('key', 'frais_gestion', 'label', 'Frais de mise en route et de gestion du dossier carte grise', 'ttc', 50)) as lines
  from d
), t as (
  select id, lines,
    (select sum((l->>'ttc')::numeric) from jsonb_array_elements(lines) l) as ttc,
    (select coalesce(sum((l->>'ttc')::numeric), 0) from jsonb_array_elements(lines) l where (l->>'debours')::boolean is true) as deb
  from n
)
update sales_invoices s set lines = t.lines, total_ttc = t.ttc, retained_ttc = t.ttc,
  total_ht = round((t.ttc - t.deb) / 1.2, 2) + t.deb, tva = t.ttc - (round((t.ttc - t.deb) / 1.2, 2) + t.deb), updated_at = now()
from t where s.id = t.id and s.status = 'brouillon';
