-- Paiements clients automatiques (lib/payment-match.ts, /api/paiements, /tableau-de-bord).
-- Chaque encaissement Revolut est comparé aux réservations (montant, nom du payeur, référence) :
-- une seule correspondance forte → relié + paiement confirmé + e-mail au fondateur ; sinon « à vérifier ».
-- Le lien est bank_transactions.reservation_id (déjà existant) ; reservations.bank_transaction_id garde le dernier paiement relié.

alter table bank_transactions add column if not exists pay_match_status text;    -- null (pas encore traité) | lié | à vérifier | rejeté
alter table bank_transactions add column if not exists pay_candidates jsonb;     -- [{ reservation_id, score, why, kind, client, total }]
alter table bank_transactions add column if not exists pay_linked_at timestamptz;
alter table bank_transactions add column if not exists pay_checked_at timestamptz; -- confirmé ou rejeté à la main
create index if not exists bank_transactions_pay_status_idx on bank_transactions (pay_match_status, date);
create index if not exists bank_transactions_reservation_idx on bank_transactions (reservation_id) where reservation_id is not null;

alter table reservations add column if not exists bank_transaction_id bigint references bank_transactions(id) on delete set null;
