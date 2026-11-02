/** Sourcing NeoDrive : fournisseurs, produits, critères, business plan par produit.
 *  Même méthode que le pilotage : prix usine → arrivée au hub (fret, douane, dépotage) → livraison remorque → marge. */
import type { Params, Port } from "./gestion";

export type Cat = "vsp" | "golfette" | "utilitaire" | "tricycle" | "quad" | "chariot" | "scooter" | "autre";
export const CATS: [Cat, string][] = [
  ["vsp", "🚗 Voiture sans permis"], ["golfette", "⛳ Golfette / navette"], ["utilitaire", "🛻 Petit utilitaire"], ["tricycle", "🛺 Tricycle cargo"],
  ["quad", "🏍️ Quad / UTV"], ["chariot", "🏗️ Chariot élévateur"], ["scooter", "🛵 Scooter"], ["autre", "📦 Autre"],
];
export type Status = "etudier" | "contacter" | "mail" | "devis" | "echantillon" | "partenaire" | "ecarte";
export const STATUS: [Status, string][] = [
  ["etudier", "🔎 À étudier"], ["contacter", "📨 À contacter"], ["mail", "✉️ Mail envoyé"], ["devis", "📄 Devis reçu"],
  ["echantillon", "📦 Échantillon"], ["partenaire", "🤝 Partenaire"], ["ecarte", "❌ Écarté"],
];
export type Homolog = "coc" | "eec" | "aucune" | "inutile";
export const HOMOLOG: [Homolog, string][] = [["coc", "✅ COC européen (carte grise OK)"], ["eec", "⚠️ « EEC » annoncé, COC non vu"], ["aucune", "❌ Pas d’homologation"], ["inutile", "➖ Pas besoin (usage privé / pro)"]];
export type Permis = "aucun" | "AM" | "B" | "B96" | "CACES";

export type Supplier = {
  id: string; name: string; city: string; fair: string; stand: string; website: string; email: string; whatsapp: string; phone: string; contact: string;
  cats: Cat[]; status: Status; notes: string; nextDate: string; sources: string; verified: boolean;
};
export type Product = {
  id: string; supplierId: string; name: string; cat: Cat; specs: string; photo: string; link: string;
  fobUsd: number; perContainer: number; dutyPct: number; transferUnit: number;
  priceTtc: number; frPriceTtc: number; frSource: string; salesMonth: number;
  trailerFit: number; otherDelivery: number; homolog: Homolog; permis: Permis; lbc: number; sav: number; savCost: number;
  verified: boolean; notes: string;
};
export type Weights = Record<CritKey, number>;
export type CritKey = "arbitrage" | "marge" | "remorque" | "leboncoin" | "homolog" | "permis" | "sav" | "treso" | "rotation";
export const CRITS: [CritKey, string, string][] = [
  ["arbitrage", "💶 Arbitrage de prix", "Écart entre le prix du neuf en France et ton prix"],
  ["marge", "📈 Marge par unité", "Marge HT après tous les frais, en % du prix HT"],
  ["remorque", "🚚 Remorque / livraison", "Combien d’unités par voyage avec ta remorque"],
  ["leboncoin", "📱 Demande Leboncoin", "Ça se cherche et se vend déjà entre particuliers"],
  ["homolog", "📄 Homologation", "Carte grise possible (COC européen)"],
  ["permis", "🪪 Sans permis", "Accessible sans permis = plus de clients"],
  ["sav", "🔧 SAV / fiabilité", "Pièces, fiabilité, peu de retours"],
  ["treso", "🏦 Trésorerie", "Argent bloqué par conteneur, par rapport à ta trésorerie"],
  ["rotation", "🔁 Rotation", "Temps pour vendre un conteneur"],
];
export const DEFAULT_WEIGHTS: Weights = { arbitrage: 3, marge: 3, remorque: 2, leboncoin: 2, homolog: 3, permis: 1, sav: 2, treso: 2, rotation: 2 };
export type Hyp = { port: Port; marketingPerSale: number; storagePerUnit: number; transporteur: number };
export const DEFAULT_HYP: Hyp = { port: "havre", marketingPerSale: 150, storagePerUnit: 50, transporteur: 350 };
export type Sourcing = { suppliers: Supplier[]; products: Product[]; weights: Weights; hyp: Hyp; removed: string[]; updated_at?: string };

const S = (id: string, name: string, city: string, stand: string, cats: Cat[], o: Partial<Supplier> = {}): Supplier =>
  ({ id, name, city, fair: "EICMA 2026 (Milan)", stand, website: "", email: "", whatsapp: "", phone: "", contact: "", cats, status: "etudier", notes: "", nextDate: "", sources: "", verified: false, ...o });
const P = (id: string, supplierId: string, name: string, cat: Cat, o: Partial<Product> = {}): Product => ({
  id, supplierId, name, cat, specs: "", photo: "", link: "", fobUsd: 0, perContainer: 9, dutyPct: 10, transferUnit: 150,
  priceTtc: 5990, frPriceTtc: 12000, frSource: "", salesMonth: 4, trailerFit: 2, otherDelivery: 350, homolog: "eec", permis: "aucun", lbc: 3, sav: 3, savCost: 100, verified: false, notes: "", ...o,
});

/** Premières fiches (recherche du 2 novembre 2026). Les chiffres non vérifiés sont marqués « à vérifier ». */
export function seedSourcing(): Sourcing {
  return {
    weights: { ...DEFAULT_WEIGHTS }, hyp: { ...DEFAULT_HYP }, removed: [],
    suppliers: [
      S("actuel", "Fournisseur actuel NeoDrive", "Chine", "—", ["vsp"], { fair: "—", status: "partenaire", notes: "Référence : c’est la base de comparaison.", verified: true }),
      S("elfgogo", "Shandong Elfgogo Vehicle Co., Ltd.", "Weifang, Shandong", "Pav. 22, stand N25", ["vsp"], { website: "https://www.elfgogo.com", email: "info@elfgogo.com", notes: "Microcar E6 L6e-BP, monocoque alu-acier, 6 kW, jusqu’à 200 km. Filiale en Hongrie (homologation, SAV). Batterie LiFePO4 chauffée testée à −35 °C → piste pour la batterie hiver. Plus haut de gamme que NeoDrive.", status: "contacter", sources: "elfgogo.com" }),
      S("bontu", "Shandong Bontu New Energy Vehicle", "Xintai, Shandong", "Pav. 5 E81 · Pav. 10 I95", ["vsp"], { website: "https://www.desnerauto.com", email: "info@desnerauto.com", whatsapp: "+39 378 081 8566", phone: "+39 071 241 5245", contact: "Angelo Sun Wenyu (ITB Auto / Desner, Milan)", notes: "Passer par Desner = un intermédiaire de plus. Demander le contact export de l’usine. BTE05 = Desner Y300, vendue 12 000–14 000 € en Italie. Desner importe aussi Jinpeng.", status: "contacter", sources: "desnerauto.com" }),
      S("feibo", "Henan Feibo Automobile Industry", "Zhumadian, Henan", "stand direct", ["vsp", "tricycle", "scooter"], { website: "https://bomamotor.en.made-in-china.com", notes: "77 salariés. Beaucoup de plomb. Plan B, prix proche du fournisseur actuel.", sources: "made-in-china.com" }),
      S("davy", "Jiangsu Davy New Energy Vehicle Technology", "Jiangsu", "via Primateria", ["tricycle", "utilitaire"], { website: "https://davytricycle.en.made-in-china.com", notes: "Tricycles cargo et petits utilitaires de voirie. Piste pour la 2e gamme.", sources: "made-in-china.com" }),
      S("jingpin", "Shandong Jingpin Electric Vehicle Technology", "Linyi, Shandong", "stand direct", ["tricycle", "scooter"], { website: "https://cn-electricbicycle.com", notes: "Usine 20 000 m², 200 salariés. Tricycles d’entrée de gamme. Secondaire.", sources: "cn-electricbicycle.com" }),
      S("benod", "Zhejiang Benod Automobile Manufacturing", "Taizhou, Zhejiang", "—", ["scooter"], { website: "https://benodvehicle.en.made-in-china.com", notes: "Scooters et motos électriques, ISO 9001. Pour la gamme scooters 2027.", sources: "made-in-china.com" }),
      S("boma", "BOMA", "Chine", "EICMA 2025 : Hall 4 C88A (à confirmer) · 2024 : Hall 10 A96", ["tricycle", "vsp"], { notes: "Meilleure piste EICMA de la catégorie : tricycles et 4 roues électriques exposés en 2024 et 2025. Site et contact à trouver.", sources: "chinamotorworld.com (avant-première EICMA 2025)" }),
      S("vigrous", "VIGROUS", "Chine", "EICMA 2026 (stand à trouver) · 2025 : Hall 9 Q81", ["tricycle", "vsp", "scooter"], { notes: "Annoncé à l’EICMA 2026 (3–8 nov.) avec 2 et 3 roues ; 4 roues en 2025. Passer sur le stand ou trouver le contact.", sources: "chinamotorworld.com/eicma-2026-preview" }),
      S("luqi", "LUQI", "Chine", "EICMA 2025 : Hall 10 A80A (à confirmer)", ["vsp", "tricycle"], { notes: "Microcar « EV300 (2026) » vue en vidéo. Specs et contact à trouver.", sources: "chinamotorworld.com, youtube.com/watch?v=Hs3Oesfyexo" }),
      S("saige", "SAIGE", "Chine", "EICMA 2024 : Hall 10 I81", ["tricycle", "scooter"], { notes: "Scooters et tricycles électriques.", sources: "chinamotorworld.com (EICMA 2024)" }),
      S("timy", "TIM / TIMY", "Chine", "EICMA 2024 : Hall 14", ["golfette", "tricycle", "scooter"], { notes: "Golfettes, tricycles, scooters (et fauteuils électriques).", sources: "chinamotorworld.com, soymotero.net" }),
      S("qianxin", "QIANXIN", "Chine", "EICMA 2024", ["golfette"], { notes: "Spécialiste golfettes selon l’avant-première EICMA 2024.", sources: "chinamotorworld.com (EICMA 2024)" }),
      S("lvtong", "Guangdong Lvtong New Energy EV (Lvtong)", "Dongguan, Guangdong", "pas vu à l’EICMA", ["golfette", "utilitaire"], { email: "eason@lvtong.com", contact: "Eason Lau (commercial)", notes: "Golfettes, navettes, utilitaires de chasse. Exporte dans plus de 30 pays. Mail trouvé via un résumé LinkedIn : à confirmer.", sources: "linkedin.com/in/easonlau, evtrader.com/ev-company/lvtong-china" }),
      S("jinpeng", "Jiangsu Jinpeng Group", "Xuzhou, Jiangsu", "pas vu à l’EICMA", ["tricycle"], { notes: "Gros fabricant de tricycles cargo et passagers, annonce l’EEC. Desner (Milan) l’importe déjà.", sources: "b2brazil.com/hotsite/jiangsujinpeng" }),
      S("yoki", "Taizhou Yoki Carts", "Taizhou, Zhejiang", "pas vu à l’EICMA", ["quad"], { notes: "Quads et UTV. Pas sûr que ce soit le bon « Yoki ».", sources: "made-in-china.com" }),
      S("luobei", "Jiangsu Luobei Electric Vehicle (LOBOEV)", "Jiangsu", "pas vu à l’EICMA", ["vsp", "scooter"], { notes: "Marque LOBOEV déposée en 2024 (voitures électriques). Pas de site ni contact trouvé.", sources: "trademark.justia.com" }),
      S("lilong", "Xuzhou Lilong Locomotive", "Xuzhou, Jiangsu", "pas vu à l’EICMA", ["tricycle"], { website: "https://m.made-in-china.com/company-lilongtricycle/", notes: "Tricycles électriques haut de gamme, cargo et passagers.", sources: "made-in-china.com" }),
      S("hanbang", "Jiangsu Hanbang Vehicle Industry", "Xuzhou, Jiangsu", "pas vu à l’EICMA", ["tricycle"], { website: "https://m.made-in-china.com/company-hbtricycle/", notes: "300 000 tricycles par an (cargo, passagers).", sources: "made-in-china.com" }),
      S("baobo", "Wuxi Baobo Vehicle", "Wuxi, Jiangsu", "pas vu à l’EICMA", ["vsp"], { notes: "Annonce une mini-voiture fermée « L6e EEC COC » sur Alibaba : demander le COC.", sources: "french.alibaba.com/f/coc-l6e.html" }),
      S("cfmoto", "CFMOTO (repère de prix)", "Hangzhou, Zhejiang", "exposant régulier EICMA", ["quad"], { status: "ecarte", notes: "Marque vendue par des concessionnaires officiels en Europe : pas une source usine, mais un bon repère de prix pour les UTV.", sources: "cfmoto.com.au, takatalo.fi" }),
      S("segway", "Segway Powersports (repère de prix)", "Changzhou, Jiangsu", "EICMA 2025 : Hall 18 A74", ["quad", "scooter"], { status: "ecarte", notes: "Déjà distribué en France (SSV sur Leboncoin 13 990–39 990 €) : repère de prix, pas une source usine.", sources: "powersportsbusiness.com, leboncoin.fr" }),
      S("huangbao", "Nanjing Huangbao Electric Vehicle", "Nanjing, Jiangsu", "—", ["tricycle"], { notes: "Tricycles utilitaires, pas de site export trouvé. Secondaire." }),
    ],
    products: [
      P("ref-confort", "actuel", "NeoDrive Confort (référence)", "vsp", { specs: "Voiture sans permis, plomb, ≈ 45–70 km", fobUsd: 1790, priceTtc: 4990, frPriceTtc: 12000, frSource: "VSP neuves en France : 10 000–17 000 € (Aixam, Ligier) ; Ami ≈ 8 000 €", salesMonth: 18, homolog: "coc", lbc: 5, sav: 3, verified: true, notes: "Tes vrais chiffres : 1 540 € usine." }),
      P("elf-e6", "elfgogo", "Elfgogo E6", "vsp", { specs: "L6e-BP, 6 kW, LiFePO4 chauffée, jusqu’à 200 km", link: "https://www.elfgogo.com", fobUsd: 0, priceTtc: 8990, frPriceTtc: 15000, salesMonth: 3, homolog: "eec", lbc: 4, sav: 3, notes: "Prix usine inconnu : à demander." }),
      P("bontu-bte05", "bontu", "Bontu BTE05 (= Desner Y300)", "vsp", { specs: "Quadricycle électrique", link: "https://www.desnerauto.com", fobUsd: 0, priceTtc: 7990, frPriceTtc: 13000, frSource: "Vendue 12 000–14 000 € en Italie", salesMonth: 3, homolog: "eec", lbc: 4 }),
      P("feibo-eec", "feibo", "Feibo mini-voiture EEC 1 500 W", "vsp", { specs: "1 500 W, lithium 60 V 60 Ah", link: "https://bomamotor.en.made-in-china.com", fobUsd: 2550, priceTtc: 5990, frPriceTtc: 12000, salesMonth: 4, homolog: "eec", lbc: 4, sav: 2, notes: "2 450–2 650 $ FOB, à partir de 1 pièce." }),
      P("davy-cargo", "davy", "Davy tricycle cargo électrique", "tricycle", { specs: "Tricycle cargo 3 roues", link: "https://davytricycle.en.made-in-china.com", fobUsd: 0, perContainer: 18, transferUnit: 80, priceTtc: 4490, frPriceTtc: 9000, salesMonth: 3, trailerFit: 3, homolog: "eec", permis: "B", lbc: 2, sav: 3 }),
      P("benod-scoot", "benod", "Benod scooter électrique", "scooter", { specs: "Scooter 50 cc équivalent", link: "https://benodvehicle.en.made-in-china.com", fobUsd: 0, perContainer: 80, transferUnit: 20, priceTtc: 1490, frPriceTtc: 3000, salesMonth: 5, trailerFit: 8, homolog: "eec", permis: "AM", lbc: 3, sav: 3, savCost: 50 }),
      P("luqi-ev300", "luqi", "Luqi EV300 (2026)", "vsp", { specs: "Microcar électrique, specs inconnues", link: "https://www.youtube.com/watch?v=Hs3Oesfyexo", priceTtc: 5990, frPriceTtc: 12000, salesMonth: 3, homolog: "aucune", lbc: 4, notes: "Demander specs, COC, prix usine." }),
      P("baobo-l6e", "baobo", "Baobo mini-voiture fermée L6e", "vsp", { specs: "4 roues fermée, L6e annoncée", link: "https://french.alibaba.com/f/coc-l6e.html", priceTtc: 5490, frPriceTtc: 12000, salesMonth: 3, homolog: "eec", lbc: 4 }),
      P("lvtong-a827", "lvtong", "Lvtong LT-A827 golfette 2+2", "golfette", { specs: "Golfette 4 places. Vendue 9 500 $ au Canada (pas un prix usine)", link: "https://evtrader.com/ev-company/lvtong-china", perContainer: 6, priceTtc: 7990, frPriceTtc: 14000, frSource: "Golfette homologuée route neuve : dès ≈ 12 000 € TTC, souvent 17 000–30 000 € (hellopro.fr)", salesMonth: 2, trailerFit: 2, homolog: "eec", permis: "B", lbc: 3, sav: 3 }),
      P("jinpeng-xd", "jinpeng", "Jinpeng XD tricycle loisir", "tricycle", { specs: "72 V 1 000 W, ≈ 45–50 km", link: "https://b2brazil.com/hotsite/jiangsujinpeng/xd-electric-leisure-tricycle-3-wheel-ele", perContainer: 24, transferUnit: 60, priceTtc: 2990, frPriceTtc: 4500, frSource: "Triporteurs électriques 2 600–6 000 € TTC (reussir.fr, hellopro.fr)", salesMonth: 3, trailerFit: 3, homolog: "eec", permis: "AM", lbc: 3, sav: 3, savCost: 60 }),
      P("cfmoto-u6", "cfmoto", "CFMOTO UFORCE U6 EV (repère)", "quad", { specs: "UTV électrique", link: "https://takatalo.fi/fr/p182932/cfmoto-u6-ev", perContainer: 4, priceTtc: 19100, frPriceTtc: 19100, frSource: "19 990 € TTC en Finlande ≈ 19 100 € avec TVA française", salesMonth: 1, trailerFit: 1, homolog: "coc", permis: "B", lbc: 2, notes: "Repère : un UTV chinois sans marque devrait se vendre ≈ 9 000–12 000 €." }),
    ],
  };
}
/** Ajoute les fiches de départ qui manquent (sans toucher à ce que tu as modifié ou supprimé). */
export function mergeSeed(d: Partial<Sourcing> | null): Sourcing {
  const seed = seedSourcing();
  if (!d) return seed;
  const removed = d.removed || [], sup = d.suppliers || [], prod = d.products || [];
  return {
    suppliers: [...sup, ...seed.suppliers.filter(x => !removed.includes(x.id) && !sup.some(y => y.id === x.id))],
    products: [...prod, ...seed.products.filter(x => !removed.includes(x.id) && !prod.some(y => y.id === x.id))],
    weights: { ...DEFAULT_WEIGHTS, ...(d.weights || {}) }, hyp: { ...DEFAULT_HYP, ...(d.hyp || {}) }, removed, updated_at: d.updated_at,
  };
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** Business plan d'un produit, avec les vrais coûts du pilotage (fret, douane, agent, dépotage, transferts, livraison). */
export function businessPlan(p: Params, h: Hyp, x: Product, cashNow: number) {
  const n = Math.max(1, x.perContainer), port = h.port, known = x.fobUsd > 0;
  const goods = n * x.fobUsd * p.usd, freight = (p.freightUsd[port] || 5000) * p.usd, duty = (goods + freight) * x.dutyPct / 100;
  const log = port === "fos" ? p.fosToMuret + p.unload + n * Math.min(x.transferUnit, 50) : p.warehouseTransfer + p.unload + n * x.transferUnit;
  const cash = goods + freight + duty + p.agent + log;
  const landed = cash / n;
  const delivery = x.trailerFit > 0 ? p.deliveryCost * (p.carsPerTrip || 2) / x.trailerFit : (x.otherDelivery || h.transporteur);
  const ht = x.priceTtc / 1.2;
  const lines: [string, number][] = [
    ["Prix usine", x.fobUsd * p.usd], ["Fret maritime (part)", freight / n], ["Douane", duty / n], ["Agent + dépotage + transferts", (p.agent + log) / n],
    ["Livraison", delivery], ["Pub par vente", h.marketingPerSale], ["Stockage", h.storagePerUnit], ["SAV (provision)", x.savCost],
  ];
  const costs = lines.reduce((a, l) => a + l[1], 0), margin = ht - costs, marginPct = ht > 0 ? margin / ht : 0;
  const arbitrage = x.priceTtc > 0 ? x.frPriceTtc / x.priceTtc : 0, months = n / Math.max(0.1, x.salesMonth);
  const yearUnits = x.salesMonth * 12, yearMargin = margin * yearUnits;
  const c: Record<CritKey, number> = {
    arbitrage: clamp((arbitrage - 1) / 1.5), marge: clamp(marginPct / 0.4),
    remorque: x.trailerFit >= 3 ? 1 : x.trailerFit === 2 ? 0.8 : x.trailerFit === 1 ? 0.5 : 0.15,
    leboncoin: clamp(x.lbc / 5), homolog: { coc: 1, eec: 0.4, aucune: 0, inutile: 0.8 }[x.homolog],
    permis: { aucun: 1, AM: 0.9, B96: 0.5, B: 0.5, CACES: 0.6 }[x.permis], sav: clamp(x.sav / 5),
    treso: clamp(1 - (cash / Math.max(1, cashNow) - 0.2) / 0.6), rotation: clamp(1 - (months - 1) / 5),
  };
  return { n, goods, freight, duty, log, cash, landed, delivery, ht, lines, costs, margin, marginPct, arbitrage, months, yearUnits, yearMargin, containerMargin: margin * n, roi: cash > 0 ? yearMargin / cash : 0, crit: c, known };
}
export function scoreOf(w: Weights, crit: Record<CritKey, number>) {
  const tot = CRITS.reduce((a, [k]) => a + (w[k] || 0), 0) || 1;
  return Math.round(100 * CRITS.reduce((a, [k]) => a + (w[k] || 0) * crit[k], 0) / tot);
}
export function verdict(score: number, known: boolean, margin: number) {
  if (!known) return ["❓ Prix usine à demander", "#7a8594"];
  if (margin <= 0) return ["❌ Pas rentable", "#b42318"];
  if (score >= 70) return ["🟢 Opportunité forte", "#067647"];
  if (score >= 55) return ["🟡 À creuser", "#b54708"];
  return ["⚪ Faible", "#7a8594"];
}
