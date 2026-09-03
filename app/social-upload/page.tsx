"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const U = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const K = "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd";
const supabase = createClient(U, K, { auth: { persistSession: false, autoRefreshToken: false } });

type State = "waiting" | "uploading" | "done" | "error";
type S = { name: string; size: number; state: State; error?: string };
type UploadInfo = { index: number; path?: string; token?: string; type?: string; name?: string; size?: number; error?: string };

function mb(n: number) {
  return `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} Mo`;
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function optimiseImage(f: File) {
  if (!f.type.startsWith("image/")) return f;
  if (f.type === "image/jpeg" && f.size < 2 * 1024 * 1024) return f;
  try {
    const bitmap = await createImageBitmap(f);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
    return blob ? new File([blob], `${f.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

export default function Page() {
  const [passcode, setPasscode] = useState("");
  const [ctx, setCtx] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<S[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [videoAction, setVideoAction] = useState<"create" | "instagram" | "facebook" | "tiktok" | "tiktok-connect" | null>(null);
  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const [latestTheme, setLatestTheme] = useState<string | null>(null);
  const [tiktokConnected, setTiktokConnected] = useState<boolean | null>(null);
  const [seoTopic, setSeoTopic] = useState("");
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoArticle, setSeoArticle] = useState<{ title: string; url: string } | null>(null);
  const total = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  async function uploadOne(file: File, info: UploadInfo, index: number) {
    if (info.error || !info.path || !info.token) {
      setProgress((p) => p.map((x, k) => k === index ? { ...x, state: "error", error: info.error || "Upload non préparé" } : x));
      return null;
    }

    setProgress((p) => p.map((x, k) => k === index ? { ...x, state: "uploading", error: undefined } : x));

    let lastError = "Erreur d’envoi";
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await supabase.storage
          .from("social-media")
          .uploadToSignedUrl(info.path, info.token, file, {
            contentType: file.type || "application/octet-stream",
            cacheControl: "3600",
          });

        if (!error) {
          setProgress((p) => p.map((x, k) => k === index ? { ...x, state: "done", error: undefined } : x));
          return info;
        }

        const text = error.message || String(error);
        // If the network lost the response after Supabase had already completed the upload,
        // the retry can answer "already exists". In that case the file is in storage.
        if (/already exists|resource already exists|duplicate/i.test(text)) {
          setProgress((p) => p.map((x, k) => k === index ? { ...x, state: "done", error: undefined } : x));
          return info;
        }
        lastError = text;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Connexion interrompue";
      }

      if (attempt < 3) {
        setStatus(`Connexion instable : nouvelle tentative ${attempt + 1}/3 pour ${file.name}…`);
        await sleep(attempt * 1600);
      }
    }

    setProgress((p) => p.map((x, k) => k === index ? { ...x, state: "error", error: lastError } : x));
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setLoading(true);
    setStatus("Préparation des médias…");
    setProgress(files.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));

    try {
      const fs = await Promise.all(files.map(optimiseImage));
      setProgress(fs.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));

      const prep = await fetch("/api/social-media/upload-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, files: fs.map((f) => ({ name: f.name, type: f.type, size: f.size })) }),
      });
      const prepared = await prep.json();
      if (!prep.ok || !Array.isArray(prepared.uploads)) throw new Error(prepared.error || "Préparation impossible");

      const done: UploadInfo[] = [];
      // Important: one file at a time. It avoids saturating a mobile/4G connection.
      for (let i = 0; i < fs.length; i++) {
        setStatus(`Envoi ${i + 1}/${fs.length} — ${fs[i].name}…`);
        const result = await uploadOne(fs[i], prepared.uploads[i] || { index: i, error: "Réponse manquante" }, i);
        if (result) done.push(result);
      }

      if (done.length) {
        const reg = await fetch("/api/social-media/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passcode, batchContext: ctx, items: done }),
        });
        const registered = await reg.json();
        if (!reg.ok || !registered.ok) throw new Error(registered.error || "Enregistrement incomplet");
      }

      const failed = fs.length - done.length;
      setStatus(`✅ ${done.length} média(s) ajouté(s)${failed ? ` · ❌ ${failed} non envoyé(s)` : ""}.`);
      if (!failed) { setFiles([]); setCtx(""); }
    } catch (e) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setLoading(false);
    }
  }

  async function publishNow(platform: "instagram" | "facebook") {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; }
    setPublishing(platform);
    setStatus(`Publication d’un média réel récent sur ${platform === "instagram" ? "Instagram" : "Facebook"}…`);
    try {
      const r = await fetch(`/api/${platform}/publish-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Publication impossible");
      setStatus(j.published ? `✅ Média publié sur ${platform === "instagram" ? "Instagram" : "Facebook"}.` : `ℹ️ ${j.reason || "Aucun média récent à publier"}`);
    } catch (e) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setPublishing(null);
    }
  }

  async function createVideoNow() {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; }
    setVideoAction("create"); setLatestJobId(null); setLatestTheme(null); setStatus("🎬 Création du Reel…");
    try {
      const r = await fetch("/api/video/manual-create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || j.reason || "Création impossible");
      setLatestJobId(j.jobId || null); setLatestTheme(j.theme || null);
      setStatus(`✅ Reel prêt${j.theme ? ` — ${j.theme}` : ""}.`);
    } catch (e) { setStatus(`❌ ${e instanceof Error ? e.message : "Erreur vidéo"}`); }
    finally { setVideoAction(null); }
  }

  async function publishReel(platform: "instagram" | "facebook") {
    if (!passcode || !latestJobId) { setStatus("❌ Crée d’abord un nouveau Reel."); return; }
    setVideoAction(platform); setStatus(`⏳ Envoi du Reel vers ${platform}…`);
    try {
      const r = await fetch("/api/video/publish-latest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, jobId: latestJobId, platform }) });
      const j = await r.json();
      const p = platform === "instagram" ? j.instagram : j.facebook;
      if ((!r.ok && r.status !== 207) || !p?.published) throw new Error(p?.error || j.error || "Publication vidéo impossible");
      setStatus(`✅ Reel ${j.theme || latestTheme || "NeoDrive"} publié sur ${platform}.`);
    } catch (e) { setStatus(`❌ ${e instanceof Error ? e.message : "Erreur publication vidéo"}`); }
    finally { setVideoAction(null); }
  }

  async function connectTikTok() {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; }
    setVideoAction("tiktok-connect");
    try {
      const r = await fetch("/api/tiktok/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
      const j = await r.json();
      if (!r.ok || !j.authorizationUrl) throw new Error(j.error || "Connexion TikTok impossible");
      window.location.href = j.authorizationUrl;
    } catch (e) { setStatus(`❌ TikTok : ${e instanceof Error ? e.message : "Erreur"}`); setVideoAction(null); }
  }

  async function checkTikTok() {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; }
    try {
      const r = await fetch("/api/tiktok/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Statut TikTok impossible");
      setTiktokConnected(!!j.connected); setStatus(j.connected ? "✅ TikTok connecté." : "ℹ️ TikTok non connecté.");
    } catch (e) { setStatus(`❌ ${e instanceof Error ? e.message : "Erreur TikTok"}`); }
  }

  async function publishTikTok() {
    if (!passcode || !latestJobId) { setStatus("❌ Crée d’abord un nouveau Reel."); return; }
    setVideoAction("tiktok");
    try {
      const r = await fetch("/api/tiktok/publish-reel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, jobId: latestJobId }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Upload TikTok impossible");
      setTiktokConnected(true); setStatus(`✅ ${j.note || "Reel envoyé à TikTok."}`);
    } catch (e) { setStatus(`❌ TikTok : ${e instanceof Error ? e.message : "Erreur"}`); }
    finally { setVideoAction(null); }
  }

  async function createSeoArticle() {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; }
    setSeoLoading(true); setSeoArticle(null); setStatus("📝 Rédaction de l’article…");
    try {
      const r = await fetch("/api/seo/manual-publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, topic: seoTopic }) });
      const j = await r.json();
      if (!r.ok || !j.ok || !j.article?.slug) throw new Error(typeof j.error === "string" ? j.error : "Impossible de créer l’article SEO");
      const url = j.url || `https://www.easydrive-auto.fr/blog/${j.article.slug}`;
      setSeoArticle({ title: j.article.title || "Article NeoDrive", url });
      setStatus(`✅ Article publié : ${j.article.title || "NeoDrive"}`);
    } catch (e) { setStatus(`❌ SEO : ${e instanceof Error ? e.message : "Erreur"}`); }
    finally { setSeoLoading(false); }
  }

  return <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 18px 60px", fontFamily: "Arial,sans-serif" }}>
    <h1>Bibliothèque sociale NeoDrive</h1>
    <p>Ajoute tes vraies photos et vidéos. Elles deviennent la source prioritaire des publications Facebook et Instagram.</p>
    <div style={{ padding: 13, borderRadius: 10, background: "#fff7df", border: "1px solid #f0d484", fontSize: 14, lineHeight: 1.45 }}>
      <strong>Important :</strong> les fichiers sont maintenant envoyés avec le mécanisme d’upload signé officiel de Supabase, un par un. Sur l’offre actuelle, les vidéos de plus de 49 Mo restent refusées.
    </div>

    <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 22 }}>
      <label>Code d’accès<input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required style={input} /></label>
      <label>Photos et vidéos<input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={(e) => setFiles(Array.from(e.target.files || []))} style={input} /></label>
      {files.length > 0 && <div><strong>{files.length} fichier(s)</strong> — {mb(total)}</div>}
      <label>Note globale facultative<textarea value={ctx} onChange={(e) => setCtx(e.target.value)} rows={3} placeholder="Ex. livraison client à Toulouse, essai sur route, détails intérieur…" style={input} /></label>
      <button disabled={loading || !files.length} style={button}>{loading ? "Envoi fiable en cours…" : `Envoyer ${files.length || "les"} média(s)`}</button>
    </form>

    {progress.length > 0 && <div style={{ marginTop: 18, display: "grid", gap: 9 }}>
      {progress.map((p, i) => <div key={i} style={{ fontSize: 14, color: p.state === "error" ? "#b00020" : "#222" }}>
        {p.state === "done" ? "✅" : p.state === "uploading" ? "⏳" : p.state === "error" ? "❌" : "•"} {p.name} <span style={{ color: "#777" }}>({mb(p.size)})</span>{p.error && <span> — {p.error}</span>}
      </div>)}
    </div>}

    <section style={panel}>
      <h2 style={{ marginTop: 0 }}>🎬 Reel manuel</h2>
      <p>Crée volontairement un montage à partir de tes vraies vidéos récentes.</p>
      <button onClick={createVideoNow} disabled={!!videoAction} style={{ ...button, background: "#7c3aed", width: "100%" }}>{videoAction === "create" ? "Création…" : "Créer un nouveau Reel"}</button>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <button onClick={() => publishReel("instagram")} disabled={!!videoAction || !latestJobId} style={{ ...button, background: latestJobId ? "#d62976" : "#777" }}>Publier CE Reel sur Instagram</button>
        <button onClick={() => publishReel("facebook")} disabled={!!videoAction || !latestJobId} style={{ ...button, background: latestJobId ? "#1877f2" : "#777" }}>Publier CE Reel sur Facebook</button>
      </div>
      <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: "#fff", border: "1px solid #ddd" }}>
        <h3 style={{ marginTop: 0 }}>TikTok</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={connectTikTok} disabled={!!videoAction} style={{ ...button, background: "#111" }}>Connecter TikTok</button>
          <button onClick={checkTikTok} disabled={!!videoAction} style={{ ...button, background: "#444" }}>Vérifier</button>
        </div>
        <button onClick={publishTikTok} disabled={!!videoAction || !latestJobId} style={{ ...button, background: latestJobId ? "#fe2c55" : "#777", width: "100%", marginTop: 10 }}>Envoyer CE Reel à TikTok</button>
        {tiktokConnected !== null && <p style={{ fontSize: 13, fontWeight: 700 }}>{tiktokConnected ? "✅ TikTok connecté" : "⚠️ TikTok non connecté"}</p>}
      </div>
    </section>

    <section style={{ ...panel, background: "#eff8ff", border: "1px solid #cfe5ff" }}>
      <h2 style={{ marginTop: 0 }}>📝 Article SEO supplémentaire</h2>
      <label>Thématique de l’article<input value={seoTopic} onChange={(e) => setSeoTopic(e.target.value)} maxLength={240} placeholder="Ex. voiture sans permis à 14 ans…" style={input} /></label>
      <button onClick={createSeoArticle} disabled={seoLoading} style={{ ...button, background: "#1473e6", width: "100%", marginTop: 15 }}>{seoLoading ? "Rédaction…" : "Écrire et publier un article SEO"}</button>
      {seoArticle && <div style={{ marginTop: 15, padding: 14, borderRadius: 12, background: "#fff" }}><strong>✅ {seoArticle.title}</strong><br /><a href={seoArticle.url} target="_blank" rel="noreferrer">Ouvrir l’article →</a></div>}
    </section>

    <hr style={{ margin: "32px 0" }} />
    <h2>Publier un média récent maintenant</h2>
    <p>Ces boutons prennent directement un vrai média récent de la bibliothèque.</p>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <button onClick={() => publishNow("instagram")} disabled={!!publishing} style={button}>{publishing === "instagram" ? "Publication…" : "Publier récent sur Instagram"}</button>
      <button onClick={() => publishNow("facebook")} disabled={!!publishing} style={button}>{publishing === "facebook" ? "Publication…" : "Publier récent sur Facebook"}</button>
    </div>

    {status && <p style={{ fontWeight: 700, marginTop: 18, padding: 14, background: "#f5f5f5", borderRadius: 10 }}>{status}</p>}
  </main>;
}

const input: React.CSSProperties = { padding: 13, border: "1px solid #ccc", borderRadius: 10, fontSize: 16, width: "100%", boxSizing: "border-box", display: "block", marginTop: 7 };
const button: React.CSSProperties = { padding: "15px 18px", border: 0, borderRadius: 12, background: "#111", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer" };
const panel: React.CSSProperties = { marginTop: 32, padding: 22, borderRadius: 18, background: "#f4f0ff", border: "1px solid #e6dcff" };
