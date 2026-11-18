-- Heures du livreur hors tournée (préparation, contrôle à l'arrivée, réparation, transport…), facturées à part.
create table if not exists driver_hours (
  id bigserial primary key,
  member_id bigint not null,
  date date not null,
  kind text not null,
  start_time text not null,
  end_time text not null,
  pause_min integer not null default 0,
  worked_min integer not null default 0,
  note text,
  tour_id text,
  invoice_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists driver_hours_member_idx on driver_hours (member_id, invoice_id);
alter table driver_hours enable row level security;
