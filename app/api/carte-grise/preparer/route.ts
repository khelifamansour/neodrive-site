import { NextResponse, after } from "next/server";
import { dataClient } from "../../../../lib/datastore";
import {
  CARTE_GRISE_FILE_LABEL, CARTE_GRISE_MAX_FILE, PLATE_PHOTO_KEY, PLATE_PHOTO_LABEL, PREP_KEYS, PREP_STATUS_PENDING, PREP_STATUS_WAITING, PREP_TOKEN,
  type CarteGriseFile,
} from "../../../../lib/carte-grise";
import { CARTE_GRISE_BUCKET, findDossier, type CarteGriseDossier } from "../../../../lib/carte-grise-server";
import { checkDocuments } from "../../../../lib/carte-grise-check";
import { finalizePrep, prepDossier, prepStage, prepVehicle, reservationByToken, type PrepReservation } from "../../../../lib/carte-grise-prep";
import { stampMandat } from "../../../../lib/mandat-cachet";
import { analyseDossier } from "../../../../lib/stock";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const safeName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
const TYPES = /^(application\/pdf|image\/[a-z0-9.+-]+)?$/i;
const IMAGE = /^image\/[a-z0-9.+-]+$/i;
const nowFr = () => new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const CLIENT_COLS = ["prenom", "nom", "telephone", "email", "adresse", "code_postal", "ville"] as const;

const hits = new Map<string, number[]>();
function tooMany(req: Request, max: number) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now(); const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > max;
}
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
type Up = { key?: string; name?: string; type?: string; size?: number; path?: string };

/** État affiché au client : coordonnées, pièces reçues, véhicule (VIN complet seulement à l'étape de signature, pour le mandat). */
function view(r: PrepReservation, d: CarteGriseDossier | null, v: Awaited<ReturnType<typeof prepVehicle>>) {
  const stage = prepStage(d, v.ready);
  const src = (d || r) as Record<string, unknown>;
  const client = Object.fromEntries(CLIENT_COLS.map(k => [k, String(src[k] ?? r[k] ?? "")]));
  const pieces = Object.fromEntries(PREP_KEYS.map(k => {
    const n = (d?.files || []).filter(f => f.key === k && !f.superseded).length;
    const p = d?.doc_check?.pieces?.[k];
    return [k, { files: n, status: n ? (p && p.files ? p.status : "reçu") : "manquant", reason: p?.status === "à refaire" ? p.reason : "" }];
  }));
  return {
    ok: true, stage, client, pieces,
    vehicle: { model: v.model, vin_tail: v.vin ? v.vin.slice(-6) : "", ...(stage === "signature" ? { vin: v.vin || "" } : {}) },
  };
}

/**
 * Lien personnel « préparer ma carte grise » (/carte-grise/preparer/<jeton>), sans connexion.
 * state : étape et coordonnées. init / complete : pièce d'identité + justificatif de domicile (dépôt direct dans le stockage privé).
 * sign_init / sign_complete : photo de la plaque VIN + mandat signé ; certificat de vente, COC par VIN et e-mail au fondateur ensuite.
 */
export async function POST(req: Request) {
  const sb = dataClient();
  if (!sb) return fail("Service momentanément indisponible", 503);
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const token = String(b.token || "");
  if (!PREP_TOKEN.test(token)) return fail("Lien invalide", 404);
  if (tooMany(req, b.action === "state" ? 120 : 40)) return fail("Trop d’envois, réessayez dans une heure", 429);
  try {
    const r = await reservationByToken(sb, token).catch(e => { console.error("[carte-grise] préparer", e); throw Object.assign(new Error("Service momentanément indisponible"), { status: 503 }); });
    if (!r) return fail("Lien invalide ou expiré", 404);
    let d = await prepDossier(sb, r.id);
    const v = await prepVehicle(sb, r);

    if (b.action === "state") return NextResponse.json(view(r, d, v));

    const files = (Array.isArray(b.files) ? b.files : []).slice(0, 12) as Up[];

    if (b.action === "init") {
      const stage = prepStage(d, v.ready);
      if (stage === "termine") return fail("Votre dossier est déjà complet");
      const raw = (b.client && typeof b.client === "object" ? b.client : {}) as Record<string, unknown>;
      const c = Object.fromEntries(CLIENT_COLS.map(k => [k, String(raw[k] ?? "").trim().slice(0, 200)])) as Record<(typeof CLIENT_COLS)[number], string>;
      const miss = (["prenom", "nom", "adresse", "code_postal", "ville"] as const).filter(k => !c[k]);
      if (miss.length) return fail("Complétez vos coordonnées (nom, prénom, adresse, code postal, ville)");
      if (!files.length) return fail("Ajoutez au moins un document");
      for (const f of files) {
        if (!f.key || !(PREP_KEYS as readonly string[]).includes(f.key)) return fail("Document inconnu");
        if (!(Number(f.size) > 0) || Number(f.size) > CARTE_GRISE_MAX_FILE) return fail("Fichier trop lourd (25 Mo maximum)");
        if (!TYPES.test(String(f.type || ""))) return fail("Envoyez une photo ou un PDF");
      }
      const at = new Date().toISOString();
      if (!d) {
        const ref = `CG-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
        const folder = `${ref}-${crypto.randomUUID()}`;
        const fields = { prep: "1", reservation: String(r.id), ...(r.modele ? { modele: r.modele } : {}) };
        const { data: row, error } = await sb.from("carte_grise_dossiers").insert({
          ref, folder, ...c, type_demande: "carte grise préparée avant livraison (lien client)", version: r.modele || null, service_carte_grise: "oui",
          reservation_id: r.id, fields, files: [], status: PREP_STATUS_PENDING, notes: `🔗 ${nowFr()} : dossier ouvert par le client via le lien de préparation (réservation n° ${r.id})`,
        }).select("*").single();
        if (error) throw new Error(error.message);
        d = row as CarteGriseDossier;
      } else if (!d.sent_to_provider_at) {
        // Coordonnées corrigées par le client (le mandat et le certificat seront à ce nom et à cette adresse).
        await sb.from("carte_grise_dossiers").update({ ...c, updated_at: at }).eq("id", d.id);
      }
      const uploads: { key: string; path: string; token: string }[] = [];
      for (const f of files) {
        const name = safeName(f.name || "document") || "document";
        const path = `carte-grise/${d.folder}/${f.key}-prep-${crypto.randomUUID().slice(0, 8)}-${name}`;
        const { data: up, error } = await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUploadUrl(path);
        if (error || !up) return fail("Envoi momentanément indisponible", 502);
        uploads.push({ key: f.key!, path: up.path, token: up.token });
      }
      return NextResponse.json({ ok: true, bucket: CARTE_GRISE_BUCKET, uploads });
    }

    if (!d) return fail("Ajoutez d’abord votre pièce d’identité et votre justificatif de domicile");
    const prefix = `carte-grise/${d.folder}/`;
    const received = async (allowed: string[]) => {
      const { data: listed, error } = await sb.storage.from(CARTE_GRISE_BUCKET).list(`carte-grise/${d!.folder}`, { limit: 300 });
      if (error) throw Object.assign(new Error("Envoi momentanément indisponible"), { status: 502 });
      const size = new Map((listed || []).map(f => [`${prefix}${f.name}`, Number((f.metadata as { size?: number } | null)?.size) || 0]));
      const known = new Set((d!.files || []).map(f => f.path));
      const got: CarteGriseFile[] = [];
      for (const f of files) {
        const path = String(f.path || "");
        if (!f.key || !allowed.includes(f.key) || !path.startsWith(`${prefix}${f.key}-prep-`) || !size.has(path) || known.has(path)) continue;
        got.push({ key: f.key, label: f.key === PLATE_PHOTO_KEY ? PLATE_PHOTO_LABEL : CARTE_GRISE_FILE_LABEL[f.key], path, name: safeName(f.name || "document") || "document", size: size.get(path) || Number(f.size) || 0, type: String(f.type || "") });
      }
      return got;
    };

    if (b.action === "complete") {
      const got = await received([...PREP_KEYS]);
      if (!got.length) return fail("Aucun document reçu : réessayez");
      const keys = [...new Set(got.map(f => f.key))];
      const at = new Date().toISOString();
      // Nouvel envoi d'une pièce : les versions précédentes ne sont plus utilisées.
      const all = [...(d.files || []).map(f => keys.includes(f.key) && !f.superseded ? { ...f, superseded: true } : f), ...got];
      const line = `📥 ${nowFr()} : pièces de préparation reçues (${keys.map(k => CARTE_GRISE_FILE_LABEL[k] || k).join(", ")}, ${got.length} fichier(s))`;
      const status = d.status === PREP_STATUS_PENDING ? PREP_STATUS_WAITING : d.status;
      const { error } = await sb.from("carte_grise_dossiers").update({ files: all, status, notes: [d.notes, line].filter(Boolean).join("\n"), updated_at: at }).eq("id", d.id);
      if (error) throw new Error(error.message);
      // Contrôle tolérant des pièces (identité, domicile) : au plus ~55 s d'attente pour le client, la suite continue après la réponse.
      const check = checkDocuments(sb, d.id, { keys }).catch(e => { console.error("[carte-grise] préparer contrôle", e); return null; });
      after(() => check.then(() => undefined));
      await Promise.race([check, new Promise(res => setTimeout(res, 55_000))]);
      const fresh = await findDossier(sb, { id: d.id });
      return NextResponse.json(view(r, fresh, v));
    }

    if (b.action === "sign_init" || b.action === "sign_complete") {
      const stage = prepStage(d, v.ready);
      if (stage === "termine") return NextResponse.json(view(r, d, v));
      if (stage !== "signature") return fail(v.ready ? "Ajoutez d’abord vos documents" : v.delivered ? "La signature sera possible dès que le numéro de série de votre véhicule sera enregistré" : "La signature sera possible après la livraison de votre véhicule");
    }

    if (b.action === "sign_init") {
      const want = new Map(files.map(f => [f.key, f]));
      const mandat = want.get("mandat_carte_grise_signe"); const plate = want.get(PLATE_PHOTO_KEY);
      if (!mandat) return fail("Signez d’abord le mandat");
      if (!plate) return fail("Ajoutez la photo de la plaque du véhicule");
      for (const f of [mandat, plate]) if (!(Number(f.size) > 0) || Number(f.size) > CARTE_GRISE_MAX_FILE || !TYPES.test(String(f.type || ""))) return fail("Fichier non accepté (photo ou PDF, 25 Mo maximum)");
      if (!IMAGE.test(String(plate.type || "")) && plate.type !== "application/pdf") return fail("La plaque doit être une photo");
      const uploads: { key: string; path: string; token: string }[] = [];
      for (const f of [mandat, plate]) {
        const name = safeName(f.name || "document") || "document";
        const path = `${prefix}${f.key}-prep-${crypto.randomUUID().slice(0, 8)}-${name}`;
        const { data: up, error } = await sb.storage.from(CARTE_GRISE_BUCKET).createSignedUploadUrl(path);
        if (error || !up) return fail("Envoi momentanément indisponible", 502);
        uploads.push({ key: f.key!, path: up.path, token: up.token });
      }
      return NextResponse.json({ ok: true, bucket: CARTE_GRISE_BUCKET, uploads });
    }

    if (b.action === "sign_complete") {
      const got = await received(["mandat_carte_grise_signe", PLATE_PHOTO_KEY]);
      const mandat = got.find(f => f.key === "mandat_carte_grise_signe");
      if (!mandat || !got.some(f => f.key === PLATE_PHOTO_KEY)) return fail("Envoi incomplet : réessayez");
      const today = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
      const onScreen = b.mode === "screen" && mandat.type === "application/pdf";
      const at = new Date().toISOString();
      // Mandat signé à l'écran : sans added_at, pour que le cachet MK HOLDING soit apposé automatiquement (lib/mandat-cachet).
      const fields = { ...(d.fields || {}), prep_signed_at: at, mandat_carte_grise_signe_mode: onScreen ? `signé à l’écran au doigt le ${today}, mention « Lu et approuvé »` : "imprimé et signé à la main (fichier importé)" };
      const line = `✍️ ${nowFr()} : mandat ${onScreen ? "signé au doigt" : "importé"} et photo de la plaque VIN reçus (lien de préparation)`;
      const { error } = await sb.from("carte_grise_dossiers").update({
        files: [...(d.files || []), ...got], fields, status: "reçu", notes: [d.notes, line].filter(Boolean).join("\n"), updated_at: at,
        ...(v.vin && !d.vin ? { vin: v.vin, vin_source: "scan livraison" } : {}),
      }).eq("id", d.id);
      if (error) throw new Error(error.message);
      const id = d.id;
      // Plaque VIN, certificat de vente, COC, cachet MK HOLDING, rapprochement et e-mail « Carte grise à valider » (rien n'est envoyé à NK Services).
      after(async () => {
        try {
          const warn = await finalizePrep(sb, id, r, v.vin);
          const x = await findDossier(sb, { id });
          if (x) await stampMandat(sb, x);
          await analyseDossier(sb, id, { notify: true, extra: warn });
        } catch (e) { console.error("[carte-grise] préparer finalisation", e); }
      });
      return NextResponse.json({ ok: true, stage: "termine" });
    }
    return fail("Action inconnue");
  } catch (e) {
    const err = e as Error & { status?: number };
    console.error("[carte-grise] préparer", err);
    return fail(err.status ? err.message : "Erreur serveur, réessayez", err.status || 500);
  }
}
