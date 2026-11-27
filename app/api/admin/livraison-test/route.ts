import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { crmDatabase } from "../../../../lib/crm-agent";
import { sha } from "../../../../lib/team";
import { CARTE_GRISE_BUCKET } from "../../../../lib/carte-grise-server";
import { POST as livreur } from "../../livreur/route";
import { POST as preparer } from "../../carte-grise/preparer/route";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BASE = "https://www.easydrive-auto.fr";
type J = Record<string, unknown>;

/**
 * Test de bout en bout du parcours livraison, sur une réservation de TEST uniquement (source « test »), par jeton à usage unique
 * (admin_once_tokens.purpose « livraison-test », payload { reservation_id, member_id, vin, pieces?, sign? }).
 * Appelle les vraies routes (/api/livreur puis /api/carte-grise/preparer) avec une session temporaire du compte livreur indiqué,
 * fermée à la fin : liste des livraisons, VIN, paiement, signature du bon, puis état du lien carte grise.
 */
async function run(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const db = crmDatabase();
  const { data } = await db.from("admin_once_tokens").update({ used_at: new Date().toISOString() }).eq("token", token).eq("purpose", "livraison-test").is("used_at", null).gt("expires_at", new Date().toISOString()).select("payload");
  const p = (data?.[0] as { payload?: { reservation_id?: number; member_id?: number; vin?: string; pieces?: boolean; sign?: boolean; watch?: number[] } } | undefined)?.payload;
  if (!p?.reservation_id || !p.member_id) return NextResponse.json({ ok: false }, { status: 401 });
  const id = Number(p.reservation_id);
  const { data: r } = await db.from("reservations").select("id,source,prenom,nom").eq("id", id).maybeSingle();
  if (!r || r.source !== "test") return NextResponse.json({ ok: false, error: "Réservation de test uniquement (source « test »)." }, { status: 400 });

  // Session temporaire du compte livreur (fermée à la fin).
  const sess = randomBytes(32).toString("hex");
  const { data: s, error: se } = await db.from("team_sessions").insert({ member_id: p.member_id, token_hash: sha(sess), ip: "test", ua: "livraison-test" }).select("id").single();
  if (se || !s) return NextResponse.json({ ok: false, error: "Session : " + (se?.message || "?") }, { status: 500 });
  const steps: J[] = [];
  const call = async (body: J) => {
    const res = await livreur(new Request(`${BASE}/api/livreur`, { method: "POST", headers: { "content-type": "application/json", cookie: `nd_team=${sess}`, "x-forwarded-for": "10.0.0.1" }, body: JSON.stringify(body) }));
    const j = await res.json() as J;
    steps.push({ action: body.action, status: res.status, ok: j.ok, error: j.error });
    return j;
  };
  const prep = async (body: J) => {
    const res = await preparer(new Request(`${BASE}/api/carte-grise/preparer`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.2" }, body: JSON.stringify(body) }));
    return await res.json() as J;
  };
  try {
    const dl = await call({ action: "deliveries" });
    const list = (dl.deliveries || []) as { id: number; prenom: string; nom: string; ville: string; tour_name?: string; vin?: string | null }[];
    const watch = (p.watch || []).map(Number);
    const visible = list.filter(x => x.id === id || watch.includes(x.id)).map(x => ({ id: x.id, name: `${x.prenom} ${x.nom}`, ville: x.ville, tour: x.tour_name || null, vin: x.vin || null }));
    const out: J = { who: dl.who, mine: dl.mine, visible };
    if (p.sign !== false) {
      if (p.vin) await call({ action: "save_vin", id, vin: p.vin });
      const { data: sv } = await db.from("shipment_vehicles").select("status,picked_at,reservation_id").eq("vin", String(p.vin || "")).limit(1);
      out.vehicle_after_vin = sv?.[0] || null;
      await call({ action: "confirm_payment", id });
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200"><rect width="600" height="200" fill="white"/><path d="M20 150 C 80 20, 140 180, 200 80 S 320 160, 380 60 S 520 170, 580 90" stroke="black" stroke-width="5" fill="none"/><text x="20" y="190" font-size="18">TEST</text></svg>`;
      const png = await sharp(Buffer.from(svg)).png().toBuffer();
      const signed = await call({ action: "sign", id, signer: "TEST Mansour", accept: true, checks: {}, signature: `data:image/png;base64,${png.toString("base64")}`, reserves: "Test de bout en bout (fictif)" });
      out.sign = { url: signed.url, emailed: signed.emailed, paid: signed.paid, carte_grise_url: signed.carte_grise_url, carte_grise_whatsapp: !!signed.carte_grise_whatsapp };
    }
    const { data: rr } = await db.from("reservations").select("cg_prep_token,statut,livre_at").eq("id", id).maybeSingle();
    out.reservation = { statut: rr?.statut, livre_at: rr?.livre_at };
    const cg = rr?.cg_prep_token as string | null;
    if (cg) {
      out.carte_grise_link = `${BASE}/carte-grise/preparer/${cg}`;
      const st1 = await prep({ action: "state", token: cg });
      out.state_before = { stage: st1.stage, vehicle: st1.vehicle };
      if (p.pieces) {
        // Étape 1 (pièces fictives) pour atteindre l'étape 2.
        const img = async (t: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#eee"/><text x="40" y="250" font-size="40">${t}</text></svg>`)).jpeg().toBuffer();
        const files = [{ key: "cni", name: "test-identite.jpg", buf: await img("TEST - piece d'identite fictive") }, { key: "justificatif_domicile", name: "test-domicile.jpg", buf: await img("TEST - justificatif fictif") }];
        const init = await prep({ action: "init", token: cg, client: { prenom: "TEST", nom: "Mansour", telephone: "0689781710", email: "", adresse: "Place du Capitole", code_postal: "31000", ville: "Toulouse" }, files: files.map(f => ({ key: f.key, name: f.name, type: "image/jpeg", size: f.buf.length })) });
        const ups = (init.uploads || []) as { key: string; path: string; token: string }[];
        for (const u of ups) { const f = files.find(x => x.key === u.key)!; await db.storage.from(CARTE_GRISE_BUCKET).uploadToSignedUrl(u.path, u.token, f.buf, { contentType: "image/jpeg" }); }
        const done = await prep({ action: "complete", token: cg, files: ups.map(u => { const f = files.find(x => x.key === u.key)!; return { key: u.key, path: u.path, name: f.name, type: "image/jpeg", size: f.buf.length }; }) });
        out.pieces = { init_ok: init.ok, init_error: init.error, complete_ok: done.ok, complete_error: done.error, stage: done.stage };
      }
      const st2 = await prep({ action: "state", token: cg });
      out.state_after = { stage: st2.stage, vehicle: st2.vehicle, pieces: st2.pieces };
    }
    return NextResponse.json({ ok: true, steps, ...out });
  } catch (e) {
    return NextResponse.json({ ok: false, steps, error: (e as Error).message }, { status: 500 });
  } finally {
    await db.from("team_sessions").update({ ended_at: new Date().toISOString() }).eq("id", s.id);
  }
}
export const GET = run;
