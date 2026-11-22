"use client";
import { useEffect, useState } from "react";

/* Rappel rapide : un appel arrive sur le téléphone du fondateur → il le confie à un membre de l'équipe en 10 secondes. */
type Member = { id: number; name: string; role: string; hasPhone: boolean };
type Item = { id: number; nom: string; tel: string; rappel: string; pour: string; statut: string; phase: string; fait: boolean };
const C = { orange: "#f05a28", bg: "#f6f4f0", mute: "#666", line: "#e5e0d8" };
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "12px 12px", fontSize: 17, border: `1px solid ${C.line}`, borderRadius: 10, background: "#fff" };
const chip = (on: boolean): React.CSSProperties => ({ padding: "10px 12px", borderRadius: 999, border: `1px solid ${on ? C.orange : C.line}`, background: on ? "#fff1ea" : "#fff", color: on ? "#b4410f" : "#222", fontWeight: 700, fontSize: 15 });

function parisNowParts() {
  const f = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, wd: p.weekday };
}
/** Date (heure de Paris) → ISO. */
function parisToIso(y: number, m: number, d: number, h: number, min: number) {
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const off = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Paris" })).getTime() - new Date(guess.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(guess.getTime() - off).toISOString();
}
const CHOICES = [
  { k: "now", label: "Dès que possible" },
  { k: "1h", label: "Dans 1 h" },
  { k: "soir", label: "Ce soir 18 h" },
  { k: "demain", label: "Demain 11 h" },
  { k: "autre", label: "Autre…" },
] as const;
function whenIso(k: string, custom: string) {
  const n = parisNowParts();
  if (k === "now") return new Date(Date.now() + 5 * 60e3).toISOString();
  if (k === "1h") return new Date(Date.now() + 3600e3).toISOString();
  if (k === "soir") return parisToIso(n.y, n.m, n.d, 18, 0);
  if (k === "demain") { const t = new Date(Date.UTC(n.y, n.m - 1, n.d + 1)); return parisToIso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), 11, 0); }
  if (custom) { const [dt, tm] = custom.split("T"); const [y, m, d] = dt.split("-").map(Number); const [h, mi] = (tm || "11:00").split(":").map(Number); return parisToIso(y, m, d, h, mi); }
  return "";
}
const dt = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Rappel() {
  const [pc, setPc] = useState(""); const [authed, setAuthed] = useState<boolean | null>(null); const [code, setCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]); const [items, setItems] = useState<Item[]>([]);
  const [tel, setTel] = useState(""); const [nom, setNom] = useState(""); const [note, setNote] = useState("");
  const [origine, setOrigine] = useState("Appel manqué"); const [who, setWho] = useState<number>(0);
  const [when, setWhen] = useState("now"); const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const api = async (p: string, body: Record<string, unknown>) => {
    const r = await fetch("/api/rappel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: p, ...body }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Erreur réseau" }));
    if (r.status === 401) throw Object.assign(new Error("Code incorrect"), { auth: true });
    if (!j.ok) throw new Error(j.error || "Erreur"); return j;
  };
  const load = async (p: string) => {
    try {
      const [a, b] = await Promise.all([api(p, { action: "members" }), api(p, { action: "list" })]);
      setMembers(a.members); setItems(b.items);
      setWho(w => w || (a.members.find((m: Member) => m.role === "closer")?.id ?? 0)); return true;
    } catch (e: any) { if (e.auth) return false; setErr(e.message); return true; }
  };
  useEffect(() => {
    const q = new URLSearchParams(location.search); if (q.get("tel")) setTel(q.get("tel") || "");
    (async () => { let p = ""; try { p = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ } setPc(p); setAuthed(await load(p)); })();
  }, []);

  const login = async (e: React.FormEvent) => { e.preventDefault(); const c = code.trim(); if (await load(c)) { try { sessionStorage.setItem("nd_pc", c); } catch { /* privé */ } setPc(c); setAuthed(true); } else setErr("Code incorrect."); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setErr("");
    const w = whenIso(when, custom); if (!w) { setErr("Choisissez l'heure du rappel."); return; }
    setBusy(true);
    try {
      const j = await api(pc, { action: "create", phone: tel, nom, note, origine, member_id: who || null, when: w });
      const m = members.find(x => x.id === who);
      setMsg(`✅ ${j.existing ? "Fiche existante mise à jour" : "Nouveau contact créé"}${m ? `, confié à ${m.name} pour ${dt(w)}` : ""}. Notification : ${j.notified}.`);
      setTel(""); setNom(""); setNote(""); setWhen("now"); setCustom(""); await load(pc);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#141414" }}><div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 80px" }}>
    <p style={{ margin: 0 }}><a href="/organisation" style={{ color: C.orange, fontWeight: 700, textDecoration: "none" }}>← Organisation</a></p>
    <h1 style={{ fontSize: 26, margin: "6px 0 4px" }}>📞 Rappel rapide</h1>
    <p style={{ color: C.mute, margin: "0 0 14px", lineHeight: 1.45 }}>Un client vous a appelé ? Confiez-le en 10 secondes : il est ajouté au CRM et la personne de l'équipe est prévenue par SMS.</p>{children}</div></main>;

  if (authed === null) return Shell({ children: <p style={{ color: C.mute }}>Chargement…</p> });
  if (!authed) return Shell({ children: <form onSubmit={login} style={card}><label style={{ fontWeight: 700 }}>Code d'accès<input type="password" value={code} onChange={e => setCode(e.target.value)} style={{ ...input, marginTop: 6 }} autoFocus /></label><button style={{ marginTop: 10, width: "100%", padding: 14, borderRadius: 12, border: 0, background: C.orange, color: "#fff", fontWeight: 800, fontSize: 16 }}>Se connecter</button>{err ? <p style={{ color: "#b91c1c" }}>{err}</p> : null}</form> });

  return Shell({ children: <>
    <form onSubmit={submit} style={{ ...card, display: "grid", gap: 12 }}>
      <label style={{ fontWeight: 700 }}>Numéro du client<input type="tel" inputMode="tel" required value={tel} onChange={e => setTel(e.target.value)} placeholder="06 12 34 56 78" style={{ ...input, marginTop: 6 }} /></label>
      <label style={{ fontWeight: 700 }}>Nom <span style={{ color: C.mute, fontWeight: 400 }}>(facultatif)</span><input value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex. M. Martin" style={{ ...input, marginTop: 6 }} /></label>
      <div><b>Origine</b><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{["Appel manqué", "Appel reçu", "Message reçu"].map(o => <button type="button" key={o} onClick={() => setOrigine(o)} style={chip(origine === o)}>{o}</button>)}</div></div>
      <div><b>Rappeler quand ?</b><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{CHOICES.map(c => <button type="button" key={c.k} onClick={() => setWhen(c.k)} style={chip(when === c.k)}>{c.label}</button>)}</div>
        {when === "autre" ? <input type="datetime-local" value={custom} onChange={e => setCustom(e.target.value)} style={{ ...input, marginTop: 8 }} /> : null}</div>
      <div><b>Confier à</b><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{members.map(m => <button type="button" key={m.id} onClick={() => setWho(m.id)} style={chip(who === m.id)}>{m.name}{m.hasPhone ? "" : " (pas de SMS)"}</button>)}<button type="button" onClick={() => setWho(0)} style={chip(who === 0)}>Moi-même</button></div></div>
      <label style={{ fontWeight: 700 }}>Note <span style={{ color: C.mute, fontWeight: 400 }}>(facultatif)</span><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ex. veut la Confort, livraison Bordeaux, rappeler après 18 h" style={{ ...input, marginTop: 6, fontSize: 16 }} /></label>
      <button disabled={busy} style={{ padding: 15, borderRadius: 12, border: 0, background: C.orange, color: "#fff", fontWeight: 800, fontSize: 17 }}>{busy ? "Envoi…" : "Ajouter au CRM et prévenir"}</button>
      {msg ? <p style={{ color: "#166534", margin: 0 }}>{msg}</p> : null}{err ? <p style={{ color: "#b91c1c", margin: 0 }}>{err}</p> : null}
    </form>
    <h2 style={{ fontSize: 18, margin: "20px 0 8px" }}>Rappels des 3 derniers jours</h2>
    <div style={{ display: "grid", gap: 8 }}>{items.length ? items.map(i => <div key={i.id} style={{ ...card, padding: 12, display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span><b>{i.nom || "Client"}</b><br /><span style={{ color: C.mute, fontSize: 14 }}>{i.tel} · pour {i.pour} · {i.phase || i.statut}</span></span>
      <span style={{ textAlign: "right", fontSize: 14, whiteSpace: "nowrap" }}>⏰ {dt(i.rappel)}<br />{i.fait ? <span style={{ color: "#166534", fontWeight: 700 }}>✅ rappelé</span> : <span style={{ color: "#b4410f", fontWeight: 700 }}>à faire</span>}</span>
    </div>) : <p style={{ color: C.mute }}>Aucun rappel récent.</p>}</div>
  </> });
}
