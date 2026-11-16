-- Prospection WhatsApp des lieux de stockage par Hana (accès serveur uniquement)
create table if not exists public.logistics_wa (
  phone text primary key,
  partner_id bigint,
  name text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  message_id text,
  replied_at timestamptz,
  error text
);
alter table public.logistics_wa enable row level security;
