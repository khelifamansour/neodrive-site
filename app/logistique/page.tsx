"use client";
import { useEffect, useMemo, useState } from "react";
import s from "../planificateur/planif.module.css";

type Partner = { id: number; zone: string; name: string; city: string | null; services: string | null; phone: string | null; email: string | null; website: string | null; note: string | null; status: string; price_note: string | null; email_sent_at: string | null; sms_sent_at: string | null };

const STATUSES = ["à contacter", "contacté", "a répondu", "devis reçu", "retenu", "pas intéressé"];
const DEFAULT_SUBJECT = "Recherche prestataire : dépotage de conteneurs et stockage de véhicules (NeoDrive)";
const DEFAULT_EMAIL = `Bonjour,

Je suis Mansour Khelifa, dirigeant de NeoDrive (MK HOLDING, Muret – 31). Nous importons des voitures sans permis électriques neuves (quadricycles légers d'environ 2,5 m et 500 kg), qui arrivent en conteneurs 40' HC.

Nous recherchons un prestataire en région parisienne (ou sur l'axe Le Havre – Paris) et dans le Sud (Fos-sur-Mer / Marseille) pour :
- le dépotage des conteneurs (déchargement des véhicules) ;
- le stockage des véhicules de 1 à 3 mois (parc sécurisé extérieur ou couvert) ;
- le chargement sur porte-voitures ou remorque lors des enlèvements.

Volume : plusieurs conteneurs par mois, de 20 à 30 véhicules par conteneur.

Ce service entre-t-il dans votre activité ? Si oui, pourriez-vous nous indiquer vos tarifs (dépotage par conteneur, stockage par véhicule et par mois, manutention à la sortie) ?

Merci d'avance pour votre retour.

Mansour Khelifa
NeoDrive – MK HOLDING
06 28 26 14 46 – www.easydrive-auto.fr`;
const DEFAULT_SMS = "Bonjour, NeoDrive (voitures sans permis) recherche un prestataire pour le dépotage de conteneurs 40' et le stockage de véhicules (1 à 3 mois). Pouvez-vous nous faire une offre ? Contact : 06 28 26 14 46 ou contact.neodrivefrance@gmail.com Merci, Mansour Khelifa";

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR") : "";
const isMobile = (p: string | null) => !!p && /^(\+33|0033|0)\s?[67]/.test(p.replace(/[\s.]/g, ""));

export default function LogistiquePage() {
  const [code, setCode] = useState(""); const [authed, setAuthed] = useState(false);
  const [list, setList] = useState<Partner[]>([]); const [zone, setZone] = useState("Tous");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [subject, setSubject] = useState(DEFAULT_SUBJECT); const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL); const [smsBody, setSmsBody] = useState(DEFAULT_SMS);
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState(""); const [results, setResults] = useState<{ name: string; email?: string; sms?: string }[]>([]);
  const api = async (body: object, pc = code) => { const r = await fetch("/api/logistique", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: pc, ...body }) }); const j = await r.json().catch(() => ({ ok: false, error: "Erreur" })); if (!r.ok || !j.ok) throw new Error(j.error || "Erreur"); return j; };
  const load = async (pc = code) => { setBusy("load"); setMsg(""); try { const j = await api({ action: "list" }, pc); setList(j.partners || []); setAuthed(true); try { sessionStorage.setItem("nd_pc", pc) } catch { } } catch (e) { setMsg((e as Error).message) } finally { setBusy("") } };
  useEffect(() => { try { const pc = sessionStorage.getItem("nd_pc"); if (pc) { setCode(pc); load(pc); } } catch { } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shown = useMemo(() => list.filter(p => zone === "Tous" || p.zone === zone), [list, zone]);
  const toggle = (id: number) => setSel(x => { const n = new Set(x); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const update = async (id: number, patch: Partial<Partner>) => { setList(l => l.map(p => p.id === id ? { ...p, ...patch } : p)); try { await api({ action: "update", id, patch }); } catch (e) { setMsg((e as Error).message) } };
  const smsLen = smsBody.length + (smsBody.match(/€/g) || []).length;
  const chosen = list.filter(p => sel.has(p.id));
  const nbMail = chosen.filter(p => p.email && !p.email_sent_at).length; const nbSms = chosen.filter(p => isMobile(p.phone) && !p.sms_sent_at).length;
  const send = async () => {
    if (!chosen.length) return;
    if (!confirm(`Envoyer ${nbMail} e-mail(s) et ${nbSms} SMS ? (les prestataires déjà contactés sont ignorés)`)) return;
    setBusy("send"); setMsg(""); try { const j = await api({ action: "send", ids: [...sel], subject, emailBody, smsBody }); setResults(j.results || []); setSel(new Set()); await load(); setMsg("✅ Envoi terminé."); } catch (e) { setMsg((e as Error).message) } finally { setBusy("") }
  };

  if (!authed) return <main className={s.page}><form className={s.login} onSubmit={e => { e.preventDefault(); load(); }}><span className={s.logo}>N</span><h1>Logistique</h1><p>Code d’accès NeoDrive (le même que l’ERP).</p><input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="Code" autoFocus /><button disabled={busy === "load"}>{busy === "load" ? "…" : "Entrer"}</button>{msg ? <p style={{ color: "#b91c1c" }}>{msg}</p> : null}</form></main>;

  const count = (z: string) => list.filter(p => z === "Tous" || p.zone === z).length;
  return <main className={s.page}>
    <div className={s.top}><div><h1>🚚 Logistique</h1><p>Dépotage, stockage et chargement des voitures : prestataires et demandes de devis.</p></div><a className={s.ghost} href="/pilotage">Pilotage</a></div>

    <section className={s.card}>
      <div className={s.seg}>{["Tous", "Nord", "Sud"].map(z => <button key={z} className={zone === z ? s.on : ""} onClick={() => setZone(z)}>{z} ({count(z)})</button>)}
        <button onClick={() => setSel(new Set(shown.filter(p => p.status === "à contacter").map(p => p.id)))}>Sélectionner « à contacter »</button>
        <button onClick={() => setSel(new Set())}>Tout désélectionner</button></div>
      <p className={s.muted}>{list.filter(p => p.email).length} avec e-mail · {list.filter(p => isMobile(p.phone)).length} avec un portable (SMS) · {list.filter(p => p.status !== "à contacter").length} déjà contactés</p>
      {shown.map(p => <article key={p.id} style={{ border: "1px solid #ece6dd", borderRadius: 14, padding: 12, display: "grid", gap: 6, background: sel.has(p.id) ? "#fff7ed" : "#fff" }}>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontWeight: 900 }}><input type="checkbox" style={{ width: 20, marginTop: 3 }} checked={sel.has(p.id)} onChange={() => toggle(p.id)} /><span>{p.name}<br /><small style={{ fontWeight: 600, color: "#7a8594" }}>{p.zone} · {p.city || "?"} · {p.services || ""}</small></span></label>
        <div style={{ fontSize: 14, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {p.phone ? <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>📞 {p.phone}</a> : null}
          {p.email ? <a href={`mailto:${p.email}`}>✉️ {p.email}</a> : null}
          {p.website ? <a href={p.website} target="_blank" rel="noreferrer">🌐 site</a> : null}
          {p.email_sent_at ? <span>📨 e-mail le {fmt(p.email_sent_at)}</span> : null}{p.sms_sent_at ? <span>💬 SMS le {fmt(p.sms_sent_at)}</span> : null}
        </div>
        {p.note ? <small style={{ color: "#5b6573" }}>{p.note}</small> : null}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <select value={p.status} onChange={e => update(p.id, { status: e.target.value })}>{STATUSES.map(x => <option key={x}>{x}</option>)}</select>
          <input defaultValue={p.price_note || ""} placeholder="Prix proposé, remarques…" onBlur={e => e.target.value !== (p.price_note || "") && update(p.id, { price_note: e.target.value })} />
        </div>
      </article>)}
    </section>

    <section className={s.card}>
      <h2>✉️ Demande de devis groupée ({sel.size} sélectionné{sel.size > 1 ? "s" : ""})</h2>
      <label className={s.field}>Objet de l’e-mail<input value={subject} onChange={e => setSubject(e.target.value)} /></label>
      <label className={s.field}>Texte de l’e-mail<textarea rows={16} value={emailBody} onChange={e => setEmailBody(e.target.value)} style={{ font: "inherit", fontSize: 15, padding: 12, borderRadius: 12, border: "1px solid #d4d7db" }} /></label>
      <label className={s.field}>Texte du SMS (portables uniquement) · {smsLen}/306 caractères<textarea rows={4} value={smsBody} onChange={e => setSmsBody(e.target.value)} style={{ font: "inherit", fontSize: 15, padding: 12, borderRadius: 12, border: "1px solid #d4d7db" }} /></label>
      <p className={s.muted}>Les réponses aux e-mails arrivent sur contact.neodrivefrance@gmail.com. Un prestataire déjà contacté ne reçoit jamais deux fois le même envoi.</p>
      <button className={s.primary} disabled={!sel.size || busy === "send" || smsLen > 306} onClick={send}>{busy === "send" ? "Envoi en cours…" : `Envoyer : ${nbMail} e-mail(s) + ${nbSms} SMS`}</button>
      {msg ? <p>{msg}</p> : null}
      {results.length ? <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{results.map(r => <li key={r.name}><b>{r.name}</b> : e-mail {r.email || "—"} · SMS {r.sms || "—"}</li>)}</ul> : null}
    </section>
  </main>;
}
