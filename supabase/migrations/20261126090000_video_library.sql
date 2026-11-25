-- Bibliothèque vidéo (/studio/bibliotheque) : rushes envoyés en masse depuis le téléphone, analysés ensuite par l'IA.
-- Idempotent. Sans cette table, la route /api/studio/library se replie sur des fiches JSON dans le bucket (library/_meta/*.json).
create table if not exists public.video_library (
  id text primary key,
  path text not null unique,
  name text not null default '',
  size bigint not null default 0,
  mime text,
  duration real,
  width integer,
  height integer,
  poster_path text,
  status text not null default 'uploaded' check (status in ('uploaded', 'analysing', 'analysed', 'error')),
  analysis jsonb,
  transcript jsonb,
  has_client boolean not null default false,
  consent boolean not null default false,
  tags text[] not null default '{}',
  error text,
  uploaded_by text,
  analysed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_library_created_idx on public.video_library (created_at desc);
create index if not exists video_library_status_idx on public.video_library (status);
alter table public.video_library enable row level security;
-- Aucune politique : accès uniquement par la clé service (routes serveur).

-- Rushes jusqu'à ~1 Go : relève la limite du bucket privé (la limite globale du projet doit aussi être >= 1,1 Go).
insert into storage.buckets (id, name, public, file_size_limit)
values ('studio-video', 'studio-video', false, 1181116006)
on conflict (id) do update set public = false, file_size_limit = greatest(coalesce(storage.buckets.file_size_limit, 0), excluded.file_size_limit);
