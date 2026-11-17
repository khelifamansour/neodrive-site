import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { applyStoredSecrets, isAuthorized } from "../../../lib/integrations";
import { crmDatabase } from "../../../lib/crm-agent";
import { listJson } from "../../../lib/datastore";
import { PLAN_TOURS } from "../../../lib/fleet";
import { driverKey } from "../../../lib/driver-link";
import { brevoReady, sendEmail, sendSms } from "../../../lib/brevo";
import { newCode, sha } from "../../../lib/team";
import { CONTRACT_VERSION, DOC_KINDS, DRIVER_BUCKET, REQUIRED_DOCS, isDocKind } from "../../../lib/driver-docs";
import type { PlanTour } from "../../../lib/planif";

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
      const tours = (await listJson<PlanTour>(db, PLAN_TOURS)).filter(t => t.status !== "brouillon" && isMine(t, name)).sort((a, z) => String(z.date).localeCompare(String(a.date))).slice(0, 30);
      return NextResponse.json({ ok: true, tours: tours.map(t => { const k = driverKey(t.id); return { id: t.id, name: t.name, date: t.date, driver: t.driver, status: t.status, clients: t.clientIds.length, km: t.km || 0, closed_at: t.closed_at || null, en_route: (t.en_route || []).length, link: k ? `/chauffeur?k=${encodeURIComponent(k)}` : null }; }) });
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
