/** Mode démonstration du planificateur : tout se passe dans le navigateur, avec des données fictives. */
import { DEFAULT_HUBS, type Hub, type PlanClient, type PlanTour } from "../../lib/planif";

type Store = { clients: PlanClient[]; tours: PlanTour[]; hubs: Hub[] };
const KEY = "nd_demo_planif_v1";
const DEMO: [string, string, string, string, string, number, number, number][] = [
  ["Martin", "Julie", "12 rue Alsace Lorraine", "31000", "Toulouse", 43.6045, 1.4440, 450],
  ["Dubois", "Karim", "10 cours de l'Intendance", "33000", "Bordeaux", 44.8420, -0.5760, 590],
  ["Bernard", "Sophie", "5 rue Foch", "34000", "Montpellier", 43.6110, 3.8770, 590],
  ["Petit", "Nadia", "20 La Canebière", "13001", "Marseille", 43.2975, 5.3810, 690],
  ["Robert", "Paul", "3 rue de la République", "69001", "Lyon", 45.7660, 4.8360, 690],
  ["Richard", "Emma", "8 rue Crébillon", "44000", "Nantes", 47.2130, -1.5600, 790],
  ["Durand", "Hugo", "15 rue Nationale", "37000", "Tours", 47.3920, 0.6870, 790],
  ["Leroy", "Inès", "2 rue Faidherbe", "59000", "Lille", 50.6370, 3.0680, 790],
  ["Moreau", "Lucas", "1 place Kléber", "67000", "Strasbourg", 48.5835, 7.7458, 790],
  ["Simon", "Léa", "30 rue du Gros Horloge", "76000", "Rouen", 49.4410, 1.0910, 790],
];
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const demoClients = (): PlanClient[] => DEMO.map(([nom, prenom, adresse, code_postal, ville, lat, lng, fee], i) => ({
  id: `demo-${i}-${uid()}`, token: uid(), created_at: new Date().toISOString(), source: "reservation", prenom, nom,
  telephone: `06 12 34 56 ${10 + i}`, email: `demo${i + 1}@exemple.fr`, adresse, code_postal, ville, modele: "NeoDrive Confort", couleur: "",
  note: "TEST démonstration", total: 4990 + fee, status: "a_planifier", tour_id: null, lat, lng,
}));
const fresh = (): Store => ({ clients: demoClients(), tours: [], hubs: DEFAULT_HUBS.map(h => ({ ...h, stock: 20 })) });
function read(): Store { try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s?.hubs) return s; } catch { /* vide */ } const s = fresh(); write(s); return s; }
function write(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* navigateur privé */ } }
async function geocode(q: string, type = "") {
  const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1${type ? `&type=${type}` : ""}`).then(x => x.json()).catch(() => null);
  const f = r?.features?.[0]; return f ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } : null;
}
const clean = (v: unknown, n = 200) => String(v ?? "").trim().slice(0, n);

export async function demoApi(b: Record<string, unknown>): Promise<Record<string, unknown>> {
  const s = read();
  const ok = (x: Record<string, unknown> = {}) => { write(s); return { ok: true, ...x }; };
  switch (b.action) {
    case "list": return ok({ clients: s.clients, tours: s.tours, hubs: s.hubs });
    case "fuel": return fetch("/api/planificateur", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "fuel" }) }).then(r => r.json()).catch(() => ({ ok: false }));
    case "demo": { const before = s.clients.length; s.clients = [...s.clients.filter(c => !c.note?.startsWith("TEST")), ...demoClients()]; s.hubs = s.hubs.map(h => ({ ...h, stock: h.id === "lamasquere" || h.id === "boran" ? 20 : h.stock })); void before; return ok({ created: DEMO.length }); }
    case "demo_clear": { const n = s.clients.filter(c => c.note?.startsWith("TEST")).length; s.clients = s.clients.filter(c => !c.note?.startsWith("TEST")); return ok({ deleted: n }); }
    case "add": {
      const c = { prenom: clean(b.prenom, 80), nom: clean(b.nom, 80), telephone: clean(b.telephone, 30), adresse: clean(b.adresse), code_postal: clean(b.code_postal, 5), ville: clean(b.ville, 80), modele: clean(b.modele, 60), note: clean(b.note, 500) };
      if (!c.nom || !/^\d{5}$/.test(c.code_postal) || !c.ville) throw new Error("Nom, code postal et ville sont obligatoires.");
      const pos = (await geocode(`${c.adresse} ${c.code_postal} ${c.ville}`)) || (await geocode(`${c.code_postal} ${c.ville}`, "municipality"));
      if (!pos) throw new Error("Adresse introuvable, vérifiez le code postal et la ville.");
      s.clients.push({ id: uid(), token: uid(), created_at: new Date().toISOString(), source: "manuel", email: "", couleur: "", total: null, status: "a_planifier", tour_id: null, ...c, ...pos });
      return ok();
    }
    case "client_status": {
      const id = clean(b.id, 80);
      if (b.delete) { s.clients = s.clients.filter(c => c.id !== id); return ok(); }
      const c = s.clients.find(x => x.id === id); if (!c) throw new Error("Client introuvable");
      if (["a_planifier", "planifie", "livre"].includes(String(b.status))) c.status = b.status as PlanClient["status"];
      if (c.status === "a_planifier") c.tour_id = null;
      return ok();
    }
    case "save_hubs": { const hubs = (b.hubs as Hub[]) || []; if (!hubs.length) throw new Error("Au moins un hub est nécessaire."); s.hubs = hubs.map(h => ({ ...h, stock: Math.max(0, Math.round(Number(h.stock) || 0)) })); return ok({ hubs: s.hubs }); }
    case "add_hub": {
      const name = clean(b.name, 80); const pos = name.length >= 2 ? await geocode(name, "municipality") : null;
      if (!pos) throw new Error("Ville introuvable");
      s.hubs.push({ id: `hub-${Date.now()}`, name, stock: Math.max(0, Math.round(Number(b.stock) || 0)), ...pos }); return ok({ hubs: s.hubs });
    }
    case "save_tour": {
      const t = b.tour as PlanTour; const prev = s.tours.find(x => x.id === t.id);
      const validating = t.status === "valide" && prev?.status !== "valide";
      if (validating && !t.stops?.length) throw new Error("Calculez la tournée avant de la valider.");
      const ids = new Set(t.clientIds);
      for (const c of s.clients) {
        if (ids.has(c.id) && c.status !== "livre") { c.tour_id = t.id; c.status = "planifie"; }
        else if (!ids.has(c.id) && c.tour_id === t.id && c.status === "planifie") { c.tour_id = null; c.status = "a_planifier"; }
      }
      if (validating) for (const st of t.stops || []) if (st.kind === "depot" && st.loaded) { const h = s.hubs.find(x => x.id === st.id); if (h) h.stock = Math.max(0, h.stock - st.loaded); }
      s.tours = [...s.tours.filter(x => x.id !== t.id), t];
      return ok({ hubs: s.hubs });
    }
    case "delete_tour": {
      const id = clean(b.id, 80); const t = s.tours.find(x => x.id === id);
      if (t) {
        for (const c of s.clients) if (c.tour_id === id && c.status === "planifie") { c.status = "a_planifier"; c.tour_id = null; }
        if (t.status === "valide") for (const st of t.stops || []) if (st.kind === "depot" && st.loaded) { const h = s.hubs.find(x => x.id === st.id); if (h) h.stock += st.loaded; }
      }
      s.tours = s.tours.filter(x => x.id !== id); return ok();
    }
  }
  throw new Error("Action inconnue");
}
