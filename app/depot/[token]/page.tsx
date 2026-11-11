"use client";
import { use, useEffect, useState } from "react";
import s from "../../planificateur/planif.module.css";
import { DOC_TYPES } from "../../../lib/shipments";

type Doc = { doc_type: string; version: string; file_name: string; created_at: string; uploaded_by: string };

export default function Depot({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [ship, setShip] = useState<Record<string, any> | null>(null); const [docs, setDocs] = useState<Doc[]>([]); const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const load = async () => { const r = await fetch(`/api/conteneurs/depot?t=${token}`); const j = await r.json().catch(() => null); if (j?.ok) { setShip(j.ship); setDocs(j.docs || []); } else setErr("Lien invalide / Invalid link / 链接无效"); };
  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(""); const fd = new FormData(e.currentTarget); fd.append("t", token);
    const r = await fetch("/api/conteneurs/depot", { method: "POST", body: fd }); const j = await r.json().catch(() => null);
    setBusy(false); if (j?.ok) { setMsg(`✅ ${j.saved.length} document(s) reçu(s) / received / 已收到`); (e.target as HTMLFormElement).reset(); load(); } else setMsg("❌ Erreur / Error / 错误");
  }
  if (err) return <main className={s.page}><h1>{err}</h1></main>;
  if (!ship) return <main className={s.page}><p>…</p></main>;
  return <main className={s.page}>
    <div className={s.top}><div><h1>📦 {ship.name}</h1><p>MK HOLDING – NeoDrive · {ship.port || ""} · B/L {ship.bl_number || "—"} · {ship.containers || ""}</p></div></div>
    <section className={s.card}>
      <h2>Déposer des documents · Upload documents · 上传文件</h2>
      <p className={s.muted}>Factures, listes de colisage avec numéros de série (VIN), COC, connaissement, facture de transport… / Invoices, packing lists with VIN numbers, COC, B/L, freight invoice… / 发票、含车架号的装箱单、COC、提单、运费发票…</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label className={s.field}>Votre nom / Your name / 您的名字<input name="who" placeholder="Factory / Transitaire…" /></label>
        <label className={s.field}>Type<select name="doc_type" defaultValue="autre">{DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.key === "autre" ? "Classement automatique / Auto / 自动分类" : `${d.fr} / ${d.en} / ${d.zh}`}</option>)}</select></label>
        <label className={s.field}>Version<select name="version" defaultValue="originale"><option value="originale">Originale / Original / 原始</option><option value="corrigée">Corrigée / Corrected / 修改版</option></select></label>
        <label className={s.field}>Fichiers / Files / 文件<input type="file" name="files" multiple required accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx" /></label>
        <button className={s.primary} disabled={busy}>{busy ? "…" : "Envoyer / Upload / 上传"}</button>
        {msg ? <p>{msg}</p> : null}
      </form>
    </section>
    <section className={s.card}>
      <h2>Documents reçus · Received · 已收到 ({docs.length})</h2>
      {DOC_TYPES.map(t => { const list = docs.filter(d => d.doc_type === t.key); return <div key={t.key} style={{ fontSize: 14 }}><b>{list.length ? "✅" : t.required ? "❌" : "◻️"} {t.fr} / {t.en} / {t.zh}</b>{list.map((d, i) => <div key={i} style={{ paddingLeft: 24, color: "#5b6573" }}>{d.file_name} · {d.version} · {new Date(d.created_at).toLocaleDateString("fr-FR")}</div>)}</div>; })}
    </section>
  </main>;
}
