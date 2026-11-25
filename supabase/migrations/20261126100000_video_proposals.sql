-- Fabrique TikTok (/studio/fabrique) : propositions quotidiennes de vidéos fabriquées à partir de la bibliothèque.
-- Idempotent. Sans cette table, la route /api/studio/fabrique se replie sur des fiches JSON dans le bucket (fabrique/<jour>/*.json).
create table if not exists public.video_proposals (
  id text primary key,
  day date not null,
  angle text not null default '',
  title text not null default '',
  hook text not null default '',
  script text not null default '',
  voice text not null default 'tts' check (voice in ('tts', 'original')),
  segments jsonb not null default '[]',
  caption text not null default '',
  hashtags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'rendering', 'rendered', 'error')),
  render_path text,
  duration real,
  error text,
  feedback text,
  published boolean not null default false,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_proposals_day_idx on public.video_proposals (day desc, created_at);
alter table public.video_proposals enable row level security;
-- Aucune politique : accès uniquement par la clé service (routes serveur).
