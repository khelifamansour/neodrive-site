-- Livreurs : coordonnées de facturation, factures d'autofacturation par tournée, contrôle prévu / réel.
alter table team_members add column if not exists billing jsonb; -- { legal_name, siret, address, iban, bic }

create table if not exists driver_invoices (
  id bigserial primary key,
  member_id bigint not null references team_members(id) on delete cascade,
  tour_id text not null,
  tour_name text,
  seq int not null,
  number text not null,
  status text not null default 'brouillon' check (status in ('brouillon','a_payer','payee')),
  days jsonb not null default '[]'::jsonb,
  deliveries jsonb not null default '[]'::jsonb,
  expenses jsonb not null default '[]'::jsonb,
  rate numeric not null default 25,
  worked_min int not null default 0,
  amount_hours numeric not null default 0,
  amount_expenses numeric not null default 0,
  total numeric not null default 0,
  control jsonb,
  billing jsonb,
  pdf_path text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, seq),
  unique (member_id, tour_id)
);
create index if not exists driver_invoices_status_idx on driver_invoices (status);
alter table driver_invoices enable row level security;
