-- Performance (/performance, réservé au fondateur) : un relevé par jour (upsert sur la date).
create table if not exists perf_daily (
  date date primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  poids numeric(5,1),            -- kg, facultatif (pesée 1×/semaine)
  sommeil numeric(3,1),          -- heures
  energie smallint check (energie between 1 and 5),
  km numeric(6,0),               -- km roulés
  conduite numeric(3,1),         -- heures de conduite
  sport text check (sport in ('aucun','marche','muscu','autre')),
  sport_min smallint,
  eau numeric(3,1),              -- litres
  proteines boolean,             -- protéines à chaque repas
  grignotage boolean,            -- grignotage de stress
  soir_leger boolean,            -- repas du soir léger
  note text
);
alter table perf_daily enable row level security;
