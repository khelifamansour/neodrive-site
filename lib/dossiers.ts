/** Dossiers de décision : un produit = un dossier complet (marché, part visée, prix d'achat/vente, fournisseurs,
 *  1re commande, histoire mois par mois, trésorerie). Prix chinois = annonces (pas des devis) ; « est. » = estimation. */
export type Supplier = { name: string; city: string; url: string; model: string; fob: string; moq: string; certs: string; contact?: string };
export type Dossier = {
  id: string; name: string; group: "Véhicules" | "Équipements"; confidence: number; // 1–5 : solidité des données
  pOk: number;                               // chance que le produit soit conforme et passe (homologation, CE, douane) — calibrée sur les cas réels
  market: { units: number; label: string; src: string; est: boolean };
  sharePct: number;                          // part de marché visée en année 2 (%)
  leaders: { name: string; ca: string }[];
  fobUsd: number; freightUnit: number; dutyPct: number; otherUnit: number; // achat → arrivé chez toi
  sellTtc: number; extraUnit: number;        // prix de vente TTC ; frais par vente (livraison, pub, SAV, pose)
  firstOrder: { qty: number; month: number; why: string }; // mois de commande (1 = janvier)
  seasonMonths?: number[];                   // mois de vente forte (1–12), sinon toute l’année
  suppliers: Supplier[]; why: string[]; risks: string[]; next: string;
};
export const USD = 0.86;
export function numbers(d: Dossier) {
  const fobEur = d.fobUsd * USD, landed = fobEur * (1 + d.dutyPct / 100) + d.freightUnit + d.otherUnit;
  const ht = d.sellTtc / 1.2, margin = ht - landed - d.extraUnit;
  const yearUnits = d.market.units * d.sharePct / 100, perMonth = yearUnits / 12;
  return { fobEur, landed, ht, margin, yearUnits, perMonth, yearProfit: yearUnits * margin, budget: d.firstOrder.qty * landed, ratio: d.sellTtc / Math.max(1, landed) };
}
/** Trésorerie de la 1re commande, mois par mois (acompte 30 % à la commande, solde + fret à 2 mois, arrivée à 4 mois). */
export function cashCurve(d: Dossier, months = 12) {
  const n = numbers(d), q = d.firstOrder.qty, out: number[] = [];
  let cash = 0, stock = 0, sold = 0;
  for (let m = 0; m < months; m++) {
    if (m === 0) cash -= 0.3 * n.fobEur * q;
    if (m === 2) cash -= 0.7 * n.fobEur * q + (n.landed - n.fobEur) * q;
    if (m === 4) stock = q;
    if (m >= 4 && stock > 0) {
      const cal = ((d.firstOrder.month - 1 + m) % 12) + 1;
      const boost = !d.seasonMonths ? 1 : d.seasonMonths.includes(cal) ? 1.6 : 0.4;
      const ramp = m === 4 ? 0.3 : m === 5 ? 0.6 : 1; // il faut le temps de se faire connaître
      const s = Math.min(stock, Math.max(0.5, n.perMonth * boost * ramp));
      stock -= s; sold += s; cash += s * (n.ht - d.extraUnit);
    }
    out.push(cash);
  }
  const payback = out.findIndex(v => v >= 0);
  return { curve: out, payback: payback < 0 ? null : payback, sold };
}
export function score(d: Dossier) {
  const n = numbers(d);
  const money = Math.min(1, n.yearProfit * d.pOk / 150000), ratio = Math.min(1, (n.ratio - 1) / 2), conf = d.confidence / 5, cash = n.budget <= 30000 ? 1 : 0.6;
  return Math.round(100 * (0.45 * money + 0.2 * ratio + 0.25 * conf + 0.1 * cash) * (n.margin > 0 ? 1 : 0));
}
export const verdictOf = (sc: number): [string, string] => sc >= 60 ? ["🟢 Lancer", "#067647"] : sc >= 45 ? ["🟡 Tester petit", "#b54708"] : ["⏳ Attendre", "#7a8594"];
/** Meilleur plan pour un budget : on prend les dossiers par note décroissante tant que la 1re commande rentre dans le budget. */
export function planFor(budget: number, ds: Dossier[]) {
  const pick: { d: Dossier; budget: number }[] = []; let left = budget * 0.85; // 15 % gardés en sécurité (douane, imprévus)
  for (const d of [...ds].sort((a, b) => score(b) - score(a))) { const b = numbers(d).budget; if (score(d) >= 50 && b <= left) { pick.push({ d, budget: b }); left -= b; } }
  return { pick, left: left + budget * 0.15 };
}

const S = (name: string, city: string, url: string, model: string, fob: string, moq: string, certs: string, contact?: string): Supplier => ({ name, city, url, model, fob, moq, certs, contact });

export const DOSSIERS: Dossier[] = [
  { id: "golf", pOk: 0.85, name: "⛳ Golfettes électriques lithium 4 places (campings, domaines)", group: "Véhicules", confidence: 3,
    market: { units: 4300, label: "≈ 4 300 neuves / an", src: "Calcul : 733 golfs × 15 ÷ 6 ans + 7 460 campings × 35 % × 2,5 ÷ 7 ans + hôtels/collectivités", est: true }, sharePct: 1.2,
    leaders: [{ name: "Club Car / Garia", ca: "non publié" }, { name: "E-Z-GO (Textron)", ca: "non publié" }, { name: "Melex", ca: "non publié" }],
    fobUsd: 4000, freightUnit: 270, dutyPct: 10, otherUnit: 150, sellTtc: 8400, extraUnit: 690,
    firstOrder: { qty: 4, month: 11, why: "4 golfettes à la place de 2 voitures dans un conteneur : 1 démo par hub + 2 à vendre avant l’été." }, seasonMonths: [3, 4, 5, 6],
    suppliers: [S("Guangdong Lvtong", "Dongguan", "https://en.lvtong.com.cn", "LT-A627 (2–4 places)", "3 800–4 800 $", "1", "CE/EEC annoncés ; S4 homologuée route vendue en France", "mike@lvtong.com.cn"), S("Dongguan Excar", "Dongguan", "https://fr.made-in-china.com/co_excargolf", "4 places personnalisable", "4 300–5 000 $", "1", "CE annoncé")],
    why: ["Même usine, même remorque, même savoir-faire que tes VSP.", "Neuf en France : 7 500–15 000 € ; tu peux vendre ≈ 8 400 €.", "Antidumping américain : les usines chinoises cherchent des distributeurs européens → prix négociables."],
    risks: ["Usage privé seulement (sans COC route).", "Batteries lithium : exiger le BMS et la garantie.", "Risque que l’UE suive les USA (antidumping)."], next: "Mail à Lvtong et Excar : prix 4 places lithium, plan de chargement 40HQ, garantie batterie." },
  { id: "utility", pOk: 0.6, name: "🛻 Utilitaire sans permis L6e (benne / fourgon) « anti-Goupil »", group: "Véhicules", confidence: 3,
    market: { units: 2000, label: "≈ 2 000 utilitaires légers / an", src: "Goupil ≈ 750 en France + Aixam Pro ≈ 500 + Ligier Pro ≈ 300 + autres (estimation)", est: true }, sharePct: 1.5,
    leaders: [{ name: "Goupil (Polaris)", ca: "93 M€ (2024)" }, { name: "Aixam-Mega", ca: "≈ 208 M€ (2024)" }, { name: "Alkè", ca: "10,6 M€, 16 % de marge nette" }],
    fobUsd: 4250, freightUnit: 720, dutyPct: 10, otherUnit: 250, sellTtc: 14390, extraUnit: 900,
    firstOrder: { qty: 2, month: 11, why: "1 benne + 1 fourgon de démonstration : on les fait essayer aux campings, paysagistes et petites communes." },
    suppliers: [S("Shandong Yunlong Eco Technologies", "Shandong", "https://french.alibaba.com/f/coc-l6e.html", "L6e cargo pickup / fourgon", "4 000–4 500 $", "1", "« EEC COC » annoncé — à vérifier"), S("MCROWN EV", "Qingdao", "https://www.mcrownev.com", "L6e/L7e cargo car", "à demander", "?", "EEC L7e annoncé", "info@inquiry.mcrownev.com")],
    why: ["Goupil vend ≈ 3 000 véhicules/an à ≈ 30 k€ : le marché paie cher.", "Ta barrière (COC, carte grise) est exactement celle de ce marché.", "Une petite commune peut acheter sans appel d’offres sous 60 000 € HT."],
    risks: ["COC de la version cargo souvent mal documenté.", "Marchés publics de l’État verrouillés (UGAP).", "Clients pros exigeants sur le SAV."], next: "Demander à Yunlong et MCROWN le COC du cargo, la charge utile et le prix des carrosseries." },
  { id: "autoportee", pOk: 0.75, name: "🚜 Tondeuses autoportées sur batterie", group: "Véhicules", confidence: 2,
    market: { units: 135000, label: "≈ 135 000 autoportées / an", src: "Calcul depuis NielsenIQ-GfK (parts de marché de la motoculture)", est: true }, sharePct: 0.15,
    leaders: [{ name: "Husqvarna", ca: "groupe, n.d. France" }, { name: "Stiga", ca: "n.d." }, { name: "Etesia (pro)", ca: "41,9 M€ (2024)" }],
    fobUsd: 1470, freightUnit: 170, dutyPct: 1.7, otherUnit: 50, sellTtc: 2790, extraUnit: 310,
    firstOrder: { qty: 12, month: 11, why: "≈ ½ conteneur : arrivée en mars, pile pour la saison de tonte." }, seasonMonths: [3, 4, 5, 6, 7],
    suppliers: [S("à confirmer par la recherche", "Zhejiang", "https://www.accio.ai/find-product/rover-ride-on-mower-for-sale", "Autoportée lithium 38\"", "1 437–1 496 $", "5", "CE + EN ISO 5395 à exiger")],
    why: ["Même histoire que la VSP : vieux marché, marques chères, bascule vers la batterie.", "Électrique des marques : 3 400–5 800 € ; toi ≈ 2 790 €.", "Personne ne casse encore les prix en direct."],
    risks: ["Saison courte (mars–juillet) : stock payé en hiver.", "Autonomie et garantie batterie.", "Marge unitaire modeste."], next: "3 devis + 1 échantillon pour tester l’autonomie réelle." },
  { id: "mower", pOk: 0.65, name: "🌱 Débroussailleuses radiocommandées (pentes)", group: "Véhicules", confidence: 3,
    market: { units: 1050, label: "≈ 1 050 / an (800–1 500)", src: "Europe ≈ 96 M€ ÷ 18 000 € × 20 % France (estimation)", est: true }, sharePct: 2.5,
    leaders: [{ name: "Energreen, RoboFlail, McConnel", ca: "n.d." }, { name: "Iseki (gamme)", ca: "n.d." }],
    fobUsd: 2850, freightUnit: 215, dutyPct: 2, otherUnit: 80, sellTtc: 5990, extraUnit: 530,
    firstOrder: { qty: 3, month: 11, why: "1 démo + 2 à vendre aux paysagistes avant la saison de débroussaillage obligatoire." }, seasonMonths: [3, 4, 5, 6],
    suppliers: [S("Vigorun Intelligent Tech", "Weifang, Shandong", "https://vigorun.com", "Débroussailleuse à chenilles, pente 40°", "2 800–2 900 $", "1", "CE annoncé ; Stage V à prouver", "sales@vigorun.com")],
    why: ["Marques européennes : 9 800–40 000 € ; chinoise ≈ 2 850 $.", "Débroussaillage obligatoire : 52 départements depuis avril 2026.", "Aucun importateur Vigorun trouvé en France."],
    risks: ["Certificat Stage V du moteur et test bruit.", "Pièces : chenilles, télécommandes."], next: "Demander à Vigorun le certificat moteur et l’exclusivité France." },
  { id: "foodtruck", pOk: 0.5, name: "🍔 Remorques food-truck homologuées", group: "Véhicules", confidence: 2,
    market: { units: 800, label: "≈ 800 / an (estimation)", src: "600–700 food-trucks actifs + snacks de marché (ventes annuelles non publiées)", est: true }, sharePct: 3,
    leaders: [{ name: "Beau Comme Un Camion", ca: "3,5 M€" }, { name: "Hedimag, Concept Mag", ca: "n.d." }],
    fobUsd: 5000, freightUnit: 1100, dutyPct: 2.7, otherUnit: 1500, sellTtc: 16800, extraUnit: 800,
    firstOrder: { qty: 2, month: 11, why: "2 remorques : on teste l’homologation (réception à titre isolé) et la vente avant le printemps." }, seasonMonths: [2, 3, 4, 5],
    suppliers: [S("à confirmer par la recherche", "Henan / Shanghai", "https://www.alibaba.com/product-detail/Concession-Food-Trailer-Mobile-Bar-Food_1601295689774.html", "Remorque snack 4 m", "1 500–5 900 $", "1", "CE annoncé ; COC européen à exiger")],
    why: ["France : 15 000–25 000 € ; Chine ≈ 5 000 $.", "La barrière (homologation + carte grise VASP) est TON métier."],
    risks: ["Réception individuelle en DREAL : peut demander des modifications.", "Petit marché, saisonnier."], next: "Trouver un fabricant avec COC européen et chiffrer la réception à titre isolé." },
  { id: "led", pOk: 0.8, name: "📺 Écrans LED de vitrine « clé en main »", group: "Équipements", confidence: 2,
    market: { units: 5000, label: "≈ 5 000 écrans vitrine / an (estimation)", src: "111 177 coiffeurs, 34 000 boulangeries, 10 400 kebabs… (nombre d’écrans vendus non publié)", est: true }, sharePct: 1,
    leaders: [{ name: "Enseignistes et intégrateurs locaux", ca: "fragmenté" }],
    fobUsd: 650, freightUnit: 30, dutyPct: 0, otherUnit: 150, sellTtc: 4800, extraUnit: 850,
    firstOrder: { qty: 4, month: 11, why: "4 écrans de 2 m² : 1 en démo, 3 vendus à des commerces près de tes hubs." },
    suppliers: [S("à confirmer par la recherche", "Shenzhen", "https://fr.made-in-china.com/factory/p2-5-led-module.html", "Écran transparent P2.5 (2 m²)", "216–338 €/m²", "1 m²", "CE (CEM, basse tension)")],
    why: ["Chine 216–338 €/m², France 2 000–4 200 €/m².", "Le commerçant paie pour qu’on s’occupe de tout (réglage, cerfa mairie, pose).", "Minuscule dans le conteneur."],
    risks: ["Pose électrique par un partenaire.", "Autorisation préalable en mairie selon la commune."], next: "2 devis Shenzhen + 1 électricien partenaire par hub." },
  { id: "barber", pOk: 0.9, name: "💈 Fauteuils barbier / coiffure (packs salon)", group: "Équipements", confidence: 3,
    market: { units: 16000, label: "≈ 16 000 fauteuils / an (estimation)", src: "111 177 salons (UNEC 2024) × ≈ 5 % qui rénovent / an × ≈ 3 postes", est: true }, sharePct: 0.5,
    leaders: [{ name: "Takara Belmont, Pietranera, Salon Ambience", ca: "n.d." }],
    fobUsd: 250, freightUnit: 40, dutyPct: 2.7, otherUnit: 20, sellTtc: 900, extraUnit: 110,
    firstOrder: { qty: 12, month: 11, why: "12 fauteuils (≈ 6 m³) : 2 packs salon de 4 + 4 à l’unité, showroom dans chaque hub." },
    suppliers: [S("à confirmer par la recherche", "Foshan", "https://m.made-in-china.com/hot-china-products/Salon_Chair.html", "Fauteuil barbier hydraulique", "140–350 $", "1–2", "meuble (CE si électrique)")],
    why: ["111 177 salons et +2 %/an.", "Aucune réglementation.", "Écart de prix 3–5×."],
    risks: ["Qualité de la pompe hydraulique et du simili-cuir.", "Concurrence en ligne sur l’entrée de gamme."], next: "Échantillon de 2 modèles avant la commande." },
  { id: "garage", pOk: 0.7, name: "🔧 Pack garage : pont élévateur 4 t + démonte-pneus (avec pose)", group: "Équipements", confidence: 3,
    market: { units: 4000, label: "≈ 4 000 ponts / an (estimation)", src: "≈ 42 000 garages (INSEE) × ≈ 10 % qui s’équipent / an", est: true }, sharePct: 1,
    leaders: [{ name: "Weber, Ravaglioli, distributeurs", ca: "n.d." }],
    fobUsd: 900, freightUnit: 100, dutyPct: 1.7, otherUnit: 40, sellTtc: 2868, extraUnit: 490,
    firstOrder: { qty: 4, month: 11, why: "4 ponts posés chez des garages près des hubs (pose + contrôle annuel)." },
    suppliers: [S("à confirmer par la recherche", "Yantai / Shanghai", "https://m.made-in-china.com/catlist/Car-Lift-2901010000.html", "Pont 2 colonnes 4 t", "715–1 100 $", "1", "CE machines à vérifier")],
    why: ["Chine 715–1 100 $, France 1 400–3 100 € HT hors pose.", "La pose et la vérification annuelle obligatoire écartent Amazon.", "Consommables récurrents."],
    risks: ["Responsabilité en cas de chute : RC pro solide.", "Dossier CE sérieux obligatoire."], next: "Devis + dossier CE de 2 usines ; un poseur partenaire." },
  { id: "glace", pOk: 0.7, name: "🍦 Machines à glace italienne (snacks, campings)", group: "Équipements", confidence: 2,
    market: { units: 3000, label: "≈ 3 000 / an (estimation)", src: "snacks, glaciers, campings, fast-foods (non publié)", est: true }, sharePct: 1,
    leaders: [{ name: "Carpigiani, Gel Matic", ca: "n.d. France" }],
    fobUsd: 1400, freightUnit: 90, dutyPct: 2, otherUnit: 40, sellTtc: 4790, extraUnit: 430,
    firstOrder: { qty: 3, month: 10, why: "3 machines arrivées en février : démo aux campings et snacks avant la saison." }, seasonMonths: [2, 3, 4, 5],
    suppliers: [S("à confirmer par la recherche", "Guangzhou / Shanghai", "https://china.org.ru/product/60288912865", "2+1 parfums, 40 L/h", "1 245–1 504 $", "1", "CE ; gaz R290 à exiger")],
    why: ["France 4 500–5 200 € HT ; Chine ≈ 1 300 $.", "Démo + formation + SAV : on ne l’achète pas sur Internet."],
    risks: ["Gaz frigorigène (F-gas) et contact alimentaire.", "Saison courte."], next: "Exiger le R290 et la déclaration CE complète." },
  { id: "bainfroid", pOk: 0.7, name: "🧊 Bains froids avec groupe froid", group: "Équipements", confidence: 2,
    market: { units: 15000, label: "≈ 15 000 / an (estimation, non publiée)", src: "catégorie en forte croissance chez Decathlon (non chiffrée)", est: true }, sharePct: 0.5,
    leaders: [{ name: "Netspa (Poolstar)", ca: "n.d." }],
    fobUsd: 300, freightUnit: 25, dutyPct: 2, otherUnit: 15, sellTtc: 899, extraUnit: 140,
    firstOrder: { qty: 8, month: 11, why: "8 kits (≈ 2,4 m³) : vente aux clubs, salles et kinés." },
    suppliers: [S("Shaoxing Yuanran", "Shaoxing", "https://icebathfactory.en.made-in-china.com/product-list-1.html", "Bain gonflable + chiller 1/3 HP", "188–260 $", "?", "CE à vérifier, gaz R290 à exiger"), S("Smartmak", "Hebei", "https://smartmak.en.made-in-china.com/product-group/EMGfRVrxRHco/ICE-BATH-COLD-PLUNGE-catalog-1.html", "Bain + chiller", "à demander", "?", "CE à vérifier")],
    why: ["Chiller lourd et technique : démo et dépannage locaux.", "Meilleure marge/m³ chez les particuliers."],
    risks: ["Marché non chiffré (mode ?).", "Gaz frigorigène."], next: "1 échantillon de chaque usine." },
  { id: "massage", pOk: 0.8, name: "💆 Fauteuils de massage 4D zéro gravité", group: "Équipements", confidence: 2,
    market: { units: 20000, label: "≈ 20 000 / an (estimation)", src: "Jetform seul > 5 000/an ; marché non publié", est: true }, sharePct: 0.3,
    leaders: [{ name: "Jetform", ca: "> 5 000 fauteuils/an" }, { name: "VEVOR (en ligne)", ca: "n.d." }],
    fobUsd: 750, freightUnit: 80, dutyPct: 2, otherUnit: 40, sellTtc: 1790, extraUnit: 280,
    firstOrder: { qty: 4, month: 7, why: "4 fauteuils arrivés en novembre : showroom avant Noël." }, seasonMonths: [11, 12],
    suppliers: [S("Moway Massage", "Chine", "https://mowaymassage.en.made-in-china.com", "4D SL track", "1 025–1 390 $ (haut) ; milieu 450–800 $", "?", "CE, EN 60335-2-32 à exiger")],
    why: ["On veut l’essayer avant de payer 1 600 €.", "Produit lourd livré à l’étage."],
    risks: ["Aucune allégation médicale.", "VEVOR en ligne."], next: "Comparer 2 modèles milieu de gamme." },
];
