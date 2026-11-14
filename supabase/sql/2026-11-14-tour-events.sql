-- Journal des tournées NeoDrive (appliqué le 2026-11-14 via l'API de gestion Supabase).
-- Additif uniquement. RLS activé sans politique : seul le serveur (clé service) lit et écrit.
create table if not exists public.tour_events (
  id bigserial primary key,
  tour_id text not null,
  created_at timestamptz not null default now(),
  kind text not null,            -- depart, pause, reprise, arrive, livre, probleme, position, prevenir
  client_id text,
  stop_index integer,            -- index de l'arrêt dans PlanTour.stops
  lat double precision,
  lng double precision,
  accuracy real,
  note text,
  photo_path text,
  author text
);
create index if not exists tour_events_tour_created_idx on public.tour_events (tour_id, created_at);
alter table public.tour_events enable row level security;
comment on table public.tour_events is 'Journal des tournees NeoDrive (depart, pauses, arrivees, livraisons, positions GPS pendant une tournee en cours). Positions conservees 90 jours max.';
