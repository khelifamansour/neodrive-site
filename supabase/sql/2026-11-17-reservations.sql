-- Réservations clients (formulaires /reservation et /reservation-devis + saisie manuelle)
create table if not exists public.reservations (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null default 'site',
  nom text not null default '',
  prenom text not null default '',
  telephone text not null default '',
  email text not null default '',
  adresse text not null default '',
  code_postal text not null default '',
  ville text not null default '',
  departement text not null default '',
  modele text not null default '',
  couleur text not null default '',
  quantite int not null default 1,
  options text not null default '',
  delivery_price numeric,
  total numeric,
  message text not null default '',
  raw jsonb not null default '{}'::jsonb,
  statut text not null default 'Nouvelle' check (statut in ('Nouvelle','Confirmée','Planifiée','Livrée','Annulée')),
  date_promise date,
  acompte numeric,
  priorite text not null default 'Normale',
  notes text not null default '',
  lead_id bigint,
  plan_client_id text
);
create index if not exists reservations_created_idx on public.reservations (created_at desc);
create index if not exists reservations_phone_idx on public.reservations (telephone);
create unique index if not exists reservations_plan_client_uidx on public.reservations (plan_client_id) where plan_client_id is not null;
alter table public.reservations enable row level security;
