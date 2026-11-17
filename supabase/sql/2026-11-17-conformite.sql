-- Espace Conformité : demandes des banques et organismes, documents justificatifs.
create table if not exists compliance_requests (
  id bigserial primary key,
  organisme text not null default 'Autre',
  objet text not null default '',
  demande text not null default '',
  date_demande date default current_date,
  date_limite date,
  statut text not null default 'a_faire',
  reponse text not null default '',
  notes text not null default '',
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists compliance_docs (
  id bigserial primary key,
  categorie text not null default 'autre',
  titre text not null default '',
  description text not null default '',
  path text not null,
  mime text,
  size bigint,
  date_doc date default current_date,
  request_id bigint references compliance_requests(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table compliance_requests enable row level security;
alter table compliance_docs enable row level security;
