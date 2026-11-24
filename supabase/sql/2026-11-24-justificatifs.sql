-- Justificatifs d'achat (tickets, factures fournisseurs, attestations de justificatif manquant), onglet « Comptabilité ».
-- Fichiers privés : erp-documents/justificatifs/AAAA-MM/… ; lus automatiquement (date, marchand, TTC, TVA, catégorie).
create table if not exists receipts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  month text not null,                 -- AAAA-MM (date du justificatif, sinon mois choisi à l'envoi)
  kind text not null default 'justificatif' check (kind in ('justificatif', 'attestation')),
  path text not null unique,
  file_name text,
  mime text,
  size bigint,
  status text not null default 'à lire', -- à lire | lu | erreur
  date date,
  merchant text,
  total_ttc numeric,
  tva_amount numeric,
  tva_rate numeric,
  payment_hint text,
  category text,                       -- carburant | péage | hôtel/repas | pièces | transport | douane | logiciel | fournitures | autre
  is_invoice boolean,                  -- vraie facture (nom de l'acheteur / SIREN) ; un simple ticket ne suffit pas toujours pour déduire la TVA
  buyer text,
  vat_deductible boolean not null default false,
  transaction_id bigint references bank_transactions(id) on delete set null,
  match_kind text,                     -- auto | manuel
  extracted jsonb,
  note text
);
create index if not exists receipts_month_idx on receipts (month, date);
create unique index if not exists receipts_transaction_key on receipts (transaction_id) where transaction_id is not null;
alter table receipts enable row level security;
