import { NextResponse } from "next/server";
import { isAuthorized } from "../../../lib/integrations";
import { crmDatabase, normalizePhone } from "../../../lib/crm-agent";
import { sendSms } from "../../../lib/brevo";
import { logActivity } from "../../../lib/team";

/**
 * Rappel rapide (fondateur uniquement) : un appel arrive sur le téléphone du fondateur,
 * il saisit le numéro → fiche CRM créée ou retrouvée, attribuée à un membre de l'équipe avec une heure de rappel,
 * et le membre est prévenu par SMS. POST { passcode, action: "members" | "list" | "create", ... }.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const clean = (v: unknown, n = 200) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const last9 = (p: string) => p.replace(/\D/g, "").slice(-9);
const paris = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!isAuthorized(req, typeof b.passcode === "string" ? b.passcode : "")) return fail("Code incorrect", 401);
  const db = crmDatabase();

  if (b.action === "members") {
    const { data } = await db.from("team_members").select("id,name,role,phone,active,revoked_at,expires_at").eq("active", true).is("revoked_at", null).order("created_at", { ascending: false });
    const members = (data || []).filter(m => !m.expires_at || new Date(m.expires_at).getTime() > Date.now()).map(m => ({ id: m.id, name: m.name, role: m.role, hasPhone: !!m.phone }));
    return NextResponse.json({ ok: true, members });
  }

  if (b.action === "list") {
    const since = new Date(Date.now() - 3 * 86400e3).toISOString();
    const { data } = await db.from("leads").select("id,nom,telephone,rappel,assigned_to,statut,phase,last_contact_at,notes").not("rappel", "is", null).gte("updated_at", since).order("rappel", { ascending: true }).limit(60);
    const { data: ms } = await db.from("team_members").select("id,name");
    const names = Object.fromEntries((ms || []).map(m => [String(m.id), m.name]));
    return NextResponse.json({ ok: true, items: (data || []).map(l => ({ id: l.id, nom: l.nom, tel: l.telephone, rappel: l.rappel, pour: names[String(l.assigned_to)] || "—", statut: l.statut, phase: l.phase, fait: !!(l.last_contact_at && l.rappel && new Date(l.last_contact_at) >= new Date(new Date(l.rappel).getTime() - 3 * 3600e3)) })) });
  }

  if (b.action === "create") {
    const phone = normalizePhone(clean(b.phone, 40));
    if (!phone || phone.length < 9) return fail("Numéro de téléphone invalide.");
    const memberId = Number(b.member_id) || 0;
    const { data: m } = memberId ? await db.from("team_members").select("id,name,phone").eq("id", memberId).maybeSingle() : { data: null };
    if (memberId && !m) return fail("Membre introuvable.");
    const when = new Date(clean(b.when, 40));
    if (isNaN(when.getTime())) return fail("Heure de rappel invalide.");
    const nom = clean(b.nom, 80); const note = clean(b.note, 400); const origine = clean(b.origine, 40) || "Appel reçu";
    const now = new Date().toISOString();
    const line = `[${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}] ${origine} sur le téléphone de Mansour → rappel ${paris(when.toISOString())}${m ? ` par ${m.name}` : ""}.${note ? " Note : " + note : ""}`;

    // Fiche existante (même numéro, 9 derniers chiffres) ou nouvelle fiche.
    const { data: cands } = await db.from("leads").select("id,nom,notes,history,statut,telephone,opted_out_at").ilike("telephone", `%${last9(phone)}`).order("id", { ascending: false }).limit(5);
    const ex = (cands || []).find(l => last9(String(l.telephone || "")) === last9(phone));
    if (ex?.opted_out_at) return fail("Ce contact a demandé à ne plus être contacté (STOP / liste noire).");
    let id: number;
    const ev = { type: "callback_request", at: now, origine, by: "Mansour", member_id: m?.id ?? null, rappel: when.toISOString() };
    if (ex) {
      id = ex.id;
      const history = [...(Array.isArray(ex.history) ? ex.history : []), ev].slice(-60);
      const { error } = await db.from("leads").update({ nom: ex.nom && ex.nom !== "Appel manqué" ? ex.nom : (nom || ex.nom), rappel: when.toISOString(), next_followup_at: when.toISOString(), assigned_to: m ? String(m.id) : null, phase: "À rappeler", statut: ex.statut === "Nouveau" ? "Chaud" : ex.statut, notes: [ex.notes, line].filter(Boolean).join("\n").slice(-4000), history, updated_at: now }).eq("id", id);
      if (error) return fail(error.message, 500);
    } else {
      const { data, error } = await db.from("leads").insert({ nom: nom || "Appel entrant", telephone: phone, source: "telephone", statut: "Chaud", phase: "À rappeler", rappel: when.toISOString(), next_followup_at: when.toISOString(), assigned_to: m ? String(m.id) : null, notes: line, history: [ev], created_at: now, updated_at: now }).select("id").single();
      if (error || !data) return fail(error?.message || "Création impossible", 500);
      id = data.id;
    }

    // Notification au membre (SMS), sans le numéro du client : il le retrouve dans son espace équipe.
    let notified = "non";
    if (m?.phone && b.notify !== false) {
      const txt = `NeoDrive : nouveau rappel à faire ${paris(when.toISOString())} : ${nom || "client"}${note ? " (" + note.slice(0, 80) + ")" : ""}. Ouvrez votre espace équipe, filtre « À rappeler » : www.easydrive-auto.fr/equipe`;
      try { await sendSms(m.phone, txt, "transactional"); notified = "SMS envoyé"; } catch (e) { notified = `SMS en erreur : ${e instanceof Error ? e.message : e}`; }
    }
    if (m) await logActivity(m.id, "callback_assigned", id, { rappel: when.toISOString(), by: "Mansour" }).catch(() => {});
    return NextResponse.json({ ok: true, id, existing: !!ex, notified });
  }

  return fail("Action inconnue");
}
