/**
 * NeoDrive Academy : contenu de la formation closer (leçons, phrases clés, QCM, argumentaire).
 * Partagé par la page /academy (affichage) et la route /api/academy (correction des QCM côté serveur).
 * Sources : connaissances de Hana (supabase/functions/neodrive-whatsapp-agent), lib/neodrive-pricing.ts,
 * lib/reservation-confirm.ts, /cgv, /produit, /financement, /livraison, /preparer-ma-livraison, /sav, /equipe, lib/shipments.ts,
 * et les consignes du fondateur. Ne rien ajouter qui ne soit pas vérifié.
 */

export const PASS_MARK = 80;

export type Lesson = { title: string; text?: string[]; list?: string[] };
export type Question = { q: string; options: string[]; answer: number; why: string };
export type Module = {
  key: string;
  icon: string;
  title: string;
  summary: string;
  lessons: Lesson[];
  say: string[];
  never: string[];
  quiz: Question[];
};

export const MODULES: Module[] = [
  // ───────────────────────────── 1
  {
    key: "decouvrir",
    icon: "🏠",
    title: "Découvrir NeoDrive",
    summary: "Qui nous sommes, ce que nous vendons, comment nous travaillons.",
    lessons: [
      {
        title: "NeoDrive en quelques mots",
        text: [
          "NeoDrive est une marque française de voitures sans permis 100 % électriques, neuves. La société qui porte la marque s’appelle MK HOLDING (SAS). Son fondateur et dirigeant est Mansour.",
          "Nous sommes une marque toulousaine : tout part de la région de Toulouse, en Haute-Garonne, et nous livrons partout en France métropolitaine.",
        ],
      },
      {
        title: "Notre modèle : la vente directe",
        text: [
          "NeoDrive achète directement à l’usine et vend directement au particulier. Il n’y a ni concession, ni magasin, ni intermédiaire, ni vendeur à payer en plus.",
          "C’est exactement ce qui nous permet d’avoir un des prix les plus bas du marché pour une voiture sans permis électrique neuve.",
          "En échange, c’est nous qui livrons la voiture chez le client, avec notre propre organisation, jusqu’à sa porte. Nous n’avons pas de point d’accueil du public : on ne propose pas au client de venir chercher la voiture.",
        ],
      },
      {
        title: "Ce qui rassure le client",
        text: ["Beaucoup de clients ont peur d’acheter à distance. Notre rôle est de les accompagner, pas de les pousser. Les faits qui rassurent :"],
        list: [
          "Pour la Confort (en stock) : le client voit et essaie la voiture à la livraison, et il ne paie qu’à ce moment-là. Aucun acompte.",
          "Une voiture neuve, garantie 2 ans.",
          "Une structure et une carrosserie en acier, pas en plastique : solide et rassurante.",
          "Des vidéos de vraies livraisons sur le site et sur nos réseaux (Facebook, Instagram, TikTok).",
          "Un service après-vente en ligne, avec un suivi de chaque demande.",
        ],
      },
      {
        title: "Nos clients",
        text: ["On rencontre surtout trois profils :"],
        list: [
          "Des parents qui cherchent une voiture pour leur adolescent (dès 14 ans) : on parle sécurité de l’acier, caméra de recul, alarme, au chaud et au sec.",
          "Des seniors : simple à conduire, se gare partout, chauffage, livrée et expliquée à domicile.",
          "Des adultes sans permis ou qui ont perdu leur permis, pour les trajets du quotidien (travail, courses).",
        ],
      },
      {
        title: "Le bon ton",
        text: [
          "Nous parlons comme une conseillère de confiance : chaleureuse, simple, honnête. Une seule question utile à la fois (pour qui est la voiture, la ville ou le code postal, l’usage, pour quand).",
          "On préfère « acquérir votre voiture », « directement à l’usine », « sans intermédiaire », « nous vous la livrons » plutôt que « vendre », « vente » ou « achetez maintenant ».",
        ],
      },
    ],
    say: [
      "« NeoDrive est une marque toulousaine qui livre dans toute la France des voitures sans permis électriques neuves. »",
      "« Nous travaillons directement avec l’usine, sans intermédiaire : c’est pour ça que nos prix sont parmi les plus bas du marché. »",
      "« Nous vous livrons jusqu’à votre porte. Pour la Confort, vous la voyez, vous l’essayez, et vous payez seulement à la livraison. »",
    ],
    never: [
      "Dire qu’on a un magasin, une concession ou un point de retrait.",
      "Proposer au client de venir chercher la voiture.",
      "Inventer une information sur l’entreprise (chiffres, nombre de clients, etc.).",
    ],
    quiz: [
      { q: "Qu’est-ce que NeoDrive ?", options: ["Une marque française de voitures sans permis électriques neuves", "Un garage qui vend des voitures sans permis d’occasion", "Un loueur de voitures", "Une concession multimarque"], answer: 0, why: "NeoDrive vend uniquement des voitures sans permis électriques neuves." },
      { q: "D’où part NeoDrive ?", options: ["De la région de Toulouse", "De Paris", "De Lyon", "De Marseille"], answer: 0, why: "NeoDrive est une marque toulousaine : tout part de la région de Toulouse." },
      { q: "Quelle est la société qui porte la marque NeoDrive ?", options: ["MK HOLDING", "Concentrix", "Aixam", "Citroën"], answer: 0, why: "La marque NeoDrive appartient à MK HOLDING (SAS)." },
      { q: "Pourquoi nos prix sont-ils si bas ?", options: ["Vente directe de l’usine au client, sans concession ni intermédiaire", "Les voitures sont d’occasion", "Nous faisons des promotions permanentes", "Les voitures n’ont pas de garantie"], answer: 0, why: "Pas de concession, pas de magasin, pas d’intermédiaire : c’est ce qui fait le prix." },
      { q: "Un client veut venir chercher la voiture lui-même. Que répondez-vous ?", options: ["Ce n’est pas possible : nous n’avons pas d’accueil du public, nous la livrons jusqu’à sa porte", "Oui, il peut passer au magasin", "Oui, s’il paie un supplément", "Il doit aller chez un concessionnaire"], answer: 0, why: "Nous n’avons pas de point d’accueil : la livraison à domicile fait partie de notre modèle." },
      { q: "Pour la Confort, quand le client paie-t-il ?", options: ["À la livraison, après avoir vu la voiture", "À la réservation", "50 % à la commande, 50 % à la livraison", "Un mois après la livraison"], answer: 0, why: "La Confort est en stock : paiement uniquement à la livraison, aucun acompte." },
      { q: "Qui livre la voiture ?", options: ["NeoDrive, avec sa propre organisation, jusqu’à la porte du client", "La Poste", "Le client doit trouver un transporteur", "Un concessionnaire partenaire"], answer: 0, why: "La livraison est organisée par NeoDrive, partout en France métropolitaine." },
      { q: "En quoi est faite la structure de la voiture ?", options: ["En acier", "En plastique", "En bois", "En carton renforcé"], answer: 0, why: "Structure et carrosserie en acier : plus solide que beaucoup de concurrentes en plastique." },
      { q: "Quelle phrase correspond au bon ton NeoDrive ?", options: ["« Je vous accompagne : pour qui serait la voiture ? »", "« Achetez maintenant, il n’en reste plus beaucoup ! »", "« Il faut vous décider aujourd’hui. »", "« Je vous vends la voiture tout de suite. »"], answer: 0, why: "On accompagne avec une question douce. Jamais de fausse urgence." },
      { q: "Pour un parent qui cherche une voiture pour son ado, quels arguments mettre en avant ?", options: ["La sécurité de l’acier, la caméra de recul, l’alarme, au chaud et au sec", "La vitesse maximale sur autoroute", "La possibilité de transporter 4 personnes", "Le prix des pièces d’occasion"], answer: 0, why: "Pour un ado, les parents veulent avant tout la sécurité et le confort." },
    ],
  },

  // ───────────────────────────── 2
  {
    key: "gamme",
    icon: "🚗",
    title: "La gamme et les prix",
    summary: "Les trois versions, leurs prix, leurs délais, et pourquoi on conseille la Confort.",
    lessons: [
      {
        title: "Une voiture, trois versions",
        text: [
          "Notre voiture s’appelle la NeoDrive SWITCH. C’est une voiture sans permis électrique (catégorie L6e) : 45 km/h, 2 places, un grand coffre, un moteur électrique de 3 kW. Dimensions : 2,50 m de long, 1,30 m de large, 1,65 m de haut.",
          "Elle se recharge sur une prise électrique classique de la maison (220 V), en 6 h environ.",
        ],
        list: [
          "Confort — 4 990 € : EN STOCK, livrée en 2 à 3 semaines. Paiement à la livraison.",
          "Essentielle — 3 990 € : la plus simple. Fabriquée sur commande : 6 à 8 mois. Paiement à la commande.",
          "Confort Plus — 5 990 € : la plus complète, plus d’autonomie (jusqu’à 80 km) et une recharge plus rapide. Fabriquée sur commande : 6 à 8 mois. Paiement à la commande.",
        ],
      },
      {
        title: "Notre objectif : orienter vers la Confort",
        text: [
          "La Confort est la version la plus demandée. C’est le meilleur équilibre entre le prix, l’équipement et l’autonomie, et c’est la seule disponible tout de suite.",
          "Si un client demande le délai de l’Essentielle ou de la Confort Plus, on répond honnêtement : elles sont fabriquées uniquement sur commande, 6 à 8 mois. La Confort est produite à l’avance parce que c’est celle que la plupart de nos clients choisissent. Si le client veut quand même une version sur commande, on respecte son choix.",
        ],
      },
      {
        title: "Ce que la Confort a en plus de l’Essentielle",
        text: ["Pour 1 000 € de plus, la Confort apporte :"],
        list: [
          "le chauffage ;",
          "la caméra de recul et le radar de recul ;",
          "l’assistance en côte : dans une montée, par exemple à un feu rouge, la voiture se bloque pour ne pas reculer sur celle de derrière ;",
          "une alerte au siège si on oublie de couper le contact ;",
          "la radio, le Bluetooth et la prise USB ;",
          "le toit ouvrant avec ventilateurs ;",
          "les pare-soleil ;",
          "les enjoliveurs de roues ;",
          "l’alarme.",
        ],
      },
      {
        title: "Autonomie, recharge, fiabilité",
        text: [
          "Autonomie : on dit toujours « jusqu’à 70 km » pour la Confort et l’Essentielle. La plupart des trajets du quotidien font moins de 70 km, et on recharge la nuit ou à la maison, sur une simple prise.",
          "L’autonomie réelle dépend de la température, des côtes, du poids transporté et de la conduite : on dit « jusqu’à ».",
          "La voiture est extrêmement fiable : conception simple, peu de composants, structure en acier. On parle de solidité et de simplicité.",
          "Couleurs : selon disponibilité, souvent gris.",
        ],
      },
      {
        title: "Le prix tout compris",
        text: [
          "Le prix total = prix de la voiture + livraison selon la zone + 150 € de carte grise (formalités faites par un partenaire extérieur). La livraison dépend du département :",
        ],
        list: [
          "450 € : 31, 81, 82, 32, 09 (Toulouse et départements voisins).",
          "590 € : 11, 12, 46, 47, 33, 65, 66, 34, 30, 40, 24, 19, 87, 15.",
          "690 € : Île-de-France (75, 77, 78, 91, 92, 93, 94, 95), 13, 69, 63, 16, 17, 86.",
          "790 € : tous les autres départements de France métropolitaine.",
          "Corse et outre-mer : sur devis, Mansour s’en occupe.",
          "Exemples de totaux pour la Confort : 5 590 € (zone 450), 5 730 € (zone 590), 5 830 € (zone 690), 5 930 € (zone 790).",
        ],
      },
      {
        title: "Expliquer le prix de la livraison",
        text: [
          "Ce n’est pas un colis : c’est un vrai transport sur plateau (remorquage) depuis la région de Toulouse jusqu’à la porte du client, aller et retour, avec l’explication de la voiture à la remise.",
          "Même avec la livraison, le total reste très accessible : une voiture neuve, livrée chez vous, pour moins de 6 000 € tout compris (Confort et Essentielle).",
        ],
      },
    ],
    say: [
      "« La Confort est notre version la plus demandée : elle est en stock, livrée chez vous en 2 à 3 semaines, et vous payez à la livraison. »",
      "« Pour 1 000 € de plus que l’Essentielle, vous avez le chauffage, la caméra et le radar de recul, l’assistance en côte, la radio Bluetooth… et vous roulez dans quelques semaines au lieu d’attendre 6 à 8 mois. »",
      "« Elle a jusqu’à 70 km d’autonomie et se recharge sur une prise normale de la maison. »",
      "« Avec la livraison chez vous et la carte grise, le total est de … € tout compris. »",
    ],
    never: [
      "Dire « 50 km » d’autonomie : on dit « jusqu’à 70 km ».",
      "Parler de « pannes » pendant la vente : la voiture est extrêmement fiable.",
      "Calculer un total au hasard : utiliser le barème (voiture + livraison de la zone + 150 €).",
      "Inventer une caractéristique technique (poids, pente, puissance de batterie, pneus…) : on dit qu’on fait vérifier.",
      "Faire une remise : le prix est déjà au plus juste.",
      "Inventer une fausse urgence ou un faux stock limité.",
    ],
    quiz: [
      { q: "Quel est le prix de la Confort ?", options: ["4 990 €", "3 990 €", "5 990 €", "6 990 €"], answer: 0, why: "Confort 4 990 €, Essentielle 3 990 €, Confort Plus 5 990 €." },
      { q: "Quel modèle est en stock et livré en 2 à 3 semaines ?", options: ["La Confort", "L’Essentielle", "La Confort Plus", "Aucun"], answer: 0, why: "Seule la Confort est en stock. Les deux autres sont fabriquées sur commande." },
      { q: "Quel est le délai de l’Essentielle ?", options: ["6 à 8 mois, fabriquée sur commande", "2 à 3 semaines", "48 heures", "1 an"], answer: 0, why: "L’Essentielle et la Confort Plus sont fabriquées sur commande : 6 à 8 mois." },
      { q: "Quand le client paie-t-il une Essentielle ou une Confort Plus ?", options: ["À la commande", "À la livraison", "Jamais", "En 10 fois"], answer: 0, why: "Les versions sur commande se paient à la commande. Seule la Confort se paie à la livraison." },
      { q: "Quelle autonomie annoncez-vous pour la Confort ?", options: ["Jusqu’à 70 km", "50 km", "150 km", "Illimitée"], answer: 0, why: "On dit toujours « jusqu’à 70 km », jamais « 50 km »." },
      { q: "Que fait l’assistance en côte ?", options: ["Dans une montée, la voiture se bloque pour ne pas reculer (par exemple à un feu rouge)", "Elle accélère toute seule dans les côtes", "Elle permet de rouler à 60 km/h", "Elle recharge la batterie en descente"], answer: 0, why: "Elle retient la voiture dans une montée pour ne pas reculer sur la voiture de derrière." },
      { q: "Lequel de ces équipements n’est PAS sur l’Essentielle mais est sur la Confort ?", options: ["La caméra et le radar de recul", "Les deux places", "Le chargeur 220 V", "La batterie"], answer: 0, why: "Caméra et radar de recul, chauffage, radio Bluetooth, toit ouvrant… sont réservés à la Confort." },
      { q: "Combien coûte le service carte grise ?", options: ["150 €", "450 €", "Gratuit", "990 €"], answer: 0, why: "150 €, formalités faites par un partenaire extérieur." },
      { q: "Un client habite dans le 31 (Haute-Garonne). Combien coûte la livraison ?", options: ["450 €", "590 €", "690 €", "790 €"], answer: 0, why: "Zone 450 € : 31, 81, 82, 32, 09." },
      { q: "Un client habite à Paris (75) et veut une Confort. Quel est le total tout compris ?", options: ["5 830 €", "5 590 €", "4 990 €", "6 830 €"], answer: 0, why: "4 990 € + 690 € (Île-de-France) + 150 € = 5 830 €." },
      { q: "Comment se recharge la voiture ?", options: ["Sur une prise électrique classique de la maison, en 6 h environ", "Uniquement sur une borne rapide", "À la station-service", "Il faut changer la batterie"], answer: 0, why: "Recharge sur une prise 220 V classique, environ 6 h." },
      { q: "Un client demande une petite remise. Que répondez-vous ?", options: ["Le prix est déjà au plus juste grâce à l’achat direct à l’usine", "Oui, je vous fais 10 %", "Je vous offre la livraison", "Revenez demain, il y aura une promotion"], answer: 0, why: "Pas de remise. Jamais de promesse sans l’accord écrit de Mansour." },
    ],
  },

  // ───────────────────────────── 3
  {
    key: "loi",
    icon: "⚖️",
    title: "Ce que dit la loi",
    summary: "Qui peut conduire, l’assurance, la carte grise, la garantie et le droit de rétractation.",
    lessons: [
      {
        title: "Qui peut conduire une voiture sans permis ?",
        text: [
          "Une voiture sans permis (quadricycle léger, catégorie L6e) peut être conduite dès 14 ans en France.",
          "Les personnes nées après le 1er janvier 1988 doivent avoir au minimum le permis AM (l’ancien BSR). Les personnes nées avant 1988 n’ont pas besoin de titre de conduite pour ce type de véhicule.",
          "Une voiture sans permis ne peut pas rouler sur l’autoroute.",
          "C’est au client de vérifier qu’il remplit les conditions pour conduire. En cas de doute sur un cas particulier, on ne s’avance pas : on dit qu’on fait vérifier.",
        ],
      },
      {
        title: "L’assurance",
        text: ["L’assurance est obligatoire avant de rouler. Elle est à la charge du client et n’est pas comprise dans le prix. Le client choisit librement son assureur."],
      },
      {
        title: "La carte grise et le COC",
        text: [
          "Le service carte grise coûte 150 €. Les formalités sont faites par un partenaire extérieur. La carte grise définitive est envoyée par l’administration (ANTS / Imprimerie nationale) : nous ne maîtrisons pas ses délais.",
          "Le COC (certificat de conformité) est la « carte d’identité » du véhicule. L’original est remis au client à la livraison, avec la voiture, parce qu’il porte le numéro de châssis (VIN) de cette voiture précise. Sans le COC, pas de carte grise.",
          "Pour la carte grise, le client prépare : sa pièce d’identité, un justificatif de domicile de moins de 6 mois, le COC original, et son permis AM ou BSR s’il en a un.",
        ],
      },
      {
        title: "La garantie : 2 ans",
        text: [
          "La « garantie 2 ans » correspond à la garantie légale de conformité : elle couvre le véhicule pendant 2 ans à partir de la livraison, sans frais pour le client. Il y a aussi la garantie légale des vices cachés.",
          "En plus, NeoDrive garantit le châssis et la structure de la carrosserie contre les défauts de fabrication pendant 2 ans.",
          "La garantie ne couvre pas les dégâts après la livraison (accident, choc, surcharge, mauvaise utilisation, modification) ni l’usure normale (pneus, plaquettes de frein, ampoules, fusibles, essuie-glaces).",
          "Attention : savoir si un problème précis est couvert, c’est une décision de Mansour, jamais du closer.",
        ],
      },
      {
        title: "Le droit de rétractation : 14 jours",
        text: [
          "Comme pour tout achat à distance, le client a 14 jours pour se rétracter, sans donner de raison. Le délai commence le jour où il prend possession du véhicule.",
          "Il informe NeoDrive par une déclaration claire (e-mail ou courrier). Le retour du véhicule est à ses frais. NeoDrive rembourse au plus tard 14 jours après avoir été informée, et peut attendre d’avoir récupéré le véhicule.",
          "Tout cela est écrit dans nos conditions générales de vente (page /cgv du site). En cas de question précise, on renvoie vers les CGV et vers Mansour.",
        ],
      },
      {
        title: "Propriété de la voiture",
        text: ["La voiture reste la propriété de MK HOLDING jusqu’au paiement complet. Les clés et les documents sont remis une fois le paiement reçu."],
      },
    ],
    say: [
      "« La voiture sans permis se conduit dès 14 ans. Si vous êtes né après 1988, il faut le permis AM, l’ancien BSR. »",
      "« Pensez à assurer la voiture avant de rouler : c’est obligatoire. »",
      "« À la livraison, on vous remet le COC original, la carte d’identité de la voiture : c’est avec lui que se fait la carte grise. »",
      "« La voiture est garantie 2 ans. »",
    ],
    never: [
      "Promettre qu’un problème sera pris en charge par la garantie : c’est Mansour qui décide.",
      "Dire que l’assurance est comprise dans le prix.",
      "Promettre un délai pour la carte grise définitive.",
      "Donner un avis juridique sur un cas compliqué : on fait vérifier.",
    ],
    quiz: [
      { q: "À partir de quel âge peut-on conduire une voiture sans permis ?", options: ["14 ans", "16 ans", "18 ans", "12 ans"], answer: 0, why: "Dès 14 ans en France." },
      { q: "Une personne née en 2005 veut conduire la voiture. De quoi a-t-elle besoin ?", options: ["Du permis AM (ancien BSR) au minimum", "De rien du tout", "Du permis B obligatoirement", "D’un permis poids lourd"], answer: 0, why: "Nées après le 1er janvier 1988 : permis AM au minimum." },
      { q: "L’assurance de la voiture est-elle obligatoire ?", options: ["Oui, avant de rouler, à la charge du client", "Non, pas pour une voiture sans permis", "Oui, et elle est comprise dans le prix", "Seulement pour les jeunes"], answer: 0, why: "L’assurance est obligatoire et reste à la charge du client." },
      { q: "Qu’est-ce que le COC ?", options: ["Le certificat de conformité, la « carte d’identité » du véhicule, avec son numéro de châssis", "Un bon de réduction", "Le contrat d’assurance", "La facture de la livraison"], answer: 0, why: "Le COC porte le VIN de la voiture : il est indispensable pour la carte grise." },
      { q: "Quand le client reçoit-il le COC original ?", options: ["À la livraison, avec la voiture", "Par e-mail, à la réservation", "Un an après", "Jamais, NeoDrive le garde"], answer: 0, why: "L’original est remis avec le véhicule, car il porte son VIN." },
      { q: "Combien de temps dure la garantie légale de conformité ?", options: ["2 ans à partir de la livraison", "6 mois", "10 ans", "Elle n’existe pas pour les voitures sans permis"], answer: 0, why: "2 ans à partir de la livraison, sans frais pour le client." },
      { q: "Combien de jours le client a-t-il pour se rétracter après un achat à distance ?", options: ["14 jours", "7 jours", "30 jours", "Aucun"], answer: 0, why: "14 jours, à partir de la prise de possession du véhicule." },
      { q: "Une voiture sans permis peut-elle rouler sur l’autoroute ?", options: ["Non", "Oui", "Oui, la nuit seulement", "Oui, sur la voie de droite"], answer: 0, why: "Un véhicule L6e ne peut pas circuler sur l’autoroute." },
      { q: "Un client demande si son problème de pneu usé est couvert par la garantie. Que faites-vous ?", options: ["Je ne promets rien : l’usure normale n’est en général pas couverte, et c’est Mansour qui décide", "Je lui dis oui, tout est couvert", "Je lui promets un remboursement", "Je lui envoie des pneus neufs"], answer: 0, why: "Les pièces d’usure ne sont pas couvertes, et la décision appartient à Mansour." },
      { q: "Que doit préparer le client pour la carte grise ?", options: ["Pièce d’identité, justificatif de domicile de moins de 6 mois, COC original, permis AM ou BSR s’il en a un", "Seulement son RIB", "Une photo de la voiture", "Rien du tout"], answer: 0, why: "Ce sont les documents demandés sur la page « Préparer ma livraison »." },
    ],
  },

  // ───────────────────────────── 4
  {
    key: "paiement",
    icon: "💳",
    title: "Paiement, financement et livraison",
    summary: "Comment le client paie, comment il peut financer, comment se passe la livraison.",
    lessons: [
      {
        title: "Le paiement de la Confort : à la livraison",
        text: [
          "Le client paie la Confort le jour de la livraison, par virement instantané, devant le livreur, après avoir vu la voiture.",
          "Les coordonnées bancaires (RIB) de MK HOLDING lui sont envoyées quelques jours avant la livraison. Elles figurent aussi sur la page « Préparer ma livraison » du site.",
          "Pour que le virement passe sans souci le jour J, le client doit faire 3 choses à l’avance :",
        ],
        list: [
          "prévenir sa banque qu’il va payer un véhicule à la livraison ;",
          "ajouter le RIB de NeoDrive comme bénéficiaire dans son application (cela peut prendre 24 à 72 h selon les banques) ;",
          "vérifier son plafond de virement instantané et l’augmenter au moins au prix total (l’augmentation est souvent temporaire : vérifier les dates).",
        ],
      },
      {
        title: "Les versions sur commande",
        text: ["L’Essentielle et la Confort Plus sont fabriquées sur commande (6 à 8 mois) : elles se paient à la commande."],
      },
      {
        title: "Financement",
        text: [
          "NeoDrive ne propose pas de paiement en plusieurs fois.",
          "Si le client veut étaler le paiement, il peut demander un prêt à sa propre banque ou à son assureur (Macif, MAIF, Groupama…). Il peut aussi consulter la page Financement du site : il y fait une simulation et dépose son dossier ; c’est l’organisme prêteur qui décide.",
          "On ne donne jamais soi-même un taux ni une mensualité.",
        ],
      },
      {
        title: "La livraison",
        text: [
          "La voiture est livrée sur plateau, jusqu’à la porte du client, partout en France métropolitaine. Le livreur décharge la voiture, la vérifie avec le client et lui explique la prise en main (recharge, commandes, autonomie).",
          "Nous appelons le client à l’avance pour fixer le jour et l’heure. Les dates peuvent varier un peu selon les conditions de route : on le dit honnêtement au client.",
          "Le client doit être présent (ou une personne de confiance), avec un endroit facile d’accès pour décharger.",
          "En attendant la livraison, on dit au client : « Votre voiture est en cours de préparation. »",
        ],
      },
      {
        title: "La page à envoyer au client",
        text: ["Avant la livraison, on envoie au client la page « Préparer ma livraison » du site : paiement, prise en main de la voiture, carte grise. Ça prend 5 minutes à lire."],
      },
    ],
    say: [
      "« Le jour de la livraison, vous payez par virement instantané, devant le livreur, après avoir vu la voiture. »",
      "« Pensez à prévenir votre banque, à ajouter notre RIB en bénéficiaire et à vérifier votre plafond de virement instantané. »",
      "« Pour étaler le paiement, le plus simple est de demander un prêt à votre banque ou à votre assureur. Vous pouvez aussi regarder notre page Financement. »",
      "« Votre voiture est en cours de préparation. Nous vous appelons à l’avance pour fixer le jour et l’heure. »",
    ],
    never: [
      "Dire « entrepôt » ou « les voitures arrivent dans notre entrepôt » au client.",
      "Proposer un paiement en plusieurs fois NeoDrive : il n’existe pas.",
      "Donner un taux de crédit ou une mensualité.",
      "Promettre une date de livraison exacte sans l’accord de Mansour.",
      "Demander des coordonnées bancaires au client, ou envoyer un autre RIB que celui de MK HOLDING.",
    ],
    quiz: [
      { q: "Comment le client paie-t-il la Confort ?", options: ["Par virement instantané le jour de la livraison, devant le livreur", "Par carte bancaire sur le site à la réservation", "En espèces un mois plus tard", "Par chèque à la commande"], answer: 0, why: "Paiement à la livraison, par virement instantané, après avoir vu la voiture." },
      { q: "Quelles sont les 3 choses à faire par le client avant la livraison ?", options: ["Prévenir sa banque, ajouter le RIB en bénéficiaire, vérifier son plafond de virement instantané", "Acheter une borne, un câble et des pneus", "Envoyer un acompte, une photo et sa carte vitale", "Rien du tout"], answer: 0, why: "Sans ça, la banque peut bloquer le virement le jour J." },
      { q: "Quand le client reçoit-il le RIB ?", options: ["Quelques jours avant la livraison", "Jamais", "Le jour de la réservation par SMS d’un autre numéro", "Après la livraison"], answer: 0, why: "Le RIB est envoyé quelques jours avant la livraison, pour avoir le temps de l’ajouter." },
      { q: "Un client veut payer en 10 fois. Que répondez-vous ?", options: ["Nous ne faisons pas de paiement en plusieurs fois ; il peut demander un prêt à sa banque ou à son assureur, ou voir la page Financement", "Oui, je vous fais 10 fois sans frais", "Oui, mais avec 5 % de frais", "Impossible d’acheter sans tout l’argent"], answer: 0, why: "Pas de paiement en plusieurs fois NeoDrive : on oriente vers sa banque, son assureur ou la page Financement." },
      { q: "Un client vous demande le taux du crédit. Que faites-vous ?", options: ["Je ne donne pas de taux : il fait sa simulation sur la page Financement ou demande à sa banque", "Je lui donne un taux de mémoire", "Je lui dis 0 %", "Je lui invente une mensualité"], answer: 0, why: "On ne donne jamais soi-même un taux ni une mensualité." },
      { q: "Quelle phrase utiliser pour une voiture pas encore livrée ?", options: ["« Votre voiture est en cours de préparation. »", "« Votre voiture est dans notre entrepôt. »", "« Les voitures arrivent dans notre entrepôt la semaine prochaine. »", "« On ne sait pas où est votre voiture. »"], answer: 0, why: "On ne parle jamais d’« entrepôt » au client." },
      { q: "La date de livraison peut-elle changer un peu ?", options: ["Oui, selon les conditions de route ; on appelle le client à l’avance pour fixer le jour et l’heure", "Non, elle est garantie à la minute", "Oui, de plusieurs mois", "On ne prévient jamais le client"], answer: 0, why: "Les dates peuvent varier légèrement : on prévient et on fixe le rendez-vous ensemble." },
      { q: "Que fait le livreur à la remise ?", options: ["Il décharge, vérifie la voiture avec le client et explique la prise en main", "Il laisse la voiture devant la porte sans rien dire", "Il demande au client de venir la chercher au camion, au bout de la rue", "Il repart avec les clés"], answer: 0, why: "Livraison sur plateau, inspection avec le client et explication de la voiture." },
      { q: "Quelle page du site envoyer au client avant sa livraison ?", options: ["« Préparer ma livraison »", "La page recrutement", "La page d’un concurrent", "Aucune"], answer: 0, why: "Elle explique le paiement, la prise en main et la carte grise." },
      { q: "Quand se paie une Confort Plus ?", options: ["À la commande", "À la livraison", "Six mois après", "Elle est gratuite"], answer: 0, why: "Versions sur commande (Essentielle, Confort Plus) : paiement à la commande." },
    ],
  },

  // ───────────────────────────── 5
  {
    key: "appel",
    icon: "📞",
    title: "Le premier appel et la confirmation ferme",
    summary: "Se présenter, écouter, comprendre le besoin, puis confirmer fermement avant toute livraison.",
    lessons: [
      {
        title: "Le déroulé d’un premier appel",
        list: [
          "Se présenter : « Bonjour, je suis [votre prénom], conseillère chez NeoDrive. Vous nous avez contactés au sujet d’une voiture sans permis électrique. Vous avez deux minutes ? »",
          "Écouter : laisser le client parler. Pour qui est la voiture ? Pour quel usage (travail, courses, lycée) ? Combien de kilomètres par jour ? Dans quelle ville ou quel code postal ? Pour quand ?",
          "Répondre au besoin avec 1 ou 2 arguments, pas plus.",
          "Présenter la Confort, donner le prix tout compris avec la livraison de sa zone.",
          "Proposer la suite : réservation gratuite sur le site, ou un rappel à une date précise.",
          "Noter tout dans le compte-rendu de l’appel.",
        ],
        text: ["Un bon appel, c’est surtout écouter. Une seule question à la fois."],
      },
      {
        title: "La confirmation ferme : les 3 questions",
        text: ["Avant de programmer une livraison, on pose toujours ces 3 questions, et on attend 3 « oui » clairs :"],
        list: [
          "1. « Je vous confirme : c’est bien la NeoDrive Confort, pour un total de … € tout compris, livraison et carte grise incluses ? »",
          "2. « C’est bien vous qui serez présent à la livraison et qui ferez le paiement ? »",
          "3. « Votre virement instantané est prêt : votre banque est prévenue et votre plafond est suffisant ? »",
        ],
      },
      {
        title: "Hésitation = pas de livraison programmée",
        text: [
          "Si le client hésite (« je dois demander à ma fille », « on verra », « je ne sais pas encore »), on ne programme PAS la livraison. On note « À rappeler » avec une date, et on garde le contact chaleureux.",
          "Nous livrons uniquement des clients sûrs. Une livraison annulée sur place, c’est un aller-retour sur plateau perdu.",
        ],
      },
    ],
    say: [
      "« Pour qui serait la voiture ? »",
      "« Vous feriez combien de kilomètres par jour, à peu près ? »",
      "« Dans quelle ville se ferait la livraison ? Je vous calcule le prix tout compris. »",
      "« Pas de souci, prenez le temps d’en parler. Je vous rappelle jeudi à 18 h, ça vous va ? »",
    ],
    never: [
      "Programmer une livraison sans les 3 « oui » clairs.",
      "Parler sans écouter, ou enchaîner les questions.",
      "Mettre la pression ou inventer une urgence.",
    ],
    quiz: [
      { q: "Quelle est la première chose à faire dans un premier appel ?", options: ["Se présenter et demander si le client a un moment", "Donner tout de suite le RIB", "Parler 10 minutes de la voiture sans s’arrêter", "Demander un acompte"], answer: 0, why: "On se présente, puis on écoute." },
      { q: "Quelle est la qualité la plus importante dans un premier appel ?", options: ["Écouter le besoin du client", "Parler vite", "Insister jusqu’à la réservation", "Raccrocher vite"], answer: 0, why: "Un bon appel, c’est surtout écouter, une question à la fois." },
      { q: "Quelle est la 1re question de la confirmation ferme ?", options: ["Confirmer le modèle et le prix total", "Demander son signe astrologique", "Demander son salaire", "Demander s’il connaît un concurrent"], answer: 0, why: "1) modèle et prix total, 2) qui sera présent et paiera, 3) virement prêt." },
      { q: "Quelle est la 2e question de la confirmation ferme ?", options: ["Est-ce bien vous qui serez présent et qui paierez ?", "Avez-vous un garage ?", "Quelle couleur préférez-vous ?", "Avez-vous déjà eu une voiture ?"], answer: 0, why: "La personne présente doit être celle qui paie." },
      { q: "Quelle est la 3e question de la confirmation ferme ?", options: ["Le virement instantané est-il prêt, la banque prévenue ?", "Voulez-vous un café ?", "Pouvez-vous payer en espèces ?", "Voulez-vous une remise ?"], answer: 0, why: "Sans virement prêt, la livraison risque d’échouer." },
      { q: "Le client dit : « Je dois d’abord demander à ma fille. » Que faites-vous ?", options: ["Je ne programme pas la livraison, je note « À rappeler » avec une date", "Je programme quand même la livraison", "Je lui dis qu’il doit décider maintenant", "Je raccroche"], answer: 0, why: "Toute hésitation = pas de livraison programmée. On ne livre que des clients sûrs." },
      { q: "Pourquoi ne livre-t-on que des clients sûrs ?", options: ["Une livraison annulée sur place, c’est un aller-retour sur plateau perdu", "Parce que c’est la loi", "Parce que le livreur n’aime pas attendre", "Ce n’est pas important"], answer: 0, why: "Chaque livraison coûte cher à organiser." },
      { q: "Combien d’arguments donner à la fois ?", options: ["1 ou 2, selon le besoin du client", "Tous, d’un coup", "Aucun", "Au moins 10"], answer: 0, why: "Un ou deux arguments qui répondent au besoin du client." },
      { q: "Le client dit « on verra ». C’est…", options: ["Une hésitation : pas de livraison programmée", "Un oui ferme", "Un non définitif", "Une demande de remise"], answer: 0, why: "« On verra » n’est pas un oui clair." },
      { q: "Que proposez-vous à un client intéressé mais pas encore décidé ?", options: ["Un rappel à une date précise, ou la réservation gratuite sans paiement", "Un paiement immédiat", "Une remise de 20 %", "D’aller voir un concurrent"], answer: 0, why: "On garde le lien sans pression." },
    ],
  },

  // ───────────────────────────── 6
  {
    key: "objections",
    icon: "🛡️",
    title: "Répondre aux objections",
    summary: "Le prix, la confiance, l’autonomie, « je vais réfléchir », les concurrents.",
    lessons: [
      {
        title: "La méthode",
        text: [
          "Une objection n’est pas un refus : c’est une question. On écoute jusqu’au bout, on reformule (« Si je comprends bien, vous avez peur de… »), on répond avec un fait, puis on pose une question.",
          "Si le client refuse vraiment, on le remercie poliment et on s’arrête.",
        ],
      },
      {
        title: "« C’est trop beau, c’est une arnaque ? » / « C’est chinois ? »",
        text: [
          "Le prix est bas parce que nous travaillons en direct avec l’usine, sans concession ni intermédiaire. Pour la Confort, le client n’a rien à payer avant la livraison : il voit et essaie la voiture avant de payer.",
          "La voiture est fabriquée en usine et importée par NeoDrive, marque toulousaine. Elle est neuve, garantie 2 ans, avec une structure en acier. On peut envoyer une vidéo d’une vraie livraison, et nos réseaux sont pleins de vidéos de clients livrés.",
        ],
      },
      {
        title: "« C’est trop cher » / « La livraison est chère »",
        text: [
          "On compare : une Citroën Ami neuve coûte environ 8 000 €, avec beaucoup moins d’équipements (ni caméra de recul, ni radio d’origine). Chez Aixam ou Ligier, une sans permis électrique neuve coûte souvent 15 000 € ou plus.",
          "La livraison est un vrai transport sur plateau, aller et retour, jusqu’à sa porte. Même avec la livraison, la Confort reste sous les 6 000 € tout compris. Si le budget est vraiment serré : la page Financement, ou un prêt de sa banque.",
        ],
      },
      {
        title: "« 70 km, ce n’est pas assez »",
        text: ["La plupart des trajets du quotidien font moins de 70 km. On recharge la nuit, à la maison, sur une simple prise. On demande au client combien de kilomètres il fait par jour : souvent, c’est bien moins."],
      },
      {
        title: "« Je n’ose pas acheter à distance »",
        text: ["C’est normal, beaucoup de clients nous le disent. Pour la Confort : aucun acompte, il voit la voiture chez lui, l’essaie, et paie seulement à ce moment-là. Le droit de rétractation de 14 jours s’applique aussi."],
      },
      {
        title: "« Je vais réfléchir »",
        text: [
          "On relance avec une question : « Bien sûr. Qu’est-ce qui vous fait hésiter ? Le prix, le délai, ou autre chose ? » Puis on répond à ce point précis.",
          "On peut proposer la réservation gratuite, sans paiement, sur le site : il n’y a aucun acompte à verser.",
        ],
      },
      {
        title: "Les comparaisons avec les concurrents",
        list: [
          "Citroën Ami : environ 8 000 € neuve, beaucoup moins équipée (pas de caméra de recul ni de radio d’origine).",
          "Fiat Topolino : un design connu, mais un équipement plutôt simple, un coffre limité, et un prix souvent plus élevé selon la version et les options. NeoDrive : grand coffre, caméra de recul, chauffage, Bluetooth, alarme.",
          "Aixam, Ligier : marques connues, mais une sans permis électrique neuve coûte souvent 15 000 € ou plus.",
        ],
        text: ["On reste respectueux des autres marques : on compare des faits, on ne critique pas. Et on ne renvoie jamais un client vers un concurrent, l’occasion ou Leboncoin."],
      },
    ],
    say: [
      "« Je comprends tout à fait. Pour la Confort, vous ne payez rien avant d’avoir vu la voiture chez vous. »",
      "« Une Citroën Ami neuve coûte environ 8 000 €, sans caméra de recul ni radio. La Confort est à 4 990 €, bien équipée. »",
      "« Vous faites combien de kilomètres par jour, à peu près ? »",
      "« Qu’est-ce qui vous fait hésiter : le prix, le délai, ou autre chose ? »",
      "« Vous pouvez réserver gratuitement sur le site, sans aucun paiement. »",
    ],
    never: [
      "Critiquer une autre marque ou dire du mal d’un concurrent.",
      "Envoyer un client vers l’occasion, Leboncoin ou un concurrent.",
      "Promettre une remise pour convaincre.",
      "Insister quand le client a clairement dit non.",
    ],
    quiz: [
      { q: "Un client dit : « C’est trop beau pour être vrai, c’est une arnaque ? » Votre meilleure réponse ?", options: ["Pour la Confort, rien à payer avant la livraison : vous voyez et essayez la voiture avant de payer", "Faites-moi confiance, c’est tout", "Payez un acompte, vous verrez bien", "Je ne sais pas"], answer: 0, why: "Le paiement à la livraison est l’argument le plus rassurant." },
      { q: "Combien coûte environ une Citroën Ami neuve ?", options: ["Environ 8 000 €", "Environ 2 000 €", "Environ 30 000 €", "Elle est gratuite"], answer: 0, why: "Environ 8 000 €, avec beaucoup moins d’équipements." },
      { q: "Chez Aixam ou Ligier, une sans permis électrique neuve coûte souvent…", options: ["15 000 € ou plus", "3 000 €", "Moins de 1 000 €", "Le même prix que NeoDrive"], answer: 0, why: "Souvent 15 000 € ou plus." },
      { q: "Le client dit « 70 km, ce n’est pas assez ». Que faites-vous ?", options: ["Je lui demande combien de km il fait par jour et j’explique la recharge à la maison", "Je lui dis que c’est 150 km", "Je lui conseille un concurrent", "Je change de sujet"], answer: 0, why: "La plupart des trajets font moins de 70 km, et on recharge la nuit." },
      { q: "Le client dit « je vais réfléchir ». Quelle est la meilleure relance ?", options: ["« Bien sûr. Qu’est-ce qui vous fait hésiter ? »", "« Décidez-vous maintenant ou c’est trop tard. »", "« D’accord, au revoir. »", "« Je vous fais une remise si vous signez. »"], answer: 0, why: "On relance avec une question pour comprendre le vrai frein." },
      { q: "Que peut-on proposer à un client qui hésite ?", options: ["La réservation gratuite, sans paiement", "Un acompte de 500 €", "Une remise exceptionnelle", "Un paiement en espèces"], answer: 0, why: "La réservation est gratuite, aucun acompte." },
      { q: "Un client compare avec une Fiat Topolino. Que dites-vous ?", options: ["On compare des faits : chez NeoDrive, grand coffre, caméra de recul, chauffage, Bluetooth, alarme, à un prix accessible", "La Topolino est une mauvaise voiture", "Achetez plutôt une Topolino", "Je ne connais pas"], answer: 0, why: "On compare avec respect, sur les faits." },
      { q: "Un client demande s’il peut trouver moins cher d’occasion sur Leboncoin. Vous…", options: ["Ne le renvoyez jamais vers l’occasion ; vous rappelez neuf, garantie 2 ans, paiement à la livraison pour la Confort", "Lui conseillez Leboncoin", "Lui donnez le lien d’un concurrent", "Lui dites que l’occasion est interdite"], answer: 0, why: "On ne renvoie jamais vers l’occasion, Leboncoin ou un concurrent." },
      { q: "« La voiture est chinoise ? » Quelle réponse est correcte ?", options: ["Elle est fabriquée en usine et importée par NeoDrive, marque toulousaine ; neuve, garantie 2 ans, structure en acier", "Non, elle est 100 % fabriquée à Toulouse", "Je ne veux pas en parler", "Oui, et il n’y a pas de garantie"], answer: 0, why: "On reste honnête et on rassure avec les faits." },
      { q: "Le client dit clairement « non merci, ça ne m’intéresse pas ». Vous…", options: ["Le remerciez poliment et vous arrêtez", "Le rappelez tous les jours", "Lui proposez une remise", "Insistez encore 10 minutes"], answer: 0, why: "Si le client refuse, on le remercie et on s’arrête." },
    ],
  },

  // ───────────────────────────── 7
  {
    key: "ecrit",
    icon: "💬",
    title: "WhatsApp, SMS et écrit",
    summary: "Écrire un message clair et poli, les horaires d’appel, ce qu’on ne promet jamais.",
    lessons: [
      {
        title: "Un bon message",
        list: [
          "Vouvoiement, poli, chaleureux.",
          "Court : 3 à 6 phrases, une seule idée importante, une seule question.",
          "Sans faute : on se relit avant d’envoyer.",
          "Précis : modèle, prix total, ville. Jamais de chiffre approximatif.",
          "On termine simplement : « Je reste à votre disposition. »",
        ],
        text: ["Le client lit souvent sur son téléphone : il faut qu’il comprenne en 10 secondes."],
      },
      {
        title: "Les mots à éviter",
        text: [
          "On ne dit jamais « pardon ». On préfère « excusez-moi » ou « merci pour votre patience ».",
          "On évite les mots qui font peur comme « vendre », « vente », « achetez maintenant ». On dit « acquérir votre voiture », « nous vous la livrons ».",
          "On ne parle pas d’« entrepôt » : « votre voiture est en cours de préparation ».",
        ],
      },
      {
        title: "Ce qu’on ne promet jamais",
        text: ["Sans l’accord écrit de Mansour, on ne promet jamais :"],
        list: ["un remboursement ;", "une remise ou un geste commercial ;", "une date de livraison précise ;", "une prise en charge par le SAV ou la garantie."],
      },
      {
        title: "Respecter le client",
        list: [
          "Si le client répond STOP ou ne veut plus être contacté : on arrête tout de suite, on ne le relance plus jamais, et on le note.",
          "Horaires d’appel pour les particuliers en France : du lundi au vendredi, de 10 h à 13 h et de 14 h à 20 h. Pas d’appel le samedi, le dimanche ni les jours fériés.",
          "Attention au décalage horaire : ce sont les heures de France qui comptent.",
          "WhatsApp : si le client n’a pas écrit depuis plus de 24 h, WhatsApp ne permet pas de lui écrire librement. On l’appelle.",
          "On ne demande jamais de coordonnées bancaires par message.",
        ],
      },
    ],
    say: [
      "« Bonjour Madame Martin, merci pour votre message. La NeoDrive Confort vous revient à 5 830 € tout compris, livrée chez vous. Je reste à votre disposition. »",
      "« Excusez-moi pour l’attente, je reviens vers vous avec la réponse. »",
      "« C’est noté, nous ne vous recontacterons plus. Bonne journée. »",
    ],
    never: [
      "Dire « pardon ».",
      "Promettre un remboursement, une remise, une date ou une prise en charge SAV sans l’accord écrit de Mansour.",
      "Relancer quelqu’un qui a dit STOP.",
      "Appeler un particulier le week-end, un jour férié, ou en dehors de 10 h–13 h / 14 h–20 h.",
    ],
    quiz: [
      { q: "Quels sont les horaires d’appel autorisés pour les particuliers ?", options: ["Du lundi au vendredi, 10 h–13 h et 14 h–20 h", "Tous les jours de 8 h à 22 h", "Le samedi et le dimanche seulement", "À n’importe quelle heure"], answer: 0, why: "En semaine, 10 h–13 h et 14 h–20 h (heure de France), jamais le week-end ni les jours fériés." },
      { q: "Peut-on appeler un particulier le samedi ?", options: ["Non", "Oui", "Oui, le matin", "Seulement s’il est d’accord par SMS"], answer: 0, why: "Pas d’appel le week-end ni les jours fériés." },
      { q: "Un client répond « STOP ». Que faites-vous ?", options: ["J’arrête tout de suite, je ne le relance plus et je le note", "Je le rappelle pour comprendre", "Je lui envoie une promotion", "J’attends une semaine et je réécris"], answer: 0, why: "STOP est respecté immédiatement et définitivement." },
      { q: "Quel mot ne doit-on jamais utiliser ?", options: ["« Pardon »", "« Merci »", "« Bonjour »", "« Je reste à votre disposition »"], answer: 0, why: "On dit plutôt « excusez-moi » ou « merci pour votre patience »." },
      { q: "Un client demande à être remboursé de la livraison. Vous…", options: ["Ne promettez rien et transmettez à Mansour", "Lui promettez le remboursement", "Lui faites un virement", "Lui dites que c’est impossible pour toujours"], answer: 0, why: "Aucune promesse de remboursement sans l’accord écrit de Mansour." },
      { q: "Un client veut une date de livraison précise. Vous…", options: ["Ne promettez pas de date sans l’accord de Mansour ; on l’appelle à l’avance pour fixer le jour", "Lui donnez une date au hasard", "Lui promettez demain", "Lui dites qu’on ne livre pas"], answer: 0, why: "Les dates sont fixées par NeoDrive, pas promises au hasard." },
      { q: "Quelle longueur pour un message WhatsApp ?", options: ["Court : 3 à 6 phrases, une seule question", "Le plus long possible", "Un seul mot", "Une page entière"], answer: 0, why: "Le client doit comprendre en quelques secondes." },
      { q: "Le client n’a pas écrit sur WhatsApp depuis plus de 24 h. Que faites-vous ?", options: ["Je l’appelle : WhatsApp ne permet pas de lui écrire librement", "Je lui envoie 5 messages", "Je lui écris par e-mail son RIB", "J’abandonne le contact"], answer: 0, why: "Hors fenêtre de 24 h, on appelle." },
      { q: "Quelle formule est la bonne ?", options: ["« Votre voiture est en cours de préparation. »", "« Votre voiture est à l’entrepôt. »", "« Achetez maintenant ! »", "« Pardon pour le retard. »"], answer: 0, why: "Pas d’« entrepôt », pas de pression, pas de « pardon »." },
      { q: "Peut-on promettre qu’une réparation sera prise en charge ?", options: ["Non, jamais sans l’accord écrit de Mansour", "Oui, toujours", "Oui, si le client insiste", "Oui, si c’est le week-end"], answer: 0, why: "La prise en charge est une décision de Mansour." },
    ],
  },

  // ───────────────────────────── 8
  {
    key: "sav",
    icon: "🛠️",
    title: "Service après-vente (1er niveau)",
    summary: "Rassurer, comprendre le problème, ouvrir un ticket, suivre, transmettre à Mansour.",
    lessons: [
      {
        title: "Votre rôle",
        text: [
          "Quand un client qui a déjà sa NeoDrive appelle pour un problème, vous êtes le premier niveau : vous rassurez, vous comprenez, vous ouvrez un ticket, vous suivez. Les décisions techniques (pièce, réparation, prise en charge) appartiennent à Mansour.",
          "Avec un client SAV, on ne fait pas la présentation commerciale : on dit bonjour, qu’on va l’aider, et on commence à comprendre le problème. Une question à la fois.",
        ],
      },
      {
        title: "Les cas fréquents",
        list: [
          "Autonomie plus faible que prévu : on demande un test précis. Recharger complètement pendant 12 h sur une prise classique (sans rallonge enroulée), noter le kilométrage au départ, rouler normalement jusqu’à ce que la voiture ralentisse, noter le kilométrage à l’arrivée, et nous envoyer les deux chiffres. Le froid, les côtes, le poids et des pneus mal gonflés réduisent l’autonomie : c’est normal.",
          "La vitesse baisse dans les côtes ou quand la batterie est basse : c’est normal, la voiture protège sa batterie et son moteur. On demande le niveau de charge affiché, et si cela arrive aussi batterie pleine sur du plat.",
          "La voiture ne charge pas : vérifier la prise avec un autre appareil, éviter les rallonges, vérifier que le câble est bien enfoncé des deux côtés, regarder le voyant de charge. Demander une photo du tableau de bord pendant la charge.",
          "Autre problème : quels symptômes, depuis quand, y a-t-il un message ou un voyant au tableau de bord ?",
        ],
        text: [],
      },
      {
        title: "Sécurité d’abord",
        text: ["Freins qui fonctionnent mal, mouvement imprévu, fumée, odeur de brûlé, batterie abîmée ou fils visibles : le client arrête immédiatement d’utiliser la voiture, ne la recharge pas, et on ouvre un ticket. On ne guide que des contrôles visuels, voiture à l’arrêt, sans démontage."],
      },
      {
        title: "Ouvrir et suivre un ticket",
        list: [
          "Le ticket s’ouvre sur la page SAV du site (/sav).",
          "On rassemble : nom, téléphone, e-mail, numéro de série de la voiture (VIN, sur la carte grise case E), une description claire, et des photos ou une courte vidéo (environ 30 secondes).",
          "Le client reçoit une référence (SAV-…). Avec cette référence et son e-mail, il suit sa demande en ligne.",
          "On rappelle le client pour faire le point, on note tout, et on transmet à Mansour dès qu’il faut une pièce ou un avis technique.",
        ],
        text: [],
      },
      {
        title: "Accident, litige, remboursement",
        text: ["Ces dossiers sont repris directement par Mansour. Vous écoutez, vous notez, vous transmettez."],
      },
    ],
    say: [
      "« Je suis là pour vous aider. Pouvez-vous me décrire ce qui se passe ? »",
      "« Pouvez-vous m’envoyer une photo ou une petite vidéo de 30 secondes ? »",
      "« J’ouvre votre demande : un technicien l’étudie et revient vers vous. »",
      "« Par sécurité, n’utilisez plus la voiture et ne la rechargez pas pour le moment. »",
    ],
    never: [
      "Promettre une prise en charge, un remboursement, un délai ou une intervention à domicile.",
      "Guider un démontage ou une manipulation électrique.",
      "Prendre une décision technique à la place de Mansour.",
      "Envoyer le client vers l’outil NeoDiag (pas encore disponible).",
    ],
    quiz: [
      { q: "Un client SAV appelle. Par quoi commencez-vous ?", options: ["Le rassurer et comprendre le problème, une question à la fois", "Lui présenter la Confort Plus", "Lui promettre un remboursement", "Lui dire de rappeler plus tard"], answer: 0, why: "Pas de présentation commerciale : on aide, on comprend." },
      { q: "Où s’ouvre un ticket SAV ?", options: ["Sur la page SAV du site (/sav)", "Sur Leboncoin", "Par courrier uniquement", "Chez un concessionnaire"], answer: 0, why: "La page /sav crée le ticket et donne une référence de suivi." },
      { q: "Que faut-il rassembler pour le ticket ?", options: ["Nom, contact, VIN, description claire, photos ou vidéo", "Seulement le prénom", "Le RIB du client", "Rien, Mansour devinera"], answer: 0, why: "Plus la demande est précise, plus la réponse est rapide." },
      { q: "Où trouver le numéro de série (VIN) ?", options: ["Sur la carte grise, case E", "Sur le pneu", "Sur la clé", "Sur la facture d’électricité"], answer: 0, why: "Le VIN figure en case E de la carte grise (et sur le COC)." },
      { q: "Un client sent une odeur de brûlé. Que lui dites-vous ?", options: ["Arrêter d’utiliser la voiture, ne pas la recharger, et on ouvre un ticket", "Continuer à rouler", "Démonter la batterie", "Mettre de l’eau dessus"], answer: 0, why: "Sécurité d’abord : arrêt immédiat, pas de recharge." },
      { q: "Un client trouve que l’autonomie est faible. Que demandez-vous ?", options: ["Un test : charge complète de 12 h, km au départ et à l’arrivée", "De changer la batterie lui-même", "D’acheter une autre voiture", "Rien, c’est normal"], answer: 0, why: "Le test donne des chiffres précis pour le technicien." },
      { q: "La vitesse baisse dans une forte côte. C’est…", options: ["Normal : la voiture protège sa batterie et son moteur", "Forcément un défaut grave", "Interdit par la loi", "Causé par la radio"], answer: 0, why: "C’est le fonctionnement normal ; on vérifie quand même le niveau de charge." },
      { q: "Le client demande si la réparation sera gratuite. Vous…", options: ["Ne promettez rien : c’est Mansour qui décide", "Dites oui", "Dites non", "Lui demandez de payer d’avance"], answer: 0, why: "Jamais de promesse de prise en charge." },
      { q: "La voiture ne charge pas. Première vérification ?", options: ["Tester la prise avec un autre appareil, éviter les rallonges", "Ouvrir le moteur", "Changer le câble par un câble de téléphone", "Attendre un mois"], answer: 0, why: "Souvent, le problème vient de la prise ou de la rallonge." },
      { q: "Un client a eu un accident et parle de litige. Vous…", options: ["Écoutez, notez et transmettez à Mansour", "Réglez le litige vous-même", "Lui promettez une voiture neuve", "Lui raccrochez au nez"], answer: 0, why: "Accident, litige, remboursement : Mansour reprend le dossier." },
    ],
  },

  // ───────────────────────────── 9
  {
    key: "outils",
    icon: "🧰",
    title: "Les outils NeoDrive",
    summary: "L’espace équipe (prospects), Ringover, les comptes-rendus, le rapport du jour, les priorités.",
    lessons: [
      {
        title: "L’espace équipe (prospects)",
        text: [
          "Vous vous connectez avec votre code personnel sur l’espace Organisation, puis vous ouvrez « Prospects ». Votre code est strictement personnel et confidentiel.",
          "Vous voyez uniquement les contacts qui vous sont attribués. Des filtres vous aident : Tous, À rappeler, Nouveaux, Chauds.",
          "Votre activité est enregistrée (connexion, fiches ouvertes, appels, messages). Il est interdit de copier, photographier ou transmettre les informations des clients.",
        ],
      },
      {
        title: "Appeler avec Ringover",
        text: [
          "Les appels passent par l’application web Ringover, avec la ligne de l’entreprise. Sur la fiche du client, le bouton « Appeler » lance l’appel : vous décrochez sur Ringover. Le numéro du client reste masqué.",
          "Vous n’appelez jamais un client avec votre numéro personnel.",
        ],
      },
      {
        title: "Le compte-rendu d’appel",
        text: ["Après chaque appel, vous choisissez un résultat et vous écrivez une note courte (ce que le client a dit, ses questions, son budget, sa ville). Si besoin, vous fixez la date du prochain rappel."],
        list: [
          "Injoignable : ça ne répond pas.",
          "Messagerie : vous avez laissé un message.",
          "À rappeler : le client demande à être rappelé (mettez la date).",
          "Intéressé : le client est intéressé.",
          "Devis envoyé : le client a reçu un devis.",
          "Réservation : le client a réservé.",
          "Pas intéressé : le client ne veut pas.",
          "Mauvais numéro : le numéro n’est pas le bon.",
        ],
      },
      {
        title: "Le rapport du jour",
        text: ["En fin de journée, vous envoyez votre rapport dans l’espace équipe : ce que vous avez fait, les clients prometteurs, les difficultés, vos questions."],
      },
      {
        title: "L’ordre des priorités",
        list: [
          "1. Les appels manqués : on rappelle d’abord les clients qui ont essayé de nous joindre.",
          "2. Les réservations à confirmer (les 3 questions de la confirmation ferme).",
          "3. Les prospects chauds.",
          "4. Les prospects récents.",
          "5. Le reste du fichier.",
        ],
        text: [],
      },
    ],
    say: [
      "Note de compte-rendu claire : « Mme Durand, 64 ans, Albi (81). Pour elle, courses et médecin. Intéressée par la Confort, total 5 590 €. Doit en parler à son fils. Rappel jeudi 18 h. »",
    ],
    never: [
      "Copier, photographier ou transmettre les données des clients.",
      "Prêter votre code d’accès à quelqu’un.",
      "Appeler un client avec votre téléphone personnel.",
      "Oublier le compte-rendu après un appel.",
    ],
    quiz: [
      { q: "Avec quoi appelez-vous les clients ?", options: ["L’application web Ringover, avec la ligne de l’entreprise", "Mon téléphone personnel", "Skype", "Un téléphone public"], answer: 0, why: "Toujours la ligne de l’entreprise via Ringover." },
      { q: "Quelle est la 1re priorité de la journée ?", options: ["Les appels manqués", "Le reste du fichier", "Les prospects anciens", "Le rapport du jour"], answer: 0, why: "Ordre : appels manqués, réservations à confirmer, chauds, récents, reste du fichier." },
      { q: "Quelle est la 2e priorité ?", options: ["Les réservations à confirmer", "Les prospects pas intéressés", "Les mauvais numéros", "Les réseaux sociaux"], answer: 0, why: "Juste après les appels manqués." },
      { q: "Le client n’a pas décroché et vous n’avez pas laissé de message. Quel résultat choisir ?", options: ["Injoignable", "Réservation", "Intéressé", "Pas intéressé"], answer: 0, why: "Injoignable = ça ne répond pas." },
      { q: "Vous avez laissé un message vocal. Quel résultat choisir ?", options: ["Messagerie", "Mauvais numéro", "Réservation", "Devis envoyé"], answer: 0, why: "Messagerie = message laissé." },
      { q: "Le client demande à être rappelé demain. Que faites-vous ?", options: ["« À rappeler » avec la date et l’heure du rappel", "« Pas intéressé »", "Rien", "« Réservation »"], answer: 0, why: "On met toujours la date du prochain rappel." },
      { q: "Que doit contenir le rapport du jour ?", options: ["Ce que vous avez fait, les clients prometteurs, les difficultés, vos questions", "Seulement « RAS »", "Les numéros de téléphone des clients", "Une photo de l’écran"], answer: 0, why: "C’est ce qui est demandé dans l’espace équipe." },
      { q: "Pouvez-vous faire une capture d’écran d’une fiche client pour la garder ?", options: ["Non, c’est interdit", "Oui", "Oui, si c’est pour vous", "Oui, le week-end"], answer: 0, why: "Il est interdit de copier, photographier ou transmettre les informations clients." },
      { q: "Qui voit les contacts de l’espace prospects ?", options: ["Vous voyez uniquement les contacts qui vous sont attribués", "Tout le monde sur internet", "Vos amis", "Personne"], answer: 0, why: "Chaque membre voit ses contacts attribués." },
      { q: "Après chaque appel, que faut-il faire ?", options: ["Enregistrer un compte-rendu (résultat + note)", "Rien", "Envoyer un SMS au fondateur", "Supprimer la fiche"], answer: 0, why: "Le compte-rendu permet à toute l’équipe de suivre le client." },
    ],
  },

  // ───────────────────────────── 10
  {
    key: "conteneurs",
    icon: "🚢",
    title: "Administratif et suivi des conteneurs",
    summary: "Pour le temps libre : comprendre un dossier conteneur et garder les papiers en ordre.",
    lessons: [
      {
        title: "Pourquoi des conteneurs ?",
        text: ["Nos voitures sont fabriquées en usine puis arrivent en France par bateau, dans des conteneurs. Chaque conteneur a son dossier, qu’il faut suivre et garder bien rangé. C’est une tâche pour le temps libre, si Mansour vous ouvre l’accès « Conteneurs »."],
      },
      {
        title: "Ce que contient un dossier conteneur",
        list: [
          "La facture commerciale de l’usine.",
          "La liste de colisage (packing list), avec les numéros de série (VIN) des voitures.",
          "Les certificats de conformité (COC), un par voiture.",
          "Le connaissement (B/L, bill of lading) : le document du transport maritime.",
          "Selon les cas : facture de transport, assurance, avis d’arrivée, documents de douane, photos du chargement.",
        ],
        text: [],
      },
      {
        title: "Le transitaire",
        text: ["Le transitaire est le prestataire qui s’occupe des formalités à l’arrivée (douane, dédouanement) pour le compte de NeoDrive. On lui envoie le dossier complet quand l’usine a déposé tous ses documents."],
      },
      {
        title: "Les étapes d’un conteneur",
        text: ["Dans l’outil Conteneurs, chaque dossier avance par étapes :"],
        list: ["commandé → en production → prêt usine → documents complets → en mer → avis d’arrivée → frais de débarquement payés → dédouané → livré au dépôt → dépoté → en stock."],
      },
      {
        title: "Bien tenir les dossiers",
        list: [
          "Vérifier que chaque document est bien classé dans le bon dossier.",
          "Vérifier que les VIN de la liste de colisage correspondent aux COC.",
          "Suivre la date d’arrivée prévue et signaler un retard à Mansour.",
          "Ne jamais transmettre un document à l’extérieur sans l’accord de Mansour : ces documents sont confidentiels.",
        ],
        text: [],
      },
    ],
    say: ["« Le dossier du conteneur est complet : facture, liste de colisage, COC et B/L. » (pour faire le point avec Mansour)"],
    never: [
      "Envoyer un document d’import à quelqu’un sans l’accord de Mansour.",
      "Parler des conteneurs, des arrivages ou d’« entrepôt » à un client.",
      "Modifier un document officiel.",
    ],
    quiz: [
      { q: "Comment nos voitures arrivent-elles en France ?", options: ["Par bateau, dans des conteneurs", "Par avion", "Elles roulent depuis l’usine", "Par la poste"], answer: 0, why: "Elles voyagent par bateau, en conteneurs." },
      { q: "Qu’est-ce que la liste de colisage (packing list) ?", options: ["La liste du contenu du conteneur, avec les VIN des voitures", "Le contrat d’assurance du client", "La liste des clients", "Le menu du livreur"], answer: 0, why: "Elle détaille le contenu, avec les numéros de série." },
      { q: "Qu’est-ce que le B/L ?", options: ["Le connaissement : le document du transport maritime", "Le bon de livraison du client", "Le bulletin de salaire", "Une marque de voiture"], answer: 0, why: "B/L = bill of lading, le connaissement." },
      { q: "Combien de COC dans un dossier ?", options: ["Un par voiture", "Un seul pour tout le conteneur", "Aucun", "Un par client"], answer: 0, why: "Chaque voiture a son certificat de conformité, avec son VIN." },
      { q: "Quel est le rôle du transitaire ?", options: ["Il s’occupe des formalités à l’arrivée (douane) pour NeoDrive", "Il vend les voitures", "Il répare les voitures", "Il fait la carte grise du client"], answer: 0, why: "Le transitaire gère les formalités d’import." },
      { q: "Quelle étape vient juste après « en mer » ?", options: ["Avis d’arrivée", "Commandé", "En production", "En stock"], answer: 0, why: "… en mer → avis d’arrivée → frais de débarquement payés → dédouané…" },
      { q: "Que vérifier entre la liste de colisage et les COC ?", options: ["Que les VIN correspondent", "Que les couleurs sont jolies", "Que les prix sont les mêmes que sur le site", "Rien"], answer: 0, why: "Chaque VIN doit avoir son COC." },
      { q: "Un contact extérieur vous demande une copie d’une facture usine. Vous…", options: ["Ne l’envoyez pas sans l’accord de Mansour", "L’envoyez tout de suite", "La publiez sur les réseaux", "La modifiez avant"], answer: 0, why: "Ces documents sont confidentiels." },
      { q: "Peut-on dire à un client « votre voiture est dans le conteneur qui arrive à l’entrepôt » ?", options: ["Non : on dit « votre voiture est en cours de préparation »", "Oui", "Oui, avec le numéro du conteneur", "Oui, s’il insiste"], answer: 0, why: "On ne parle ni de conteneur ni d’entrepôt au client." },
      { q: "Le suivi des conteneurs, c’est…", options: ["Une tâche pour le temps libre, après les appels prioritaires", "La priorité numéro 1 de la journée", "Interdit", "Le travail du client"], answer: 0, why: "Les clients passent d’abord : les conteneurs, c’est pour le temps libre." },
    ],
  },
];

export type ArgItem = { theme: string; objection: string; reponse: string };

/** Argumentaire rapide, à garder ouvert pendant les appels. */
export const ARGUMENTAIRE: ArgItem[] = [
  { theme: "Confiance", objection: "« C’est une arnaque ? C’est trop beau. »", reponse: "Je comprends. Pour la Confort, vous ne payez rien avant la livraison : vous voyez la voiture chez vous, vous l’essayez, et vous payez à ce moment-là. Je peux vous envoyer la vidéo d’une vraie livraison." },
  { theme: "Confiance", objection: "« Je n’ose pas acheter à distance. »", reponse: "C’est normal, beaucoup de nos clients nous l’ont dit. Aucun acompte, paiement à la livraison pour la Confort, garantie 2 ans, et vous avez 14 jours de rétractation comme pour tout achat à distance." },
  { theme: "Confiance", objection: "« C’est chinois ? »", reponse: "La voiture est fabriquée en usine et importée par NeoDrive, marque toulousaine. Elle est neuve, garantie 2 ans, avec une structure et une carrosserie en acier, pas en plastique." },
  { theme: "Prix", objection: "« Pourquoi c’est si peu cher ? »", reponse: "Nous achetons directement à l’usine et nous vous livrons sans intermédiaire : pas de concession, pas de magasin, pas de vendeur à payer. C’est ça qui fait le prix." },
  { theme: "Prix", objection: "« C’est trop cher. »", reponse: "Une Citroën Ami neuve coûte environ 8 000 €, sans caméra de recul ni radio. Chez Aixam ou Ligier, une électrique neuve coûte souvent 15 000 € ou plus. La Confort est à 4 990 €, bien équipée, garantie 2 ans." },
  { theme: "Prix", objection: "« Vous pouvez me faire une remise ? »", reponse: "Le prix est déjà au plus juste, grâce à l’achat direct à l’usine. Par contre, je peux vous calculer le prix exact tout compris, livré chez vous." },
  { theme: "Prix", objection: "« La livraison est chère. »", reponse: "C’est un vrai transport sur plateau, aller et retour, jusqu’à votre porte, avec l’explication de la voiture. Même avec la livraison et la carte grise, la Confort reste sous les 6 000 € tout compris." },
  { theme: "Prix", objection: "« Je peux venir la chercher ? »", reponse: "Nous n’avons pas d’accueil du public : c’est justement ce qui nous permet d’avoir des prix très bas. En échange, nous vous la livrons chez vous, et vous la voyez avant de payer." },
  { theme: "Paiement", objection: "« Je peux payer en plusieurs fois ? »", reponse: "Nous ne faisons pas de paiement en plusieurs fois. Le plus simple : demander un prêt à votre banque ou à votre assureur (Macif, MAIF, Groupama…). Vous pouvez aussi regarder notre page Financement sur le site." },
  { theme: "Paiement", objection: "« Comment je paie ? »", reponse: "Pour la Confort : par virement instantané le jour de la livraison, devant le livreur. Pensez à prévenir votre banque, ajouter notre RIB (envoyé quelques jours avant) et vérifier votre plafond." },
  { theme: "Produit", objection: "« 70 km, ce n’est pas assez. »", reponse: "Vous faites combien de kilomètres par jour ? La plupart des trajets du quotidien font moins de 70 km, et vous rechargez la nuit, à la maison, sur une simple prise." },
  { theme: "Produit", objection: "« Ça se recharge comment ? »", reponse: "Sur une prise électrique normale de la maison, en 6 h environ. Pas besoin de borne." },
  { theme: "Produit", objection: "« Pourquoi la Confort plutôt que l’Essentielle ? »", reponse: "Pour 1 000 € de plus : chauffage, caméra et radar de recul, assistance en côte, alerte au siège, radio Bluetooth USB, toit ouvrant avec ventilateurs, pare-soleil, enjoliveurs, alarme. Et elle est en stock : livrée en 2 à 3 semaines au lieu de 6 à 8 mois." },
  { theme: "Produit", objection: "« C’est solide ? »", reponse: "Structure et carrosserie en acier, pas en plastique : c’est robuste et rassurant. Et une conception simple avec peu de composants : la voiture est extrêmement fiable." },
  { theme: "Produit", objection: "Question technique que je ne connais pas (poids, pente, puissance…)", reponse: "« Je préfère vous donner une information exacte : je fais vérifier et je vous rappelle. » Puis demander à Mansour." },
  { theme: "Délai", objection: "« Quand est-ce que je l’aurai ? »", reponse: "La Confort est en stock : livrée en 2 à 3 semaines. Nous vous appelons à l’avance pour fixer le jour et l’heure ; la date peut varier un peu selon la route." },
  { theme: "Délai", objection: "« Je veux l’Essentielle (ou la Confort Plus). »", reponse: "Avec plaisir. Elle est fabriquée sur commande : 6 à 8 mois, avec paiement à la commande. La Confort est disponible tout de suite et se paie à la livraison. Si vous préférez quand même attendre, je respecte votre choix." },
  { theme: "Hésitation", objection: "« Je vais réfléchir. »", reponse: "Bien sûr. Qu’est-ce qui vous fait hésiter : le prix, le délai, ou autre chose ? (Répondre à ce point.) Vous pouvez aussi réserver gratuitement sur le site, sans aucun paiement." },
  { theme: "Hésitation", objection: "« Je dois demander à ma fille. »", reponse: "Bien sûr, c’est important. Je vous rappelle quel jour, après en avoir parlé ? (Noter « À rappeler » avec la date : pas de livraison programmée.)" },
  { theme: "Concurrents", objection: "« La Citroën Ami ? »", reponse: "Environ 8 000 € neuve, avec beaucoup moins d’équipements : pas de caméra de recul ni de radio d’origine. La Confort : 4 990 €, structure en acier, chauffage, caméra, Bluetooth." },
  { theme: "Concurrents", objection: "« La Fiat Topolino ? »", reponse: "Un joli design, mais un équipement plutôt simple, un coffre limité et un prix souvent plus élevé selon la version. Chez NeoDrive : grand coffre, caméra de recul, chauffage, Bluetooth, alarme." },
  { theme: "Concurrents", objection: "« Aixam, Ligier ? »", reponse: "Ce sont des marques connues, mais une sans permis électrique neuve chez elles coûte souvent 15 000 € ou plus. Avec NeoDrive, vous avez une voiture neuve, garantie 2 ans, pour moins de 6 000 € livrée." },
  { theme: "Loi", objection: "« Mon fils a 14 ans, il peut conduire ? »", reponse: "Oui, dès 14 ans, avec le permis AM (l’ancien BSR). Pensez aussi à l’assurance, obligatoire avant de rouler." },
  { theme: "Loi", objection: "« C’est garanti ? »", reponse: "Oui, la voiture est garantie 2 ans à partir de la livraison. Pour un problème, le client ouvre une demande sur la page SAV et un technicien l’étudie." },
  { theme: "Reprise", objection: "« Vous reprenez mon ancienne voiture ? »", reponse: "Nous ne faisons pas de reprise. Le mieux est de vendre votre ancien véhicule de votre côté." },
];
