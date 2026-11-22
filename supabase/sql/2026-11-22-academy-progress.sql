-- NeoDrive Academy (/academy) : progression de chaque membre de l'équipe, par module.
-- best_score et last_score en pourcentage (0 à 100) ; passed_at = date de la première validation (80 % ou plus).
create table if not exists academy_progress (
  member_id bigint not null references team_members(id) on delete cascade,
  module_key text not null,
  best_score integer not null default 0,
  last_score integer,
  attempts integer not null default 0,
  read_at timestamptz,
  passed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (member_id, module_key)
);
alter table academy_progress add column if not exists read_at timestamptz;
alter table academy_progress add column if not exists last_score integer;
alter table academy_progress enable row level security;
