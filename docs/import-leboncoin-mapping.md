# Import Leboncoin CSV — mapping vérifié le 30 octobre 2026

Fichier analysé localement : 302 lignes ; colonnes Date, Annonce, Référence, Nom, Téléphone, Email, Maturité, Informations, Message, Mémo. Aucune donnée personnelle du fichier n'est committée.

## Correspondance CRM
- Nom -> leads.nom
- Téléphone -> leads.telephone (normaliser E.164, ne jamais déduire le consentement WhatsApp)
- Email -> leads.email
- Annonce -> leads.annonce
- Date -> leads.created_at uniquement si la date est correctement parsée ; conserver la date source
- Maturité -> leads.tag (valeur originale) ; ne pas confondre avec un score IA calculé
- Informations et Mémo -> leads.notes, avec délimiteurs et provenance
- Message -> crm_messages.body, direction=inbound, channel=leboncoin, uniquement après résolution de lead_id
- Référence -> champ additionnel ou metadata si non vide (ici toutes vides)
- source -> leboncoin
- whatsapp_opt_in -> false par défaut ; preuve explicite à stocker séparément
- ai_enabled -> mode simulation lors de l'import initial

## Contrôles observés
- 302 lignes, 278 téléphones renseignés, 260 numéros distincts après retrait des caractères non numériques.
- 279 emails distincts, 302 messages renseignés.
- Maturité : Modéré 150, Pas de données 74, À explorer 46, Élevé 32 (accent Unicode normalisé).
- Les 302 lignes représentent des demandes, pas nécessairement 302 personnes distinctes.
- Avant insertion : prévisualisation, dédoublonnage par téléphone/email, conservation de plusieurs demandes par contact, rapport d'erreurs et rollback.
- Ne pas publier les contacts dans GitHub ni envoyer de campagnes sortantes à partir du seul export.
