"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tzlsdjzcxdjaatcpwqwn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type UploadState = { name: string; state: "waiting" | "uploading" | "done" | "error"; error?: string };

export default function SocialUploadPage() {
  const [passcode, setPasscode] = useState("");
  const [batchContext, setBatchContext] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<UploadState[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  async function uploadOne(file: File, info: any, index: number) {
    setProgress(p => p.map((x, i) => i === index ? { ...x, state: "uploading" } : x));
    const { error } = await supabase.storage
      .from("social-media")
      .uploadToSignedUrl(info.path, info.token, file, { contentType: file.type, cacheControl: "3600" });
    if (error) {
      setProgress(p => p.map((x, i) => i === index ? { ...x, state: "error", error: error.message } : x));
      throw error;
    }
    setProgress(p => p.map((x, i) => i === index ? { ...x, state: "done" } : x));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setLoading(true);
    setStatus("Préparation des envois…");
    setProgress(files.map(f => ({ name: f.name, state: "waiting" })));

    try {
      const initRes = await fetch("/api/social-media/upload-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode,
          files: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
        }),
      });
      const init = await initRes.json();
      if (!initRes.ok || !init?.ok) throw new Error(init?.error || "Impossible de préparer les uploads");

      setStatus(`Envoi direct vers la bibliothèque : 0/${files.length}`);
      const uploaded: any[] = [];

      // 3 uploads in parallel: fast enough on mobile without saturating the connection.
      let cursor = 0;
      async function worker() {
        while (true) {
          const i = cursor++;
          if (i >= files.length) return;
          await uploadOne(files[i], init.uploads[i], i);
          uploaded.push(init.uploads[i]);
          setStatus(`Envoi direct vers la bibliothèque : ${uploaded.length}/${files.length}`);
        }
      }
      await Promise.all([worker(), worker(), worker()]);

      const regRes = await fetch("/api/social-media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, batchContext, items: uploaded }),
      });
      const reg = await regRes.json();
      if (!regRes.ok || !reg?.ok) throw new Error(reg?.error || "Médias envoyés mais enregistrement incomplet");

      setStatus(`✅ ${reg.count} média${reg.count > 1 ? "s" : ""} ajouté${reg.count > 1 ? "s" : ""}. Tu peux fermer la page.`);
      setFiles([]);
      setBatchContext("");
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{maxWidth:760,margin:"0 auto",padding:"28px 18px 60px",fontFamily:"Arial,sans-serif"}}>
      <h1 style={{fontSize:32,marginBottom:8}}>Bibliothèque sociale NeoDrive</h1>
      <p style={{color:"#555",lineHeight:1.5}}>Sélectionne plusieurs vraies photos et vidéos. Elles partent directement vers Supabase, sans passer par Vercel et sans déclencher de build.</p>

      <form onSubmit={submit} style={{display:"grid",gap:16,marginTop:28}}>
        <label style={{display:"grid",gap:7,fontWeight:700}}>Code d’accès
          <input type="password" value={passcode} onChange={e=>setPasscode(e.target.value)} required style={input}/>
        </label>

        <label style={{display:"grid",gap:7,fontWeight:700}}>Photos et vidéos
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={e=>setFiles(Array.from(e.target.files || []))} required style={input}/>
        </label>

        {files.length > 0 && <div style={{background:"#f5f5f5",padding:14,borderRadius:12}}>
          <strong>{files.length} fichier{files.length > 1 ? "s" : ""}</strong> — {(totalSize/1024/1024).toFixed(1)} Mo au total
          <div style={{fontSize:13,color:"#666",marginTop:6}}>Tu peux sélectionner jusqu’à 50 fichiers par lot, 100 Mo maximum par fichier.</div>
        </div>}

        <label style={{display:"grid",gap:7,fontWeight:700}}>Une note pour tout le lot <span style={{fontWeight:400,color:"#777"}}>(facultatif)</span>
          <textarea value={batchContext} onChange={e=>setBatchContext(e.target.value)} placeholder="Ex. Livraisons, essais routiers et préparation des voitures cette semaine à Toulouse." rows={4} style={{...input,resize:"vertical"}}/>
        </label>

        <button disabled={loading || !files.length} style={{padding:"15px 18px",border:0,borderRadius:12,background:"#111",color:"white",fontSize:17,fontWeight:800,cursor:"pointer",opacity:loading?0.6:1}}>{loading?"Envoi en cours…":`Envoyer ${files.length || "les"} média${files.length>1?"s":""}`}</button>
      </form>

      {progress.length > 0 && <div style={{marginTop:20,display:"grid",gap:7}}>
        {progress.map((p,i)=><div key={`${p.name}-${i}`} style={{fontSize:14}}>{p.state==="done"?"✅":p.state==="uploading"?"⏳":p.state==="error"?"❌":"•"} {p.name}{p.error?` — ${p.error}`:""}</div>)}
      </div>}
      {status && <p style={{marginTop:18,fontWeight:700}}>{status}</p>}
      <p style={{marginTop:30,color:"#777",fontSize:14,lineHeight:1.5}}>Priorité : authenticité et régularité. Tu n’as pas besoin d’écrire une description parfaite. Une note courte suffit, ou laisse-la vide : le moteur fera une légende courte et factuelle sans inventer ce qu’il ne sait pas.</p>
    </main>
  );
}

const input: React.CSSProperties = {padding:"13px 14px",border:"1px solid #ccc",borderRadius:10,fontSize:16,width:"100%",boxSizing:"border-box"};
