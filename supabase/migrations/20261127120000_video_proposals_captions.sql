-- Fabrique : légendes prêtes à publier sur Facebook et Instagram pour chaque proposition (en plus de la légende TikTok).
alter table if exists public.video_proposals add column if not exists captions jsonb;
