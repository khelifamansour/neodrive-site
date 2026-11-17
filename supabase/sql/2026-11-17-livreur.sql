-- Espace livreur prestataire : documents (SIRET, RC pro, permis, identité, RIB, contrat signé)
create table if not exists driver_documents (
  id bigserial primary key,
  member_id bigint not null references team_members(id) on delete cascade,
  kind text not null,
  path text,
  filename text,
  status text not null default 'recu', -- recu | valide | refuse
  data jsonb not null default '{}'::jsonb,
  note text,
  uploaded_at timestamptz not null default now(),
  validated_at timestamptz
);
create index if not exists driver_documents_member_idx on driver_documents(member_id, kind, uploaded_at desc);
alter table driver_documents enable row level security;

-- Bucket privé (accès uniquement par URL signée côté serveur)
insert into storage.buckets (id, name, public, file_size_limit)
values ('driver-docs', 'driver-docs', false, 15728640)
on conflict (id) do update set public = false;
