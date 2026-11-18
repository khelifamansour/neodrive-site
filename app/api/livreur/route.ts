import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { listJson } from "../../../lib/datastore";
import { PLAN_CLIENTS, PLAN_TOURS } from "../../../lib/fleet";
import { driverKey } from "../../../lib/driver-link";
import { brevoReady, sendEmail, sendSms } from "../../../lib/brevo";
import { newCode, sha } from "../../../lib/team";
import { CONTRACT_VERSION, DOC_KINDS, DRIVER_BUCKET, REQUIRED_DOCS, isDocKind } from "../../../lib/driver-docs";
import { roadKm, splitTrips, type PlanClient, type PlanTour, type Stop } from "../../../lib/planif";
import { estimateHours } from "../../../lib/driver-hours";
import { randomBytes } from "crypto";
import { CHECKS, RECEIPT_FOLDER, VIN_RE, receiptPdf, type ReceiptData } from "../../../lib/delivery-receipt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SITE = "https://www.easydrive-auto.fr";
const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type Doc = { id: number; member_id: number; kind: string; path: string | null; filename: string | null; status: string; data: Record<string, unknown>; note: string | null; uploaded_at: string; validated_at: string | null };
type DB = ReturnType<typeof crmDatabase>;

/** Dernier document de chaque type pour un livreur. */
async function latestDocs(db: DB, memberId: number) {
  const { data } = await db.from("driver_documents").select("*").eq("member_id", memberId).order("uploaded_at", { ascending: false }).limit(200);
  const out: Record<string, Doc> = {};
  for (const d of (data || []) as Doc[]) if (!out[d.kind]) out[d.kind] = d;
  return out;
}
const publicDoc = (d?: Doc) => d ? { status: d.status, filename: d.filename, uploaded_at: d.uploaded_at, note: d.note, signed_name: d.data?.signed_name || null, signed_at: d.data?.signed_at || null } : { status: "manquant" };

/** Tournées du livreur : nom du livreur de la tournée qui contient son prénom (ou toutes pour le fondateur). */
const isMine = (t: PlanTour, name: string | null) => {
  if (!name) return true;
  const first = name.trim().split(/\s+/)[0]?.toLowerCase() || "";
  return !!first && String(t.driver || "").toLowerCase().includes(first);
};


/**
 * Vue livreur d'une tournée (lecture seule) : voyages, prénom + ville de chaque client, km et heures estimées.
 * Jamais de prix ni de coûts. Tournée prévisionnelle (brouillon) : ni adresse ni téléphone, positions arrondies (~1 km).
 */
function driverPlan(t: PlanTour, clients: Map<string, PlanClient>) {
  const draft = t.status === "brouillon";
  const stops: Stop[] = (t.stops || []).map(s => {
    if (s.kind !== "client") return { kind: "depot", id: s.id, name: s.name, label: s.name, lat: s.lat, lng: s.lng, load: s.load, loaded: s.loaded, action: s.action, legKm: s.legKm, legH: s.legH };
    const c = clients.get(s.id);
    const who = c ? `${c.prenom || c.nom}`.trim() : s.name.split(" ")[0];
    const ville = c ? `${c.code_postal ? c.code_postal.slice(0, 2) + " · " : ""}${c.ville}` : "";
    const r = (x: number) => draft ? Math.round(x * 100) / 100 : x;
    return { kind: "client", id: s.id, name: who, label: ville, lat: r(s.lat), lng: r(s.lng), load: s.load, action: s.action, legKm: s.legKm, legH: s.legH };
  });
  const trips = splitTrips(stops).map(v => {
    const legs = [...v.clients, ...(v.next ? [v.next] : [])];
    const drive = legs.every(x => x.legH) ? legs.reduce((a, x) => a + (x.legH || 0), 0) : v.km / 72;
    const hours = drive + v.clients.length * 0.75 + (v.hub.loaded ? 0.5 : 0);
    return { n: v.n, color: v.color, hub: v.hub.name, action: v.hub.action, clients: v.clients.map(x => ({ id: x.id, name: x.name, ville: x.label })), next: v.next ? v.next.name : null, km: Math.round(v.km || legs.reduce((a, x, i) => a + roadKm(i ? legs[i - 1] : v.hub, x), 0)), hours: Math.round(hours * 10) / 10 };
  });
  const hours = Math.round(estimateHours(t) * 10) / 10;
  const days = Math.max(1, Math.ceil(hours / 9));
  const end = t.date ? new Date(new Date(t.date + "T12:00:00").getTime() + (days - 1) * 86400e3).toISOString().slice(0, 10) : null;
  return { draft, stops, trips, km: t.km || Math.round(trips.reduce((a, v) => a + v.km, 0)), hours, days, end };
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const db = crmDatabase();
  try {
    // ── Fondateur : invitations et vérification des documents
    if (typeof b.action === "string" && b.action.startsWith("admin_")) {
      if (!isAuthorized(req, String(b.passcode || ""))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
      if (b.action === "admin_list") {
        const { data: members } = await db.from("team_members").select("id,name,role,phone,email,active,expires_at,revoked_at,last_seen_at,sections,created_at").order("created_at", { ascending: false });
        const drivers = (members || []).filter(m => m.role === "livreur" || (Array.isArray(m.sections) && m.sections.includes("livreur")));
        const out = [];
        for (const m of drivers) {
          const docs = await latestDocs(db, m.id);
          const paths = Object.values(docs).map(d => d.path).filter(Boolean) as string[];
          const urls: Record<string, string> = {};
          if (paths.length) { const { data } = await db.storage.from(DRIVER_BUCKET).createSignedUrls(paths, 1800); for (const x of data || []) if (x.path && x.signedUrl) urls[x.path] = x.signedUrl; }
          out.push({ ...m, docs: Object.fromEntries(Object.entries(docs).map(([k, d]) => [k, { id: d.id, status: d.status, filename: d.filename, uploaded_at: d.uploaded_at, validated_at: d.validated_at, note: d.note, url: d.path ? urls[d.path] || null : null, data: d.data }])) });
        }
        return NextResponse.json({ ok: true, drivers: out, kinds: DOC_KINDS, required: REQUIRED_DOCS });
      }
      if (b.action === "admin_validate") {
        const status = b.status === "valide" ? "valide" : b.status === "refuse" ? "refuse" : null;
        if (!status) return NextResponse.json({ ok: false, error: "Statut invalide" }, { status: 400 });
        const { error } = await db.from("driver_documents").update({ status, note: clean(b.note, 300) || null, validated_at: new Date().toISOString() }).eq("id", Number(b.id));
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }
      if (b.action === "admin_invite") {
        const name = clean(b.name, 80); if (name.length < 2) return NextResponse.json({ ok: false, error: "Nom manquant" }, { status: 400 });
        const phone = clean(b.phone, 30), email = clean(b.email, 160);
        const days = Math.min(Math.max(Number(b.days) || 90, 1), 365); const code = newCode();
        const { data, error } = await db.from("team_members").insert({ name, role: "livreur", phone: phone || null, email: email || null, code_hash: sha(code), expires_at: new Date(Date.now() + days * 86400e3).toISOString(), can_see_numbers: true, max_views_per_hour: 60, note: "Livreur prestataire (invitation espace livreur)", sections: ["livreur"] }).select("id").single();
        if (error) throw new Error(error.message);
        const first = name.split(/\s+/)[0];
        const text = `Bonjour ${first}, voici votre accès NeoDrive (livreur) : ${SITE}/organisation - code personnel : ${code}. Ouvrez « Espace livreur » pour déposer vos documents et signer votre contrat.`;
        const sent = { sms: false, email: false, errors: [] as string[] };
        await applyStoredSecrets();
        if (brevoReady()) {
          if (phone) { try { sent.sms = !!(await sendSms(phone, text)); } catch (e) { sent.errors.push("SMS : " + (e as Error).message); } }
          if (email) { try { sent.email = !!(await sendEmail(email, name, "Votre accès NeoDrive (espace livreur)", `<p>Bonjour ${esc(first)},</p><p>Voici votre accès à l'espace livreur NeoDrive.</p><p>1. Ouvrez <a href="${SITE}/organisation">${SITE}/organisation</a><br>2. Entrez votre code personnel : <b style="font-size:18px;letter-spacing:2px">${esc(code)}</b><br>3. Ouvrez « Espace livreur » : déposez vos documents (SIRET, assurance RC pro, permis, pièce d'identité, RIB) et signez votre contrat.</p><p>Ce code est personnel : ne le communiquez à personne.</p><p>À bientôt,<br>Mansour - NeoDrive</p>`)); } catch (e) { sent.errors.push("E-mail : " + (e as Error).message); } }
        } else sent.errors.push("Envoi automatique indisponible (Brevo non configuré)");
        return NextResponse.json({ ok: true, id: data.id, code, text, sent });
      }
      return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
    }

    // ── Livreur connecté (section « livreur ») ou fondateur
    const acc = await authorizeSection(req, b.passcode, "livreur");
    if (!acc) return NextResponse.json({ ok: false, error: "Connectez-vous avec votre code personnel." }, { status: 401 });
    const memberId = acc.who === "member" ? acc.member.id : null;
    const name = acc.who === "member" ? acc.member.name : null;

    if (b.action === "me") {
      const docs = memberId ? await latestDocs(db, memberId) : {};
      return NextResponse.json({ ok: true, who: acc.who, name: acc.name, kinds: DOC_KINDS, required: REQUIRED_DOCS, docs: Object.fromEntries([...DOC_KINDS.map(k => k.id), "contrat"].map(k => [k, publicDoc(docs[k])])), contractVersion: CONTRACT_VERSION });
    }
    if (b.action === "reservations") {
      const { data, error } = await db.from("reservations").select("id,prenom,nom,ville,code_postal,departement,telephone,statut,date_promise,modele,priorite").in("statut", ["Nouvelle", "Confirmée", "Planifiée"]).order("date_promise", { ascending: true, nullsFirst: false }).limit(500);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, reservations: data || [] });
    }
    if (b.action === "tours") {
      const tours = (await listJson<PlanTour>(db, PLAN_TOURS)).filter(t => isMine(t, name) && (t.status !== "brouillon" || (t.stops?.length ?? 0) > 0)).sort((a, z) => String(a.date).localeCompare(String(z.date))).slice(0, 30);
      const need = new Set(tours.flatMap(t => t.clientIds));
      const clients = new Map((need.size ? await listJson<PlanClient>(db, PLAN_CLIENTS) : []).filter(c => need.has(c.id)).map(c => [c.id, c]));
      return NextResponse.json({ ok: true, tours: tours.map(t => { const k = t.status === "brouillon" ? null : driverKey(t.id); return { id: t.id, name: t.name, date: t.date, departTime: t.departTime || "", driver: t.driver, status: t.status, clients: t.clientIds.length, km: t.km || 0, closed_at: t.closed_at || null, en_route: (t.en_route || []).length, link: k ? `/chauffeur?k=${encodeURIComponent(k)}` : null, plan: driverPlan(t, clients) }; }) });
    }
    // ── Livraisons : numéro de série (VIN) + accusé de réception signé par le client
    if (b.action === "deliveries") {
      const since = new Date(Date.now() - 3 * 86400e3).toISOString();
      const { data, error } = await db.from("reservations").select("id,prenom,nom,adresse,code_postal,ville,telephone,email,modele,couleur,statut,date_promise,vin,vin_photo_path,paiement_confirme_at,livre_at,accuse_token").or(`statut.in.(Confirmée,Planifiée),livre_at.gte.${since}`).order("date_promise", { ascending: true, nullsFirst: false }).limit(200);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, deliveries: (data || []).map(r => ({ ...r, email: undefined, has_email: !!r.email, has_vin_photo: !!r.vin_photo_path, vin_photo_path: undefined, accuse_url: r.accuse_token ? `${SITE}/api/accuse/${r.accuse_token}` : null, accuse_token: undefined })), checks: CHECKS });
    }
    if (b.action === "free_vins") {
      const [{ data: sv }, { data: used }] = await Promise.all([db.from("shipment_vehicles").select("vin,container,status,client_name").neq("status", "livrée").order("vin").limit(500), db.from("reservations").select("vin").not("vin", "is", null)]);
      const taken = new Set((used || []).map(x => x.vin));
      return NextResponse.json({ ok: true, vins: (sv || []).filter(v => !taken.has(v.vin) && !v.client_name).map(v => ({ vin: v.vin, container: v.container, status: v.status })) });
    }
    if (b.action === "vin_photo_url") {
      const id = Number(b.id); if (!id) return NextResponse.json({ ok: false, error: "Livraison inconnue" }, { status: 400 });
      const ext = String(b.ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      if (!["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return NextResponse.json({ ok: false, error: "Envoyez une photo (JPG ou PNG)." }, { status: 400 });
      const path = `${RECEIPT_FOLDER}/${id}/vin-${Date.now()}.${ext}`;
      const { data, error } = await db.storage.from(DRIVER_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      return NextResponse.json({ ok: true, bucket: DRIVER_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "save_vin") {
      const id = Number(b.id); const vin = String(b.vin || "").toUpperCase().replace(/[\s-]/g, "");
      if (!id) return NextResponse.json({ ok: false, error: "Livraison inconnue" }, { status: 400 });
      if (!VIN_RE.test(vin)) return NextResponse.json({ ok: false, error: "Numéro de série invalide : 17 caractères, lettres et chiffres, sans I, O ni Q." }, { status: 400 });
      const photo = clean(b.photo_path, 300);
      if (photo && (!photo.startsWith(`${RECEIPT_FOLDER}/${id}/`) || photo.includes(".."))) return NextResponse.json({ ok: false, error: "Photo invalide" }, { status: 400 });
      const { data: r } = await db.from("reservations").select("id,prenom,nom,statut,vin_photo_path").eq("id", id).maybeSingle();
      if (!r) return NextResponse.json({ ok: false, error: "Livraison introuvable" }, { status: 404 });
      const { data: dup } = await db.from("reservations").select("id,prenom,nom").eq("vin", vin).neq("id", id).limit(1);
      if (dup?.length) return NextResponse.json({ ok: false, error: `Ce numéro de série est déjà attribué à ${dup[0].prenom} ${dup[0].nom}. Vérifiez la plaque.` }, { status: 409 });
      const { error } = await db.from("reservations").update({ vin, ...(photo ? { vin_photo_path: photo } : {}), updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
      await db.from("shipment_vehicles").update({ client_name: `${r.prenom} ${r.nom}`.trim(), ...(photo ? { plate_photo: photo } : {}), updated_at: new Date().toISOString() }).eq("vin", vin);
      await logSection(acc, "livraison_vin", { id, vin });
      return NextResponse.json({ ok: true, vin });
    }
    if (b.action === "sign") {
      const id = Number(b.id);
      const { data: r } = await db.from("reservations").select("*").eq("id", id).maybeSingle();
      if (!r) return NextResponse.json({ ok: false, error: "Livraison introuvable" }, { status: 404 });
      if (r.accuse_token) return NextResponse.json({ ok: false, error: "Cette livraison est déjà signée." }, { status: 409 });
      if (!r.vin) return NextResponse.json({ ok: false, error: "Enregistrez d'abord le numéro de série (VIN)." }, { status: 400 });
      if (!r.paiement_confirme_at) return NextResponse.json({ ok: false, error: "Le paiement n'est pas encore confirmé par NeoDrive. Ne remettez pas les clés : appelez Mansour." }, { status: 409 });
      const signer = clean(b.signer, 120);
      if (signer.length < 3) return NextResponse.json({ ok: false, error: "Le client doit écrire son nom et prénom." }, { status: 400 });
      const sigUrl = String(b.signature || "");
      const m = sigUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
      if (!m || m[1].length < 800) return NextResponse.json({ ok: false, error: "Le client doit signer dans le cadre." }, { status: 400 });
      if (m[1].length > 900_000) return NextResponse.json({ ok: false, error: "Signature trop lourde, recommencez." }, { status: 400 });
      const sig = Buffer.from(m[1], "base64");
      const checksIn = (b.checks || {}) as Record<string, unknown>;
      const checks = Object.fromEntries(CHECKS.map(c => [c.id, !!checksIn[c.id]]));
      const at = new Date().toISOString();
      const num = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
      const data: ReceiptData = {
        numero: `LIV-${at.slice(0, 4)}-${String(id).padStart(6, "0")}`,
        client: `${r.prenom || ""} ${r.nom || ""}`.trim(), adresse: [r.adresse, `${r.code_postal || ""} ${r.ville || ""}`.trim()].filter(Boolean).join(", "),
        telephone: r.telephone || "", email: r.email || "", modele: r.modele || "NeoDrive", couleur: r.couleur || "", vin: r.vin,
        checks, reserves: clean(b.reserves, 600), signer, signed_at: at, livreur: name || acc.name || "NeoDrive",
        paiement_confirme_at: r.paiement_confirme_at, lat: num(b.lat), lng: num(b.lng),
      };
      const pdf = await receiptPdf(data, sig);
      const base = `${RECEIPT_FOLDER}/${id}/accuse-${Date.now()}`;
      const up1 = await db.storage.from(DRIVER_BUCKET).upload(`${base}.pdf`, pdf, { contentType: "application/pdf", upsert: false });
      if (up1.error) throw new Error("Enregistrement du PDF impossible : " + up1.error.message);
      await db.storage.from(DRIVER_BUCKET).upload(`${base}-signature.png`, sig, { contentType: "image/png", upsert: false });
      const token = randomBytes(24).toString("hex");
      const line = `[${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] Livrée, accusé signé par ${signer} (VIN ${r.vin})${data.reserves ? " · réserves : " + data.reserves : ""}`;
      const { error } = await db.from("reservations").update({ statut: "Livrée", livre_at: at, accuse_path: `${base}.pdf`, accuse_token: token, accuse_data: data, notes: [r.notes, line].filter(Boolean).join("\n"), updated_at: at }).eq("id", id).is("accuse_token", null);
      if (error) throw new Error(error.message);
      await db.from("shipment_vehicles").update({ status: "livrée", client_name: data.client, delivered_at: at, driver: data.livreur, updated_at: at }).eq("vin", r.vin);
      if (r.plan_client_id) {
        try {
          const tours = await listJson<PlanTour>(db, PLAN_TOURS);
          const t = tours.filter(x => x.clientIds?.includes(r.plan_client_id)).sort((a, z) => String(z.date).localeCompare(String(a.date)))[0];
          if (t) await db.from("tour_events").insert({ tour_id: t.id, kind: "accuse_signe", client_id: r.plan_client_id, lat: data.lat, lng: data.lng, note: `Accusé signé par ${signer} · VIN ${r.vin}`, author: data.livreur, data: { reservation_id: id, vin: r.vin, reserves: data.reserves } });
        } catch (e) { console.error("[LIVREUR] tour_event", e); }
      }
      const url = `${SITE}/api/accuse/${token}`;
      let emailed = false;
      if (r.email) {
        await applyStoredSecrets();
        if (brevoReady()) {
          try {
            const first = String(r.prenom || "").split(/\s+/)[0];
            emailed = !!(await sendEmail(r.email, data.client, "Votre accusé de réception NeoDrive", `<p>Bonjour ${esc(first)},</p><p>Bienvenue dans la famille NeoDrive ! Vous trouverez ci-joint l'accusé de réception de votre véhicule (n° de série ${esc(r.vin)}), signé ce jour.</p><p>Vous pouvez aussi le consulter ici : <a href="${url}">${url}</a></p><p>Une question, un souci ? Répondez simplement à cet e-mail ou appelez-nous au 06 89 78 17 10.</p><p>Bonne route !<br>Mansour - NeoDrive</p>`, [{ name: `Accuse-reception-${data.numero}.pdf`, content: pdf.toString("base64") }]));
          } catch (e) { console.error("[LIVREUR] email accusé", e); }
        }
      }
      await logSection(acc, "livraison_accuse", { id, vin: r.vin });
      const wa = r.telephone ? `https://wa.me/${String(r.telephone).replace(/\D/g, "").replace(/^0/, "33")}?text=${encodeURIComponent(`Bonjour, voici votre accusé de réception NeoDrive : ${url} Bonne route ! NeoDrive`)}` : null;
      return NextResponse.json({ ok: true, url, emailed, whatsapp: wa });
    }

    if (!memberId) return NextResponse.json({ ok: false, error: "Le dépôt de documents se fait depuis le compte du livreur." }, { status: 403 });

    if (b.action === "upload_url") {
      if (!isDocKind(b.kind) || b.kind === "contrat") return NextResponse.json({ ok: false, error: "Type de document inconnu" }, { status: 400 });
      const ext = String(b.ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
      if (!["jpg", "jpeg", "png", "webp", "heic", "pdf"].includes(ext)) return NextResponse.json({ ok: false, error: "Format accepté : photo (JPG, PNG) ou PDF." }, { status: 400 });
      const path = `${memberId}/${b.kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await db.storage.from(DRIVER_BUCKET).createSignedUploadUrl(path);
      if (error || !data) return NextResponse.json({ ok: false, error: "Stockage indisponible" }, { status: 502 });
      return NextResponse.json({ ok: true, bucket: DRIVER_BUCKET, path: data.path, token: data.token });
    }
    if (b.action === "upload_done") {
      const path = clean(b.path, 300);
      if (!isDocKind(b.kind) || b.kind === "contrat" || !path.startsWith(`${memberId}/${b.kind}/`) || path.includes("..")) return NextResponse.json({ ok: false, error: "Document invalide" }, { status: 400 });
      const { error } = await db.from("driver_documents").insert({ member_id: memberId, kind: b.kind, path, filename: clean(b.filename, 160) || null, status: "recu" });
      if (error) throw new Error(error.message);
      await logSection(acc, "livreur_document", { kind: b.kind });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "contract_sign") {
      const signed = clean(b.signed_name, 120);
      if (signed.length < 3 || !b.accept) return NextResponse.json({ ok: false, error: "Écrivez votre nom complet et cochez la case." }, { status: 400 });
      const at = new Date().toISOString();
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
      const { error } = await db.from("driver_documents").insert({ member_id: memberId, kind: "contrat", path: null, filename: `Contrat de prestation v${CONTRACT_VERSION}`, status: "recu", data: { signed_name: signed, signed_at: at, version: CONTRACT_VERSION, ip, ua: clean(req.headers.get("user-agent"), 200), member_name: name, rate: 25 } });
      if (error) throw new Error(error.message);
      await logSection(acc, "livreur_contrat_signe", { version: CONTRACT_VERSION });
      return NextResponse.json({ ok: true, signed_at: at });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[LIVREUR]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
