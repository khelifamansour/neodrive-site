-- Confirmation automatique des réservations (SMS, e-mail, WhatsApp) : statut par canal.
alter table reservations add column if not exists confirm jsonb;
create index if not exists reservations_confirm_wa on reservations ((confirm->>'whatsapp'));
