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
    leaders: [{ name: "ORA Véhicules Électriques (distributeur Club Car, Labarthe-sur-Lèze 31 — à côté de ton hub !)", ca: "non publié" }, { name: "ORA e-Cars (location longue durée)", ca: "parc de 6 000 golfettes" }, { name: "Liberty Electric Motion (location)", ca: "8 M€ (2021)" }],
    fobUsd: 4000, freightUnit: 270, dutyPct: 10, otherUnit: 150, sellTtc: 8400, extraUnit: 690,
    firstOrder: { qty: 4, month: 11, why: "4 golfettes à la place de 2 voitures dans un conteneur : 1 démo par hub + 2 à vendre avant l’été." }, seasonMonths: [3, 4, 5, 6],
    suppliers: [S("Guangdong Lvtong", "Dongguan", "https://en.lvtong.com.cn", "LT-A627 (2–4 places)", "3 800–4 800 $ (2 places) ; 4 places lithium : devis à demander (revendue 13 500 $ en Ukraine)", "1", "CE à exiger + test batterie", "mike@lvtong.com.cn / eason@lvtong.com"), S("Dongguan Excar Electric Vehicle", "Liaobu, Dongguan", "https://fr.made-in-china.com/co_excargolf", "golfette 2–6 places", "4 000–6 000 $", "1", "profil vérifié SGS (créée en 2016)")],
    why: ["Même usine, même remorque, même savoir-faire que tes VSP.", "Neuf en France : 7 500–15 000 € ; tu peux vendre ≈ 8 400 €.", "Antidumping américain : les usines chinoises cherchent des distributeurs européens → prix négociables.", "16 golfettes 4 places par 40HQ (toit et siège démontés) selon un fournisseur."],
    risks: ["Usage privé seulement (sans COC route).", "Batteries lithium : exiger le BMS et la garantie.", "Risque que l’UE suive les USA (antidumping).", "Des importateurs vendent déjà des 4 places lithium 2 790–4 230 € hors frais : il faut la qualité + le SAV pour vendre 8 400 €."], next: "Mail à Lvtong et Excar : prix 4 places lithium, plan de chargement 40HQ, garantie batterie." },
  { id: "utility", pOk: 0.6, name: "🛻 Utilitaire sans permis L6e (benne / fourgon) « anti-Goupil »", group: "Véhicules", confidence: 3,
    market: { units: 2000, label: "≈ 2 000 utilitaires légers / an", src: "Goupil ≈ 750 en France + Aixam Pro ≈ 500 + Ligier Pro ≈ 300 + autres (estimation)", est: true }, sharePct: 1.5,
    leaders: [{ name: "Goupil (Polaris) — G4 lithium ≈ 24 800 €", ca: "93 M€ (2024)" }, { name: "Aixam Truck (Espagne) — dès 18 254 €", ca: "—" }, { name: "Bontu BTE03 (arrive par l’Italie) — 12 000–14 000 €", ca: "concurrent direct" }, { name: "Aixam-Mega", ca: "≈ 208 M€ (2024)" }, { name: "Alkè", ca: "10,6 M€, 16 % de marge nette" }],
    fobUsd: 4250, freightUnit: 720, dutyPct: 10, otherUnit: 250, sellTtc: 14390, extraUnit: 900,
    firstOrder: { qty: 2, month: 11, why: "1 benne + 1 fourgon de démonstration : on les fait essayer aux campings, paysagistes et petites communes." },
    suppliers: [S("Shandong Yunlong Eco Technologies (bev-cars.com)", "Shandong", "https://de.accio.com/plp/elektro-lieferwagen", "Fourgon L6e EEC COC (≈ 4 000–4 500 $) ; camion L7e COC (7 500–7 700 $)", "4 000–7 700 $", "1", "« EEC L1e–L7e COC » revendiqué — vérifier le numéro e-xx et la plaque VIN"), S("MCROWN EV", "Qingdao", "https://www.mcrownev.com", "L6e/L7e cargo car", "à demander", "?", "EEC L7e annoncé", "info@inquiry.mcrownev.com")],
    why: ["Goupil vend ≈ 3 000 véhicules/an à ≈ 30 k€ : le marché paie cher.", "Ta barrière (COC, carte grise) est exactement celle de ce marché.", "Une petite commune peut acheter sans appel d’offres sous 60 000 € HT."],
    risks: ["COC de la version cargo souvent mal documenté.", "Marchés publics de l’État verrouillés (UGAP).", "Clients pros exigeants sur le SAV.", "Contrôle technique des quadricycles lourds depuis le 01/01/2026."], next: "Demander à Yunlong et MCROWN le COC du cargo, la charge utile et le prix des carrosseries." },
  { id: "autoportee", pOk: 0.75, name: "🚜 Tondeuses autoportées sur batterie", group: "Véhicules", confidence: 1,
    market: { units: 100000, label: "≈ 100 000 autoportées / an (estimation)", src: "Pas de donnée récente publique (AXEMA/Promojardin) ; estimation depuis NielsenIQ-GfK", est: true }, sharePct: 0.15,
    leaders: [{ name: "Husqvarna France", ca: "224 M€ (2024), 243 M€ (2025)" }, { name: "Popster batterie chez Mr Bricolage", ca: "2 499 € TTC (concurrence)" }, { name: "Stiga", ca: "n.d." }, { name: "Etesia (pro)", ca: "41,9 M€ (2024)" }],
    fobUsd: 1470, freightUnit: 170, dutyPct: 1.7, otherUnit: 50, sellTtc: 2490, extraUnit: 310,
    firstOrder: { qty: 2, month: 11, why: "2 échantillons seulement : aucun fabricant trouvé ne publie à la fois un CE et un prix vérifiables, et la grande distribution vend déjà ≈ 2 500 €." }, seasonMonths: [3, 4, 5, 6, 7],
    suppliers: [S("Weibang (vendue au Royaume-Uni/UE)", "Chine", "https://www.justlawnmowers.co.uk/weibang-ion-81-rc-battery-ride-on-lawn-mower.html", "Ion 81 RC lithium 81 cm (3 999 $ au détail aux USA)", "non publié", "?", "vendue en UE → CE probable, DoC à demander"), S("Chongqing Lead Motor Tech", "Chongqing", "https://b2brazil.com/hotsite/chongqingleadmotor/electric-lawn-mower", "Autoportée électrique", "non publié", "?", "aucun CE mentionné (non vérifiée)")],
    why: ["Même histoire que la VSP : vieux marché, marques chères, bascule vers la batterie.", "Électrique des marques : 3 400–5 800 € ; toi ≈ 2 790 €.", "Personne ne casse encore les prix en direct."],
    risks: ["Saison courte (mars–juillet) : stock payé en hiver.", "Autonomie et garantie batterie.", "Marge unitaire modeste."], next: "3 devis + 1 échantillon pour tester l’autonomie réelle." },
  { id: "mower", pOk: 0.65, name: "🌱 Débroussailleuses radiocommandées (pentes)", group: "Véhicules", confidence: 3,
    market: { units: 800, label: "≈ 600–1 050 / an (estimation)", src: "Europe ≈ 96 M€ ÷ 18 000 € × 20 % ; une autre recherche dit « quelques centaines »", est: true }, sharePct: 2.5,
    leaders: [{ name: "Energreen (RoboMini)", ca: "n.d." }, { name: "Iseki France (radiocommandées)", ca: "n.d." }, { name: "Prix France : Rhino800 dès 5 200 € HT, Panter X 12 492 € HT, électriques 28–40 k€", ca: "" }],
    fobUsd: 2850, freightUnit: 215, dutyPct: 2, otherUnit: 80, sellTtc: 5990, extraUnit: 530,
    firstOrder: { qty: 2, month: 11, why: "1 thermique + 1 électrique 48 V (l’électrique évite le problème du Stage V). Palier à 2 580 $ dès 10 unités une fois les certificats obtenus." }, seasonMonths: [3, 4, 5, 6],
    suppliers: [S("Vigorun Intelligent Tech", "Weifang, Shandong", "https://b2usa.com/hotsite/vigorunintelligent/rubber-track-remote-control-slope-mower-", "VTLM800 (60°, Loncin 452 cc) ou 48 V électrique", "2 900 $ (1–9) · 2 580 $ (≥ 10)", "1", "« CE, EPA, Euro 5 » — Euro 5 n’est PAS le Stage V", "sales@vigorun.com"), S("SuperShine Robot", "Weifang, Shandong", "https://www.goldsupplier.com/provide/p173742609.html", "Tondeuse de pente à chenilles", "850–2 500 $", "1 set", "EPA/Euro 5 déclaratif")],
    why: ["Marques européennes : 9 800–40 000 € ; chinoise ≈ 2 850 $.", "Débroussaillage obligatoire : 52 départements depuis avril 2026.", "Aucun importateur Vigorun trouvé en France."],
    risks: ["Certificat Stage V du moteur et test bruit.", "Pièces : chenilles, télécommandes."], next: "Demander à Vigorun le certificat moteur et l’exclusivité France." },
  { id: "foodtruck", pOk: 0.5, name: "🍔 Remorques food-truck homologuées", group: "Véhicules", confidence: 2,
    market: { units: 800, label: "≈ 800 / an (estimation)", src: "600–700 food-trucks actifs + snacks de marché (ventes annuelles non publiées)", est: true }, sharePct: 3,
    leaders: [{ name: "Beau Comme Un Camion (Castelnaudary) — 20–39 k€", ca: "3,5 M€" }, { name: "Mazaki — 13–35 k€", ca: "n.d." }, { name: "Remorques Vérène — 12–25 k€", ca: "n.d." }],
    fobUsd: 10500, freightUnit: 1100, dutyPct: 2.7, otherUnit: 800, sellTtc: 21900, extraUnit: 800,
    firstOrder: { qty: 2, month: 11, why: "2 remorques : on teste l’homologation (réception à titre isolé) et la vente avant le printemps." }, seasonMonths: [2, 3, 4, 5],
    suppliers: [S("Shanghai Huanmai Machinery Technology", "Shanghai", "https://www.truck1.sg/dealers/huanmai", "MA-210 (essieu AL-KO 1 600 kg, style Airstream possible)", "9 000–15 000 € FOB", "1", "« COC européen disponible » (déclaratif) ; 500 unités/mois revendiquées"), S("Henan Camp Industrial", "Zhengzhou, Henan", "https://kr.made-in-china.com/factory/pizza-trailer.html", "remorques food trailer OEM", "à demander", "?", "COC UE non attribué")],
    why: ["France 3–4 m : 15 000–25 000 € ; fabricant chinois avec COC : 9 000–15 000 € FOB (les coques à 5 000 $ n’ont pas de COC).", "La barrière (homologation + carte grise VASP) est TON métier."],
    risks: ["Réception individuelle en DREAL : peut demander des modifications.", "Petit marché, saisonnier."], next: "Trouver un fabricant avec COC européen et chiffrer la réception à titre isolé." },
  { id: "led", pOk: 0.8, name: "📺 Écrans LED de vitrine « clé en main »", group: "Équipements", confidence: 2,
    market: { units: 5000, label: "≈ 5 000 écrans vitrine / an (estimation)", src: "19 627 pharmacies (Ordre des pharmaciens 2024), 111 177 coiffeurs, 34 000 boulangeries… (nombre d’écrans vendus non publié)", est: true }, sharePct: 1,
    leaders: [{ name: "Prismaflex International (affichage)", ca: "51,2 M€ (2025-26), dont matériel 15,9 M€" }, { name: "Enseignistes et intégrateurs locaux", ca: "fragmenté" }],
    fobUsd: 650, freightUnit: 30, dutyPct: 0, otherUnit: 150, sellTtc: 4800, extraUnit: 850,
    firstOrder: { qty: 4, month: 11, why: "≈ 10 m² au total : 4 écrans (2 posters P2.5 + 2 transparents P3.9), 1 en démo, 3 vendus à des pharmacies et commerces près de tes hubs. Moins de 2 m³ dans le conteneur." },
    suppliers: [
      S("Shenzhen LEDventure", "Shenzhen", "https://m.made-in-china.com/company-szledventure/", "Écran poster / vitrine P2.5", "180–389 $ / pièce ou m² (annonce)", "1", "CE (CEM + basse tension) et RoHS à exiger"),
      S("Shenzhen WeiGu Electronic", "Shenzhen", "https://www.globalsources.com/Transparent-display/Outdoor-Transparent-LED-Display-1231040597p.htm", "LED transparent P3.91, 3 500 cd/m²", "≈ 1 600 $ / m² (annonce 2023, à revérifier)", "1 m²", "à demander"),
      S("Nexnovo", "Shenzhen", "https://www.sixteen-nine.net/?p=20417", "LED transparent / film (fabricant reconnu)", "sur devis", "?", "à demander")],
    why: ["Chine 180–1 600 $/m² selon le type ; France 2 000–4 200 €/m² (transparent) ou 3 000–8 000 € l’écran vitrine pharmacie.", "Le commerçant paie pour qu’on s’occupe de tout (réglage, déclaration mairie, pose).", "Minuscule dans le conteneur."],
    risks: ["Écart de prix énorme entre annonces : seuls des devis tranchent.", "Pose électrique par un partenaire ; demander 2–3 % de modules de rechange et un contrôleur Novastar."], next: "3 devis (LEDventure, WeiGu, Nexnovo) avec rapports CE + 1 électricien partenaire par hub." },
  { id: "barber", pOk: 0.9, name: "💈 Fauteuils barbier / coiffure (packs salon)", group: "Équipements", confidence: 3,
    market: { units: 16000, label: "≈ 16 000 fauteuils / an (estimation)", src: "111 177 salons fin 2024 (UNEC, +1,7 %/an) × ≈ 5 % qui rénovent / an × ≈ 3 postes", est: true }, sharePct: 0.5,
    leaders: [{ name: "Maletti (Italie, collection Barber)", ca: "non publié" }, { name: "Grossistes FR (Mobicoiff…)", ca: "à vérifier sur Pappers" }],
    fobUsd: 300, freightUnit: 40, dutyPct: 2.7, otherUnit: 20, sellTtc: 900, extraUnit: 110,
    firstOrder: { qty: 12, month: 11, why: "12 fauteuils en 2–3 modèles (vintage or/noir, moderne, 1 électrique) ≈ 5–6 m³ : 2 packs salon de 4 + 4 à l’unité, showroom dans chaque hub. MOQ 1–2 : on panache." },
    suppliers: [
      S("Foshan Great Furniture", "Foshan (Guangdong)", "https://salonchair.en.made-in-china.com/", "Fauteuil barbier vintage cuir, hydraulique ; électrique 760–850 $", "340–380 $", "1–2", "meuble (CE si électrique)"),
      S("Foshan Yayou Furniture", "Foshan (Guangdong)", "https://www.made-in-china.com/products-search/hot-china-products/Salon_Furniture_Barber_Chair.html", "Fauteuil barbier hydraulique", "152–190 $", "2", "à demander")],
    why: ["111 177 salons et +2 %/an.", "Aucune réglementation (hors modèle électrique).", "Chine 150–380 $, France 495–866 € l’unité."],
    risks: ["Qualité de la pompe hydraulique, du chrome et du simili-cuir (REACH).", "Concurrence en ligne sur l’entrée de gamme (dès 90 €)."], next: "Échantillon de 2 modèles (Great Furniture + Yayou) avant la commande." },
  { id: "garage", pOk: 0.55, name: "🔧 Pack garage : pont élévateur 4 t + démonte-pneus (avec pose)", group: "Équipements", confidence: 3,
    market: { units: 4000, label: "≈ 4 000 ponts / an (estimation)", src: "69 062 garages et ateliers dont 83,7 % indépendants (Scalon) × ≈ 6 % qui s’équipent / an", est: true }, sharePct: 1,
    leaders: [{ name: "SEFAC (fabricant FR de levage)", ca: "13,7 M€ (2025)" }, { name: "Fog Automotive (ex-leader FR des ponts)", ca: "liquidé en 2022 : place libérée" }],
    fobUsd: 850, freightUnit: 100, dutyPct: 1.7, otherUnit: 40, sellTtc: 2868, extraUnit: 490,
    firstOrder: { qty: 3, month: 11, why: "3 ponts 4 t + 3 combos démonte-pneu/équilibreuse ≈ 6 m³ et 2,5 t, livrés et posés en remorque depuis l’Oise et Toulouse. Pas de commande sans certificat d’examen CE de type." },
    suppliers: [
      S("Yantai Jintuo Automobile Technology", "Yantai (Shandong)", "https://www.yunzhan365.com/basic/27960550.html", "Pont 2 colonnes 4 t (2 940×430×800 mm, ≈ 580 kg)", "790–880 $", "1", "aucune preuve CE trouvée"),
      S("Yantai Tonghe Precision", "Yantai (Shandong)", "https://www.accio.ai/find-product/best-2-post-automotive-lift", "Pont 2 colonnes 4 t « CE »", "930–989 $", "5", "CE déclaré, organisme notifié non visible"),
      S("Yingkou Yuanmech / Yantai (combo pneus)", "Liaoning / Shandong", "https://m.made-in-china.com/hot-china-products/Tire_Changer_Machine.html", "Démonte-pneu + équilibreuse", "700–940 $", "1", "à demander")],
    why: ["Chine ≈ 850 $, France 1 400–2 300 € HT hors pose ; combo pneus 1 660–2 375 € HT.", "La pose et la vérification annuelle obligatoire écartent Amazon.", "Fog liquidé : un leader français en moins."],
    risks: ["POINT BLOQUANT : pont = annexe IV directive Machines + EN 1493 → examen CE de type par organisme notifié. Alerte Safety Gate 2025 sur un pont chinois.", "En tant qu’importateur tu portes la responsabilité : RC produit + notice FR.", "Commencer par le combo pneus (moins risqué)."], next: "Demander numéro d’organisme notifié + rapport EN 1493, vérifier auprès de l’organisme ; 1 poseur partenaire." },
  { id: "glace", pOk: 0.7, name: "🍦 Machines à glace italienne (snacks, campings)", group: "Équipements", confidence: 2,
    market: { units: 3000, label: "≈ 3 000 / an (estimation)", src: "7 637 campings (FNHPA 2025) + snacks, boulangeries, bases de loisirs (non publié)", est: true }, sharePct: 1,
    leaders: [{ name: "Carpigiani (Italie, leader)", ca: "n.d. France" }, { name: "Revendeurs CHR : Mondial CHR (Spaceman), Equipe Resto Diffusion, Nordglace (Gelmatic)", ca: "n.d." }],
    fobUsd: 900, freightUnit: 90, dutyPct: 2, otherUnit: 40, sellTtc: 4790, extraUnit: 430,
    firstOrder: { qty: 4, month: 10, why: "4 machines de comptoir 2+1 (≈ 2,5 m³) arrivées en février : 1 en démo/prêt, 3 vendues aux campings et snacks avant la saison." }, seasonMonths: [2, 3, 4, 5],
    suppliers: [
      S("Goshen (Guangzhou)", "Guangzhou", "https://china.org.ru/product/60714114034", "Soft 20–25 L/h, 2+1 parfums", "800–900 $ FOB", "10 (1 pour test)", "CE déclaré ; gaz à préciser"),
      S("Jingling", "Chine", "https://www.jinglingmachine.com/", "RN29PRO de table, 2×10 L, 2+1, R290", "sur devis", "?", "R290 ✓ ; CE à confirmer"),
      S("Shenzhen Oceanpower", "Shenzhen", "https://www.hellopro.fr/machine-a-glace-op-138cs-2005880-3827587-produit.html", "OP138CS (déjà revendue en France ≈ 4 499 € HT)", "sur devis", "?", "CE")],
    why: ["France 3 620–5 190 € HT (2+1 parfums) ; Chine 800–900 $.", "Démo + formation + SAV : on ne l’achète pas sur Internet.", "Des revendeurs FR vendent déjà des Oceanpower rebadgées."],
    risks: ["Gaz frigorigène : R290 impératif (F-gas 2024/573).", "Contact alimentaire (règlement 1935/2004).", "Saison courte."], next: "Devis Goshen + Jingling avec R290 et déclaration CE complète." },
  { id: "bainfroid", pOk: 0.7, name: "🧊 Bains froids avec groupe froid", group: "Équipements", confidence: 2,
    market: { units: 15000, label: "≈ 15 000 / an (estimation, non publiée)", src: "6 811 salles de sport (Epsimas 2026) + kinés, clubs, particuliers ; catégorie en croissance (non chiffrée)", est: true }, sharePct: 0.5,
    leaders: [{ name: "Ice Boost (35, bain portable 159 €)", ca: "objectif 150 k€ an 1" }, { name: "Reboots (via i-run.fr)", ca: "n.d." }],
    fobUsd: 390, freightUnit: 25, dutyPct: 2, otherUnit: 15, sellTtc: 1290, extraUnit: 160,
    firstOrder: { qty: 10, month: 11, why: "10 ensembles (≈ 3–5 m³) : 6 en 1/3–1/2 HP pour particuliers et kinés, 4 en 1 HP pour salles. MOQ 1 : on panache et on teste le prix public." },
    suppliers: [
      S("Hefei Smartmak", "Hefei (Anhui)", "https://www.made-in-china.com/manufacturers/ice-bath-tub-chiller.html", "Chiller 1/2 HP + bac ; 1 HP", "375–388 $", "1", "R290 sur certains modèles ; CE à demander"),
      S("Power World Machinery", "Chine", "https://www.made-in-china.com/manufacturers/cold-plunge-ice-bath-with-chiller.html", "Chiller 1 HP R290", "650 $", "5", "R290 ✓"),
      S("Chillmend (Guangzhou)", "Guangzhou", "https://chillmend.com/", "Chillers 1/3–2 HP, OEM", "sur devis", "faible", "CE sur certains modèles")],
    why: ["Chiller lourd et technique : démo et dépannage locaux.", "Marché FR peu structuré, pas de leader installé."],
    risks: ["Marché non chiffré (effet de mode ?).", "Électricité + eau : différentiel, IP de la pompe ; gaz R290."], next: "1 échantillon Smartmak + 1 Power World, test d’un prix public à 1 290 €." },
  { id: "massage", pOk: 0.8, name: "💆 Fauteuils de massage 4D zéro gravité", group: "Équipements", confidence: 2,
    market: { units: 20000, label: "≈ 20 000 / an (estimation)", src: "Jetform seul > 5 000/an (France + export) ; marché non publié", est: true }, sharePct: 0.3,
    leaders: [{ name: "Jetform (Rouvroy)", ca: "> 5 000 fauteuils/an" }, { name: "Xiamen Comfort / Easepal (OEM mondial)", ca: "≈ 5,1 Md CNY" }, { name: "VEVOR (en ligne)", ca: "1 552 € le 4D" }],
    fobUsd: 650, freightUnit: 80, dutyPct: 2, otherUnit: 40, sellTtc: 1790, extraUnit: 280,
    firstOrder: { qty: 6, month: 7, why: "6 fauteuils (2 modèles × 3 coloris, ≈ 7 m³) arrivés en novembre : showroom dans les hubs avant Noël, livraison et installation en remorque." }, seasonMonths: [11, 12],
    suppliers: [
      S("Fujian Jingtuo Health (Jingtop)", "Fujian", "https://jingtop.en.made-in-china.com/product/HJsYNieTbScf/China-OEM-Wholesale-Luxury-Automatic-Family-Healthcare-Zero-Gravity-4D-Massage-Chair.html", "4D zéro gravité ; rail SL 650–695 $", "400–1 150 $", "1 (30 sur certains)", "CE/CB/FCC déclarés"),
      S("Quanzhou Princen Health Tech", "Quanzhou (Fujian)", "https://princen.manufacturer.globalsources.com/company-profile_6003002327030.htm", "4D zéro gravité, chauffage, rouleaux pieds", "650–750 $", "10", "à demander")],
    why: ["On veut l’essayer avant de payer 1 600 € : showroom = avantage.", "Produit lourd livré à l’étage.", "France 763–4 999 € ; Chine 400–750 $."],
    risks: ["Aucune allégation médicale.", "VEVOR en ligne à 1 552 €.", "SAV électronique (cartes, airbags) : exiger pièces 2 ans + EN 60335-2-32."], next: "Comparer Jingtop et Princen (2 échantillons)." },
];
