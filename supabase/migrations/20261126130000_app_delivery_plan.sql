-- Planning des livraisons affiché en haut de l'application (fondateur) : une ligne par client, fenêtre large, qui livre, statut d'appel.
create table if not exists public.app_delivery_plan (
  id bigserial primary key,
  reservation_id bigint,
  block text not null,
  sort int not null default 0,
  client text not null,
  ville text,
  phone text,
  delivery_window text not null,
  who text,
  status text not null default 'à appeler',
  note text,
  updated_at timestamptz not null default now()
);
alter table public.app_delivery_plan enable row level security;
