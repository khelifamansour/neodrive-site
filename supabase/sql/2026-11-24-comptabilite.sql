-- Comptabilité mensuelle (/stock-facturation, onglet « Comptabilité », fondateur seulement).
-- Relevé Revolut Business importé chaque mois (CSV), rapprochement avec les ventes / factures et les fournisseurs,
-- exports pour Pennylane (factures + justificatifs bancaires). Aucun appel à l'API Pennylane pour l'instant.

create table if not exists bank_transactions (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hash text not null unique,          -- ID Revolut si présent, sinon empreinte date|montant|libellé|référence|solde : pas de doublon à la réimportation
  import_id bigint,
  import_month text not null,         -- AAAA-MM (mois de l'opération)
  date date not null,
  label text,
  amount numeric not null,            -- > 0 encaissement, < 0 décaissement
  currency text,
  counterparty text,
  reference text,
  balance numeric,
  raw jsonb,
  category text,                      -- vente voiture | pièces | achat véhicules | transport | douane | salaires/prestataires | logiciel | publicité | carburant/péage | frais bancaires | virement interne | autre
  supplier text,
  match_kind text,                    -- auto | manuel | null (non rapproché)
  invoice_id bigint references sales_invoices(id) on delete set null,
  reservation_id bigint references reservations(id) on delete set null,
  parts_order text,
  vat_deductible numeric,             -- TVA déductible d'un achat, si connue (saisie)
  ignored boolean not null default false, -- virement interne, opération à ne pas rapprocher
  note text
);
create index if not exists bank_transactions_month_idx on bank_transactions (import_month, date);
create index if not exists bank_transactions_invoice_idx on bank_transactions (invoice_id);
alter table bank_transactions enable row level security;

create table if not exists bank_imports (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  file_name text,
  months text[],
  rows int,
  inserted int,
  skipped int
);
alter table bank_imports enable row level security;

create table if not exists accounting_months (
  month text primary key,             -- AAAA-MM
  pennylane_exported_at timestamptz,
  pennylane_pushed_at timestamptz,    -- réservé à un futur envoi par l'API Pennylane
  closed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);
alter table accounting_months enable row level security;
