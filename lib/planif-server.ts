/** Serveur : création d'un client du planificateur (géocodage de l'adresse). */
import type { PlanClient } from "./planif";

export const PLAN_CLIENTS = "planificateur/clients";
const clean = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

export async function geocode(adresse: string, cp: string, ville: string) {
  try {
    const q = encodeURIComponent(`${adresse} ${cp} ${ville}`.trim());
    const f = (await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1${/^\d{5}$/.test(cp) ? `&postcode=${cp}` : ""}`, { cache: "no-store" })).json())?.features?.[0];
    if (f) return { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
    const f2 = (await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cp + " " + ville)}&type=municipality&limit=1`, { cache: "no-store" })).json())?.features?.[0];
    if (f2) return { lng: f2.geometry.coordinates[0], lat: f2.geometry.coordinates[1] };
  } catch (e) { console.error("[PLANIF] geocode", e); }
  return null;
}

export async function buildClient(b: Record<string, unknown>, source: PlanClient["source"]): Promise<PlanClient | { error: string }> {
  const c = { prenom: clean(b.prenom, 80), nom: clean(b.nom, 80), telephone: clean(b.telephone, 30), email: clean(b.email, 120), adresse: clean(b.adresse), code_postal: clean(b.code_postal, 5), ville: clean(b.ville, 80), modele: clean(b.modele, 60), couleur: clean(b.couleur, 40), note: clean(b.note, 500) };
  if (!c.nom || !/^\d{5}$/.test(c.code_postal) || !c.ville) return { error: "Nom, code postal et ville sont obligatoires." };
  const pos = await geocode(c.adresse, c.code_postal, c.ville);
  if (!pos) return { error: "Adresse introuvable, vérifiez le code postal et la ville." };
  const total = Number(b.total);
  return { id: `${Date.now()}-${crypto.randomUUID().slice(0, 6)}`, token: crypto.randomUUID(), created_at: new Date().toISOString(), source, ...c, total: Number.isFinite(total) && total > 0 ? total : null, status: "a_planifier", tour_id: null, ...pos };
}

