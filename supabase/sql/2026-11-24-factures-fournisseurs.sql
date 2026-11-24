-- Factures fournisseurs reçues par e-mail (Brevo Inbound Parsing → /api/compta/inbound) et tickets photographiés au téléphone.
-- Même table que les justificatifs (receipts) : même stockage privé (erp-documents/justificatifs/AAAA-MM/…), même lecture
-- automatique, même rapprochement avec les débits Revolut, même export Pennylane. Rejouable sans effet de bord.

alter table receipts add column if not exists source text not null default 'envoi'; -- envoi | telephone | email
alter table receipts add column if not exists invoice_number text;
alter table receipts add column if not exists total_ht numeric;
alter table receipts add column if not exists vat_lines jsonb;          -- [{ "rate": 20, "base": 100, "tva": 20 }]
alter table receipts add column if not exists currency text;            -- EUR, USD, CNY…
alter table receipts add column if not exists vat_regime text;          -- normale | autoliquidation | import | sans TVA
alter table receipts add column if not exists iban text;
alter table receipts add column if not exists file_hash text;           -- sha256 du fichier : même pièce jointe reçue deux fois = ignorée
alter table receipts add column if not exists email_id bigint;
alter table receipts add column if not exists email_from text;
alter table receipts add column if not exists email_subject text;
alter table receipts add column if not exists review text;              -- raisons « à vérifier » (montants incohérents, devise, doublon…)
alter table receipts add column if not exists checked_at timestamptz;   -- vérifiée à la main par le fondateur
create index if not exists receipts_supplier_number_idx on receipts (invoice_number) where invoice_number is not null;
create index if not exists receipts_file_hash_idx on receipts (file_hash) where file_hash is not null;

create table if not exists inbound_emails (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  message_id text unique,              -- Brevo peut renvoyer le même e-mail : traité une seule fois
  from_email text,
  from_name text,
  to_email text,
  subject text,
  attachments int not null default 0,
  receipts int not null default 0,     -- justificatifs créés
  duplicates int not null default 0,
  ignored int not null default 0,      -- logos, conditions générales, fichiers non lisibles
  status text not null default 'reçu', -- reçu | traité | erreur
  error text
);
create index if not exists inbound_emails_created_idx on inbound_emails (created_at desc);
alter table inbound_emails enable row level security;
