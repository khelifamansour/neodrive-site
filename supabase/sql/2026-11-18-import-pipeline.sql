-- Chaîne import automatisée : étapes colorées, documents par conteneur, plusieurs prestataires par port, relances suivies.

-- 1. Étape du conteneur (une couleur par étape) + historique des passages
alter table shipments add column if not exists pipeline text default 'commandé';
alter table shipments add column if not exists pipeline_history jsonb default '[]'::jsonb;

-- 2. Document rattaché à un conteneur précis (facture / colisage générés, COC par conteneur)
alter table shipment_docs add column if not exists container text;

-- 3. Plusieurs prestataires par port, avec un rôle
alter table forwarders drop constraint if exists forwarders_port_key;
alter table forwarders add column if not exists role text default 'dédouanement';
alter table forwarders add column if not exists notes text;
alter table forwarders add column if not exists active boolean default true;

-- 4. Relances suivies (usine, transitaire, compagnie maritime, transport / stockage)
create table if not exists shipment_followups (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  shipment_id bigint references shipments(id) on delete cascade,
  kind text not null default 'transitaire',
  label text,
  recipient text not null,
  cc text,
  subject text,
  sent_at timestamptz default now(),
  answered_at timestamptz,
  relance_count int default 0,
  last_relance_at timestamptz,
  auto boolean default true,
  log jsonb default '[]'::jsonb
);
create index if not exists shipment_followups_ship on shipment_followups(shipment_id);
alter table shipment_followups enable row level security;
