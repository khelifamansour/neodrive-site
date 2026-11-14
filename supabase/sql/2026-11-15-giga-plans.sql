-- Plans annuels de la Giga Analyse (accès serveur uniquement)
create table if not exists public.giga_plans (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  plan jsonb not null default '{}'::jsonb
);
alter table public.giga_plans enable row level security;
