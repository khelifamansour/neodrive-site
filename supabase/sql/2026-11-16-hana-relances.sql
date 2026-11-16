-- Relances des conversations Hana sans réponse (accès serveur uniquement)
create table if not exists public.hana_relances (
  id bigint generated always as identity primary key,
  phone text not null,
  step int not null,
  kind text,
  template text,
  message_id text,
  sent_at timestamptz not null default now()
);
create index if not exists hana_relances_phone on public.hana_relances(phone);
alter table public.hana_relances enable row level security;
