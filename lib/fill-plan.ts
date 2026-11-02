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
