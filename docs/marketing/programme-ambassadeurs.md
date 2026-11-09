# Programme ambassadeurs NeoDrive : la méthode standard

Page publique : `easydrive-auto.fr/devenir-ambassadeur` (inscription, règles, code promo automatique).
Réglages (commissions, niveaux, bonus) : `lib/ambassadors.ts`. Liste des ambassadeurs : table `ambassadors` (Supabase).

## 1. L'offre
| Niveau | Dès | Avantages |
|---|---|---|
| Ambassadeur | inscription | 100 € par voiture, code promo + lien, kit vidéos NeoDrive |
| Partenaire officiel | 30 ventes | Une NeoDrive pour lui au prix ambassadeur, mis en avant sur le site |

Objectifs du mois (en plus, non cumulables) : 5 ventes = +100 €, 10 ventes = +200 €.
Client : 20 € de remise avec le code (montant non annoncé dans les vidéos, il le découvre en réservant).
Coût pour NeoDrive : 120 € par voiture, 140 € au maximum quand un objectif est atteint.
Une vente compte quand la voiture est livrée et payée. Paiement sous 30 jours. Pas de prêt de voiture.

## 2. Recrutement, étape par étape
1. **Trouver** (30 min/semaine) : TikTok et Instagram, recherches « voiture sans permis », « permis AM », « bons plans », « vie à la campagne », « maman de 4 ». Cible : 2 000 à 100 000 abonnés, vidéos récentes, commentaires réels.
2. **Contacter** (message ci-dessous), 10 profils par semaine.
3. **Inscription** : il s'inscrit lui-même sur la page, le code est créé automatiquement, vous recevez un SMS et un e-mail.
4. **Sous 48 h** : envoyer sur WhatsApp le kit vidéos (5 à 10 vidéos de livraisons et de la Confort) + un rappel des règles.
5. **Suivi** : à chaque réservation avec un code (champ `code_promo` dans l'e-mail de réservation), ajouter +1 à `sales_count` et la commission à `commission_due` une fois la voiture livrée et payée.
6. **Paiement** : une fois par mois, virement des commissions et du bonus du mois.
7. **Partenaire officiel** : quand `sales_count` atteint 30, le prévenir et lui proposer une NeoDrive au prix ambassadeur.
8. **Arrêt** : en cas de non-respect des règles (crédit, « la moins chère », faux avis, spam), lui demander de corriger ; si ça continue, passer `status` à « suspendu » (le code ne marche plus).

## 3. Message de premier contact
> Bonjour ! Je suis Mansour, fondateur de NeoDrive : on vend des voitures sans permis électriques neuves, livrées partout en France. J'aime beaucoup vos vidéos et je pense que votre communauté pourrait être intéressée.
> On a un programme ambassadeur : vous touchez une commission sur chaque voiture vendue grâce à votre code, avec des niveaux et des bonus chaque mois. On vous fournit les vidéos si besoin.
> Tout est expliqué ici : easydrive-auto.fr/devenir-ambassadeur
> Si vous avez des questions, je vous réponds avec plaisir !

## 4. Rappels légaux
- Mention « collaboration commerciale » obligatoire sur chaque publication (loi influenceurs du 9 juin 2023).
- Les commissions sont des revenus à déclarer par l'ambassadeur ; au-delà de quelques ventes, lui conseiller le statut d'auto-entrepreneur et demander une facture.
