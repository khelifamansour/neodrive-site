-- Partenaires logistiques : partenaire confirmé + rôle dépotage
alter table forwarders add column if not exists confirmed boolean not null default false;
