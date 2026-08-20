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
  if (!f.type.startsWith("image/")) return f;
  if (f.type === "image/jpeg" && f.size < 2 * 1024 * 1024) return f;
  try {
    const b = await createImageBitmap(f);
    const s = Math.min(1, 1920 / Math.max(b.width, b.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(b.width * s)); c.height = Math.max(1, Math.round(b.height * s));
    const x = c.getContext("2d"); if (!x) return f;
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(b, 0, 0, c.width, c.height); b.close();
    const z = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    return z ? new File([z], `${f.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" }) : f;
  } catch { return f; }
}

export default function Page() {
  const [passcode, setPasscode] = useState(""); const [ctx, setCtx] = useState(""); const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<S[]>([]); const [status, setStatus] = useState(""); const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null); const [videoAction, setVideoAction] = useState<"create"|"publish"|null>(null);
  const [latestJobId,setLatestJobId]=useState<string|null>(null); const [latestTheme,setLatestTheme]=useState<string|null>(null);
  const total = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);

  async function uploadOne(f: File, info: UploadInfo, n: number) {
    if (info.error || !info.path || !info.token) { setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "error", error: info.error || "Upload non préparé" } : x)); return null; }
    setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "uploading" } : x));
    try { const { error } = await supabase.storage.from("social-media").uploadToSignedUrl(info.path, info.token, f, { contentType: f.type, cacheControl: "3600" }); if (error) throw error; setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "done" } : x)); return info; }
    catch (e) { const message = e instanceof Error ? e.message : "Erreur d'envoi"; setProgress((p) => p.map((x, k) => k === n ? { ...x, state: "error", error: message } : x)); return null; }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!files.length) return; setLoading(true); setStatus("Optimisation et conversion des photos en JPEG…"); setProgress(files.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));
    try { const fs = await Promise.all(files.map(optimiseImage)); setProgress(fs.map((f) => ({ name: f.name, size: f.size, state: "waiting" })));
      const r = await fetch("/api/social-media/upload-init", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, files: fs.map((f) => ({ name: f.name, type: f.type, size: f.size })) }) }); const j = await r.json(); if (!r.ok || !Array.isArray(j.uploads)) throw new Error(j.error || "Préparation impossible");
      let cursor = 0; const done: UploadInfo[] = []; async function worker() { while (true) { const n = cursor++; if (n >= fs.length) return; const result = await uploadOne(fs[n], j.uploads[n] || { index: n, error: "Réponse manquante" }, n); if (result) done.push(result); setStatus(`Traitement : ${Math.min(cursor, fs.length)}/${fs.length} — ${done.length} envoyé(s)`); } }
      await Promise.all([worker(), worker(), worker()]); if (done.length) { const rr = await fetch("/api/social-media/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode, batchContext: ctx, items: done }) }); const jj = await rr.json(); if (!rr.ok || !jj.ok) throw new Error(jj.error || "Enregistrement incomplet"); }
      const failed = fs.length - done.length; setStatus(`✅ ${done.length} média(s) ajouté(s)${failed ? ` · ❌ ${failed} fichier(s) à réessayer séparément` : ""}.`); if (!failed) { setFiles([]); setCtx(""); }
    } catch (e) { setStatus(`❌ ${e instanceof Error ? e.message : "Erreur"}`); } finally { setLoading(false); }
  }

  async function publishNow(platform: "instagram" | "facebook") {
    if (!passcode) { setStatus("❌ Entre d’abord le code d’accès."); return; } setPublishing(platform); setStatus(`Publication ${platform === "instagram" ? "Instagram" : "Facebook"} en cours…`);
    try { const r = await fetch(`/api/${platform}/publish-next`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) }); const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || "Publication impossible"); setStatus(j.published ? `✅ Publié sur ${platform === "instagram" ? "Instagram" : "Facebook"} — ${j.mediaId || j.postId || "OK"}` : `ℹ️ ${j.reason || "Aucun post à publier"}`); }
    catch (e) { setStatus(`❌ ${e instanceof Error ? e.message : "Erreur"}`); } finally { setPublishing(null); }
  }

  async function createVideoNow(){
    if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;} setVideoAction("create"); setLatestJobId(null); setLatestTheme(null); setStatus("🎬 Création d’un nouveau Reel en cours…");
    try{const r=await fetch("/api/video/manual-create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode})});const j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||j.reason||"Création impossible");if(j.setupNeeded)throw new Error("Il manque CREATOMATE_API_KEY dans Vercel");setLatestJobId(j.jobId||null);setLatestTheme(j.theme||null);setStatus(`✅ Nouveau Reel lancé${j.theme?` — thème : ${j.theme}`:""}. Attends 10 à 20 secondes avant de cliquer sur « Publier CE Reel ».*`);}
    catch(e){setStatus(`❌ ${e instanceof Error?e.message:"Erreur vidéo"}`);}finally{setVideoAction(null);}
  }

  async function publishLatestVideo(){
    if(!passcode){setStatus("❌ Entre d’abord le code d’accès.");return;} if(!latestJobId){setStatus("❌ Crée d’abord un nouveau Reel avec le bouton violet. Ainsi je publie exactement celui-ci, jamais une ancienne vidéo.");return;}
    setVideoAction("publish"); setStatus(`🚀 Publication de CE Reel${latestTheme?` (${latestTheme})`:""}…`);
    try{const r=await fetch("/api/video/publish-latest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({passcode,jobId:latestJobId})});const j=await r.json();if(!r.ok&&r.status!==207)throw new Error(j.error||"Publication vidéo impossible");
      const ig=j.instagram?.published?"Instagram ✅":`Instagram ❌ ${j.instagram?.error||j.instagram?.reason||"échec"}`; const fb=j.facebook?.published?"Facebook ✅":`Facebook ❌ ${j.facebook?.error||j.facebook?.reason||"échec"}`;
      setStatus(`🎬 Reel ${j.theme||latestTheme||"NeoDrive"} — ${ig} · ${fb}`);
    } catch(e){setStatus(`❌ ${e instanceof Error?e.message:"Erreur publication vidéo"}`);}finally{setVideoAction(null);}
  }

  return <main style={{ maxWidth: 760, margin: "0 auto", padding: "28px 18px 60px", fontFamily: "Arial,sans-serif" }}>
    <h1>Bibliothèque sociale NeoDrive</h1><p>Ajoute tes vraies photos et vidéos en lot. Les médias servent ensuite aux publications et aux Reels automatiques.</p>
    <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 28 }}><label>Code d’accès<input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required style={input} /></label><label>Photos et vidéos<input type="file" multiple accept="image/*,video/mp4,video/quicktime" onChange={(e) => setFiles(Array.from(e.target.files || []))} style={input} /></label>{files.length > 0 && <div><strong>{files.length} fichier(s)</strong> — {mb(total)}</div>}<label>Note globale facultative<textarea value={ctx} onChange={(e) => setCtx(e.target.value)} rows={3} placeholder="Ex. livraisons, essais, intérieur et voitures en préparation cette semaine" style={input} /></label><button disabled={loading || !files.length} style={button}>{loading ? "Envoi en cours…" : `Envoyer ${files.length || "les"} média(s)`}</button></form>
    {progress.length > 0 && <div style={{ marginTop: 18, display: "grid", gap: 7 }}>{progress.map((p, i) => <div key={i} style={{ fontSize: 14 }}>{p.state === "done" ? "✅" : p.state === "uploading" ? "⏳" : p.state === "error" ? "❌" : "•"} {p.name} <span style={{ color: "#777" }}>({mb(p.size)})</span>{p.error && <span style={{ color: "#b00020" }}> — {p.error}</span>}</div>)}</div>}
    <section style={panel}><h2 style={{marginTop:0}}>🎬 Vidéos automatiques</h2><p>Crée un Reel vertical différent à partir de tes vraies vidéos, avec montage court, musique et textes adaptés au thème. Le prix n’est affiché que lorsque le thème concerne le prix.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><button onClick={createVideoNow} disabled={!!videoAction} style={{...button,background:"#7c3aed"}}>{videoAction==="create"?"Création…":"Créer un nouveau Reel"}</button><button onClick={publishLatestVideo} disabled={!!videoAction||!latestJobId} style={{...button,background:latestJobId?"#0f766e":"#777"}}>{videoAction==="publish"?"Publication…":"Publier CE Reel sur Instagram + Facebook"}</button></div><p style={{fontSize:13,color:"#666"}}>Important : le bouton vert reste désactivé jusqu’à ce que tu aies créé un nouveau Reel dans cette session. Cela empêche de republier une ancienne compilation.</p></section>
    <hr style={{ margin: "32px 0" }} /><h2>Publication supplémentaire</h2><p>Instagram et Facebook continuent à publier automatiquement. Utilise ces boutons seulement pour ajouter un post immédiat.</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><button onClick={() => publishNow("instagram")} disabled={!!publishing} style={button}>{publishing === "instagram" ? "Publication…" : "Publier maintenant sur Instagram"}</button><button onClick={() => publishNow("facebook")} disabled={!!publishing} style={button}>{publishing === "facebook" ? "Publication…" : "Publier maintenant sur Facebook"}</button></div>{status && <p style={{ fontWeight: 700, marginTop: 18, padding:14, background:"#f5f5f5", borderRadius:10 }}>{status}</p>}
  </main>;
}
const input: React.CSSProperties = { padding: 13, border: "1px solid #ccc", borderRadius: 10, fontSize: 16, width: "100%", boxSizing: "border-box", display: "block", marginTop: 7 }; const button: React.CSSProperties = { padding: "15px 18px", border: 0, borderRadius: 12, background: "#111", color: "white", fontSize: 16, fontWeight: 800, cursor: "pointer" }; const panel: React.CSSProperties = { marginTop: 32, padding: 22, borderRadius: 18, background: "#f4f0ff", border: "1px solid #e6dcff" };
