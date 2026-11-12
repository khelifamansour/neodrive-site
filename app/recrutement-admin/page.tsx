"use client";
import { useEffect, useMemo, useState } from "react";
import s from "../planificateur/planif.module.css";
import { COMMON, POSTES, type PosteKey } from "../../lib/hiring";
import { supabase } from "../../lib/supabase";
import { talentIndex } from "../../lib/excellence";
import { MARKET, TEMPLATES, fmtDA, money, freelanceCharges, monthly, salariedCost, warnings, type OfferParams } from "../../lib/offers";

type Row = Record<string, any>;
type Dossier = { key: string; poste: PosteKey; name: string; city: string; phone: string; email: string; cvScore: number | null; app: Row | null; inv: Row | null; score: number; stage: string };
const STATUSES = ["nouveau", "à appeler", "test téléphone", "essai payé", "recruté", "écarté", "écarté (IA)"];
const color = (n?: number | null) => n == null ? "#9ca3af" : n >= 75 ? "#15803d" : n >= 60 ? "#b45309" : "#b91c1c";
const tail = (p: unknown) => String(p ?? "").replace(/\D/g, "").slice(-9);

export default function RecrutementAdmin() {
  const [code, setCode] = useState(""); const [apps, setApps] = useState<Row[] | null>(null); const [invs, setInvs] = useState<Row[]>([]); const [msg, setMsg] = useState("");
  const [poste, setPoste] = useState<PosteKey | "tous">("tous"); const [open, setOpen] = useState<string | null>(null); const [hideOut, setHideOut] = useState(true); const [waOnly, setWaOnly] = useState(false); const [view, setView] = useState<"top" | "all" | "offres">("top"); const [offers, setOffers] = useState<Row[]>([]); const [offerFor, setOfferFor] = useState<Dossier | null>(null); const [op, setOp] = useState<OfferParams | null>(null); const [created, setCreated] = useState<Row | null>(null); const [logs, setLogs] = useState<Row[]>([]); const [exc, setExc] = useState<Row[]>([]); const [imp, setImp] = useState<{ poste: PosteKey; busy: boolean; text: string; rows: Row[] }>({ poste: "closer", busy: false, text: "", rows: [] });
  const call = async (url: string, method: string, body: object, pc = code) => { const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { try { const [a, i] = await Promise.all([call("/api/candidatures", "PUT", { action: "list" }, pc), call("/api/candidatures/invite", "POST", { action: "list" }, pc)]); setApps(a.rows); setInvs(i.rows); call("/api/offres", "PUT", { action: "list" }, pc).then(o => setOffers(o.offers)).catch(() => null); call("/api/candidatures/log", "PUT", { action: "list" }, pc).then(o => setLogs(o.logs)).catch(() => null); call("/api/excellence", "PUT", { action: "list" }, pc).then(o => setExc(o.tests)).catch(() => null); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } };
  useEffect(() => { try { const pc = sessionStorage.getItem("nd_pc"); if (pc) { setCode(pc); load(pc); } } catch { } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Un dossier par candidat : présélection CV (invitation) + formulaire (candidature), fusionnés par numéro de téléphone.
  const dossiers = useMemo<Dossier[]>(() => {
    const out: Dossier[] = []; const used = new Set<number>();
    for (const inv of invs) {
      const app = (apps || []).find(a => a.poste === inv.poste && tail(a.phone) === tail(inv.phone)) || null; if (app) used.add(app.id);
      const score = app ? (app.final_score ?? app.ai_score ?? 0) : Math.round((inv.cv_score ?? 0) * 0.6);
      out.push({ key: "i" + inv.id, poste: inv.poste, name: inv.full_name, city: inv.city || "", phone: inv.phone, email: inv.email || "", cvScore: inv.cv_score, app, inv, score, stage: app ? (app.status || "nouveau") : /^écart/i.test(inv.cv_verdict || "") ? "écarté (CV)" : "invité" });
    }
    for (const app of apps || []) if (!used.has(app.id)) out.push({ key: "a" + app.id, poste: app.poste, name: app.full_name, city: app.city || "", phone: app.phone, email: app.email || "", cvScore: null, app, inv: null, score: app.final_score ?? app.ai_score ?? 0, stage: app.status || "nouveau" });
    return out.sort((x, y) => (y.app ? 1 : 0) - (x.app ? 1 : 0) || y.score - x.score);
  }, [apps, invs]);
  const waDone = new Set(invs.filter(i => i.whatsapp_at).map(i => tail(i.phone)));
  const waTodo = (d: Dossier) => !!d.inv && !d.app && !d.inv.whatsapp_at && !!d.phone && !/doublon/i.test(d.inv.cv_verdict || "") && !waDone.has(tail(d.phone));
  const shown = dossiers.filter(d => (poste === "tous" || d.poste === poste) && (waOnly || !hideOut || !String(d.stage).startsWith("écarté")) && (!waOnly || waTodo(d))).slice(0, waOnly ? 30 : undefined);
  const top = shown.filter(d => d.app && d.score >= 75 && !["recruté", "écarté", "écarté (IA)"].includes(d.stage));
  const update = async (id: number, patch: Row) => { setApps(rs => rs!.map(r => r.id === id ? { ...r, ...patch } : r)); try { await call("/api/candidatures", "PUT", { action: "update", id, patch }) } catch (e) { setMsg((e as Error).message) } };
  const openCv = async (path: string) => { try { const j = await call("/api/candidatures", "PUT", { action: "cv", path }); if (j.url) window.open(j.url, "_blank"); } catch { setMsg("CV indisponible") } };
  const markWa = async (id: number, done: boolean) => { setInvs(rs => rs.map(r => r.id === id ? { ...r, whatsapp_at: done ? new Date().toISOString() : null } : r)); try { await call("/api/candidatures/invite", "POST", { action: "wa", id, done }) } catch (e) { setMsg((e as Error).message) } };
  const day = (t?: string | null) => t ? new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "";
  const wa = (d: Dossier) => `https://wa.me/${String(d.phone).replace(/\D/g, "")}?text=${encodeURIComponent(d.app ? `Bonjour ${d.name.split(" ")[0]}, c'est Mansour de NeoDrive, marque française de voitures sans permis électriques. Merci d'avoir rempli notre formulaire suite à votre candidature sur Emploitic. J'aimerais échanger 15 minutes avec vous : quand êtes-vous disponible ?` : `Bonjour ${d.name.split(" ")[0]}, c'est Mansour de NeoDrive, marque française de voitures sans permis électriques. Suite à votre candidature sur Emploitic (${POSTES[d.poste]?.short}, freelance en présentiel à Alger), voici le test : un formulaire de 30-40 min, à faire seul(e), sans aide ni IA : https://www.easydrive-auto.fr/candidature?poste=${d.poste}`)}`;


  const th: React.CSSProperties = { padding: "7px 6px", borderBottom: "1px solid #e5e7eb", textAlign: "center", whiteSpace: "nowrap", fontSize: 13 };
  const salaryK = (v: unknown) => { const n = Number(String(v ?? "").replace(/[^\d]/g, "")); return n >= 1000 ? `${Math.round(n / 1000)} k DA` : String(v ?? "?").slice(0, 14); };
  const board = (k: PosteKey) => {
    const done = dossiers.filter(d => d.poste === k && d.app && !String(d.stage).startsWith("écarté")).sort((x, y) => ((talent(y) ?? 0) + y.score) - ((talent(x) ?? 0) + x.score));
    const out = dossiers.filter(d => d.poste === k && d.app && String(d.stage).startsWith("écarté")).length;
    const wait = dossiers.filter(d => d.poste === k && !d.app && d.stage === "invité").sort((x, y) => (y.cvScore ?? 0) - (x.cvScore ?? 0)).slice(0, 5);
    return <section key={k} className={s.card}>
      <h2>{POSTES[k].short} — {done.length} formulaire(s) rempli(s){out ? ` · ${out} écarté(s)` : ""}</h2>
      {done.length ? <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr style={{ background: "#f4f6f9" }}>{["#", "Candidat", "Note finale", "Talent", "Excellence", "CV", "Français /10", "Logique /8", "Rédaction /20", "Énigmes", "Bac", "Durée", "Collages", "Prétention", "Plan d'action", ""].map(h => <th key={h} style={{ ...th, fontWeight: 700 }}>{h}</th>)}</tr></thead>
        <tbody>{done.map((d, i) => { const a = d.app!; return <tr key={d.key} style={{ background: i < 3 ? "#f0fdf4" : undefined }}>
          <td style={th}><b>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</b></td>
          <td style={{ ...th, textAlign: "left", whiteSpace: "normal", minWidth: 190 }}><b>{d.name}</b><br /><small style={{ color: "#5b6573" }}>{String(a.ai_summary || d.inv?.cv_summary || "").split(/(?<=\.)\s/)[0].slice(0, 140)}</small></td>
          <td style={th}><b style={{ color: color(d.score), fontSize: 16 }}>{d.score}</b></td><td style={th}><b style={{ color: color(talent(d)) }}>{talent(d) ?? "–"}</b></td><td style={th}>{excOf(d)?.finished_at ? <b>{excOf(d)!.score}</b> : excOf(d) ? "⏳" : "–"}</td><td style={th}>{d.cvScore ?? "–"}</td>
          <td style={th}>{a.test_french ?? "–"}</td><td style={th}>{a.test_logic ?? "–"}</td><td style={th}>{a.test_writing ?? "–"}</td>
          <td style={th}>{a.answers?.riddles_score ?? "–"}{a.riddle_sec ? <><br /><small>{a.riddle_sec} s</small></> : null}</td>
          <td style={th}>{a.bac_average ?? "?"}</td><td style={th}>{a.duration_sec ? `${Math.round(a.duration_sec / 60)} min` : "–"}</td>
          <td style={{ ...th, color: a.paste_count ? "#b91c1c" : undefined }}>{a.paste_count ? `⚠️ ${a.paste_count}` : "0"}</td>
          <td style={th}>{salaryK(a.salary_expectation)}</td><td style={{ ...th, whiteSpace: "normal", minWidth: 170, textAlign: "left", background: plan(d).color }}>{plan(d).text}</td>
          <td style={th}><a href={`tel:+${String(d.phone).replace(/\D/g, "")}`}>📞</a> <a href={wa(d)} target="_blank" rel="noreferrer">💬</a> <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={() => { setView("all"); setPoste(k); setOpen(d.key); }}>Fiche</button> <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={() => openOffer(d)}>📝 Offre</button><br />{offerBadge(d)}</td>
        </tr>; })}</tbody></table></div> : <p className={s.muted}>Aucun formulaire rempli pour l'instant.</p>}
      {wait.length ? <p style={{ fontSize: 14, margin: "8px 0 0" }}><b>⏳ Meilleurs CV qui n'ont pas encore rempli le test :</b> {wait.map(d => `${d.name} (CV ${d.cvScore}${d.inv?.whatsapp_at ? ", WhatsApp ✅" : ""})`).join(" · ")}</p> : null}
    </section>;
  };

  const openOffer = (d: Dossier) => { setOfferFor(d); setCreated(null); setOp({ ...TEMPLATES[d.poste], debut: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) }); setTimeout(() => document.getElementById("offre-panel")?.scrollIntoView({ behavior: "smooth" }), 50); };
  const offerOf = (d: Dossier) => offers.find(o => (d.inv && o.invitation_id === d.inv.id) || (d.app && o.application_id === d.app.id));
  const offerBadge = (d: Dossier) => { const o = offerOf(d); return o ? <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, background: o.status === "signée" ? "#dcfce7" : o.status === "refusée" ? "#fee2e2" : "#fef3c7" }}>📝 offre {o.status}</span> : null; };
  const createOffer = async () => { if (!offerFor || !op) return; try { const j = await call("/api/offres", "PUT", { action: "create", poste: offerFor.poste, invitation_id: offerFor.inv?.id, application_id: offerFor.app?.id, full_name: offerFor.name, phone: offerFor.phone, email: offerFor.email, params: op }); setCreated({ ...j.offer, link: j.link }); setOffers(x => [j.offer, ...x]); setMsg("✅ Offre créée : envoyez-la par SMS/e-mail ou WhatsApp."); } catch (e) { setMsg((e as Error).message); } };
  const sendOffer = async (o: Row) => { try { const j = await call("/api/offres", "PUT", { action: "send", id: o.id }); setMsg(`✅ Offre envoyée (${j.via.join(" + ")})${j.errors?.length ? " — " + j.errors.join(", ") : ""}`); load(); } catch (e) { setMsg((e as Error).message); } };
  const waOffer = (o: Row) => { const link = `https://www.easydrive-auto.fr/offre/${o.token}`; call("/api/offres", "PUT", { action: "mark_whatsapp", id: o.id }).then(() => load()).catch(() => null); return `https://wa.me/${String(o.phone || "").replace(/\D/g, "").replace(/^0/, "213")}?text=${encodeURIComponent(`Bonjour ${String(o.full_name).split(" ")[0]}, c'est Mansour de NeoDrive. Suite à nos échanges, voici votre proposition de mission (${POSTES[o.poste as PosteKey]?.short}) : vous pouvez la consulter et la signer en ligne ici : ${link}`)}`; };

  const excOf = (d: Dossier) => d.app ? exc.find(x => x.application_id === d.app!.id) : undefined;
  const talent = (d: Dossier) => talentIndex(d.app, excOf(d)?.score ?? null);
  const sendExc = async (d: Dossier, wa = false) => { if (!d.app) return; try { const j = await call("/api/excellence", "PUT", { action: "send", channels: wa ? "whatsapp" : "all", poste: d.poste, application_id: d.app.id, invitation_id: d.inv?.id, full_name: d.name, phone: d.phone, email: d.email }); if (wa) window.open(`https://wa.me/${String(d.phone).replace(/\D/g, "").replace(/^0/, "213")}?text=${encodeURIComponent(`Bonjour ${d.name.split(" ")[0]}, c'est Mansour de NeoDrive. Félicitations, vos résultats vous qualifient pour l'étape suivante : un test d'excellence de 12 minutes, à faire seul(e) et en une fois : ${j.link}`)}`, "_blank"); setMsg(`🎯 Test d'excellence envoyé${j.via?.length ? ` (${j.via.join(" + ")})` : " (WhatsApp)"}`); await call("/api/candidatures/log", "PUT", { action: "add", poste: d.poste, phone: d.phone, full_name: d.name, kind: "note", note: "Test d'excellence envoyé" }); load(); } catch (e) { setMsg((e as Error).message); } };
  const logsOf = (d: Dossier) => logs.filter(l => l.poste === d.poste && l.phone9 === tail(d.phone));
  const addLog = async (d: Dossier, kind: string, ask?: string) => { const note = ask ? prompt(ask) : ""; if (ask && note === null) return; try { await call("/api/candidatures/log", "PUT", { action: "add", poste: d.poste, phone: d.phone, full_name: d.name, kind, note }); if (d.app && (kind === "recruté" || kind === "écarté")) await update(d.app.id, { status: kind }); load(); } catch (e) { setMsg((e as Error).message); } };
  const daysAgo = (t?: string) => t ? Math.floor((Date.now() - new Date(t).getTime()) / 86400000) : 99;
  /** Prochaine action conseillée pour un candidat, à partir du test, des appels et de l'offre. */
  const plan = (d: Dossier): { text: string; color: string } => {
    const L = logsOf(d); const has = (k: string) => L.find(l => l.kind === k); const o = offerOf(d); const a = d.app;
    if (has("recruté")) return { text: `✅ Recruté(e) le ${new Date(has("recruté")!.created_at).toLocaleDateString("fr-FR")} : préparer son démarrage`, color: "#dcfce7" };
    if (has("écarté") || String(d.stage).startsWith("écarté")) return { text: "Écarté(e) : ne rien faire", color: "#f3f4f6" };
    if (o?.status === "signée") return { text: "Offre signée : fixer la date de démarrage, puis marquer « Recruté »", color: "#dcfce7" };
    if (o?.status === "refusée") return { text: `Offre refusée${o.refuse_reason ? ` (${o.refuse_reason})` : ""} : passer au candidat suivant`, color: "#fee2e2" };
    if (o && ["brouillon", "envoyée"].includes(o.status)) return o.status === "brouillon" ? { text: "Offre créée mais pas envoyée : l'envoyer", color: "#fef3c7" } : daysAgo(o.sent_at) >= 2 ? { text: `Offre envoyée il y a ${daysAgo(o.sent_at)} j sans réponse : relancer par WhatsApp ou l'appeler`, color: "#fef3c7" } : { text: "Offre envoyée : attendre sa signature (48 h)", color: "#eff6ff" };
    if (a) {
      const ex = excOf(d); const ti = talent(d) ?? 0;
      if (!ex && ti >= 55) return { text: `🎯 Indice de talent ${ti} : lui envoyer le test d'excellence`, color: "#dcfce7" };
      if (ex && !ex.finished_at) return daysAgo(ex.sent_at) >= 2 ? { text: "Test d'excellence non fait depuis 2 jours : relancer", color: "#fef3c7" } : { text: "Test d'excellence envoyé : attendre le résultat", color: "#eff6ff" };
      if (ex?.finished_at && (ex.score ?? 0) < 50) return { text: `Test d'excellence ${ex.score}/100 : insuffisant, ne pas retenir`, color: "#f3f4f6" };
      const called = has("entretien") || has("appel"); const noAnswer = L.filter(l => l.kind === "pas de réponse").length;
      if (d.score >= 65) return called ? { text: "Entretien fait : s'il est convaincant, lui envoyer une offre (📝 Offre)", color: "#dcfce7" } : noAnswer >= 2 ? { text: `${noAnswer} appels sans réponse : envoyer un WhatsApp pour fixer un créneau`, color: "#fef3c7" } : { text: "🔥 L'appeler pour un entretien de 15 min (priorité)", color: "#dcfce7" };
      if (d.score >= 50) return called ? { text: "Entretien fait : à garder en réserve, décider après les meilleurs", color: "#eff6ff" } : { text: "Profil moyen : l'appeler seulement si les meilleurs ne donnent rien", color: "#eff6ff" };
      return { text: "Note faible : ne pas retenir (le marquer écarté)", color: "#f3f4f6" };
    }
    if ((d.cvScore ?? 0) >= 60) return !d.inv?.whatsapp_at ? { text: "Bon CV, test pas fait : le relancer par WhatsApp", color: "#fef3c7" } : daysAgo(d.inv.whatsapp_at) >= 3 ? { text: "Relancé il y a plus de 3 jours sans test : dernière relance, puis abandon", color: "#fef3c7" } : { text: "Relancé : attendre qu'il fasse le test", color: "#eff6ff" };
    return { text: "En attente du test (pas prioritaire)", color: "#f3f4f6" };
  };
  const planBox = (d: Dossier) => { const p = plan(d); const L = logsOf(d); return <div style={{ background: p.color, borderRadius: 12, padding: 10, display: "grid", gap: 6, fontSize: 14 }}>
    <div><b>🎯 Plan d'action :</b> {p.text}</div>
    {d.app ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}><b>🧠 Indice de talent : {talent(d) ?? "—"}</b>{excOf(d)?.finished_at ? <span>· Test d'excellence : <b>{excOf(d)!.score}/100</b> ({excOf(d)!.correct}/16 en {Math.round((excOf(d)!.duration_sec || 0) / 60)} min{excOf(d)!.blur_count ? `, ⚠️ ${excOf(d)!.blur_count} sortie(s) d'onglet` : ""})</span> : excOf(d) ? <span>· Test d'excellence envoyé, pas encore fait</span> : null}
      {!excOf(d)?.finished_at ? <><button className={s.ghost} style={{ padding: "3px 9px", fontSize: 13 }} onClick={() => sendExc(d)}>🎯 Test d'excellence (SMS + e-mail)</button><button className={s.ghost} style={{ padding: "3px 9px", fontSize: 13 }} onClick={() => sendExc(d, true)}>🎯 par WhatsApp</button></> : null}</div> : null}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{([["appel", "📞 Appelé", "Notes de l'appel (facultatif)"], ["pas de réponse", "📵 Pas de réponse", ""], ["entretien", "🗣 Entretien fait", "Impression, salaire actuel, disponibilité…"], ["note", "📝 Note", "Note"], ["recruté", "✅ Recruté", "Date de début, conditions…"], ["écarté", "❌ Écarté", "Raison"]] as const).map(([k, l, q]) => <button key={k} className={s.ghost} style={{ padding: "3px 9px", fontSize: 13 }} onClick={() => addLog(d, k, q || undefined)}>{l}</button>)}</div>
    {L.length ? <div style={{ fontSize: 13, color: "#374151" }}>{L.slice(0, 6).map(l => <div key={l.id}>• {new Date(l.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} — <b>{l.kind}</b>{l.note ? ` : ${l.note}` : ""}</div>)}</div> : <small style={{ color: "#6b7280" }}>Aucun contact enregistré.</small>}
  </div>; };

  const importZip = async (file: File | null) => {
    if (!file) return; const poste = imp.poste; setImp(x => ({ ...x, busy: true, rows: [], text: "Envoi du fichier…" }));
    try {
      const init = await call("/api/candidatures/import-zip", "PUT", { action: "init" });
      const { error } = await supabase.storage.from(init.bucket).uploadToSignedUrl(init.path, init.token, file, { contentType: "application/zip" }); if (error) throw new Error("Envoi du ZIP impossible : " + error.message);
      let offset = 0, total = 0; const rows: Row[] = [];
      for (let guard = 0; guard < 200; guard++) {
        let j: Row | null = null; for (let t = 0; t < 3 && !j; t++) j = await call("/api/candidatures/import-zip", "PUT", { action: "process", path: init.path, poste, offset }).catch(() => null);
        if (!j) throw new Error(`Arrêt à ${offset}/${total || "?"} : relancez l'import, les CV déjà traités seront ignorés.`);
        total = j.total; offset = j.next; rows.push(...j.results); setImp(x => ({ ...x, rows: [...rows], text: `Analyse des CV… ${offset}/${total}` }));
        if (j.done) break;
      }
      const n = rows.filter(r => r.status === "importé").length; setImp(x => ({ ...x, busy: false, text: `✅ Terminé : ${n} nouveau(x) CV importé(s) et noté(s), ${rows.length - n} déjà présent(s).` })); load();
    } catch (e) { setImp(x => ({ ...x, busy: false, text: "❌ " + (e as Error).message })); }
  };
  const sendImported = async (all: boolean) => { const ids = imp.rows.filter(r => r.id && (all || !/^écart/i.test(r.verdict || ""))).map(r => r.id); if (!ids.length) return; if (!confirm(`Envoyer le test par SMS + e-mail à ${ids.length} candidat(s) ?`)) return; setImp(x => ({ ...x, busy: true, text: "Envoi des tests…" })); let ok = 0; for (let i = 0; i < ids.length; i += 25) { const j = await call("/api/candidatures/invite", "POST", { action: "send", ids: ids.slice(i, i + 25) }).catch(() => null); ok += (j?.results || []).filter((r: Row) => r.sms === "envoyé" || r.email === "envoyé").length; } setImp(x => ({ ...x, busy: false, text: `✅ Test envoyé à ${ok} candidat(s).` })); load(); };
  const rescoreAll = async () => { setImp(x => ({ ...x, busy: true, text: "Analyse des CV non notés…" })); let n = 0; for (let g = 0; g < 80; g++) { const j = await call("/api/candidatures/import-zip", "PUT", { action: "rescore" }).catch(() => null); if (!j) break; n += j.results.length; setImp(x => ({ ...x, text: `Analyse… ${n} traités, ${j.remaining} restants` })); if (!j.remaining || !j.results.length) break; } setImp(x => ({ ...x, busy: false, text: `✅ Analyse terminée (${n} CV traités).` })); load(); };
  const importBox = () => <section className={s.card}><h2>📥 Importer un ZIP de CV (Emploitic)</h2><p className={s.muted}>Déposez le ZIP tel quel, même avec 100 CV : chaque CV est lu, noté par l'IA et rangé automatiquement. Les CV déjà présents sont ignorés.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}><select value={imp.poste} onChange={e => setImp(x => ({ ...x, poste: e.target.value as PosteKey }))} style={{ width: "auto" }}>{(["closer", "coordinateur", "social"] as const).map(k => <option key={k} value={k}>{POSTES[k].short}</option>)}</select>
      <label className={s.primary} style={{ cursor: imp.busy ? "wait" : "pointer", opacity: imp.busy ? 0.6 : 1 }}>{imp.busy ? "En cours…" : "Choisir le fichier ZIP"}<input type="file" accept=".zip,application/zip" hidden disabled={imp.busy} onChange={e => importZip(e.target.files?.[0] || null)} /></label><button className={s.ghost} disabled={imp.busy} onClick={rescoreAll}>🔄 Analyser les CV non notés</button></div>
    <p className={s.muted} style={{ margin: 0 }}>Le poste choisi n'est qu'indicatif : l'IA note chaque CV pour les 3 postes et le range dans celui où il est le meilleur.</p>
    {imp.text ? <p><b>{imp.text}</b></p> : null}
    {imp.rows.some(r => r.id) && !imp.busy ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button className={s.primary} onClick={() => sendImported(false)}>📨 Envoyer le test aux nouveaux (sauf écartés)</button><button className={s.ghost} onClick={() => sendImported(true)}>📨 L'envoyer à tous les nouveaux</button></div> : null}
    {imp.rows.length ? <div style={{ maxHeight: 260, overflow: "auto", fontSize: 13.5 }}>{imp.rows.map((r, i) => <div key={i}>{r.status === "importé" ? `• ${r.full_name} — ${r.score ?? "?"} — ${r.verdict}` : `• ${r.name} — ${r.status}`}</div>)}</div> : null}
  </section>;
  const offerPanel = () => { if (!offerFor || !op) return null; const k = offerFor.poste; const set = (key: keyof OfferParams, v: string) => setOp(x => x ? { ...x, [key]: typeof TEMPLATES[k][key] === "number" ? Number(v) || 0 : v } : x);
    const rows = (op.commission ? [0, 5, 10, 20, 30] : [0]).map(v => { const m = monthly(op, v); const sal = salariedCost(m.net); return { v, ...m, eur: m.brut / op.tauxEur, sal, salEur: sal.cout / op.tauxEur }; });
    const num = (key: keyof OfferParams, label: string) => <label key={key} style={{ display: "grid", gap: 4, fontSize: 13 }}>{label}<input type="number" value={op[key] as number} onChange={e => set(key, e.target.value)} /></label>;
    return <section id="offre-panel" className={s.card} style={{ borderColor: "#f05a28" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><h2>📝 Offre pour {offerFor.name} — {POSTES[k].short}</h2><button className={s.ghost} onClick={() => setOfferFor(null)}>Fermer ✕</button></div>
      <p className={s.muted}>Repère du marché : {MARKET[k].label}, environ {fmtDA(MARKET[k].low)} à {fmtDA(MARKET[k].high)} net. Objectif : être un peu au-dessus, sans plus, pour pouvoir passer la personne en salariée un jour. Prétention indiquée : {offerFor.app?.salary_expectation || "—"}.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
        {num("fixe", "Fixe (DA/mois)")}{num("charges", "Charges freelance remboursées")}{num("assiduite", "Prime d'assiduité")}{num("commission", "Commission par voiture livrée")}{num("palierVentes", "Palier : nb de ventes")}{num("palierBonus", "Bonus de palier (DA)")}{num("objectifMontant", "Prime d'objectif (DA)")}{num("reposJours", "Jours de repos payés / an")}{num("essaiJours", "Période d'essai (jours)")}{num("tauxEur", "Taux : DA pour 1 €")}
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Devise du contrat<select value={op.devise} onChange={e => setOp(x => x ? { ...x, devise: e.target.value as "DA" | "EUR" } : x)}><option value="EUR">Euros (montants convertis au taux ci-contre)</option><option value="DA">Dinars</option></select></label>
        <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Date de début<input type="date" value={op.debut} onChange={e => set("debut", e.target.value)} /></label>
      </div>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Objectif de la prime<input value={op.objectifLabel} onChange={e => set("objectifLabel", e.target.value)} /></label>
      <label style={{ display: "grid", gap: 4, fontSize: 13 }}>Horaires<input value={op.horaires} onChange={e => set("horaires", e.target.value)} /></label>
      <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}><thead><tr style={{ background: "#f4f6f9" }}>{[op.commission ? "Ventes / mois" : "Mois", "Facturé par le candidat", "Écrit dans le contrat", "Ses charges", "Net dans sa poche", "Coût NeoDrive", "Si salarié(e) : coût employeur"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.v} style={{ background: r.v === op.ventesType ? "#fff7ed" : undefined }}><td style={th}>{op.commission ? r.v : "complet"}</td><td style={th}>{fmtDA(r.brut)}</td><td style={th}><b>{money(op, r.brut)}</b></td><td style={th}>−{fmtDA(r.charges)}</td><td style={th}><b>{fmtDA(r.net)}</b></td><td style={th}><b>{Math.round(r.eur)} €</b></td><td style={th}>{fmtDA(r.sal.cout)} ({Math.round(r.salEur)} €)</td></tr>)}</tbody></table></div>
      <small className={s.muted}>Charges du candidat : impôt forfaitaire 0,5 % (minimum 10 000 DA/an) + CASNOS 24 000 DA/an, soit environ {fmtDA(freelanceCharges(op.fixe))} par mois. Coût « si salarié » : pour lui garantir le même net (IRG et CNAS à la charge de l'entreprise, estimation).</small>
      {warnings(k, op).map(w => <p key={w} style={{ color: "#b45309", margin: 0 }}>⚠️ {w}</p>)}
      {!created ? <button className={s.primary} onClick={createOffer}>Créer l'offre</button> : <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button className={s.primary} onClick={() => sendOffer(created)}>📨 Envoyer par SMS + e-mail</button>
        <a className={s.ghost} href="#" onClick={e => { e.preventDefault(); window.open(waOffer(created), "_blank"); }}>💬 Envoyer par WhatsApp</a>
        <a className={s.ghost} href={created.link} target="_blank" rel="noreferrer">👁 Voir l'offre</a>
        <button className={s.ghost} onClick={() => { navigator.clipboard?.writeText(created.link).catch(() => null); setMsg("🔗 Lien copié"); }}>🔗 Copier le lien</button></div>}
    </section>; };
  if (!apps) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Recrutement</h1><p>Code d'accès NeoDrive.</p><input type="password" value={code} onChange={e => setCode(e.target.value)} autoFocus /><button>Entrer</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;
  const count = (k: string) => dossiers.filter(d => k === "tous" || d.poste === k).length;

  const card = (d: Dossier) => { const a = d.app; const cvPath = a?.cv_path || d.inv?.cv_path; return <article key={d.key} style={{ border: "1px solid #ece6dd", borderRadius: 14, padding: 12, display: "grid", gap: 8, background: d.score >= 75 && a ? "#f0fdf4" : "#fff" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(open === d.key ? null : d.key)}>
      <b style={{ minWidth: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", color: "#fff", background: color(a ? d.score : d.cvScore), fontSize: 18 }}>{a ? d.score : (d.cvScore ?? "–")}</b>
      <div style={{ flex: 1 }}><b>{d.name}</b> <small style={{ color: "#7a8594" }}>· {POSTES[d.poste]?.short} · {d.city}</small><br />
        <small>{a ? `✅ Formulaire rempli · CV ${d.cvScore ?? "–"} · tests/IA ${a.ai_score ?? "–"}` : `⏳ Invité, formulaire non rempli · note CV ${d.cvScore ?? "–"}`} · <b>{d.stage}</b></small><br />
        <small style={{ color: "#5b6573" }}>{a?.ai_summary || d.inv?.cv_summary || ""}</small></div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 14 }}>
      <a href={`tel:+${String(d.phone).replace(/\D/g, "")}`}>📞 {d.phone}</a><a href={wa(d)} target="_blank" rel="noreferrer" onClick={() => { if (d.inv && !d.inv.whatsapp_at && !d.app) markWa(d.inv.id, true); }}>💬 WhatsApp</a>{d.email ? <a href={`mailto:${d.email}`}>✉️ e-mail</a> : null}
      {cvPath ? <button className={s.ghost} style={{ padding: "4px 10px" }} onClick={() => openCv(cvPath)}>📄 CV</button> : null}<button className={s.ghost} style={{ padding: "4px 10px" }} onClick={() => openOffer(d)}>📝 Offre</button>{offerBadge(d)}
      {a ? <><span>🇫🇷 {a.test_french ?? "–"}/10</span><span>🧠 {a.test_logic ?? "–"}/8</span><span>✍️ {a.test_writing ?? "–"}/20</span><span>🧩 {a.answers?.riddles_score ?? "–"}{a.riddle_sec ? ` en ${a.riddle_sec}s` : ""}</span><span>🎓 {a.bac_average ?? "?"}/20</span>{a.paste_count ? <span style={{ color: "#b91c1c" }}>⚠️ {a.paste_count} collage(s)</span> : null}{a.duration_sec ? <span>⏱ {Math.round(a.duration_sec / 60)} min</span> : null}<span>💰 {a.salary_expectation || "?"}</span></> : null}
    </div>
    {planBox(d)}
    {d.inv ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13 }}>
      <span style={{ padding: "3px 8px", borderRadius: 999, background: d.inv.sms_sent_at ? "#dcfce7" : "#f3f4f6" }}>📱 SMS test {d.inv.sms_sent_at ? `✅ ${day(d.inv.sms_sent_at)}` : "❌"}</span>
      <span style={{ padding: "3px 8px", borderRadius: 999, background: d.inv.email_sent_at ? "#dcfce7" : "#f3f4f6" }}>✉️ E-mail test {d.inv.email_sent_at ? `✅ ${day(d.inv.email_sent_at)}` : "❌"}</span>
      <label style={{ padding: "3px 8px", borderRadius: 999, background: d.inv.whatsapp_at ? "#dcfce7" : "#fef3c7", cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={!!d.inv.whatsapp_at} onChange={e => markWa(d.inv!.id, e.target.checked)} style={{ width: "auto" }} />💬 Test envoyé par WhatsApp {d.inv.whatsapp_at ? `✅ ${day(d.inv.whatsapp_at)}` : "— pas encore"}</label>
    </div> : null}
    {a ? <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
      <select value={a.status} onChange={e => update(a.id, { status: e.target.value })}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
      <input defaultValue={a.notes || ""} placeholder="Notes d'entretien…" onBlur={e => e.target.value !== (a.notes || "") && update(a.id, { notes: e.target.value })} />
    </div> : null}
    {open === d.key ? <div style={{ fontSize: 14, display: "grid", gap: 8, background: "#fafaf9", borderRadius: 12, padding: 12 }}>
      {d.inv ? <><div><b>📄 Analyse du CV :</b> {d.inv.cv_summary || "—"}</div>{d.inv.cv_strengths ? <div><b>✅</b> {d.inv.cv_strengths}</div> : null}{d.inv.cv_risks ? <div><b>⚠️</b> {d.inv.cv_risks}</div> : null}{d.inv.cv_questions ? <div><b>❓</b> {d.inv.cv_questions}</div> : null}</> : null}
      {a ? <>
        <hr /><div><b>🤖 Analyse du formulaire :</b> {a.ai_summary}</div><div><b>✅ Points forts :</b> {a.ai_strengths || "—"}</div><div><b>⚠️ Risques :</b> {a.ai_risks || "—"}</div><div><b>❓ Questions d'entretien :</b> {a.ai_questions || "—"}</div>
        <div><small style={{ color: "#7a8594" }}>Notes au bac</small><div>{a.bac_grades ? Object.entries(a.bac_grades).map(([k, v]) => `${k} ${v ?? "?"}`).join(" · ") : "—"}</div></div>
        <div><small style={{ color: "#7a8594" }}>Dernier employeur</small><div>{a.last_employer ? `${a.last_employer.entreprise} – ${a.last_employer.poste} (${a.last_employer.dates}) · départ : ${a.last_employer.depart} · ${a.last_employer.raison} · Référence : ${a.last_employer.reference || "—"} ${a.last_employer.reference_tel || ""} ${a.last_employer.accord_contact ? "(accord pour la contacter)" : "(pas d’accord)"}` : "—"}</div></div>
        <div><small style={{ color: "#7a8594" }}>Rédaction</small><div style={{ whiteSpace: "pre-wrap" }}>{a.answers?.writing || "—"}</div></div>
        {[...COMMON, ...(POSTES[d.poste]?.questions || [])].map(q => <div key={q.id}><small style={{ color: "#7a8594" }}>{q.label}</small><div style={{ whiteSpace: "pre-wrap" }}>{a.answers?.[q.id] || "—"}</div></div>)}
      </> : null}
    </div> : null}
  </article>; };

  return <main className={s.page}>
    <div className={s.top}><div><h1>👥 Recrutement</h1><p>Note finale = 30 % CV + 70 % formulaire et tests. Mise à jour à chaque nouvelle candidature.</p></div><button className={s.ghost} onClick={() => load()}>↻ Actualiser</button></div>
    <div className={s.seg} style={{ marginTop: 12 }}><button className={view === "top" ? s.on : ""} onClick={() => setView("top")}>🏆 Classement par poste</button><button className={view === "all" ? s.on : ""} onClick={() => setView("all")}>📂 Tous les dossiers</button><button className={view === "offres" ? s.on : ""} onClick={() => setView("offres")}>📝 Offres ({offers.length})</button></div>
    {offerPanel()}
    {view === "top" ? importBox() : null}
    {view === "offres" ? <section className={s.card}><h2>📝 Offres envoyées</h2>{offers.length ? <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr style={{ background: "#f4f6f9" }}>{["Candidat", "Poste", "Fixe", "Commission", "Statut", "Envoyée", "Vue", "Signée", ""].map(h => <th key={h} style={{ ...th, fontWeight: 700 }}>{h}</th>)}</tr></thead><tbody>{offers.map(o => <tr key={o.id}><td style={{ ...th, textAlign: "left" }}><b>{o.full_name}</b></td><td style={th}>{POSTES[o.poste as PosteKey]?.short}</td><td style={th}>{fmtDA(o.params?.fixe || 0)}</td><td style={th}>{o.params?.commission ? fmtDA(o.params.commission) : "—"}</td><td style={th}><b>{o.status}</b>{o.refuse_reason ? <><br /><small>{o.refuse_reason}</small></> : null}</td><td style={th}>{o.sent_at ? `${new Date(o.sent_at).toLocaleDateString("fr-FR")} (${o.sent_via})` : "—"}</td><td style={th}>{o.viewed_at ? new Date(o.viewed_at).toLocaleDateString("fr-FR") : "—"}</td><td style={th}>{o.signed_at ? `${new Date(o.signed_at).toLocaleDateString("fr-FR")} · ${o.signature_name}` : "—"}</td><td style={th}><a href={`https://www.easydrive-auto.fr/offre/${o.token}`} target="_blank" rel="noreferrer">👁</a>{!["signée", "annulée"].includes(o.status) ? <> <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={() => sendOffer(o)}>📨</button> <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={() => window.open(waOffer(o), "_blank")}>💬</button> <button className={s.ghost} style={{ padding: "2px 8px" }} onClick={async () => { if (confirm("Annuler cette offre ?")) { await call("/api/offres", "PUT", { action: "cancel", id: o.id }); load(); } }}>✕</button></> : null}</td></tr>)}</tbody></table></div> : <p className={s.muted}>Aucune offre pour l'instant. Cliquez sur « 📝 Offre » à côté d'un candidat.</p>}</section> : null}
    {view === "top" ? <>
      <p className={s.muted}>Classement mis à jour automatiquement à chaque formulaire reçu. Note finale = 30 % CV + 70 % tests et réponses. Les 3 premiers (en vert) sont à rappeler en priorité. Les écartés ne sont pas affichés.</p>
      {(["closer", "coordinateur", "social"] as const).map(board)}
    </> : null}
    {view === "all" ? <>
    <div className={s.seg} style={{ marginTop: 12 }}>{(["tous", "closer", "coordinateur", "social"] as const).map(k => <button key={k} className={poste === k ? s.on : ""} onClick={() => setPoste(k)}>{k === "tous" ? "Tous" : POSTES[k].short} ({count(k)})</button>)}
      <button className={waOnly ? s.on : ""} onClick={() => setWaOnly(!waOnly)}>💬 WhatsApp du jour ({Math.min(30, dossiers.filter(d => (poste === "tous" || d.poste === poste) && waTodo(d)).length)} sur {dossiers.filter(d => (poste === "tous" || d.poste === poste) && waTodo(d)).length})</button>
      <button onClick={() => setHideOut(!hideOut)}>{hideOut ? "Afficher les écartés" : "Masquer les écartés"}</button></div>
    <section className={s.card} style={{ borderColor: "#86efac" }}>
      <h2>🔥 À contacter en priorité ({top.length})</h2>
      <p className={s.muted}>Formulaire rempli, note finale ≥ 75. Vous recevez un SMS dès qu'un candidat entre ici.</p>
      {top.length ? top.map(card) : <p className={s.muted}>Personne pour l'instant : les candidats invités n'ont pas encore rempli le formulaire.</p>}
    </section>
    <section className={s.card}>
      <h2>Tous les dossiers ({shown.length})</h2>
      <p className={s.muted}>D'abord ceux qui ont rempli le formulaire (par note finale), puis les invités en attente (par note CV). Le bouton 💬 WhatsApp ouvre le message prêt à envoyer et coche automatiquement « Test envoyé par WhatsApp ». Filtre « 💬 WhatsApp à envoyer » : le lot du jour, soit les 30 meilleurs candidats (écartés compris) qui n'ont ni rempli le formulaire ni reçu de WhatsApp. Envoyez-en 20 à 30 par jour depuis votre téléphone personnel ; chaque envoi les retire de la liste.</p>
      {shown.filter(d => !top.includes(d)).map(card)}
    </section>
    </> : null}
    {msg ? <p>{msg}</p> : null}
  </main>;
}
