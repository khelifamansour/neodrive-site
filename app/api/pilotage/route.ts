import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { dataClient, readJson, writeJson } from "../../../lib/datastore";
import { defaultPilotage, type Pilotage } from "../../../lib/pilotage";

export const dynamic = "force-dynamic";
const PATH = "pilotage/pilotage.json";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as { action?: string; passcode?: string; data?: Pilotage };
  if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "load") {
      const d = await readJson<Pilotage>(sb, PATH);
      const def = defaultPilotage();
      return NextResponse.json({ ok: true, data: d ? { ...def, ...d, params: { ...def.params, ...d.params } } : def });
    }
    if (b.action === "save" && b.data?.params) {
      const data = { ...b.data, updated_at: new Date().toISOString() };
      await writeJson(sb, PATH, data);
      return NextResponse.json({ ok: true, data });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[PILOTAGE]", b.action, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur serveur" }, { status: 500 });
  }
}
