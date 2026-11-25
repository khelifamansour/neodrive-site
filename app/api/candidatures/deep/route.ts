import { NextResponse } from "next/server";
import { applyStoredSecrets } from "../../../../lib/integrations";
import { authorizeSection } from "../../../../lib/access";
import { crmDatabase } from "../../../../lib/crm-agent";
import { POSTES, isPoste } from "../../../../lib/hiring";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BUCKET = "job-applications";
const t9 = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-9);

const INSTRUCTIONS = (poste: string) => `Tu es un recruteur exigeant. Analyse en profondeur ce CV d'un candidat algérien pour le poste « ${isPoste(poste) ? POSTES[poste].title : poste} » chez NeoDrive (voitures sans permis électriques vendues en France, freelance en présentiel à Alger, horaires français). Mission : ${isPoste(poste) ? POSTES[poste].summary : ""}
IMPORTANT : nous sommes le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} ; des dates en 2025 ou 2026 ne sont donc pas dans le futur, ne les signale pas comme incohérentes. Reconstitue le parcours et évalue, en t'appuyant uniquement sur le CV :
- experience (0-100) : pertinence et niveau de l'expérience pour CE poste (responsabilités, résultats chiffrés, secteur, clients français).
- jobs : liste des postes {company, role, start: "AAAA-MM" ou null, end: "AAAA-MM" ou "en cours", months}, hors stages de moins de 3 mois.
- total_experience_months, avg_tenure_months (durée moyenne par employeur), longest_tenure_months, short_stints (nombre de postes de moins de 12 mois, hors poste actuel et hors stages).
- education : liste {school, degree, year} ; school_main : établissement principal.
- prestige (0-100) : niveau et sélectivité de la formation dans le contexte algérien et international. Repères : grandes écoles très sélectives (ENP Polytechnique, ESI, ESC/EHEC, ENSSEA, ENSM, HEC Alger, écoles supérieures nationales) 80-95 ; universités reconnues (USTHB, Alger 1-3, Oran, Constantine) 55-75 ; écoles privées peu sélectives 35-55 ; formation professionnelle ou bac seul 20-40 ; diplôme étranger reconnu 70-90. Tiens compte de la filière et du niveau (master > licence).
- french_cv (0-100) : qualité du français écrit dans le CV (orthographe, syntaxe, précision).
- coherence (0-100) : cohérence du parcours : dates plausibles, chevauchements, trous inexpliqués, intitulés gonflés, entreprises vagues ou invérifiables, compétences sans preuve. 100 = parfaitement cohérent.
- flags : liste courte des incohérences ou signaux d'alerte concrets.
- verify : 2 à 4 points précis à vérifier en entretien ou auprès des références.
- age : âge du candidat (calculé depuis la date de naissance du CV), ou null si absent.
- references : liste des références citées dans le CV {name, role, company, has_contact: true si téléphone ou e-mail donné} ; references_count : leur nombre.
- bac_cv : {year, stream, average, mention} si le baccalauréat figure dans le CV, sinon null.
- fiabilite (0-100) : probabilité que le CV soit honnête. Baisse fortement pour : intitulés gonflés (« manager » à 22 ans, « directeur » sans équipe), entreprises introuvables ou vagues (« société privée », « entreprise de commerce »), dates arrondies ou incohérentes, chevauchements, trous de plus de 6 mois non expliqués, compétences listées sans aucune preuve, CV générique ou rédigé par IA, aucune référence vérifiable, écart entre les infos déclarées dans le formulaire et le CV (bac, expérience, employeur). 100 = tout est précis et vérifiable.
- lie_signals : liste courte et concrète des éléments qui font penser à une exagération ou un mensonge (vide si aucun).
- summary : 2 phrases de synthèse franche pour le recruteur.
Réponds uniquement en json avec exactement ces clés.`;

async function analyse(poste: string, name: string, buf: Uint8Array, declared = "") {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  const ext = name.toLowerCase().split(".").pop() || "pdf"; const b64 = Buffer.from(buf).toString("base64");
  const file = ext === "pdf" ? { type: "input_file", filename: name, file_data: `data:application/pdf;base64,${b64}` } : /^(jpe?g|png|webp)$/.test(ext) ? { type: "input_image", image_url: `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${b64}` } : null;
  if (!file) return null;
  const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_HIRING_MODEL || "gpt-4.1-mini", instructions: INSTRUCTIONS(poste), input: [{ role: "user", content: [{ type: "input_text", text: `Voici le CV. Informations déclarées par le candidat dans le formulaire (à comparer au CV) : ${declared || "aucune"}. Réponds en json.` }, file] }], text: { format: { type: "json_object" } }, max_output_tokens: 2200 }) }).catch(() => null);
  const j = await r?.json().catch(() => null); if (!r?.ok) { console.error("[cv-deep]", r?.status, JSON.stringify(j).slice(0, 200)); return null; }
  try { const txt = (j?.output || []).flatMap((x: any) => x.content || []).filter((x: any) => x.type === "output_text").map((x: any) => x.text).join(""); return JSON.parse(txt); } catch { return null; }
}

/** Analyse les candidats qui ont rempli le formulaire et n'ont pas encore d'analyse approfondie (lot de 6), ou un candidat précis. */
async function run(ids?: number[]) {
  const db = crmDatabase();
  const [{ data: apps }, { data: invs }, { data: done }] = await Promise.all([db.from("job_applications").select("id,poste,full_name,phone,cv_path,cv_name,experience_years,education,bac_stream,bac_year,bac_average,bac_grades,last_employer").order("id"), db.from("job_invitations").select("id,poste,phone,cv_path,cv_file"), db.from("cv_deep").select("poste,phone9,data")]);
  const have = new Set((done || []).filter(d => (d.data as Record<string, unknown> | null)?.v === 2).map(d => `${d.poste}|${d.phone9}`));
  const todo = (apps || []).filter(a => (ids?.length ? ids.includes(a.id) : !have.has(`${a.poste}|${t9(a.phone)}`))).slice(0, 6);
  const out: Record<string, unknown>[] = [];
  await Promise.all(todo.map(async a => {
    const inv = (invs || []).find(i => t9(i.phone) === t9(a.phone));
    const path = a.cv_path || inv?.cv_path; if (!path) { out.push({ name: a.full_name, status: "pas de CV" }); await db.from("cv_deep").upsert({ poste: a.poste, phone9: t9(a.phone), application_id: a.id, data: { summary: "Pas de CV disponible.", missing: true, v: 2 } }, { onConflict: "poste,phone9" }); return; }
    const { data: blob } = await db.storage.from(BUCKET).download(path);
    const declared = `expérience ${a.experience_years || "?"} ans ; formation ${a.education || "?"} ; bac ${a.bac_stream || "?"} ${a.bac_year || ""} moyenne ${a.bac_average ?? "?"}/20, notes ${JSON.stringify(a.bac_grades || {})} ; dernier employeur et référence ${JSON.stringify(a.last_employer || {})}`;
    const raw = blob ? await analyse(a.poste, a.cv_name || inv?.cv_file || path.split("/").pop() || "cv.pdf", new Uint8Array(await blob.arrayBuffer()), declared) : null;
    const res = raw ? { ...raw, v: 2 } : null;
    if (!res) { out.push({ name: a.full_name, status: "échec" }); await db.from("cv_deep").upsert({ poste: a.poste, phone9: t9(a.phone), application_id: a.id, data: { summary: "CV non lisible automatiquement (Word ou photo) : à lire à la main.", missing: true, v: 2 } }, { onConflict: "poste,phone9" }); return; }
    await db.from("cv_deep").upsert({ poste: a.poste, phone9: t9(a.phone), application_id: a.id, invitation_id: inv?.id || null, data: res }, { onConflict: "poste,phone9" });
    out.push({ name: a.full_name, status: "analysé", experience: res.experience, prestige: res.prestige, coherence: res.coherence, fiabilite: res.fiabilite, avg_tenure: res.avg_tenure_months });
  }));
  const remaining = (apps || []).filter(a => !have.has(`${a.poste}|${t9(a.phone)}`)).length - out.filter(o => o.status === "analysé" || o.status === "pas de CV").length;
  return { results: out, remaining: Math.max(0, remaining) };
}

export async function PUT(req: Request) {
  const b = await req.json().catch(() => ({})) as Record<string, any>;
  if (!(await authorizeSection(req, b.passcode, "recrutement"))) return NextResponse.json({ ok: false, error: "Code incorrect" }, { status: 401 });
  if (b.action === "list") { const { data } = await crmDatabase().from("cv_deep").select("*"); return NextResponse.json({ ok: true, rows: data || [] }); }
  if (b.action === "run") { await applyStoredSecrets(); return NextResponse.json({ ok: true, ...(await run((b.ids || []).map(Number).filter(Boolean))) }); }
  return NextResponse.json({ ok: false, error: "Action inconnue" }, { status: 400 });
}

/** Lancement par jeton (admin_once_tokens, purpose « cv-deep », valable jusqu'à expiration). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{48}$/.test(token)) return NextResponse.json({ ok: false }, { status: 401 });
  const { data } = await crmDatabase().from("admin_once_tokens").select("token").eq("token", token).eq("purpose", "cv-deep").gt("expires_at", new Date().toISOString()).limit(1);
  if (!data?.length) return NextResponse.json({ ok: false }, { status: 401 });
  await applyStoredSecrets();
  const inv = Number(new URL(req.url).searchParams.get("inv") || 0);
  if (inv) return NextResponse.json({ ok: true, ...(await runInvitation(inv)) });
  return NextResponse.json({ ok: true, ...(await run()) });
}

/** Analyse approfondie d'un CV importé (job_invitations) même si le candidat n'a pas encore passé le test. */
async function runInvitation(id: number) {
  const db = crmDatabase();
  const { data: inv } = await db.from("job_invitations").select("id,poste,full_name,phone,cv_path,cv_file").eq("id", id).maybeSingle();
  if (!inv?.cv_path) return { results: [{ id, status: "pas de CV" }] };
  const { data: blob } = await db.storage.from(BUCKET).download(inv.cv_path);
  const raw = blob ? await analyse(inv.poste, inv.cv_file || inv.cv_path.split("/").pop() || "cv.pdf", new Uint8Array(await blob.arrayBuffer())) : null;
  if (!raw) return { results: [{ id, name: inv.full_name, status: "échec" }] };
  const res = { ...raw, v: 2 };
  await db.from("cv_deep").upsert({ poste: inv.poste, phone9: t9(inv.phone), invitation_id: inv.id, data: res }, { onConflict: "poste,phone9" });
  return { results: [{ id, name: inv.full_name, status: "analysé", data: res }] };
}
