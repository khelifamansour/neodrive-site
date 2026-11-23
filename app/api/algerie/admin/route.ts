import { NextResponse } from "next/server";
import { isAuthorized } from "../../../../lib/integrations";
import { dataClient } from "../../../../lib/datastore";

export const dynamic = "force-dynamic";

const STATUSES = ["a_faire", "en_cours", "fait"];
const PHASES = ["p1", "p2", "p3", "p4", "p5"];
const PRODUITS = ["camion", "tricycle", "vsp", "autre"];
const str = (v: unknown, max = 300) => typeof v === "string" ? v.trim().slice(0, max) : "";
const int = (v: unknown) => { const n = Number(String(v ?? "").replace(/\s/g, "")); return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), 1e9) : null; };
const list = (v: unknown) => Array.isArray(v) ? v.slice(0, 300).filter(x => x && typeof x === "object") as Record<string, unknown>[] : [];

/** Nettoie la valeur envoyée selon la clé (rien d'autre n'est accepté). */
function clean(key: string, v: unknown): unknown {
  if (key === "phases") {
    const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    return Object.fromEntries(PHASES.map(p => [p, STATUSES.includes(String(o[p])) ? String(o[p]) : "a_faire"]));
  }
  if (key === "videos") return list(v).map(r => ({
    id: str(r.id, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(String(r.date)) ? String(r.date) : "",
    produit: PRODUITS.includes(String(r.produit)) ? String(r.produit) : "autre",
    vues: int(r.vues), commentaires: int(r.commentaires), dm: int(r.dm), prix: int(r.prix),
    wilayas: str(r.wilayas, 500), note: str(r.note, 1000),
  }));
  if (key === "contacts") return list(v).map(r => ({ id: str(r.id, 40), nom: str(r.nom, 120), role: str(r.role, 160), tel: str(r.tel, 40), note: str(r.note, 1000) }));
  return undefined;
}

/** NeoDrive Algérie : tableau de stratégie du fondateur (code principal uniquement, jamais ouvert aux membres de l'équipe). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "list") {
      const { data, error } = await sb.from("algerie_board").select("key,value,updated_at");
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, board: Object.fromEntries((data || []).map(r => [r.key, r.value])), updated: Object.fromEntries((data || []).map(r => [r.key, r.updated_at])) });
    }
    if (b.action === "save") {
      const key = String(b.key);
      const value = clean(key, b.value);
      if (value === undefined) return NextResponse.json({ ok: false, error: "Clé inconnue" }, { status: 400 });
      const { error } = await sb.from("algerie_board").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, value });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Erreur" }, { status: 500 });
  }
}
