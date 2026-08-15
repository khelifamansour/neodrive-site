"use client";

import { useMemo, useState } from "react";

export default function SocialUploadPage() {
  const [passcode, setPasscode] = useState("");
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatus("Envoi en cours…");
    try {
      const form = new FormData();
      form.append("passcode", passcode);
      form.append("title", title);
      form.append("context", context);
      form.append("file", file);
      const res = await fetch("/api/social-media/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Échec de l'envoi");
      setStatus("✅ Média ajouté à la bibliothèque automatique");
      setFile(null);
      setTitle("");
      setContext("");
    } catch (err) {
      setStatus(`❌ ${err instanceof Error ? err.message : "Erreur"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{maxWidth:720,margin:"0 auto",padding:"28px 18px 60px",fontFamily:"Arial,sans-serif"}}>
      <h1 style={{fontSize:32,marginBottom:8}}>Bibliothèque sociale NeoDrive</h1>
      <p style={{color:"#555",lineHeight:1.5}}>Ajoute ici les vraies photos et vidéos prises au quotidien. Elles seront utilisées automatiquement pour les publications Instagram.</p>

      <form onSubmit={submit} style={{display:"grid",gap:16,marginTop:28}}>
        <label style={{display:"grid",gap:7,fontWeight:700}}>Code d’accès
          <input type="password" value={passcode} onChange={e=>setPasscode(e.target.value)} required style={input}/>
        </label>

        <label style={{display:"grid",gap:7,fontWeight:700}}>Photo ou vidéo
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" capture="environment" onChange={e=>setFile(e.target.files?.[0] || null)} required style={input}/>
        </label>

        {preview && file?.type.startsWith("image/") && <img src={preview} alt="Aperçu" style={{width:"100%",maxHeight:420,objectFit:"contain",borderRadius:14,background:"#111"}}/>}
        {preview && file?.type.startsWith("video/") && <video src={preview} controls style={{width:"100%",maxHeight:420,borderRadius:14,background:"#111"}}/>}

        <label style={{display:"grid",gap:7,fontWeight:700}}>Titre court <span style={{fontWeight:400,color:"#777"}}>(optionnel)</span>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. Livraison client à Toulouse" style={input}/>
        </label>

        <label style={{display:"grid",gap:7,fontWeight:700}}>Contexte pour l’IA <span style={{fontWeight:400,color:"#777"}}>(recommandé)</span>
          <textarea value={context} onChange={e=>setContext(e.target.value)} placeholder="Ex. Véhicule noir préparé avant livraison, client satisfait, montrer que nous livrons partout en France." rows={5} style={{...input,resize:"vertical"}}/>
        </label>

        <button disabled={loading || !file} style={{padding:"15px 18px",border:0,borderRadius:12,background:"#111",color:"white",fontSize:17,fontWeight:800,cursor:"pointer",opacity:loading?0.6:1}}>{loading?"Envoi…":"Ajouter à la bibliothèque"}</button>
      </form>

      {status && <p style={{marginTop:18,fontWeight:700}}>{status}</p>}
      <p style={{marginTop:30,color:"#777",fontSize:14,lineHeight:1.5}}>Conseil : écris seulement ce qui se passe réellement sur la photo/vidéo. L’IA utilisera ce contexte pour rédiger un texte naturel, sans inventer de caractéristiques.</p>
    </main>
  );
}

const input: React.CSSProperties = {padding:"13px 14px",border:"1px solid #ccc",borderRadius:10,fontSize:16,width:"100%",boxSizing:"border-box"};
