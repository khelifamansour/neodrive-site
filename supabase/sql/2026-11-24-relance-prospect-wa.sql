-- Relance WhatsApp des prospects qui ont échangé avec Hana sans réserver (lib/prospect-relance.ts, /api/crm/relance-prospect).
-- relance_wa_step : nombre de relances déjà envoyées (0, 1 ou 2 ; 2 = plus jamais). relance_wa_last_at : date de la dernière.
-- Le détail de chaque relance est aussi écrit dans leads.history (type « relance_prospect ») et dans crm_messages.
alter table leads add column if not exists relance_wa_step integer not null default 0;
alter table leads add column if not exists relance_wa_last_at timestamptz;
create index if not exists leads_relance_wa_last_at_idx on leads (relance_wa_last_at);
