-- Pack avant livraison : lien client /livraison/<pack_token>, suivi des envois et réponses du client.
alter table public.reservations add column if not exists pack_token text;
alter table public.reservations add column if not exists pack_sent_at timestamptz;
alter table public.reservations add column if not exists pack_reminded_at timestamptz;
alter table public.reservations add column if not exists pack_confirmed_at timestamptz;
alter table public.reservations add column if not exists creneau text;
create unique index if not exists reservations_pack_token_key on public.reservations (pack_token) where pack_token is not null;
create index if not exists reservations_date_promise_idx on public.reservations (date_promise) where date_promise is not null;
