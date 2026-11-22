-- Test en ligne de la candidature (/candidature) : tirage des questions par candidat, conservé côté serveur.
-- Un candidat qui recommence (même navigateur ou même numéro de téléphone) retrouve son premier tirage.
-- Sans cette table, le site garde l'état dans un jeton chiffré (fonctionne, mais sans détection multi-appareil).
create table if not exists recruit_test_sessions (
  id bigserial primary key,
  token text not null unique,
  phone_tail text,
  poste text,
  full_name text,
  state jsonb not null,
  application_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recruit_test_sessions_phone_idx on recruit_test_sessions(phone_tail, created_at);
alter table recruit_test_sessions enable row level security;
