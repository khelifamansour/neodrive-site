-- Dossiers carte grise : contrôle automatique des pièces, lien client pour les pièces manquantes, renvoi automatique à NK Services.
-- doc_check : { at, overall: 'complet'|'incomplet'|'à vérifier', pieces: { <clé>: { status: 'ok'|'manquant'|'à refaire'|'à vérifier', reason, detail, files, checked_at } } }
-- missing_token : jeton du lien /carte-grise/pieces/<jeton> ; missing_request : { keys, note, at, by, received, done_at, sms, email }
-- auto_resend : renvoi automatique du dossier complet à NK Services (dossiers déjà envoyés uniquement).
alter table carte_grise_dossiers add column if not exists doc_check jsonb;
alter table carte_grise_dossiers add column if not exists missing_token text;
alter table carte_grise_dossiers add column if not exists missing_request jsonb;
alter table carte_grise_dossiers add column if not exists auto_resend boolean not null default false;
create unique index if not exists carte_grise_dossiers_missing_token_idx on carte_grise_dossiers (missing_token) where missing_token is not null;
