# Agent commercial NeoDrive — cahier technique (version initiale)

## Objectif
Centraliser les prospects Leboncoin et WhatsApp dans le CRM Supabase existant, fournir des réponses commerciales fiables, partager les documents approuvés, qualifier les demandes et proposer un rendez-vous avec un humain.

## Architecture
- Next.js existant : interface de supervision, import CSV, prévisualisation des réponses et prise de rendez-vous.
- Supabase existant : `leads`, `crm_messages`, `knowledge_base`.
- OpenAI côté serveur uniquement : génération de réponses à partir de la base de connaissances vérifiée.
- Adaptateurs de canal : WhatsApp Cloud API ou prestataire autorisé ; Leboncoin uniquement par export ou intégration autorisée.
- Stockage des ressources commerciales : URLs validées du catalogue, vidéos et simulateur.
- Agenda : disponibilité réelle via calendrier connecté, sans créneaux inventés.

## Étapes
1. Vérifier l'existant : routes, politiques RLS, accès aux tables, secrets et journaux. Ne pas publier avant sécurisation.
2. Construire le moteur de réponse en mode simulation : aucune émission réelle de message.
3. Construire import CSV avec prévisualisation, dédoublonnage, source, provenance et état de consentement.
4. Connecter un fournisseur WhatsApp officiel sur numéro de test ; webhook authentifié et idempotence des messages.
5. Mettre en place le routage : questions générales automatiques, demande de commande / SAV / litige => humain.
6. Ajouter le paquet documentaire avec liens vérifiés et suivi des envois.
7. Ajouter la proposition de rendez-vous selon disponibilités vérifiées.
8. Activer progressivement les envois réels après tests, consentement applicable et validation explicite.

## Règles non négociables
- Ne jamais envoyer automatiquement à un numéro simplement récupéré d'une annonce ou d'un fichier sans base légale et opt-in WhatsApp approprié.
- Pas de scraping, automatisation de navigateur ni envoi Leboncoin sans autorisation de la plateforme.
- Pas de date de livraison, de stock ou de remise inventés.
- Pas de codes OTP, identifiants, PIN ou secrets dans les messages.
- Droit de reprise humaine, arrêt de l'IA, dédoublonnage, suppression/opposition et journalisation.
- Ne pas modifier le numéro WhatsApp principal sans confirmation de coexistence.
- Ne pas exposer les clés Supabase service role / OpenAI dans le navigateur.
- RLS et permissions vérifiées avant mise en production.

## État observé (30 octobre 2026)
- Projet Supabase : microdrive-crm.
- Tables présentes : leads, crm_messages, knowledge_base.
- Champs leads existants : whatsapp_opt_in, opted_out_at, lead_score, ai_enabled, next_followup_at, last_inbound_at.
- RLS désactivée sur public.leads : point de sécurité bloquant à examiner.
- Site Next.js avec dépendances Supabase et OpenAI.
- Connexion Leboncoin autorisée et connecteur WhatsApp opérationnel : non vérifiés.
