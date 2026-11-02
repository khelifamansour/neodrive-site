import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { dataClient, readJson, writeJson } from "../../../lib/datastore";
import { defaultGestion, type Gestion } from "../../../lib/gestion";
import { mergeSeed, type Sourcing } from "../../../lib/sourcing";

export const dynamic = "force-dynamic";
const PATH = "sourcing/data.json";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { action?: string; passcode?: string; data?: Sourcing };
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "load") {
      const [d, g] = await Promise.all([readJson<Sourcing>(sb, PATH), readJson<Gestion>(sb, "pilotage/gestion.json")]);
      const def = defaultGestion();
      // Les coûts (fret, douane, dépotage…) viennent du pilotage : une seule source de vérité.
      const params = { ...def.params, ...(g?.params || {}), freightUsd: { ...def.params.freightUsd, ...(g?.params?.freightUsd || {}) } };
      return NextResponse.json({ ok: true, data: mergeSeed(d), params });
    }
    if (b.action === "save" && Array.isArray(b.data?.suppliers)) {
      const data = { ...b.data, updated_at: new Date().toISOString() };
      await writeJson(sb, PATH, data);
      return NextResponse.json({ ok: true, data });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[SOURCING]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
