-- Espace équipe : dossier du membre (identité, adresse, banque, pièces) et factures mensuelles des prestataires (closers).
-- Fichiers dans le bucket privé « team-docs » (URL signées uniquement).

-- Conditions de rémunération (prestataire au mois) : null = pas de factures mensuelles dans l'espace équipe.
-- { start_date, guarantee_eur, guarantee_until, fixed_eur, prime_vente_eur, prime_confirmation_eur }
alter table team_members add column if not exists pay_terms jsonb;

create table if not exists team_member_profile (
  member_id bigint primary key references team_members(id) on delete cascade,
  full_name text,
  address text,
  ae_number text,
  email text,
  bank_holder text,
  bank_name text,
  iban text,
  rib text,
  bic text,
  docs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table team_member_profile add column if not exists rib text;
alter table team_member_profile enable row level security;

-- Une ligne par membre et par mois civil (« YYYY-MM »). statut : brouillon | envoyee | payee.
-- statement = relevé figé au moment de l'envoi ; adjustments = lignes ajoutées par le fondateur [{label, amount, at}].
create table if not exists team_invoices (
  id bigserial primary key,
  member_id bigint not null references team_members(id) on delete cascade,
  month text not null,
  status text not null default 'brouillon',
  number text,
  statement jsonb,
  total numeric,
  adjustments jsonb not null default '[]'::jsonb,
  pdf_path text,
  signature_path text,
  sent_at timestamptz,
  paid_at date,
  resend boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, month)
);
create unique index if not exists team_invoices_member_number on team_invoices (member_id, number) where number is not null;
alter table team_invoices enable row level security;

insert into storage.buckets (id, name, public) values ('team-docs', 'team-docs', false) on conflict (id) do nothing;

-- Neila Saidi (closer, prestataire) : contrat du 23/11/2026.
update team_members set pay_terms = '{"start_date":"2026-11-23","guarantee_eur":200,"guarantee_until":"2027-01-22","fixed_eur":140,"prime_vente_eur":20,"prime_confirmation_eur":5}'::jsonb
where id = 4 and pay_terms is null;
