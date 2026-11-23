-- Litiges (/litiges, réservé au fondateur) : un dossier par litige et ses pièces (stockage privé erp-documents, dossier litiges/<ref>/).
-- extracted_text : transcription automatique de chaque pièce (OpenAI pour PDF/images, lecture directe pour txt/eml/docx).
-- Export pour l'assistant : GET /api/litiges/export?token=… (admin_once_tokens purpose « litige-export », payload {ref} ou {id}, réutilisable jusqu'à expiration).
create table if not exists litiges (
  id bigserial primary key,
  ref text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  titre text not null,
  adverse_partie text,
  adverse_adresse text,
  montant_reclame numeric,
  statut text not null default 'en cours', -- en cours | mise en demeure | amiable | procédure | clos gagné | clos perdu | clos accord
  avocat text,
  resume text,
  prochaine_action text,
  prochaine_echeance date,
  notes text
);
alter table litiges enable row level security;

create table if not exists litige_pieces (
  id bigserial primary key,
  litige_id bigint not null references litiges(id) on delete cascade,
  created_at timestamptz not null default now(),
  label text not null,
  categorie text not null default 'autre', -- courrier avocat | facture | bon de livraison | e-mail | photo | plainte-médical | autre
  date_piece date,
  path text not null unique,
  name text not null,
  size bigint,
  mime text,
  extracted_text text,
  extracted_at timestamptz
);
create index if not exists litige_pieces_litige_idx on litige_pieces (litige_id, date_piece, created_at);
alter table litige_pieces enable row level security;

-- Premier litige
insert into litiges (ref, titre, adverse_partie, montant_reclame, statut, avocat, resume, prochaine_action)
values (
  'LIT-2026-001',
  'Garage Morrève / Automobiles Conseils – Angers',
  'EURL GARAGE STEPHANE MORREVE (enseigne EURO REPAR), 6 rue de Champfleur, 49124 Saint-Barthélemy-d''Anjou ; SARL AUTOMOBILES CONSEILS (M. Éric Marie), Le Tremblay, La Basse Roche, 49420 Ombrée d''Anjou',
  7400,
  'mise en demeure',
  'Me Perrine Marc, 24 rue du Languedoc, 31000 Toulouse – cabinet@pmarc-avocat.fr – 06 58 71 69 35 (réf. 26/01822)',
  'Véhicule AIMA SWITCH A05 beige VIN H81CANZB6RA200077 livré le 13/03/2025 et revendu à M. Gomez 7 400 € TTC, encaissé par le garage mais non reversé (motif invoqué : travaux sur la voiture de M. Le Bigot). 4 autres véhicules livrés et ni vendus ni payés ni restitués : AIMA START A01 GR-871-QA, AIMA START A01 VIN H81CYK0XNA20555 (livrés au garage Gilb Auto), AIMA SWITCH A05 VIN H81CANZB2SA150140 et MICRODRIVE BOATENG CLASSIK rouge/blanc (livrés le 19/05/2025). Mise en demeure LRAR du 28/12/2025 sans réponse. Agression lors de la tentative de récupération des véhicules : plainte + CHU d''Angers (urgences). Lettres de l''avocate du 15/06/2026 (Morrève et Automobiles Conseils) puis du 22/06/2026 (Morrève).',
  'Rassembler les preuves (mails du 13/03/2025, lettres de voiture, LRAR 28/12/2025 + AR, plainte, certificat médical) et décider avec l''avocate : injonction de payer / référé / fond'
)
on conflict (ref) do nothing;
