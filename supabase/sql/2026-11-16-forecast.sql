-- Prévisionnel de trésorerie et de croissance (page /giga/previsionnel)
create table if not exists forecast_plans (
  id serial primary key,
  year int unique not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table forecast_plans enable row level security;
