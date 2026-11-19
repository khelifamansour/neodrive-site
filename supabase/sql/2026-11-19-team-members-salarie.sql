-- Espace salarié (CDD) : type de contrat du membre, conditions d'emploi et informations pour la DPAE / la paie.
alter table team_members add column if not exists contract_type text not null default 'prestataire';
alter table team_members add column if not exists employment jsonb;
alter table team_members add column if not exists personal jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'team_members_contract_type_chk') then
    alter table team_members add constraint team_members_contract_type_chk check (contract_type in ('prestataire', 'salarie'));
  end if;
end $$;
