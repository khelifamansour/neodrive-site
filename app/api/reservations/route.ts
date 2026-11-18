import { NextResponse } from "next/server";
import { authorizeSection, logSection } from "../../../lib/access";
import { dataClient, listJson, writeJson } from "../../../lib/datastore";
import { buildClient, PLAN_CLIENTS } from "../../../lib/planif-server";
import type { PlanClient } from "../../../lib/planif";
import { cleanReservation, saveReservation, type Reservation } from "../../../lib/reservations";
import { normalizePhone } from "../../../lib/crm-agent";
import { applyStoredSecrets } from "../../../lib/integrations";
import { brevoReady, sendSms } from "../../../lib/brevo";

export const dynamic = "force-dynamic";
const VIDEO_KEY = "prise_en_main_video_url";
export const maxDuration = 60;

// Limite simple par adresse IP (formulaire public)
const hits = new Map<string, number[]>();
function tooMany(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now(); const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 8;
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const sb = dataClient();
  if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 503 });
  try {
    // ── Public : formulaire /reservation
    if (b.action === "submit") {
      if (b.website) return NextResponse.json({ ok: true }); // pot de miel anti-robot
      if (tooMany(req)) return NextResponse.json({ ok: false, error: "Trop de demandes, réessayez plus tard." }, { status: 429 });
      const r = cleanReservation(b);
      if (!r.nom || !normalizePhone(r.telephone)) return NextResponse.json({ ok: false, error: "Nom et téléphone obligatoires." }, { status: 400 });
      // Doublon : même téléphone et même modèle dans les 10 dernières minutes
      const since = new Date(Date.now() - 600_000).toISOString();
      const { data: dup } = await sb.from("reservations").select("id").eq("telephone", r.telephone).eq("modele", r.modele).gte("created_at", since).limit(1);
      if (dup?.length) return NextResponse.json({ ok: true, id: dup[0].id, duplicate: true });
      const saved = await saveReservation(sb, b, "site_formulaire");
      return NextResponse.json({ ok: true, id: saved.id });
    }

    // ── Public : vidéo de prise en main (page « préparer ma livraison »)
    if (b.action === "video_url") {
      const { data } = await sb.from("marketing_settings").select("value").eq("key", VIDEO_KEY).maybeSingle();
      const url = (data?.value as { url?: string } | null)?.url || "";
      return NextResponse.json({ ok: true, url: /^https:\/\//.test(url) ? url : "" });
    }
    const acc = await authorizeSection(req, b.passcode, "tournees");
    if (!acc) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });

    if (b.action === "settings") {
      const { data } = await sb.from("marketing_settings").select("value").eq("key", VIDEO_KEY).maybeSingle();
      return NextResponse.json({ ok: true, video_url: (data?.value as { url?: string } | null)?.url || "" });
    }
    if (b.action === "set_video") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
      const url = String(b.url || "").trim().slice(0, 500);
      if (url && !/^https:\/\/\S+$/.test(url)) return NextResponse.json({ ok: false, error: "Adresse invalide (elle doit commencer par https://)." }, { status: 400 });
      const { error } = await sb.from("marketing_settings").upsert({ key: VIDEO_KEY, value: { url }, description: "Vidéo de prise en main (page préparer ma livraison, message client)", updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, video_url: url });
    }
    if (b.action === "contact_log") {
      const id = Number(b.id); if (!id) return NextResponse.json({ ok: false, error: "id manquant" }, { status: 400 });
      const { data: r } = await sb.from("reservations").select("notes,raw").eq("id", id).single();
      const at = new Date();
      const channel = b.channel === "sms" ? "SMS" : "WhatsApp";
      const tpl = String(b.template || "").slice(0, 60);
      const line = `💬 ${at.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })} ${at.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })} : ${channel} « ${tpl} » (${acc.name})`;
      const raw = (r?.raw && typeof r.raw === "object" ? r.raw : {}) as Record<string, unknown>;
      const contacts = Array.isArray(raw.contacts) ? raw.contacts : [];
      await sb.from("reservations").update({ notes: [r?.notes, line].filter(Boolean).join("\n"), raw: { ...raw, contacts: [...contacts, { at: at.toISOString(), channel, template: tpl, by: acc.name }] }, updated_at: at.toISOString() }).eq("id", id);
      await logSection(acc, "reservation_contact", { id, channel, template: tpl });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "list") {
      const { data, error } = await sb.from("reservations").select("*").order("created_at", { ascending: false }).limit(1000);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, reservations: data || [] });
    }
    // Numéros de série des voitures en cours d'import (pas encore attribués à un client)
    if (b.action === "vins") {
      const [{ data: sv }, { data: used }] = await Promise.all([
        sb.from("shipment_vehicles").select("vin,container,status").order("vin").limit(500),
        sb.from("reservations").select("vin").not("vin", "is", null),
      ]);
      const taken = new Set((used || []).map(u => u.vin));
      return NextResponse.json({ ok: true, vins: (sv || []).filter(v => v.vin && !taken.has(v.vin)) });
    }
    if (b.action === "add") {
      const r = cleanReservation(b);
      if (!r.nom) return NextResponse.json({ ok: false, error: "Le nom est obligatoire." }, { status: 400 });
      const saved = await saveReservation(sb, b, "manuel");
      // La date de réservation d'origine (ex. e-mail Formspree) peut être indiquée
      const d = String(b.created_on || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) await sb.from("reservations").update({ created_at: `${d}T12:00:00Z` }).eq("id", saved.id);
      await logSection(acc, "reservation_ajout", { id: saved.id });
      return NextResponse.json({ ok: true, id: saved.id });
    }
    if (b.action === "update") {
      const id = Number(b.id); if (!id) return NextResponse.json({ ok: false, error: "id manquant" }, { status: 400 });
      const r = cleanReservation(b);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      for (const k of ["statut", "priorite", "notes", "date_promise", "acompte", "nom", "prenom", "telephone", "email", "adresse", "code_postal", "ville", "departement", "modele", "couleur", "total", "delivery_price", "quantite"] as const) if (k in b || (k === "departement" && "code_postal" in b)) patch[k] = r[k];
      // Registre clients : numéro de série (VIN) et avis Google
      if ("vin" in b) {
        const vin = String(b.vin || "").toUpperCase().replace(/[\s-]/g, "");
        if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return NextResponse.json({ ok: false, error: "Numéro de série invalide : 17 caractères, lettres et chiffres (sans I, O ni Q)." }, { status: 400 });
        patch.vin = vin || null;
      }
      if ("avis_google" in b) patch.avis_google = String(b.avis_google || "").trim().slice(0, 2000) || null;
      // Paiement confirmé par le fondateur : débloque la signature de l'accusé chez le livreur
      let paidAfterDelivery: Record<string, unknown> | null = null;
      if ("paiement_confirme" in b) {
        if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Seul le fondateur peut confirmer un paiement." }, { status: 403 });
        patch.paiement_confirme_at = b.paiement_confirme ? new Date().toISOString() : null;
        if (b.paiement_confirme) {
          const { data: cur } = await sb.from("reservations").select("id,prenom,nom,telephone,adresse,code_postal,ville,livre_at,paiement_en_attente,notes").eq("id", id).maybeSingle();
          // Livrée avec paiement en attente : le paiement arrive → « Livrée », clés et papiers à envoyer en lettre suivie.
          if (cur?.livre_at && cur.paiement_en_attente) {
            patch.statut = "Livrée"; patch.paiement_en_attente = false; paidAfterDelivery = cur;
            patch.notes = [cur.notes, `[${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] Paiement reçu après livraison : clés et papiers à envoyer en lettre suivie.`].filter(Boolean).join("\n");
          }
        }
      }
      for (const k of ["nouvelles_at", "avis_demande_at"] as const) if (k in b) patch[k] = b[k] ? new Date().toISOString() : null;
      if ("avis_at" in b) patch.avis_at = /^\d{4}-\d{2}-\d{2}$/.test(String(b.avis_at || "")) ? String(b.avis_at) : null;
      const { error } = await sb.from("reservations").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      if (paidAfterDelivery) {
        const p = paidAfterDelivery as Record<string, string | null>;
        const client = `${p.prenom || ""} ${p.nom || ""}`.trim(); const adresse = [p.adresse, `${p.code_postal || ""} ${p.ville || ""}`.trim()].filter(Boolean).join(", ");
        try {
          await applyStoredSecrets();
          if (brevoReady()) {
            await sendSms(process.env.OWNER_SMS_PHONE || "0689781710", `NeoDrive : paiement de ${client} recu. Envoyer cles et papiers en lettre suivie a ${client}, ${adresse || "adresse a verifier"}.`);
            if (p.telephone) await sendSms(p.telephone, `Bonjour ${String(p.prenom || "").split(/\s+/)[0]}, NeoDrive : paiement recu, merci ! Vos cles et papiers partent par la Poste en lettre suivie. Bonne route !`);
          }
        } catch (e) { console.error("[RESERVATIONS] SMS paiement apres livraison", e); }
      }
      await logSection(acc, "reservation_modif", { id, statut: patch.statut });
      return NextResponse.json({ ok: true });
    }
    if (b.action === "delete") {
      if (acc.who !== "owner") return NextResponse.json({ ok: false, error: "Réservé au fondateur." }, { status: 403 });
      await sb.from("reservations").delete().eq("id", Number(b.id));
      return NextResponse.json({ ok: true });
    }
    // Envoi au planificateur de tournées (clients « à planifier »)
    if (b.action === "to_planner") {
      const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Boolean).slice(0, 100);
      const { data } = await sb.from("reservations").select("*").in("id", ids);
      const done: number[] = []; const errors: string[] = [];
      for (const r of (data || []) as Reservation[]) {
        if (r.plan_client_id) { done.push(r.id); continue; }
        const c = await buildClient({ ...r, note: [r.notes, r.date_promise ? `Date promise : ${r.date_promise}` : ""].filter(Boolean).join(" · ") }, "reservation");
        if ("error" in c) { errors.push(`${r.prenom} ${r.nom} : ${c.error}`); continue; }
        await writeJson(sb, `${PLAN_CLIENTS}/${c.id}.json`, c);
        await sb.from("reservations").update({ plan_client_id: c.id, statut: r.statut === "Nouvelle" || r.statut === "Confirmée" ? "Planifiée" : r.statut, updated_at: new Date().toISOString() }).eq("id", r.id);
        done.push(r.id);
      }
      return NextResponse.json({ ok: true, done: done.length, errors });
    }
    // Reprise des réservations déjà présentes dans le planificateur (formulaire devis)
    if (b.action === "import_planner") {
      const clients = (await listJson<PlanClient>(sb, PLAN_CLIENTS)).filter(c => !(c.note || "").startsWith("TEST") && c.prenom !== "TEST");
      const { data: have } = await sb.from("reservations").select("plan_client_id").not("plan_client_id", "is", null);
      const known = new Set((have || []).map(h => h.plan_client_id));
      let added = 0;
      for (const c of clients) {
        if (known.has(c.id)) continue;
        const saved = await saveReservation(sb, { ...c, notes: c.note || "", statut: c.status === "livre" ? "Livrée" : c.status === "planifie" ? "Planifiée" : "Confirmée" }, c.source === "manuel" ? "planificateur" : "site_devis", { plan_client_id: c.id });
        await sb.from("reservations").update({ created_at: c.created_at }).eq("id", saved.id);
        added++;
      }
      return NextResponse.json({ ok: true, added });
    }
    return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
  } catch (e) {
    console.error("[RESERVATIONS]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Erreur" }, { status: 500 });
  }
}
