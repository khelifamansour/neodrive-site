/**
 * Plans annuels de la Giga Analyse : chaque année, une liste de produits classés, avec leurs fournisseurs,
 * un calendrier et des règles. Chaque Giga Analyse (toutes les 2 semaines) lit le plan de l'année en cours
 * et en tire un plan d'action. Serveur uniquement.
 *
 * Table Supabase (SQL additif, RLS activé sans politique : accès serveur uniquement) :
 *   giga_plans (id uuid, year int unique, created_at, updated_at, plan jsonb)
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const PLAN_TABLE = "giga_plans";

export const PRODUCT_STATUS: Record<string, string> = {
  a_lancer: "À lancer", devis: "Devis demandés", echantillon: "Échantillon commandé", test: "Test en cours", valide: "Validé (dans chaque conteneur)", arrete: "Arrêté",
};
export const SUPPLIER_STATUS: Record<string, string> = {
  a_contacter: "À contacter", contacte: "Contacté", devis_recu: "Devis reçu", echantillon: "Échantillon", retenu: "Retenu", ecarte: "Écarté",
};

export type Supplier = { nom: string; plateforme?: string; lien?: string; contact?: string; prix?: string; moq?: string; statut: string; notes?: string; verifie?: boolean };
export type PlanProduct = {
  id: string; rang: number; nom: string; verdict: "TOP" | "TEST" | "BON"; note: number;
  prix_usine: string; prix_vente: string; concurrence: string; marge_unite: string;
  ventes_an1: string; ventes_croisiere: string; marge_mois: string; place: string;
  clients: string; positionnement: string; attention: string;
  premier_test: string; budget_test: string; mots_cles: string[];
  fournisseurs: Supplier[]; statut: string; notes?: string;
};
export type Plan = {
  annee: number; titre: string; resume: string[]; objectifs: string[];
  produits: PlanProduct[];
  calendrier: { periode: string; actions: string[] }[];
  chargement: { zone: string; contenu: string[] }[];
  regles: string[];
  plus_tard: { nom: string; raison: string }[];
  interdits: { nom: string; raison: string }[];
  source?: string;
};

const sup = (nom: string, notes: string, plateforme = "Made-in-China / Alibaba"): Supplier => ({ nom, plateforme, statut: "a_contacter", notes, verifie: false });

/** Plan de la première année, tiré de la plaquette « Arbitrage Chine → France » (novembre 2026). */
export const SEED_PLAN_2027: Plan = {
  annee: 2027,
  titre: "Année 1 : arbitrage conteneur (produits glissés autour des voitures)",
  source: "Plaquette « Arbitrage Chine → France », novembre 2026. Chiffres = estimations à confirmer par devis.",
  resume: [
    "Le conteneur est déjà payé par les voitures : les produits glissés autour voyagent presque gratuitement et arrivent 30 à 50 % sous le prix du marché.",
    "Trio à lancer en premier : pièces de voiturettes toutes marques, mini-chargeuse et balayeuse électriques, puis brouette/dumper et débroussailleuse électriques.",
    "Règle : un produit à la fois en test, jamais de stock sans réservations avec acompte. On garde ce qui se vend en 60 jours avec au moins 30 % de marge.",
    "Si la moitié des produits réussit : environ 60 000 à 100 000 € de marge brute par mois en rythme de croisière (estimation), avant pub, livraison et salaires.",
  ],
  objectifs: [
    "Décembre 2026 : 3 devis par produit TOP (dimensions emballées, poids, CE, fiche batterie).",
    "Janvier 2027 : premier conteneur test avec échantillons (brouettes, dumper, débroussailleuse, mini-chargeuse, lot de pièces, perruques).",
    "Juin 2027 : au moins 3 produits validés (vendus en ≤ 60 jours, marge ≥ 30 %).",
    "Fin 2027 : chaque conteneur rempli avec les produits validés, et 10 000 € de marge en plus par conteneur au minimum.",
  ],
  produits: [
    { id: "pieces_vsp", rang: 1, nom: "Pièces & accessoires voiturettes, toutes marques", verdict: "TOP", note: 86,
      prix_usine: "1 – 30 $ / pièce", prix_vente: "10 – 150 € TTC", concurrence: "Oscaro, pièces adaptables, Temu (+3 € de taxe par article depuis juillet 2026)",
      marge_unite: "4 – 40 € / pièce", ventes_an1: "200 – 400 pièces", ventes_croisiere: "400 – 800 pièces", marge_mois: "5 000 – 15 000 €", place: "Habitacles (≈ 1,6 m³ par conteneur)",
      clients: "Les 250 000 à 300 000 propriétaires de voiturettes en France (estimation), garages",
      positionnement: "« Le spécialiste des pièces de voiturettes livrées en 48 h, toutes marques, avec diagnostic WhatsApp ». Boutique, Hana et clients déjà en place.",
      attention: "Vérifier chaque référence (moteurs Kubota, Lombardini, Yanmar). Plaquettes ECE R90. Éco-organismes batteries. Pneus : anti-dumping depuis juillet 2026, à éviter.",
      premier_test: "Lot de 300 pièces (plaquettes, kits d'entretien, essuie-glaces, batteries, bâches) dans le conteneur de janvier.", budget_test: "≈ 3 000 – 4 000 €",
      mots_cles: ["Aixam brake pads", "Ligier spare parts", "microcar spare parts wholesale", "Kubota Z482 filter kit", "Lombardini Focs belt"],
      fournisseurs: [sup("Usine de vos voiturettes actuelles", "Demander d'abord la liste des pièces d'usure qu'elle fabrique ou achète."), sup("Fabricants de pièces adaptables Aixam / Ligier", "Chercher avec les mots-clés ; exiger les références croisées.")],
      statut: "a_lancer" },
    { id: "mini_chargeuse", rang: 2, nom: "Mini-chargeuse électrique", verdict: "TOP", note: 82,
      prix_usine: "6 000 – 10 000 $", prix_vente: "18 000 – 30 000 € HT", concurrence: "Chargeuses électriques européennes ≈ 40 000 – 70 000 € (ordre de grandeur, à vérifier)",
      marge_unite: "6 000 – 12 000 €", ventes_an1: "1 – 2", ventes_croisiere: "3 – 5", marge_mois: "20 000 – 45 000 €", place: "Une place de voiture",
      clients: "Fermes, haras, paysagistes, collectivités",
      positionnement: "« La chargeuse électrique de ferme à moitié prix, livrée et démontrée chez vous ». Zéro bruit, zéro gasoil.",
      attention: "Vérifier les importateurs chinois déjà présents en France. CE + règlement Machines 2023/1230 (20/01/2027). Stock de pièces hydrauliques.",
      premier_test: "1 machine en démonstration, pub ciblée fermes et haras, prévente avec acompte.", budget_test: "≈ 8 000 – 11 000 €",
      mots_cles: ["electric mini wheel loader", "electric compact loader lithium", "farm electric loader CE"],
      fournisseurs: [sup("KIMA", "Marque visible sur la photo de la plaquette ; à vérifier (usine, CE, SAV)."), sup("Everun (Shandong)", "Fabricant connu de mini-chargeuses ; à vérifier.")],
      statut: "a_lancer" },
    { id: "balayeuse", rang: 3, nom: "Balayeuse autoportée électrique", verdict: "TOP", note: 80,
      prix_usine: "3 000 – 6 000 $ (estimation)", prix_vente: "7 000 – 11 000 € HT", concurrence: "Kärcher KM 90/60 R Bp Pack : 16 990 CHF (liste Suisse)",
      marge_unite: "3 000 – 5 000 €", ventes_an1: "1 – 3", ventes_croisiere: "4 – 8", marge_mois: "15 000 – 30 000 €", place: "Fond du conteneur, au sol",
      clients: "Entrepôts, usines, parkings, campings, supermarchés, collectivités",
      positionnement: "« La balayeuse pro à moitié prix de Kärcher, livrée, démontrée, brosses et filtres en stock ». Option location longue durée.",
      attention: "CE (machines, basse tension, CEM). Batterie plomb plus simple au transport que lithium. Stock de brosses et filtres.",
      premier_test: "1 échantillon en février – mars, démonstrations chez 5 entrepôts ou campings de la région.", budget_test: "≈ 4 000 – 7 000 €",
      mots_cles: ["ride on floor sweeper battery", "industrial sweeper ride on CE"],
      fournisseurs: [sup("Fabricants de balayeuses autoportées", "Vus dans votre vidéo Made-in-China ; demander 3 devis.")],
      statut: "a_lancer" },
    { id: "debroussailleuse", rang: 4, nom: "Débroussailleuse télécommandée électrique", verdict: "TOP", note: 78,
      prix_usine: "1 500 – 4 000 $", prix_vente: "5 000 – 12 000 € HT", concurrence: "Marques italiennes radiocommandées nettement plus chères",
      marge_unite: "2 500 – 6 000 €", ventes_an1: "1 – 3 (pic mars–juin)", ventes_croisiere: "3 – 8", marge_mois: "10 000 – 35 000 €", place: "Sous les racks",
      clients: "Parcs solaires au sol, talus, vergers, communes, grands terrains du Sud-Ouest",
      positionnement: "Machine + contrat d'entretien des parcs solaires : chiffre d'affaires récurrent.",
      attention: "Électrique ou hybride seulement (thermique : Stage V + bruit + certificats). Sécurité de la télécommande.",
      premier_test: "1 échantillon commandé en janvier pour la saison mars – juin, démonstrations filmées.", budget_test: "≈ 2 500 – 4 500 €",
      mots_cles: ["remote control lawn mower electric", "RC flail mower slope", "solar farm mowing robot"],
      fournisseurs: [sup("Vigorun (Shandong)", "Fabricant connu de tondeuses radiocommandées ; à vérifier (version électrique, CE).")],
      statut: "a_lancer" },
    { id: "cellule_pickup", rang: 5, nom: "Cellule camping pour pick-up", verdict: "TEST", note: 74,
      prix_usine: "5 000 – 10 000 $ (estimation)", prix_vente: "12 000 – 18 000 € TTC", concurrence: "Cellules neuves sur Leboncoin : 12 990 – 27 500 €",
      marge_unite: "3 000 – 6 000 €", ventes_an1: "1 – 2", ventes_croisiere: "2 – 5", marge_mois: "8 000 – 25 000 €", place: "Une place de voiture",
      clients: "Propriétaires de pick-up (Hilux, Ranger, D-Max, Duster pick-up), vanlife, chasse, pêche",
      positionnement: "« Cellule neuve livrée et posée chez vous, 30 % sous le marché ». Produit très vidéo.",
      attention: "Gaz et électricité à faire certifier en France. Poids total du pick-up. Étanchéité. Vente surtout au printemps.",
      premier_test: "1 cellule en février – mars, vidéos et prévente pour le printemps.", budget_test: "≈ 6 000 – 11 000 €",
      mots_cles: ["pickup truck camper slide in", "pick up camper shell aluminium"],
      fournisseurs: [sup("HaoYu Camper", "Vu sur votre vidéo Facebook ; demander poids, normes gaz/électricité, garantie.", "Facebook / site du fabricant")],
      statut: "a_lancer" },
    { id: "dumper_brouette", rang: 6, nom: "Brouette & dumper électriques", verdict: "TOP", note: 72,
      prix_usine: "200 – 500 $ (brouette) · 1 200 – 3 000 $ (dumper)", prix_vente: "800 – 1 500 € · 3 500 – 6 500 € HT", concurrence: "Dumpers thermiques chinois 2 082 – 3 950 € HT (Lumag, Torros) ; électriques presque tous « sur devis »",
      marge_unite: "400 – 800 € · 1 200 – 2 500 €", ventes_an1: "5 – 15 brouettes + 2 – 5 dumpers", ventes_croisiere: "15 – 30 + 5 – 10", marge_mois: "12 000 – 45 000 €", place: "Sous les racks",
      clients: "Maçons, paysagistes, agriculteurs, particuliers avec terrain",
      positionnement: "« Électrique, zéro bruit, prix affiché » face à des concurrents « sur devis ». Aide CARSAT pour les pros à vérifier.",
      attention: "CE machines + règlement Machines 2027. Batterie lithium = marchandise dangereuse au transport. Garantie batterie.",
      premier_test: "2 brouettes + 1 dumper 500 kg à chenilles dans le conteneur de janvier ; 10 réservations avant un lot.", budget_test: "≈ 3 000 – 4 500 €",
      mots_cles: ["electric wheelbarrow lithium", "electric mini dumper 500kg crawler", "battery power barrow"],
      fournisseurs: [sup("Fabricants de mini-dumpers électriques", "Exiger déclaration CE, rapport UN38.3 de la batterie, chargeur européen.")],
      statut: "a_lancer" },
    { id: "perruques", rang: 7, nom: "Perruques en cheveux humains", verdict: "TEST", note: 68,
      prix_usine: "5 – 15 $ annoncés (qualité douteuse) · 40 – 120 $ en vraie qualité (estimation)", prix_vente: "80 – 250 €", concurrence: "Amazon 168 – 180 € ; Shein dès 27 € ; marché France perruques + extensions ≈ 540 M$ (étude)",
      marge_unite: "30 – 100 €", ventes_an1: "30 – 100", ventes_croisiere: "150 – 400", marge_mois: "6 000 – 25 000 €", place: "Habitacles (minuscule)",
      clients: "Clientèle afro et beauté, TikTok, salons de coiffure",
      positionnement: "Marque à part, qualité vérifiée, livrée en 48 h depuis la France. La taxe de 3 € par article vise Temu, pas vous.",
      attention: "Beaucoup de faux « 100 % cheveux humains » : tester les échantillons. Hygiène, retours, sécurité des produits (GPSR). Marque séparée de NeoDrive.",
      premier_test: "10 – 20 échantillons de 3 fournisseurs, test qualité, puis page TikTok dédiée.", budget_test: "≈ 800 – 2 000 €",
      mots_cles: ["human hair lace frontal wig 13x4", "Xuchang human hair wig factory", "virgin hair wig wholesale"],
      fournisseurs: [sup("Usines de la région de Xuchang (Henan)", "Capitale mondiale de la perruque ; comparer 3 usines, test brûlure / mèche."), sup("Fournisseur vu sur Made-in-China (13x4 HD lace)", "Prix de 5 – 15 $ trop bas pour du vrai cheveu humain : méfiance.")],
      statut: "a_lancer" },
    { id: "diable", rang: 8, nom: "Diable électrique monte-escalier", verdict: "BON", note: 64,
      prix_usine: "400 – 900 $", prix_vente: "1 500 – 3 000 €", concurrence: "Peu de concurrence vidéo en France",
      marge_unite: "700 – 1 500 €", ventes_an1: "2 – 5", ventes_croisiere: "5 – 10", marge_mois: "5 000 – 11 000 €", place: "Habitacles",
      clients: "Déménageurs, livreurs, installateurs", positionnement: "Produit malin, vidéo efficace, prend peu de place.",
      attention: "CE, batterie, freinage dans les escaliers.", premier_test: "2 échantillons dans les voitures, vidéo démonstration.", budget_test: "≈ 1 000 – 2 000 €",
      mots_cles: ["electric stair climbing hand truck", "stair climber trolley battery"], fournisseurs: [], statut: "a_lancer" },
    { id: "saison", rang: 9, nom: "Produits de saison : chaussettes neige, groupes électrogènes, chauffages pétrole, housses chauffantes", verdict: "BON", note: 62,
      prix_usine: "5 – 300 $", prix_vente: "30 – 900 €", concurrence: "Amazon, Norauto, grandes surfaces de bricolage",
      marge_unite: "8 – 150 €", ventes_an1: "selon saison", ventes_croisiere: "selon saison", marge_mois: "3 000 – 8 000 € (en saison)", place: "Sous les racks",
      clients: "Clients voiturettes, montagne (loi Montagne), campagne", positionnement: "Remplir l'espace sous les racks selon la saison ; charger de juillet à septembre pour l'hiver.",
      attention: "Prix serrés sur Amazon. Groupes : bruit et émissions. Éco-organismes appareils électriques.", premier_test: "Petit lot dans le chargement de juillet – septembre 2027.", budget_test: "≈ 3 000 – 5 000 €",
      mots_cles: ["snow socks car", "inverter generator 2000W", "kerosene heater electronic", "12V heated seat cover"], fournisseurs: [], statut: "a_lancer" },
    { id: "portique_lavage", rang: 10, nom: "Portique de lavage auto sans contact", verdict: "TEST", note: 60,
      prix_usine: "15 000 – 35 000 $ (estimation)", prix_vente: "45 000 – 80 000 € HT installé", concurrence: "Portiques sans contact en France : 30 000 – 200 000 € la machine ; projet complet 200 000 – 400 000 €",
      marge_unite: "15 000 – 35 000 €", ventes_an1: "0 – 1 par trimestre", ventes_croisiere: "1 – 2", marge_mois: "15 000 – 50 000 €", place: "Une grande partie d'un conteneur (pièces démontées)",
      clients: "Garages, concessions, supermarchés, stations, investisseurs en stations de lavage",
      positionnement: "« Station de lavage clé en main à moitié prix », avec un installateur partenaire.",
      attention: "Métier d'installation (eau, électricité, séparateur d'hydrocarbures, autorisations) et de maintenance. Pas de lancement sans installateur partenaire.",
      premier_test: "Trouver d'abord un installateur partenaire et 1 client prêt à signer, puis commander.", budget_test: "≈ 0 € avant client signé",
      mots_cles: ["touchless car wash machine", "automatic car wash gantry 360"],
      fournisseurs: [sup("Leisuwash (Shenyang)", "Fabricant connu de portiques sans contact ; à vérifier (CE, SAV Europe).")],
      statut: "a_lancer" },
  ],
  calendrier: [
    { periode: "Décembre 2026", actions: ["3 devis par produit TOP (dimensions emballées, poids, CE, fiche batterie).", "Vérifier les codes douaniers et l'aide CARSAT.", "Liste des pièces de voiturettes les plus demandées."] },
    { periode: "Janvier 2027", actions: ["Conteneur test : 2 brouettes, 1 dumper, 1 débroussailleuse électrique, 1 mini-chargeuse, un lot de pièces de voiturettes, 10 – 20 perruques en échantillon."] },
    { periode: "Février – mars 2027", actions: ["Pub à 10 – 20 € par jour et par produit, prévente avec acompte.", "Échantillons de balayeuse et de cellule pick-up.", "Chercher un installateur partenaire pour le portique de lavage."] },
    { periode: "Avril – juin 2027", actions: ["Pleine saison jardin et débroussaillage.", "On garde ce qui vend en 60 jours avec au moins 30 % de marge, on arrête le reste."] },
    { periode: "Été 2027", actions: ["Chargement d'hiver : produits de saison et pièces.", "Les produits validés entrent dans chaque conteneur."] },
    { periode: "Automne 2027", actions: ["Bilan de l'année et préparation du plan 2028 dans la Giga Analyse."] },
  ],
  chargement: [
    { zone: "Dans les voitures (≈ 1,6 m³)", contenu: ["Pièces de voiturettes : plaquettes, kits d'entretien, essuie-glaces, batteries, bâches", "Perruques (cartons plats)", "Diables monte-escalier"] },
    { zone: "Sous les racks (≈ 15 – 20 m³)", contenu: ["3 – 4 brouettes électriques", "2 dumpers électriques", "1 – 2 débroussailleuses électriques", "Produits de saison (juillet – septembre pour l'hiver)"] },
    { zone: "1 place de voiture, en alternance", contenu: ["Mini-chargeuse électrique", "ou balayeuse autoportée", "ou cellule de pick-up", "Seulement avec des réservations"] },
  ],
  regles: [
    "Un produit à la fois en test, jamais de stock sans preuve de vente (réservations avec acompte).",
    "Tout sur la facture et la liste de colisage avec le bon code douanier ; batteries lithium déclarées comme marchandise dangereuse.",
    "Marquage CE vérifié (méfiance envers les faux certificats), nom de MK HOLDING sur le produit, éco-organismes.",
    "Zéro contrefaçon, zéro produit interdit.",
  ],
  plus_tard: [
    { nom: "Robot balayeur autonome", raison: "20 000 – 120 000 € HT en France, location 400 – 900 €/mois ; logiciel et SAV techniques : plus tard, en location." },
    { nom: "Distributeur nettoyage de casques", raison: "Machine 1 050 – 2 500 $, service vendu 4 – 5 € ; petit business d'appoint." },
    { nom: "Gerbeur, table élévatrice, chariot plateforme", raison: "VEVOR et Amazon tirent les prix ; seulement en complément." },
    { nom: "Mini-pelle 0,4 – 1 t", raison: "Marché saturé, moteur Stage V obligatoire." },
    { nom: "Camping-cars et caravanes chinois", raison: "Homologation européenne très difficile." },
    { nom: "Osmoseur, vérins hydrauliques, machines à canettes et gobelets, châssis de karting, matériel industriel", raison: "Niches industrielles sans lien avec vos clients." },
  ],
  interdits: [
    { nom: "AirPods « best-level-version » avec logo, copies d'iPhone, consoles « en gros »", raison: "Contrefaçon : saisie en douane, jusqu'à 4 ans de prison et 400 000 € d'amende (art. L716-9 du Code de la propriété intellectuelle)." },
    { nom: "Puffs « 18 000 bouffées »", raison: "Puffs jetables interdites en France depuis le 26 février 2025." },
  ],
};

/* ───────────── Lecture / écriture ───────────── */

export const currentYear = () => new Date().getFullYear();

/** Liste des plans (année + titre). Crée le plan de l'année 1 s'il n'existe aucun plan. */
export async function listPlans(db: SupabaseClient) {
  const { data, error } = await db.from(PLAN_TABLE).select("year,updated_at,plan->titre").order("year", { ascending: false });
  if (error) throw new Error(error.message);
  if (!data?.length) {
    const { error: e2 } = await db.from(PLAN_TABLE).insert({ year: SEED_PLAN_2027.annee, plan: SEED_PLAN_2027 });
    if (e2 && !/duplicate/i.test(e2.message)) throw new Error(e2.message);
    return [{ year: SEED_PLAN_2027.annee, updated_at: new Date().toISOString(), titre: SEED_PLAN_2027.titre }];
  }
  return data as { year: number; updated_at: string; titre: string }[];
}

export async function getPlan(db: SupabaseClient, year: number) {
  const { data, error } = await db.from(PLAN_TABLE).select("year,updated_at,plan").eq("year", year).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { year: data.year as number, updated_at: data.updated_at as string, plan: normalizePlan(data.plan) } : null;
}

/** Plan qui guide les analyses : celui de l'année en cours, sinon le plus proche (ex. plan 2027 en décembre 2026). */
export async function activePlan(db: SupabaseClient) {
  await listPlans(db);
  const y = currentYear();
  const { data } = await db.from(PLAN_TABLE).select("year,plan").order("year", { ascending: true });
  const rows = (data || []) as { year: number; plan: Plan }[];
  const pick = rows.find(r => r.year === y) || rows.find(r => r.year > y) || rows[rows.length - 1];
  return pick ? normalizePlan(pick.plan) : null;
}

export async function savePlan(db: SupabaseClient, year: number, plan: Plan) {
  const clean = normalizePlan({ ...plan, annee: year });
  const { error } = await db.from(PLAN_TABLE).upsert({ year, plan: clean, updated_at: new Date().toISOString() }, { onConflict: "year" });
  if (error) throw new Error(error.message);
  return clean;
}

const S = (v: unknown, max = 600) => String(v ?? "").slice(0, max);
const SA = (v: unknown, n = 30, max = 400) => (Array.isArray(v) ? v : []).map(x => S(x, max)).filter(Boolean).slice(0, n);

export function normalizePlan(p: unknown): Plan {
  const x = (p || {}) as Record<string, unknown>;
  const prods = (Array.isArray(x.produits) ? x.produits : []) as Record<string, unknown>[];
  return {
    annee: Number(x.annee) || currentYear(),
    titre: S(x.titre, 200), source: x.source ? S(x.source, 300) : undefined,
    resume: SA(x.resume, 8), objectifs: SA(x.objectifs, 10),
    produits: prods.slice(0, 40).map((q, i) => ({
      id: S(q.id || `p${i + 1}`, 60), rang: Number(q.rang) || i + 1, nom: S(q.nom, 200),
      verdict: (["TOP", "TEST", "BON"].includes(String(q.verdict)) ? q.verdict : "TEST") as PlanProduct["verdict"], note: Math.max(0, Math.min(100, Number(q.note) || 0)),
      prix_usine: S(q.prix_usine, 200), prix_vente: S(q.prix_vente, 200), concurrence: S(q.concurrence, 400), marge_unite: S(q.marge_unite, 200),
      ventes_an1: S(q.ventes_an1, 120), ventes_croisiere: S(q.ventes_croisiere, 120), marge_mois: S(q.marge_mois, 120), place: S(q.place, 200),
      clients: S(q.clients, 400), positionnement: S(q.positionnement, 600), attention: S(q.attention, 600),
      premier_test: S(q.premier_test, 400), budget_test: S(q.budget_test, 120), mots_cles: SA(q.mots_cles, 8, 120),
      fournisseurs: ((Array.isArray(q.fournisseurs) ? q.fournisseurs : []) as Record<string, unknown>[]).slice(0, 20).map(f => ({
        nom: S(f.nom, 160), plateforme: S(f.plateforme, 120), lien: /^https?:\/\//.test(String(f.lien || "")) ? S(f.lien, 500) : "", contact: S(f.contact, 200),
        prix: S(f.prix, 120), moq: S(f.moq, 80), statut: SUPPLIER_STATUS[String(f.statut)] ? String(f.statut) : "a_contacter", notes: S(f.notes, 500), verifie: !!f.verifie,
      })),
      statut: PRODUCT_STATUS[String(q.statut)] ? String(q.statut) : "a_lancer", notes: S(q.notes, 1500),
    })),
    calendrier: ((Array.isArray(x.calendrier) ? x.calendrier : []) as Record<string, unknown>[]).slice(0, 16).map(c => ({ periode: S(c.periode, 80), actions: SA(c.actions, 10) })),
    chargement: ((Array.isArray(x.chargement) ? x.chargement : []) as Record<string, unknown>[]).slice(0, 6).map(c => ({ zone: S(c.zone, 120), contenu: SA(c.contenu, 12) })),
    regles: SA(x.regles, 10),
    plus_tard: ((Array.isArray(x.plus_tard) ? x.plus_tard : []) as Record<string, unknown>[]).slice(0, 20).map(c => ({ nom: S(c.nom, 200), raison: S(c.raison, 400) })),
    interdits: ((Array.isArray(x.interdits) ? x.interdits : []) as Record<string, unknown>[]).slice(0, 20).map(c => ({ nom: S(c.nom, 200), raison: S(c.raison, 400) })),
  };
}

/** Résumé compact du plan envoyé à l'IA (statuts, fournisseurs, notes : sans coordonnées). */
export function planForAI(p: Plan) {
  return {
    annee: p.annee, titre: p.titre, objectifs: p.objectifs, regles: p.regles,
    produits: p.produits.map(q => ({
      rang: q.rang, nom: q.nom, verdict: q.verdict, statut: PRODUCT_STATUS[q.statut], marge_unite: q.marge_unite, ventes_croisiere: q.ventes_croisiere,
      premier_test: q.premier_test, attention: q.attention, notes: q.notes?.slice(0, 400) || "",
      fournisseurs: q.fournisseurs.map(f => ({ nom: f.nom, statut: SUPPLIER_STATUS[f.statut], prix: f.prix, moq: f.moq })),
    })),
    calendrier: p.calendrier,
  };
}
