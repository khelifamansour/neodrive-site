-- « Mission transporteur » (Transports Rabouin) : photo de remise et appel de prise en main après la livraison.
-- delivery_client_photo_path : photo du client à côté de la voiture (bucket shipment-docs, comme la photo de livraison).
-- prise_en_main_due_at : livrée par le transporteur, la coordinatrice doit appeler le client pour la prise en main.
-- prise_en_main_done_at : appel de prise en main fait.
alter table public.reservations add column if not exists delivery_client_photo_path text;
alter table public.reservations add column if not exists prise_en_main_due_at timestamptz;
alter table public.reservations add column if not exists prise_en_main_done_at timestamptz;
create index if not exists reservations_prise_en_main_todo_idx on public.reservations (prise_en_main_due_at)
  where prise_en_main_due_at is not null and prise_en_main_done_at is null;
