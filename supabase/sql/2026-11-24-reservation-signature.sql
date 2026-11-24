-- Signature au doigt du bon de commande (page /reservation-devis).
-- Le PDF signé est rangé dans le stockage privé « erp-documents » (chemin dans signature_path).
alter table public.reservations add column if not exists signature_at timestamptz;
alter table public.reservations add column if not exists signature_path text;
