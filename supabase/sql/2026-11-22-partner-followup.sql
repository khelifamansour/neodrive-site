-- Suivi automatique des candidatures partenaires (e-mail de bienvenue, relances J+4 et J+10, désinscription).
-- followup = { welcome_at, relance1_at, relance2_at, unsubscribed_at, legacy, manual_at }
alter table partner_applications add column if not exists followup jsonb;
-- Candidatures déjà reçues avant la mise en place : aucun envoi automatique (le fondateur décide).
update partner_applications set followup = '{"legacy": true}'::jsonb where followup is null and created_at < '2026-11-23';
