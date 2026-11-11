import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { crmDatabase } from "../../../../lib/crm-agent";
import { brevoReady, sendEmail, OWNER_EMAIL } from "../../../../lib/brevo";
import { storeFiles } from "../store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const tokenOk = (t: string) => /^[a-f0-9]{36}$/.test(t);

/** Lien de dépôt partagé (usine, transitaire) : infos du dossier et liste des documents déjà reçus. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || ""; if (!tokenOk(t)) return NextResponse.json({ ok: false }, { status: 404 });
  const db = crmDatabase();
  const { data: s } = await db.from("shipments").select("id,name,port,vessel,bl_number,containers,vehicles,eta").eq("share_token", t).maybeSingle();
  if (!s) return NextResponse.json({ ok: false }, { status: 404 });
  const { data: docs } = await db.from("shipment_docs").select("doc_type,version,file_name,created_at,uploaded_by").eq("shipment_id", s.id).order("created_at");
  return NextResponse.json({ ok: true, ship: { ...s, id: undefined }, docs });
}

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null); const t = String(fd?.get("t") || "");
  if (!fd || !tokenOk(t)) return NextResponse.json({ ok: false }, { status: 404 });
  await applyStoredSecrets();
  const db = crmDatabase();
  const { data: s } = await db.from("shipments").select("id,name").eq("share_token", t).maybeSingle();
  if (!s) return NextResponse.json({ ok: false }, { status: 404 });
  const who = String(fd.get("who") || "").replace(/[<>]/g, "").slice(0, 60) || "lien partagé";
  const out = await storeFiles(s.id, fd, who);
  if (brevoReady() && out.saved.length) { try { await sendEmail(OWNER_EMAIL, "Mansour", `Documents reçus : ${s.name}`, `<p>${out.saved.length} document(s) déposé(s) par ${who} dans le dossier <b>${s.name}</b> : ${out.saved.map(x => `${x.name} (${x.type})`).join(", ")}.</p><p>https://www.easydrive-auto.fr/conteneurs</p>`); } catch { } }
  return NextResponse.json({ ok: true, ...out });
}
