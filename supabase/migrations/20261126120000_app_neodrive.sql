-- L'application NeoDrive (/app) : comptes par rôle, codes de connexion à usage unique, sessions, abonnements aux notifications.
-- Rôles : fondateur, transporteur (société, ex. « Transports Rabouin »), chauffeur (rattaché à une société), equipe.
-- Accès uniquement par le serveur (clé service) : RLS activée sans politique = aucun accès public.

create table if not exists public.app_users (
  id bigserial primary key,
  role text not null check (role in ('fondateur', 'transporteur', 'chauffeur', 'equipe')),
  name text not null,
  phone text,
  email text,
  company text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists app_users_phone_uniq on public.app_users (phone) where phone is not null and phone <> '';
create unique index if not exists app_users_email_uniq on public.app_users (lower(email)) where email is not null and email <> '';
create index if not exists app_users_company_idx on public.app_users (lower(company));

create table if not exists public.app_login_codes (
  id bigserial primary key,
  user_id bigint not null references public.app_users(id) on delete cascade,
  code_hash text not null,
  channel text not null default 'sms',
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists app_login_codes_user_idx on public.app_login_codes (user_id, created_at desc);

create table if not exists public.app_sessions (
  id bigserial primary key,
  user_id bigint not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  ip text,
  ua text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists app_sessions_user_idx on public.app_sessions (user_id) where ended_at is null;

-- Notifications (Web Push) : inactif tant que les clés VAPID ne sont pas configurées.
create table if not exists public.app_push_subscriptions (
  id bigserial primary key,
  user_id bigint references public.app_users(id) on delete cascade,
  role text,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
alter table public.app_login_codes enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_push_subscriptions enable row level security;
