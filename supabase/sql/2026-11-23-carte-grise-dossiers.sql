-- Dossiers carte grise (/reservation-carte-grise) : copie côté serveur de chaque dossier envoyé (en plus de l'e-mail Formspree).
-- Les pièces sont dans le stockage privé erp-documents, dossier carte-grise/<ref>-<uuid>/.
-- Envoi au prestataire carte grise (NK Services) uniquement sur autorisation du fondateur : jeton admin_once_tokens purpose « carte-grise-send ».
-- status : 'envoi en cours' (pièces en cours de dépôt) | 'reçu' | 'envoyé' | 'traité' | 'annulé'.
create table if not exists carte_grise_dossiers (
  id bigserial primary key,
  ref text not null unique,
  folder text not null,
  created_at timestamptz not null default now(),
  type_demande text,
  nom text,
  prenom text,
  telephone text,
  email text,
  adresse text,
  code_postal text,
  ville text,
  version text,
  service_carte_grise text,
  fields jsonb not null default '{}'::jsonb,
  files jsonb not null default '[]'::jsonb,
  status text not null default 'reçu',
  sent_to_provider_at timestamptz,
  sent_to text,
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists carte_grise_dossiers_created_idx on carte_grise_dossiers (created_at desc);
alter table carte_grise_dossiers enable row level security;
