import { NextResponse } from "next/server";
import { isAuthorized } from "../../../../lib/integrations";
import { dataClient } from "../../../../lib/datastore";
import { dossierLinks, findDossier, sendDossierToProvider } from "../../../../lib/carte-grise-server";
import { CARTE_GRISE_PROVIDER_EMAIL, CARTE_GRISE_PROVIDER_NAME } from "../../../../lib/carte-grise";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const STATUSES = ["envoi en cours", "reçu", "envoyé", "traité", "annulé"];

/** Dossiers carte grise : liste et envoi au prestataire, réservés au fondateur (code principal). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    if (b.action === "list") {
      const { data, error } = await sb.from("carte_grise_dossiers").select("id,ref,created_at,type_demande,nom,prenom,telephone,email,adresse,code_postal,ville,version,service_carte_grise,files,status,sent_to_provider_at,sent_to,notes").order("created_at", { ascending: false }).limit(300);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, dossiers: data || [], provider: { name: CARTE_GRISE_PROVIDER_NAME, email: CARTE_GRISE_PROVIDER_EMAIL } });
    }
    const d = await findDossier(sb, { id: b.id });
    if (!d) return NextResponse.json({ ok: false, error: "Dossier introuvable" }, { status: 404 });
    if (b.action === "links") return NextResponse.json({ ok: true, links: await dossierLinks(sb, d, 3600) });
    if (b.action === "send") return NextResponse.json({ ok: true, ...(await sendDossierToProvider(sb, d, { force: Boolean(b.force) })) });
    if (b.action === "update") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof b.status === "string" && STATUSES.includes(b.status)) patch.status = b.status;
      if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 4000);
      const { error } = await sb.from("carte_grise_dossiers").update(patch).eq("id", d.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json({ ok: false, error: err.message || "Erreur" }, { status: err.status || 500 });
  }
}
