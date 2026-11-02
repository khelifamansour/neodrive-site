/** Analyse par famille de produits — recherche du 2 novembre 2026 (sources dans chaque fiche).
 *  Les prix usine viennent d'annonces en ligne, pas de devis : à confirmer avant toute commande. */
import type { Cat } from "./sourcing";
export type Go = "go" | "test" | "later" | "no";
export type CatAnalysis = {
  cat: Cat; rank: number; go: Go; verdict: string; market: string; buyers: string; priceFr: string; fobRange: string;
  competition?: string; risks: string; season?: string; sources?: string;
  plan: { invest: string; unitsMonth: string; marginUnit: string; first: string };
};

export const ANALYSIS: CatAnalysis[] = [
  {
    cat: "vsp", rank: 1, go: "go",
    verdict: "Ton cœur de métier reste le meilleur : tu es 2× moins cher que les nouvelles chinoises « officielles » (Linktour 10 490 €, Bontu ≈ 10 000 €, Desner 13 500 €). Priorité : un fournisseur de secours avec un vrai COC, et une version lithium.",
    market: "24 977 immatriculations L6e/L7e en France en 2025 (−21 %). L’Ami recule, la Topolino progresse. La France = 30–35 % du marché européen.",
    buyers: "Ados 14–18 ans (parents), seniors, personnes sans permis ou en suspension.",
    priceFr: "Ami ≈ 8 000 € · Bontu, Linktour 10–11 k€ · Aixam/Ligier 10–17 k€",
    fobRange: "1 300–2 350 € (Entu, Yunlong) → 4 900–5 500 $ (Luqi EV300)",
    competition: "Linktour arrive chez Fnac/Darty (Modelabs), Bontu ouvre un réseau européen, NIU et EZI arrivent en 2026–2027 : le lithium va se vendre 8–10 k€.",
    risks: "Les « EEC COC » d’Alibaba sont des déclarations du vendeur : COC faux, d’un autre modèle, ou « 4 places en L6e » (impossible). Batterie plomb faible l’hiver.",
    plan: { invest: "0 € de plus (même conteneurs)", unitsMonth: "18 → 25 / mois", marginUnit: "≈ 950 € HT (ta Confort)", first: "Demander à Entu le COC (numéro e*168/2013) + photo de la plaque constructeur, et un prix lithium." },
    sources: "journalauto.com, cleanrider.com, evupdate.nl, alvolante.it",
  },
  {
    cat: "golfette", rank: 2, go: "test",
    verdict: "Meilleure nouvelle famille pour ta méthode : achetée 2 500–4 700 $, revendue 6 000–8 500 € face à 7 500–15 000 € neuf. Même remorque, même Leboncoin, et des clients pros (campings).",
    market: "Neuf : 7 500–10 000 € (2 places) et 10 000–15 000 € (4–6 places) non homologuées ; 14 000–25 000 € homologuées route. Location 55–130 €/jour. Marchés publics réguliers (îles de loisirs, départements).",
    buyers: "Campings, golfs, domaines et châteaux, hôtels, résidences, mairies, îles de loisirs, particuliers avec grand terrain.",
    priceFr: "7 500–15 000 € (privé) · 14 000–25 000 € (route)",
    fobRange: "2 300–6 900 $ · ≈ 16 par 40HQ (à confirmer)",
    competition: "Peu d’importateurs directs visibles ; TR Conseil vend déjà des chinoises (HDK, LVTONG S4) homologuées.",
    risks: "Sans COC : interdit sur la voie publique (amende, fourrière) → vendre en usage privé, clairement. Batteries plomb = mauvaises occasions : prendre du lithium.",
    season: "Mars–juin (campings et golfs s’équipent avant l’été).",
    plan: { invest: "≈ 8 000–10 000 € pour 2 golfettes test", unitsMonth: "2–4 / mois au début", marginUnit: "≈ 1 300–1 500 € HT", first: "Ajouter 2 golfettes lithium (Lvtong ou Excar) à un conteneur de voitures déjà prévu, à la place d’une voiture." },
    sources: "conseils.hellopro.fr, marchesonline.com, trconseil.com",
  },
  {
    cat: "utilitaire", rank: 3, go: "test",
    verdict: "Le plus gros écart de prix : Aixam Pro / Goupil > 16 800–20 000 € HT, l’utilitaire L6e chinois coûte 4 000–4 500 $. Peu de concurrence sur Leboncoin. Mais prouver le COC avant tout.",
    market: "Petits utilitaires électriques pour livraison urbaine, espaces verts, campings ; marchés publics (UGAP a retenu Ligier et Goupil).",
    buyers: "Artisans, paysagistes, mairies, campings, agriculteurs, livreurs.",
    priceFr: "16 800 € HT (Aixam utilitaire) à > 20 000 € HT (Goupil)",
    fobRange: "4 000–4 500 $ (L6e cargo) · 6 500–7 700 $ (L7e)",
    risks: "COC de la version cargo, charge utile réelle. Le L7e (Bontu BTE03) demande le permis B. Clients pros plus exigeants sur le SAV.",
    plan: { invest: "≈ 5 000 € pour 1 utilitaire de démonstration", unitsMonth: "1–2 / mois", marginUnit: "≈ 1 600 € HT (à 8 990 €) — plus si vendu 9 990 €", first: "Demander à Yunlong le COC du pickup L6e + photos réelles ; demander à Bontu le prix et l’exclusivité du BTE03." },
    sources: "alibaba.com, vanreviewer.co.uk, electrive.com",
  },
  {
    cat: "motoculture", rank: 4, go: "test",
    verdict: "Une vraie niche : la débroussailleuse radiocommandée. Achetée ≈ 2 850 $, elle vaut 9 800–15 000 € en marque européenne, aucun importateur français de Vigorun trouvé, et elle tient sur ta remorque.",
    market: "Radiocommandés : Panter X 14 990 €, RhinoMax dès 9 800 €, Loncin 12,5 ch 5 200 € HT. Autoportées 1 800–3 000 €. Motoculteurs ≈ 650 € (saturé).",
    buyers: "Particuliers avec grand terrain ou talus, paysagistes, entreprises d’espaces verts, collectivités, agriculteurs.",
    priceFr: "6 000–15 000 € (radiocommandé)",
    fobRange: "2 800–8 200 $ (Vigorun) · motoculteur 160 $ · fendeuse 730 $",
    competition: "Marques européennes chères (Energreen, Antolini, FSI, Panter). Motoculteurs et fendeuses : déjà inondés de marques chinoises.",
    risks: "Moteur Stage V obligatoire (beaucoup d’annonces disent seulement EPA), directive bruit 2000/14, marquage CE à ta charge. Pièces : chenilles, télécommandes. ÉVITER les robots de tonte (enquête antidumping UE).",
    season: "Mars–juin + débroussaillage obligatoire avant l’été. Commander en novembre–décembre pour recevoir avant mars.",
    plan: { invest: "≈ 6 000 € pour 2 machines test", unitsMonth: "2 / mois en saison", marginUnit: "≈ 1 450 € HT (à 5 990 €) — ≈ 2 500 € si vendue 7 490 €", first: "Écrire à Vigorun (sales@vigorun.com) : prix, certificat Stage V du moteur, test bruit, exclusivité France. À faire avant mi-décembre pour le printemps." },
    sources: "vigorun.com, conseils.hellopro.fr, trade.ec.europa.eu (AD745)",
  },
  {
    cat: "quad", rank: 5, go: "test",
    verdict: "UTV électrique : gros ticket (12 000–23 000 € neuf) et clientèle agricole/chasse. Hisun et Kandi ont des modèles homologués sans distributeur France. Prix usine inconnus : à demander.",
    market: "Hisun Sector E1 13 078 € (DE), CFMOTO U6 EV ≈ 23 000 €. Quad électrique homologué Hytrack MP4 4 990 €.",
    buyers: "Agriculteurs, éleveurs, chasseurs (silence), campings, collectivités, centres équestres.",
    priceFr: "12 000–24 000 € (UTV électrique)",
    fobRange: "Inconnu (fiches inaccessibles) — à demander",
    risks: "1 seul par remorque, peu par conteneur. Homologation (quad route : ≤ 20 ch, ≤ 550 kg). SAV exigeant. Concurrence thermique T3b très bon marché (< 3 000 €).",
    plan: { invest: "≈ 8 000–10 000 € pour 1 UTV démo", unitsMonth: "1 / mois", marginUnit: "≈ 2 500–5 000 € HT si FOB < 6 000 $", first: "Demander prix et exclusivité France à Hisun (Sector E1) et Kandi (10K EEC)." },
    sources: "neyer.de, seekingalpha.com, fwi.co.uk",
  },
  {
    cat: "chariot", rank: 6, go: "later",
    verdict: "Le chariot frontal lithium a un vrai écart (4 000–7 000 $ contre 19 000–25 000 € HT) mais il est trop lourd pour ta remorque, demande un dossier CE solide, du SAV et des clients pros. Plus tard, quand tu as un chauffeur et un plateau.",
    market: "Frontal lithium 1,5–1,8 t : 19 000–25 000 € HT. Gerbeur 3 000–4 000 € HT. Transpalette électrique 700–1 500 € HT (banalisé).",
    buyers: "TPE/PME, négoces, entrepôts, agriculteurs, garages, menuiseries.",
    priceFr: "19 000–25 000 € HT (frontal lithium de marque)",
    fobRange: "3 980–13 500 $ (frontal) · 1 200–4 000 $ (gerbeur)",
    competition: "Heli, Hangcha, EP, Noblelift ont déjà des réseaux. Il faut des usines de second rang (Mingyu, Tavol, STMA).",
    risks: "> 2,5 t (pas ta remorque), EN ISO 3691-1, CACES et VGP chez les clients, pièces de mât et batteries. Antidumping sur les transpalettes MANUELS.",
    plan: { invest: "≈ 6 000–7 000 € par chariot", unitsMonth: "1 / mois", marginUnit: "≈ 2 500 € HT", first: "Acheter 1 gerbeur pour TON dépotage (utile tout de suite) et tester la qualité de l’usine." },
    sources: "pallit.com, europe-forklift.com, conseils.hellopro.fr",
  },
  {
    cat: "tricycle", rank: 7, go: "later",
    verdict: "Bon produit pour les fermes et campings, mais ticket trop bas (2 000–4 500 €) pour ta méthode. À glisser en complément dans un conteneur.",
    market: "Scot-e 2 190 € HT, Schot-Mob 2 650–4 390 € HT, Cobrane 8 726 € TTC.",
    buyers: "Agriculteurs, maraîchers, campings, services techniques, seniors.",
    priceFr: "2 200–4 400 € HT",
    fobRange: "À demander (prix en ligne factices)",
    risks: "Homologation L2e/L5e rare, commandes minimum élevées (Jinpeng).",
    plan: { invest: "≈ 3 000 € pour 2–3 unités", unitsMonth: "1–2 / mois", marginUnit: "≈ 1 500–2 000 € HT", first: "Tu en as déjà 3 en production : mesure combien de temps ils mettent à se vendre." },
  },
  {
    cat: "chantier", rank: 8, go: "no",
    verdict: "Mini-pelle : marché déjà saturé d’importateurs chinois (4 000–7 000 € TTC livrée) et d’enchères de machines neuves. Plus d’arbitrage. Seule niche : mini chargeuse électrique, plus tard.",
    market: "Mini-pelle chinoise 1 t : 4 000–7 000 € TTC (Maxitrack, Pelle-Import, minipelles-import.fr, Leroy Merlin). Marque UE/JP : 15 000–18 000 € HT. Mini-dumper 2 500–4 500 € en magasin.",
    buyers: "Particuliers, paysagistes, artisans BTP, agriculteurs.",
    priceFr: "4 000–7 000 € (chinoise) · 15 000–18 000 € HT (marque)",
    fobRange: "2 100–3 800 $ (mini-pelle) · 7 300–8 900 $ (chargeuse)",
    competition: "Maxitrack France, Pelle-Import, minipelles-import.fr, CZN Machinery, enchères Troostwijk/Vavato.",
    risks: "Stage V moteur (saisie possible), règlement machines 2023/1230 au 20/01/2027, bruit 2000/14, pièces.",
    plan: { invest: "—", unitsMonth: "—", marginUnit: "≈ 1 000 € HT (et baisse)", first: "Ne pas y aller maintenant." },
  },
  {
    cat: "scooter", rank: 9, go: "no",
    verdict: "Écart trop faible (2 000–3 000 € face à 500–800 € de revient) et marques à réseau (Yadea, Segway, NIU). Complément de conteneur seulement, avec un COC L1e vérifié.",
    market: "Scooter électrique 50 cm³ : 1 300–6 000 €, modèles 2026 de 2–4 kW : 2 900–4 500 €.",
    buyers: "Jeunes 14 ans et plus, urbains, livreurs.",
    priceFr: "2 000–4 500 €",
    fobRange: "230–785 $ · ≈ 84 par 40HQ",
    risks: "COC L1e, SAV, batteries lithium (transport).",
    plan: { invest: "—", unitsMonth: "—", marginUnit: "faible", first: "Vendre les 2 scooters déjà commandés et voir." },
  },
  {
    cat: "agricole", rank: 10, go: "no",
    verdict: "Micro-tracteurs : les modèles homologués (Lovol M254) se vendent déjà 16–18 k€ comme un Kubota ; les chinois à 3 000 $ n’ont pas de COC → pas de carte grise. Pas d’arbitrage.",
    market: "Kubota B1241 15 900 €, LS XJ25 17 900 €, Lovol M254 17 880 €. Occasion japonaise 6 000–10 000 €.",
    buyers: "Particuliers avec terrain ou chevaux, maraîchers, paysagistes.",
    priceFr: "15 900–17 900 € TTC (homologué 25 ch)",
    fobRange: "2 750–3 500 $ (sans COC) · 10 000–11 000 $ (Stage V)",
    competition: "Lovol/Eurotek (≈ 10 concessions), YTO, LS, Solis, Kioti.",
    risks: "Réception UE 167/2013 pour la route, Stage V pour toutes les puissances, poids > remorque avec chargeur.",
    plan: { invest: "—", unitsMonth: "—", marginUnit: "—", first: "Éventuellement des outils sans moteur (girobroyeur, remorque) en complément." },
  },
];

export const ROADMAP: { when: string; title: string; steps: string[] }[] = [
  { when: "Novembre – mi-décembre 2026", title: "Demander les preuves (0 € dépensé)", steps: [
    "Envoyer 6 mails : Entu (COC voiture), Yunlong (utilitaire L6e), Lvtong + Excar (golfettes lithium), Vigorun (débroussailleuse + exclusivité), Bontu (BTE03), Hisun (UTV).",
    "Pour chacun : prix usine, COC ou certificat Stage V, nombre par conteneur, photos réelles, délai.",
    "Taper les réponses dans les fiches : le classement se recalcule tout seul.",
  ] },
  { when: "Mi-décembre 2026", title: "Décider du premier test", steps: [
    "Garder seulement les produits avec preuve (COC / CE / Stage V) et score ≥ 60.",
    "Dans le prochain conteneur de voitures, remplacer 1–2 voitures par 2 golfettes + 2 débroussailleuses (ou 1 utilitaire) : pas de conteneur en plus, pas de risque de trésorerie.",
  ] },
  { when: "Février – juin 2027", title: "Vendre en saison et mesurer", steps: [
    "Annonces Leboncoin dédiées + démarchage campings, golfs, mairies, paysagistes autour des hubs.",
    "Noter pour chaque produit : messages reçus, jours pour vendre, prix obtenu, problèmes SAV.",
  ] },
  { when: "Juillet – décembre 2027", title: "Agrandir ce qui marche", steps: [
    "Le produit gagnant passe à un demi-conteneur, puis un conteneur dédié.",
    "Utilitaires L7e et UTV quand le chauffeur et la 2e remorque sont là ; chariots élévateurs quand tu as un plateau.",
    "Étudier une concession (NIU, Bontu) pour une gamme lithium haut de gamme.",
  ] },
];
