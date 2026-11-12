"use client";
import { use, useEffect, useState } from "react";

type Doc = { title: string; intro: string; sections: { title: string; items: string[] }[] };
const wrap: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "28px 16px 60px", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#111", lineHeight: 1.6 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e7e2da", borderRadius: 16, padding: 18, margin: "14px 0" };

export default function Offre({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [doc, setDoc] = useState<Doc | null>(null); const [info, setInfo] = useState<{ status?: string; signed_at?: string; signature_name?: string; name?: string }>({}); const [err, setErr] = useState("");
  const [name, setName] = useState(""); const [accept, setAccept] = useState(false); const [busy, setBusy] = useState(false); const [refusing, setRefusing] = useState(false); const [reason, setReason] = useState("");
  const load = () => fetch(`/api/offres?t=${token}`).then(r => r.json()).then(j => { if (j.ok) { setDoc(j.doc); setInfo(j); } else setErr(j.error || "Offre introuvable."); }).catch(() => setErr("Connexion impossible, réessayez."));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (action: "sign" | "refuse") => { setBusy(true); setErr(""); const r = await fetch("/api/offres", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, action, name, accept, reason }) }).catch(() => null); const j = await r?.json().catch(() => null); setBusy(false); if (j?.ok) load(); else setErr(j?.error || "Envoi impossible, vérifiez votre connexion et réessayez."); };

  return <main style={{ background: "#f7f4ef", minHeight: "100vh" }}><div style={wrap}>
    <div style={{ fontWeight: 900, fontSize: 22 }}>NeoDrive</div>
    {err && !doc ? <p style={{ color: "#b91c1c" }}>{err}</p> : null}
    {!doc ? (err ? null : <p>Chargement…</p>) : <>
      <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: "14px 0 6px" }}>{doc.title}</h1>
      <p>{doc.intro}</p>
      {doc.sections.map(s => <section key={s.title} style={card}><h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{s.title}</h2><ul style={{ margin: 0, paddingLeft: 20 }}>{s.items.map(i => <li key={i}>{i}</li>)}</ul></section>)}
      {info.status === "signée" ? <section style={{ ...card, background: "#f0fdf4", borderColor: "#86efac" }}><b>✅ Offre acceptée</b><p style={{ margin: "6px 0 0" }}>Signée par « {info.signature_name} » le {info.signed_at ? new Date(info.signed_at).toLocaleString("fr-FR") : ""}. Merci, nous vous contactons très vite pour la suite.</p></section>
      : info.status === "refusée" ? <section style={card}><b>Vous avez décliné cette offre.</b> Merci pour votre réponse.</section>
      : <section style={{ ...card, borderColor: "#f05a28" }}>
        <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>Accepter l'offre</h2>
        <label style={{ display: "grid", gap: 6, fontWeight: 600 }}>Votre nom et prénom (signature)<input value={name} onChange={e => setName(e.target.value)} placeholder="Prénom Nom" style={{ padding: 12, borderRadius: 10, border: "1px solid #d4d7db", font: "inherit" }} /></label>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "12px 0" }}><input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} style={{ marginTop: 5 }} /><span>J'ai lu cette proposition de mission et je l'accepte. Ma signature électronique (nom saisi, date et adresse de connexion) est enregistrée par NeoDrive.</span></label>
        {err ? <p style={{ color: "#b91c1c" }}>{err}</p> : null}
        <button disabled={busy || !accept || name.trim().length < 4} onClick={() => act("sign")} style={{ width: "100%", padding: 14, borderRadius: 12, border: 0, background: "#f05a28", color: "#fff", fontWeight: 800, fontSize: 16, opacity: busy || !accept || name.trim().length < 4 ? 0.5 : 1 }}>{busy ? "Envoi…" : "✍️ Signer et accepter l'offre"}</button>
        {!refusing ? <button onClick={() => setRefusing(true)} style={{ marginTop: 10, background: "none", border: 0, color: "#6b7280", textDecoration: "underline" }}>Je ne souhaite pas accepter</button>
        : <div style={{ marginTop: 10, display: "grid", gap: 8 }}><textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Pouvez-vous nous dire pourquoi ? (facultatif)" rows={3} style={{ padding: 10, borderRadius: 10, border: "1px solid #d4d7db", font: "inherit" }} /><button disabled={busy} onClick={() => act("refuse")} style={{ padding: 10, borderRadius: 10, border: "1px solid #d4d7db", background: "#fff" }}>Décliner l'offre</button></div>}
      </section>}
      <p style={{ fontSize: 13, color: "#6b7280" }}>Une question ? Contactez Mansour Khelifa, NeoDrive – MK HOLDING.</p>
    </>}
  </div></main>;
}
