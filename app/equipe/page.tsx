"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIRM_QUESTIONS } from "../../lib/team-pay";
import Dossier from "./Dossier";
import Factures from "./Factures";

type Card = { id: number; nom: string; ville: string; departement: string; modele: string; statut: string; phase: string; rappel: string | null; dernier: string | null; tel: string; email: string; source: string; annonce: string };
type Lead = Card & { historique: string; commentaire: string };
type Msg = { direction: string; body: string; created_at: string };
type Resa = { id: number; modele: string; couleur: string; total: number | null; statut: string; created_at: string; date_promise: string | null };
const C = { bg: "#f6f4f0", card: "#fff", line: "#e5e0d8", ink: "#141414", mute: "#6b6b6b", brand: "#f05a28", ok: "#15803d", bad: "#b91c1c" };
const box: React.CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: "10px 0" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "10px 14px", borderRadius: 10, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit" });
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 10, border: `1px solid ${C.line}`, font: "inherit", background: "#fff" };
const dt = (s: string | null) => s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

async function api(body: object, method = "POST") {
  const r = await fetch("/api/equipe", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
  if (j.logout) throw Object.assign(new Error(j.error || "Session expirée"), { logout: true });
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j;
}
/** Dossier et factures du membre : /api/equipe/dossier. */
async function dossierApi<T = Record<string, unknown>>(body: object): Promise<T> {
  const r = await fetch("/api/equipe/dossier", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false, error: r.status === 413 ? "Envoi trop lourd." : "Erreur réseau : vérifiez votre connexion et réessayez." }));
  if (j.logout) throw Object.assign(new Error(j.error || "Session expirée"), { logout: true });
  if (!j.ok) throw new Error(j.error || "Erreur");
  return j as T;
}

export default function Equipe() {
  const [me, setMe] = useState<{ member: { name: string; role: string; expires_at: string | null }; total: number; results: string[]; has_pay?: boolean; academy?: boolean; today: { calls: number; messages: number } } | null>(null);
  const [state, setState] = useState<"load" | "login" | "in">("load");
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("tous"); const [page, setPage] = useState(0); const [list, setList] = useState<Card[]>([]); const [more, setMore] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null); const [msgs, setMsgs] = useState<Msg[]>([]); const [canWa, setCanWa] = useState(false); const [tel, setTel] = useState<string | null>(null);
  const [res, setRes] = useState(""); const [note, setNote] = useState(""); const [next, setNext] = useState(""); const [wa, setWa] = useState(""); const [report, setReport] = useState(""); const [busy, setBusy] = useState("");
  const clock = useRef<string>("");
  const [tab, setTab] = useState<"crm" | "dossier" | "factures">("crm");
  const [resas, setResas] = useState<Resa[]>([]); const [conf, setConf] = useState<{ id: number; answers: Record<string, boolean>; note: string } | null>(null);

  const fail = useCallback((e: unknown) => { const x = e as Error & { logout?: boolean }; if (x.logout) { setState("login"); setMe(null); setLead(null); } setErr(x.message); }, []);
  const loadMe = useCallback(async () => { try { const j = await api({ action: "me" }); setMe(j); setState("in"); } catch (e) { setState("login"); if ((e as { logout?: boolean }).logout) setErr(""); } }, []);
  const loadList = useCallback(async (f = filter, p = page) => { try { const j = await api({ action: "list", filter: f, page: p }); setList(j.leads); setMore(j.more); } catch (e) { fail(e); } }, [filter, page, fail]);

  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { if (state === "in") loadList(); }, [state, filter, page]); // eslint-disable-line react-hooks/exhaustive-deps
  // Temps de travail : un signal par minute quand l'onglet est visible.
  useEffect(() => {
    if (state !== "in") return;
    const ping = () => api({ action: "ping", visible: document.visibilityState === "visible" }).catch(fail);
    ping(); const it = setInterval(ping, 60000); const vis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", vis); return () => { clearInterval(it); document.removeEventListener("visibilitychange", vis); };
  }, [state, fail]);
  clock.current = new Date().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  const login = async (e: React.FormEvent) => { e.preventDefault(); setErr(""); setBusy("login"); try { await api({ action: "login", code }); setCode(""); await loadMe(); } catch (x) { setErr((x as Error).message); } finally { setBusy(""); } };
  const logout = async () => { try { await api({ action: "logout" }); } catch { /* déconnecté */ } setState("login"); setMe(null); setLead(null); };
  const open = async (id: number) => { setErr(""); setMsg(""); setBusy("lead"); try { const j = await api({ action: "lead", id }); setLead(j.lead); setMsgs(j.messages); setCanWa(j.canWhatsapp); setTel(j.tel); setResas(j.reservations || []); setConf(null); setRes(""); setNote(""); setNext(""); setWa(""); window.scrollTo({ top: 0 }); } catch (e) { fail(e); } finally { setBusy(""); } };
  const call = async () => { if (!lead) return; setBusy("call"); try { const j = await api({ action: "call", id: lead.id }); if (j.mode === "lien") window.location.href = j.href; else setMsg(j.message); } catch (e) { fail(e); } finally { setBusy(""); } };
  const saveCall = async () => { if (!lead || !res) { setErr("Choisissez le résultat de l'appel."); return; } setBusy("res"); try { await api({ action: "call_result", id: lead.id, result: res, note, next }); setMsg("✅ Compte-rendu enregistré."); setLead(null); loadList(); loadMe(); } catch (e) { fail(e); } finally { setBusy(""); } };
  const draft = async () => { if (!lead) return; setBusy("draft"); try { const j = await api({ action: "draft", id: lead.id }); setWa(j.text || ""); } catch (e) { fail(e); } finally { setBusy(""); } };
  const sendWa = async () => { if (!lead) return; setBusy("wa"); try { await api({ action: "whatsapp", id: lead.id, text: wa }); setMsg("✅ Message WhatsApp envoyé."); setMsgs(m => [...m, { direction: "outbound", body: wa, created_at: new Date().toISOString() }]); setWa(""); loadMe(); } catch (e) { fail(e); } finally { setBusy(""); } };
  const saveConf = async () => {
    if (!lead || !conf) return;
    if (CONFIRM_QUESTIONS.some(q => conf.answers[q.key] === undefined)) { setErr("Répondez aux 3 questions."); return; }
    setBusy("conf"); setErr("");
    try { const j = await api({ action: "confirm_reservation", id: lead.id, reservation_id: conf.id, answers: conf.answers, note: conf.note }); setMsg(j.confirmed ? "✅ Confirmation ferme enregistrée. Merci !" : "⚠️ Hésitation notée : la réservation ne sera pas planifiée pour l'instant."); setConf(null); await open(lead.id); }
    catch (e) { fail(e); } finally { setBusy(""); }
  };
  const dApi = useCallback(async <T,>(body: object) => { try { return await dossierApi<T>(body); } catch (e) { if ((e as { logout?: boolean }).logout) fail(e); throw e; } }, [fail]);
  const sendReport = async () => { setBusy("rep"); try { await api({ body: report }, "PUT"); setReport(""); setMsg("✅ Rapport envoyé. Bonne soirée !"); } catch (e) { fail(e); } finally { setBusy(""); } };

  const noCopy = { onCopy: (e: React.ClipboardEvent) => e.preventDefault(), onContextMenu: (e: React.MouseEvent) => e.preventDefault(), style: { userSelect: "none" as const, WebkitUserSelect: "none" as const } };

  if (state === "load") return <main style={{ background: C.bg, minHeight: "100vh" }} />;
  if (state === "login") return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <form onSubmit={login} style={{ maxWidth: 380, margin: "0 auto", padding: "80px 16px" }}>
      <div style={{ fontWeight: 900, fontSize: 24 }}>NeoDrive · Espace équipe</div>
      <p style={{ color: C.mute }}>Entrez votre code personnel. Il est strictement personnel et confidentiel.</p>
      <input value={code} onChange={e => setCode(e.target.value)} placeholder="XXXXX-XXXXX" autoComplete="off" style={{ ...input, fontSize: 20, letterSpacing: 2, textAlign: "center" }} />
      <button disabled={busy === "login"} style={{ ...btn(C.brand), width: "100%", marginTop: 10, padding: 14 }}>Se connecter</button>
      {err ? <p style={{ color: C.bad }}>{err}</p> : null}
      <p style={{ color: C.mute, fontSize: 12, marginTop: 24 }}>Votre activité (connexion, fiches consultées, appels, messages) est enregistrée. Il est interdit de copier, photographier ou transmettre les informations clients.</p>
    </form>
  </main>;

  const name = me?.member.name || "";
  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink, position: "relative" }}>
    {/* Filigrane : nom + date sur toute la page */}
    <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, opacity: 0.07, fontSize: 18, fontWeight: 800, overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 60, transform: "rotate(-24deg) scale(1.4)" }}>
      {Array.from({ length: 36 }).map((_, i) => <span key={i}>{name} · {clock.current}</span>)}
    </div>
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "16px 16px 80px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div><div style={{ fontWeight: 900, fontSize: 20 }}>NeoDrive · Espace équipe</div><div style={{ color: C.mute, fontSize: 13 }}>{name} · {me?.total} clients attribués · aujourd'hui : {me?.today.calls} comptes-rendus, {me?.today.messages} messages{me?.member.expires_at ? ` · accès jusqu'au ${dt(me.member.expires_at)}` : ""}</div></div>
        <button onClick={logout} style={btn("#555")}>Se déconnecter</button>
      </header>
      {err ? <p style={{ color: C.bad, fontWeight: 600 }}>{err}</p> : null}
      {msg ? <p style={{ color: C.ok, fontWeight: 600 }}>{msg}</p> : null}

      {lead ? <section {...noCopy}>
        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div><div style={{ fontWeight: 800, fontSize: 20 }}>{lead.nom}</div><div style={{ color: C.mute }}>{[lead.ville, lead.departement].filter(Boolean).join(" · ") || "Ville inconnue"} · {lead.statut}{lead.phase ? ` · ${lead.phase}` : ""}</div></div>
            <button onClick={() => setLead(null)} style={btn("#777")}>← Retour à la liste</button>
          </div>
          <p style={{ margin: "8px 0" }}>📞 {tel || lead.tel} · ✉️ {lead.email}{lead.modele ? ` · 🚗 ${lead.modele}` : ""}{lead.rappel ? ` · ⏰ rappel ${dt(lead.rappel)}` : ""}</p>
          {lead.annonce ? <p style={{ color: C.mute, fontSize: 13 }}>Origine : {lead.source} – {lead.annonce}</p> : null}
          <button onClick={call} disabled={busy === "call"} style={{ ...btn(C.ok), fontSize: 17, padding: "12px 20px" }}>📞 Appeler</button>
        </div>

        {resas.map(r => <div key={r.id} style={{ ...box, borderColor: "#f8c8b0", background: "#fff7f3" }}>
          <b>🚗 Réservation en cours · {r.statut}</b>
          <div style={{ color: C.mute, fontSize: 14, margin: "4px 0 8px" }}>{[r.modele, r.couleur].filter(Boolean).join(" · ") || "Modèle à préciser"}{r.total ? ` · ${Math.round(r.total).toLocaleString("fr-FR")} €` : ""} · réservée le {new Date(r.created_at).toLocaleDateString("fr-FR")}{r.date_promise ? ` · livraison prévue le ${new Date(r.date_promise + "T12:00:00").toLocaleDateString("fr-FR")}` : ""}</div>
          {conf?.id === r.id ? <div>
            <p style={{ margin: "0 0 8px", fontSize: 14 }}>Posez ces 3 questions au client. La confirmation n’est enregistrée que si les 3 réponses sont « oui ».</p>
            {CONFIRM_QUESTIONS.map(q => <div key={q.key} style={{ margin: "8px 0" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{q.q}</div>
              <div style={{ display: "flex", gap: 6 }}>{([[true, "Oui"], [false, "Non"]] as const).map(([v, l]) => <button key={l} onClick={() => setConf({ ...conf, answers: { ...conf.answers, [q.key]: v } })} style={{ ...btn(conf.answers[q.key] === v ? (v ? C.ok : C.bad) : "#e9e5df"), color: conf.answers[q.key] === v ? "#fff" : C.ink, minWidth: 80 }}>{l}</button>)}</div>
            </div>)}
            <textarea value={conf.note} onChange={e => setConf({ ...conf, note: e.target.value })} rows={2} placeholder="Précision (facultatif) : jour de livraison souhaité, banque prévenue…" style={input} />
            {CONFIRM_QUESTIONS.some(q => conf.answers[q.key] === false) ? <p style={{ color: C.bad, fontSize: 14, margin: "6px 0 0" }}>Une réponse est « non » : on notera « hésitation, ne pas planifier ».</p> : null}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}><button onClick={saveConf} disabled={busy === "conf" || CONFIRM_QUESTIONS.some(q => conf.answers[q.key] === undefined)} style={btn(C.brand)}>Enregistrer</button><button onClick={() => setConf(null)} style={btn("#777")}>Annuler</button></div>
          </div> : <button onClick={() => setConf({ id: r.id, answers: {}, note: "" })} style={btn(C.brand)}>✅ Confirmation ferme</button>}
        </div>)}

        <div style={box}>
          <b>Compte-rendu de l'appel</b>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>{me?.results.map(r => <button key={r} onClick={() => setRes(r)} style={{ ...btn(res === r ? C.brand : "#eee"), color: res === r ? "#fff" : C.ink, fontWeight: 600 }}>{r}</button>)}</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Compte rendu obligatoire (30 caractères minimum) : ce que le client a dit, ses questions, son budget, sa ville, la suite prévue…" style={input} />
          <label style={{ display: "block", margin: "8px 0 4px", color: C.mute, fontSize: 13 }}>Prochain rappel (facultatif)</label>
          <input type="datetime-local" value={next} onChange={e => setNext(e.target.value)} style={{ ...input, maxWidth: 260 }} />
          <div><button onClick={saveCall} disabled={busy === "res"} style={{ ...btn(C.brand), marginTop: 10 }}>Enregistrer le compte-rendu</button></div>
        </div>

        <div style={box}>
          <b>WhatsApp</b>
          <div style={{ maxHeight: 280, overflow: "auto", margin: "8px 0" }}>{msgs.length ? msgs.map((m, i) => <div key={i} style={{ margin: "6px 0", display: "flex", justifyContent: m.direction === "outbound" ? "flex-end" : "flex-start" }}><div style={{ maxWidth: "80%", background: m.direction === "outbound" ? "#dcf8c6" : "#f1f1f1", borderRadius: 10, padding: "6px 10px", whiteSpace: "pre-wrap" }}>{m.body}<div style={{ fontSize: 11, color: C.mute }}>{dt(m.created_at)}</div></div></div>) : <p style={{ color: C.mute }}>Aucun échange WhatsApp.</p>}</div>
          {canWa ? <>
            <textarea value={wa} onChange={e => setWa(e.target.value)} rows={4} placeholder="Votre réponse au client (vouvoiement, poli, précis)…" style={input} onCopy={e => e.stopPropagation()} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}><button onClick={draft} disabled={busy === "draft"} style={btn("#555")}>✨ Proposer une réponse</button><button onClick={sendWa} disabled={busy === "wa" || wa.trim().length < 2} style={btn(C.ok)}>Envoyer sur WhatsApp</button></div>
          </> : <p style={{ color: C.mute, fontSize: 13 }}>Le client n'a pas écrit depuis plus de 24 h : WhatsApp ne permet pas de lui écrire librement. Appelez-le.</p>}
        </div>

        {lead.historique ? <div style={box}><b>Historique</b><pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 13, color: "#333", margin: "8px 0 0" }}>{lead.historique}</pre></div> : null}
      </section> : <>
        <div style={{ display: "flex", gap: 6, margin: "12px 0 4px", flexWrap: "wrap" }}>{([["crm", "📋 Mes clients"], ["dossier", "🪪 Mon dossier"], ...(me?.has_pay ? [["factures", "🧾 Mes factures"]] : [])] as [typeof tab, string][]).map(([k, l]) => <button key={k} onClick={() => { setTab(k); setErr(""); setMsg(""); }} style={{ ...btn(tab === k ? C.brand : "#fff"), color: tab === k ? "#fff" : C.ink, border: `1px solid ${tab === k ? C.brand : C.line}`, whiteSpace: "nowrap" }}>{l}</button>)}{me?.academy ? <a href="/academy" style={{ ...btn("#fff"), color: C.ink, border: `1px solid ${C.line}`, whiteSpace: "nowrap", textDecoration: "none" }}>🎓 Academy</a> : null}</div>
        {tab === "dossier" ? <Dossier api={dApi} /> : tab === "factures" ? <Factures api={dApi} goDossier={() => setTab("dossier")} /> : <>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>{[["tous", "Tous"], ["a_rappeler", "⏰ À rappeler"], ["nouveaux", "🆕 Nouveaux"], ["chauds", "🔥 Chauds"]].map(([k, l]) => <button key={k} onClick={() => { setFilter(k); setPage(0); }} style={{ ...btn(filter === k ? C.ink : "#e9e5df"), color: filter === k ? "#fff" : C.ink }}>{l}</button>)}</div>
        <div {...noCopy}>
          {list.length ? list.map(l => <button key={l.id} onClick={() => open(l.id)} disabled={busy === "lead"} style={{ ...box, display: "block", width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", color: C.ink }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><b>{l.nom}</b><span style={{ fontSize: 12, color: C.mute }}>{l.statut}{l.phase ? ` · ${l.phase}` : ""}</span></div>
            <div style={{ color: C.mute, fontSize: 13 }}>{[l.ville, l.modele].filter(Boolean).join(" · ") || "—"}{l.rappel ? ` · ⏰ ${dt(l.rappel)}` : ""}{l.dernier ? ` · dernier contact ${dt(l.dernier)}` : ""}</div>
          </button>) : <p style={{ color: C.mute }}>Aucun client dans cette liste.</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>{page > 0 ? <button onClick={() => setPage(page - 1)} style={btn("#777")}>← Précédents</button> : null}{more ? <button onClick={() => setPage(page + 1)} style={btn("#777")}>Suivants →</button> : null}</div>

        <div style={{ ...box, marginTop: 24 }}>
          <b>Rapport de fin de journée</b>
          <p style={{ color: C.mute, fontSize: 13, margin: "4px 0 8px" }}>Ce que vous avez fait, les clients prometteurs, les difficultés, vos questions.</p>
          <textarea value={report} onChange={e => setReport(e.target.value)} rows={4} style={input} />
          <button onClick={sendReport} disabled={busy === "rep" || report.trim().length < 10} style={{ ...btn(C.brand), marginTop: 8 }}>Envoyer mon rapport</button>
        </div>
      </>}
      </>}
    </div>
  </main>;
}
