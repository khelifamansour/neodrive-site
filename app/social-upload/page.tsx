"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const U = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const K = "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd";
const supabase = createClient(U, K, { auth: { persistSession: false, autoRefreshToken: false } });

type S = { name: string; size: number; state: "waiting" | "uploading" | "done" | "error"; error?: string };
type UploadInfo = { index: number; path?: string; token?: string; type?: string; name?: string; size?: number; error?: string };

function mb(n: number) { return `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} Mo`; }

async function optimiseImage(f: File) {
  if (!f.type.startsWith("image/") || f.size < 2 * 1024 * 1024) return f;
  try {
    const b = await createImageBitmap(f);
    const s = Math.min(1, 1920 / Math.max(b.width, b.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(b.width * s));
    c.height = Math.max(1, Math.round(b.height * s));
    const x = c.getContext("2d");
    if (!x) return f;
    x.drawImage(b, 0, 0, c.width, c.height);
    b.close();
    const z = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return z && z.size < f.size ? new File([z], `${f.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" }) : f;
  } catch { return f; }
}

export default function Page() {
  const [passcode, setPasscode] = useState("");
  const [ctx, setCtx] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<S[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const total = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  async function uploadOne(f: File, info: UploadInfo, n: number) {
    if (info.error || !info.path || !info.token) {
      setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "error", error: info.error || "Upload non préparé" } : x));
      return null;
    }
    setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "uploading" } : x));
    try {
      const { error } = await supabase.storage.from("social-media").uploadToSignedUrl(info.path, info.token, f, { contentType: f.type, cacheControl: "3600" });
      if (error) throw error;
      setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "done" } : x));
      return info;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur d'envoi";
      setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "error", error: message } : x));
      return null;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setLoading(true);
    setStatus("Optimisation des photos…");
    setProgress(files.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));

    try {
      const fs = await Promise.all(files.map(optimiseImage));
      setProgress(fs.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));
      const r = await fetch("/api/social-media/upload-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, files: fs.map((f) => ({ name: f.name, type: f.type, size: f.size })) }),
      });
      const j = await r.json();
      if (!r.ok || !Array.isArray(j.uploads)) throw new Error(j.error || "Préparation impossible");

      let cursor = 0;
      const done: UploadInfo[] = [];
      async function worker() {
        while (true) {
          const n = cursor++;
          if (n >= fs.length) return;
          const result = await uploadOne(fs[n], j.uploads[n] || { index: n, error: "Réponse manquante" }, n);
          if (result) done.push(result);
          setStatus(`Traitement : ${Math.min(cursor, fs.length)}/${fs.length} — ${done.length} envoyé(s)`);
        }
      }
      await Promise.all([worker(), worker(), worker()]);

      if (done.length) {
        const rr = await fetch("/api/social-media/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode, batchContext: ctx, items: done }),
        });
        const jj = await rr.json();
        if (!rr.ok || !jj.ok) throw new Error(jj.error || "Enregistrement incomplet");
      }

      const failed = fs.length - done.length;
      setStatus(`✅ ${done.length} média(s) ajouté(s)${failed ? ` · ❌ ${failed} fichier(s) à réessayer séparément` : ""}.`);
      if (!failed) { setFiles([]); setCtx(""); }
    } catch (e) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally { setLoading(false); }
  }

  async function publishNow() {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; }
    setPublishing(true);
    setStatus("Publication Instagram en cours…");
    try {
      const r = await fetch("/api/instagram/publish-next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Publication impossible");
      setStatus(j.published ? `✅ Publié sur Instagram — ${j.mediaId}` : `ℹ️ ${j.reason || "Aucun post à publier"}`);
    } catch (e) { setStatus(`❌ ${e instanceof Error ? e.message : "Erreur"}`); }
    finally { setPublishing(false); }
  }

  return <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 18px 60px", fontFamily: "Arial,sans-serif" }}>
    <h1>Bibliothèque sociale NeoDrive</h1>
    <p>Ajoute tes vraies photos et vidéos en lot. Un fichier en erreur ne bloque plus les autres. Les vidéos peuvent aller jusqu’à 500 Mo côté bibliothèque.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 28 }}>
      <label>Code d’accès<input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required style={input} /></label>
      <label>Photos et vidéos<input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={(e) => setFiles(Array.from(e.target.files || []))} style={input} /></label>
      {files.length > 0 && <div><strong>{files.length} fichier(s)</strong> — {mb(total)}</div>}
      <label>Note globale facultative<textarea value={ctx} onChange={(e) => setCtx(e.target.value)} rows={3} placeholder="Ex. livraisons, essais, intérieur et voitures en préparation cette semaine" style={input} /></label>
      <button disabled={loading || !files.length} style={button}>{loading ? "Envoi en cours…" : `Envoyer ${files.length || "les"} média(s)`}</button>
    </form>

    {progress.length > 0 && <div style={{ marginTop: 18, display: "grid", gap: 7 }}>{progress.map((p, i) => <div key={i} style={{ fontSize: 14 }}>{p.state === "done" ? "✅" : p.state === "uploading" ? "⏳" : p.state === "error" ? "❌" : "•"} {p.name} <span style={{ color: "#777" }}>({mb(p.size)})</span>{p.error && <span style={{ color: "#b00020" }}> — {p.error}</span>}</div>)}</div>}

    <hr style={{ margin: "32px 0" }} />
    <h2>Publication supplémentaire</h2>
    <p>L’automatisation continue à publier seule. Utilise ce bouton seulement quand tu veux ajouter une publication immédiatement.</p>
    <button onClick={publishNow} disabled={publishing} style={button}>{publishing ? "Publication en cours…" : "Publier maintenant sur Instagram"}</button>
    {status && <p style={{ fontWeight: 700, marginTop: 18 }}>{status}</p>}
  </main>;
}

const input: React.CSSProperties = { padding: 13, border: "1px solid #ccc", borderRadius: 10, fontSize: 16, width: "100%", boxSizing: "border-box", display: "block", marginTop: 7 };
const button: React.CSSProperties = { padding: "15px 18px", border: 0, borderRadius: 12, background: "#111", color: "white", fontSize: 17, fontWeight: 800, cursor: "pointer" };
