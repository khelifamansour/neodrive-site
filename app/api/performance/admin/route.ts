import { NextResponse } from "next/server";
import { isAuthorized } from "../../../../lib/integrations";
import { dataClient } from "../../../../lib/datastore";

export const dynamic = "force-dynamic";

const FIELDS = "date,updated_at,poids,sommeil,energie,km,conduite,sport,sport_min,eau,proteines,grignotage,soir_leger,note";
const SPORTS = ["aucun", "marche", "muscu", "autre"];
const num = (v: unknown, min: number, max: number) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const bool = (v: unknown) => v === true || v === "oui" ? true : v === false || v === "non" ? false : null;

/** Performance : relevés quotidiens du fondateur (code principal uniquement, jamais ouvert aux membres de l'équipe). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "list") {
      const { data, error } = await sb.from("perf_daily").select(FIELDS).order("date", { ascending: true }).limit(1000);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, rows: data || [] });
    }
    const date = typeof b.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : null;
    if (!date) return NextResponse.json({ ok: false, error: "Date invalide" }, { status: 400 });

    if (b.action === "save") {
      const energie = num(b.energie, 1, 5);
      const row = {
        date, updated_at: new Date().toISOString(),
        poids: num(b.poids, 30, 300), sommeil: num(b.sommeil, 0, 24), energie: energie === null ? null : Math.round(energie),
        km: num(b.km, 0, 5000), conduite: num(b.conduite, 0, 24),
        sport: SPORTS.includes(String(b.sport)) ? String(b.sport) : null, sport_min: num(b.sport_min, 0, 600),
        eau: num(b.eau, 0, 15), proteines: bool(b.proteines), grignotage: bool(b.grignotage), soir_leger: bool(b.soir_leger),
        note: typeof b.note === "string" ? b.note.trim().slice(0, 4000) || null : null,
      };
      const { error } = await sb.from("perf_daily").upsert(row, { onConflict: "date" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    if (b.action === "delete") {
      const { error } = await sb.from("perf_daily").delete().eq("date", date);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Erreur" }, { status: 500 });
  }
}
