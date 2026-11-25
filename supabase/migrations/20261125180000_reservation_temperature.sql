-- « Température » des réservations (chaud / tiède / froid) pour décider quelles livraisons confier à Transports Rabouin.
-- temperature_signals : { checked: [...], suggested, override, by } ; temperature_at : date du dernier réglage ;
-- last_client_reply_at : dernière réponse du client (WhatsApp entrant, appel, ou bouton « le client a répondu »).
alter table public.reservations add column if not exists temperature text;
alter table public.reservations add column if not exists temperature_signals jsonb not null default '{}'::jsonb;
alter table public.reservations add column if not exists temperature_at timestamptz;
alter table public.reservations add column if not exists last_client_reply_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_temperature_check') then
    alter table public.reservations add constraint reservations_temperature_check check (temperature is null or temperature in ('chaud', 'tiede', 'froid'));
  end if;
end $$;
create index if not exists reservations_temperature_idx on public.reservations (temperature) where temperature is not null;
