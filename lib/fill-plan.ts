/** Plan de remplissage du volume libre d'un conteneur 40' HC de 9 VSP (recherche du 02/11/2026).
 *  Prix FOB = annonces, pas des devis. Coûts rendus et ventes = estimations. */
export const FREE_SPACE = { containerM3: 76, carsM3: 47, insideCarsM3: "11–13", aroundM3: "15–20", freeTonnes: 20 };
export type FillLot = { id: string; verdict: "🟢" | "🟡" | "❌"; name: string; qty: string; m3: number; cost: number; sales: number; margin: number;
  priceFr: string; fob: string; suppliers: { name: string; url: string }[]; sell: string; docs: string; perMonth: string };
export const FILL_PLAN: FillLot[] = [
  { id: "vsp", verdict: "🟢", name: "🔩 Pièces d’usure VSP (courroies variateur, plaquettes R90, filtres, kits Kubota Z402/Z482)", qty: "≈ 1 030 pièces", m3: 2.5, cost: 6000, sales: 18000, margin: 12000,
    priceFr: "Plaquettes 23 €, courroie variateur 35–40 €, variateur complet 545 € (origine)", fob: "Courroie 2–6 $, plaquettes 2–5 $, filtres 0,5–2 $, kit Kubota 15–40 $",
    suppliers: [{ name: "Ton usine de VSP (kit 1re révision + pièces d’usure)", url: "" }, { name: "Kingdarn (courroies)", url: "https://www.made-in-china.com" }, { name: "SINOCMP / BAILEPARTS (Kubota)", url: "https://www.fridayparts.com/overhaul-rebuild-kit-for-kubota-z402-engine" }],
    sell: "Site avec recherche par modèle, Leboncoin Pro, eBay/ManoMano ; garages VSP et centres de contrôle technique de l’Oise et de Haute-Garonne.", docs: "Homologation E (R90 plaquettes, R43 vitrage, éclairage), table de correspondance des références d’origine.", perMonth: "300–600 pièces après 6 mois" },
  { id: "disques", verdict: "🟢", name: "💎 Disques diamant 230/125 mm (marque propre)", qty: "1 000 disques", m3: 1.2, cost: 4000, sales: 16000, margin: 12000,
    priceFr: "Sans marque 19 € ; Bosch 49 €, Norton 69,90 €", fob: "230 mm pro 3–6 $ ; 125 mm 1–2,5 $",
    suppliers: [{ name: "Quanzhou Sunny Superhard Tools", url: "https://sunnydiamondtools.com/230mm-saw-blade/" }, { name: "Danyang NYCL Tools", url: "https://freshdi.com/supplier/Danyang-NYCL-Tools-Manufacturing-Co-Ltd-Iy5oEw" }],
    sell: "Lots de 5/10 ; aux artisans (clients des mini-camions), négoces indépendants, loueurs ; Leboncoin, ManoMano.", docs: "EN 13236:2019 + marquage complet sur chaque disque (vitesse max, sens, traçabilité) — obligatoire (décret 2003-158).", perMonth: "150–300 disques" },
  { id: "sds", verdict: "🟢", name: "🪛 Coffrets de forets SDS-plus (5–7 pièces)", qty: "300 coffrets", m3: 0.5, cost: 1500, sales: 4500, margin: 3000,
    priceFr: "Bosch 7 forets 16,80 € ; Erbauer 5 forets 21,99 €", fob: "2,5–5 $",
    suppliers: [{ name: "Danyang (mêmes usines que les disques)", url: "https://freshdi.com/supplier/Danyang-NYCL-Tools-Manufacturing-Co-Ltd-Iy5oEw" }],
    sell: "Avec les disques, aux mêmes artisans.", docs: "Fiche technique.", perMonth: "40–60 coffrets" },
  { id: "moto", verdict: "🟢", name: "🌿 Pièces adaptables motoculture (chaînes, lames, courroies, carburateurs, filtres)", qty: "≈ 1 800 pièces", m3: 2.5, cost: 5550, sales: 17000, margin: 11450,
    priceFr: "Chaîne 19–29 €, carburateur adaptable 45 €, lame autoportée 33 €", fob: "Chaîne 2–5 $, carburateur 3–8 $, lame 2–5 $, filtre 0,3–1 $",
    suppliers: [{ name: "Yongkang Paradise Garden Tools", url: "https://b2usa.com/hotsite/yongkangparadise" }, { name: "Yongkang Vauban / Lishui Senwei (chaînes)", url: "https://www.made-in-china.com/factory/chainsaw-chains.html" }],
    sell: "Agriculteurs, campings, collectivités ; Leboncoin, site, ateliers de motoculture.", docs: "Fiche technique + compatibilités ; adhésion REP ABJ.", perMonth: "200–400 pièces (printemps-été)" },
  { id: "cam", verdict: "🟢", name: "📷 Caméras 4G solaires en pack B2B (caméra + SIM + réglage)", qty: "150 caméras", m3: 2.3, cost: 8250, sales: 15000, margin: 6750,
    priceFr: "Grand public 80–180 € ; ton pack pro 199–249 € HT", fob: "36–75 $",
    suppliers: [{ name: "Shenzhen Sectec", url: "https://sourcing.hktdc.com/en/Product-Detail/4G-Solar-Camera-with-36X-Zoom-Optical-Lens-Dual-View-PTZ-Camera--1Z03PB3HI" }, { name: "Shenzhen Anyuan", url: "https://b2brazil.com/hotsite/shenzhenanyuan/20x-zoom-6mp-4g-camera-ip66-metal-10w-so" }],
    sell: "Campings, fermes, chantiers, avec installation ; pas en concurrence frontale avec Amazon.", docs: "Déclaration RED + rapports EN 301 511/908, 300 328, 301 489, 62368-1, 62311, EN 18031 (cybersécurité) ; UN38.3 ; notice FR.", perMonth: "15–25 packs" },
  { id: "led", verdict: "🟡", name: "💡 Projecteurs LED 50 W rechargeables (vente croisée)", qty: "300", m3: 3, cost: 3900, sales: 11100, margin: 7200,
    priceFr: "45–56 € (Prolight 50 W)", fob: "8–20 $",
    suppliers: [{ name: "Ningbo Linkbond / Boyi", url: "https://www.globalsources.com/Work-light/work-light-1221198887p.htm" }],
    sell: "En plus des disques et du camion, aux artisans.", docs: "CE LVD/CEM (EN 60598-2-8, EN 55015, EN 61547), UN38.3, IP.", perMonth: "30–50" },
];
export const FILL_AVOID = [
  "❌ Pneus : antidumping 4,3–45,3 % sur les pneus chinois tourisme et utilitaires depuis le 07/07/2026.",
  "❌ Carrosserie VSP depuis la Chine : trop volumineuse (< 1 500 € de marge par m³) ; en Europe, RDM Ricambi (Italie) la fabrique déjà.",
  "❌ Vêtements de travail / gants EN 388 : 12 % de droits, gros volume, certification EPI.",
  "❌ Batteries et cadres de vélos/trottinettes : antidumping vélo et marchandises dangereuses.",
  "🟡 Sol SPC : aucun antidumping, très dense, mais marge < ×2,5 (option « lest » seulement).",
  "🟡 Extensions de cheveux : rentables et pas des cosmétiques, mais hors de ton métier et très concurrentiel.",
  "❌ Maquillage : dossier de sécurité par produit + personne responsable UE + déclaration CPNP.",
];

/** Gamme « Atelier & Chantier » — produits vus sur Leboncoin (PRP-Machines, France-Serres…), étude du 02/11/2026. Unités/mois = estimations. */
export type ShopItem = { rank: number; name: string; verdict: string; fob: string; landed: number; priceFr: string; perMonth: number; marginUnit: number; m3: number; note: string };
export const WORKSHOP: ShopItem[] = [
  { rank: 1, name: "Mini dumper chenilles 500 kg (Stage V)", verdict: "🟢", fob: "1 000–1 500 $ (Rongyixin, Landward)", landed: 1380, priceFr: "PRP 2 199 € · Lumag 2 499 € · Scheppach 2 599 €", perMonth: 4, marginUnit: 450, m3: 1.4, note: "Moteur Stage V obligatoire ; pic mars–juin ; paysagistes, agriculteurs, campings." },
  { rank: 2, name: "Plieuse de tôle / couvreur 3,1 m", verdict: "🟢", fob: "≈ 1 800 $ (Maanshan Ruiyi, Harsle)", landed: 1830, priceFr: "PRP 3 999 € · Redden 2 295 €", perMonth: 1.5, marginUnit: 1300, m3: 1.3, note: "Couvreurs/zingueurs ; échantillon pour tester sur zinc." },
  { rank: 3, name: "Chauffage infrarouge diesel 16 kW", verdict: "🟢", fob: "580–750 $ (Zhejiang Zobo)", landed: 625, priceFr: "PRP 2 019 € · Torros 1 330 € HT · Master ≈ 920 €", perMonth: 3, marginUnit: 530, m3: 0.3, note: "Saison oct.–fév. : arrivée en septembre." },
  { rank: 4, name: "Table de soudure 3D 1200×2400 + kits de serrage", verdict: "🟡", fob: "1 200–1 860 $ (Botou Bozhong, Wuxi Lemar)", landed: 1400, priceFr: "PRP 2 199–2 249 € · premium 3 000–15 000 €", perMonth: 2, marginUnit: 750, m3: 1.3, note: "≈ 500 kg : livraison palette 150–250 €." },
  { rank: 5, name: "Cabine de sablage 990 L", verdict: "🟢", fob: "450–550 $ (Haining Lee-Ding)", landed: 650, priceFr: "PRP 1 915–2 299 € · MW Tools 1 345–1 946 € HT", perMonth: 2, marginUnit: 650, m3: 1.0, note: "Garages, carrossiers, restaurateurs." },
  { rank: 6, name: "Laser CO2 1390 découpe/gravure", verdict: "🟡", fob: "2 500–3 800 $ (Lintcnc, Jinan DLM)", landed: 3150, priceFr: "Leboncoin 3 990–9 890 €", perMonth: 0.5, marginUnit: 2000, m3: 3.0, note: "Laser classe 4 : SAV technique, sécurité." },
  { rank: 7, name: "Rôtissoire de carrosserie", verdict: "🟢", fob: "365–550 $ (Jiaxing Ouya, Lee-Ding)", landed: 470, priceFr: "PRP 1 169 € · MW Tools 1 530 €", perMonth: 2, marginUnit: 500, m3: 0.35, note: "Niche, peu de vendeurs." },
  { rank: 8, name: "Cabine de sablage 350 L", verdict: "🟢", fob: "≈ 150–300 $ (Lee-Ding)", landed: 260, priceFr: "PRP 699 €", perMonth: 3, marginUnit: 300, m3: 0.5, note: "" },
  { rank: 9, name: "Dumper 800 kg auto-chargeur", verdict: "🟡", fob: "2 000–5 700 $ (Ant, Taian Mountain)", landed: 3400, priceFr: "PRP 5 199 € · Jansen 4 599 €", perMonth: 1, marginUnit: 900, m3: 2.6, note: "Marge incertaine : devis." },
  { rank: 10, name: "Machines à étincelles froides (lot de 4) + poudre", verdict: "🟡", fob: "114–320 $ / machine ; poudre 10–12 $ / 200 g", landed: 850, priceFr: "2 400 € le lot · recharge 25–40 €", perMonth: 1, marginUnit: 900, m3: 0.15, note: "Événementiel ; FDS de la poudre." },
  { rank: 11, name: "Scie à ruban métal 170 mm", verdict: "🟡", fob: "850–910 $ (Mingchuang, WMT)", landed: 885, priceFr: "PRP 1 539 € · Sidamo 1 247 € HT", perMonth: 2, marginUnit: 400, m3: 0.5, note: "Concurrence nombreuse." },
  { rank: 12, name: "Petite table de soudure mobile", verdict: "🟢", fob: "150–250 $", landed: 225, priceFr: "PRP 499 €", perMonth: 4, marginUnit: 180, m3: 0.25, note: "" },
  { rank: 13, name: "Presse d’atelier 20 t", verdict: "🟡", fob: "110–250 $", landed: 200, priceFr: "PRP 499 € · Holzmann 348 € HT", perMonth: 4, marginUnit: 180, m3: 0.25, note: "Produit d’appel." },
  { rank: 14, name: "Dumper électrique 500 kg", verdict: "🟡", fob: "2 000–3 700 $ (Kndmax)", landed: 2400, priceFr: "≈ 3 490 € (estimation)", perMonth: 1, marginUnit: 650, m3: 1.4, note: "Batterie : UN38.3." },
  { rank: 15, name: "Serre tunnel 3×6 m", verdict: "🟡", fob: "35–60 $", landed: 70, priceFr: "France-Serres 265 € · ManoMano 244 €", perMonth: 6, marginUnit: 110, m3: 0.12, note: "Saison fév.–mai, marché saturé." },
  { rank: 16, name: "Servante d’atelier plan bois", verdict: "🟡", fob: "52–215 $", landed: 200, priceFr: "PRP 789 € · Brico Dépôt 199–399 €", perMonth: 2, marginUnit: 300, m3: 0.4, note: "" },
  { rank: 17, name: "Mobilier d’atelier modulaire", verdict: "❌", fob: "1 194–1 629 $", landed: 1450, priceFr: "PRP 1 199–2 099 €", perMonth: 1, marginUnit: 400, m3: 3.0, note: "Trop volumineux." },
  { rank: 18, name: "Cintreuse électrique garde-corps", verdict: "🟡", fob: "900–2 000 $", landed: 1600, priceFr: "PRP 2 599 €", perMonth: 0.5, marginUnit: 700, m3: 0.8, note: "Modèle exact + devis." },
  { rank: 19, name: "Rameur / musculation", verdict: "❌", fob: "150–480 $", landed: 400, priceFr: "2 362 € (Concept2 ≈ 1 100 €)", perMonth: 0.5, marginUnit: 300, m3: 0.5, note: "Hors cible." },
  { rank: 20, name: "Fontaine de dégraissage", verdict: "❌", fob: "40–80 $", landed: 80, priceFr: "89–250 €", perMonth: 3, marginUnit: 30, m3: 0.25, note: "Seulement en complément." },
];
export const WORKSHOP_FIRST = { lines: [
  { name: "Mini dumper 500 kg Stage V", qty: 6, m3: 8.4, fobUsd: 7800 }, { name: "Cabine de sablage 990 L", qty: 6, m3: 6, fobUsd: 3000 },
  { name: "Cabine de sablage 350 L", qty: 6, m3: 3, fobUsd: 1200 }, { name: "Rôtissoire de carrosserie", qty: 6, m3: 2.1, fobUsd: 2700 },
  { name: "Presse 20 t", qty: 10, m3: 2.5, fobUsd: 1500 }, { name: "Table 3D 1200×2400 + 4 kits", qty: 2, m3: 2.8, fobUsd: 3000 },
  { name: "Pièces et consommables", qty: 1, m3: 0.5, fobUsd: 800 }], landedEur: 22500, marginEur: 15000, perMonthEur: 5300,
  note: "Un seul fournisseur (Haining Lee-Ding) pour cabines, rôtissoires et fontaines. 2e conteneur (arrivée sept.) : chauffages IR, plieuses, scies, petites tables, réassort dumpers." };
