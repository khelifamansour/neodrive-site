-- Studio : scripts vidéo écrits par l'IA, statut de tournage et performances (vues) pour apprendre ce qui marche.
create table if not exists content_scripts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  context text,
  script jsonb not null,
  status text not null default 'idée',
  views integer,
  likes integer,
  comments integer,
  notes text,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists content_scripts_created on content_scripts (created_at desc);
alter table content_scripts enable row level security;
