-- Clients et avis : envoi direct (SMS + e-mail via Brevo) et suivi automatique ~10 jours après livraison (fenêtre J+9 à J+15).
-- followup_auto : 'envoyé' | 'manuel' (déjà contacté à la main) | 'ancien' (livré avant la mise en place : suivi manuel depuis /clients) | 'ignoré' | 'impossible'.
alter table customers_followup add column if not exists reservation_id bigint;
alter table customers_followup add column if not exists followup_auto text;
alter table customers_followup add column if not exists followup_auto_at timestamptz;
alter table customers_followup add column if not exists last_sent_at timestamptz;
create index if not exists customers_followup_reservation_idx on customers_followup (reservation_id);
-- Clients déjà présents avant la mise en place (23/11/2026) : aucun envoi automatique, le fondateur les relance depuis /clients.
update customers_followup set followup_auto = 'ancien', followup_auto_at = now()
  where followup_auto is null and (delivered_at is null or delivered_at < date '2026-11-08') and created_at < '2026-11-24';
