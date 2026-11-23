-- NeoDrive Algérie (/algerie, réservé au fondateur) : tableau de stratégie éditable (statuts des phases, suivi des vidéos, contacts).
create table if not exists algerie_board (
  key text primary key,          -- 'phases' | 'videos' | 'contacts'
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table algerie_board enable row level security;
