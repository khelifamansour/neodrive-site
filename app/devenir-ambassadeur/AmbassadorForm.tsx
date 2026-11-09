"use client";
import { useState } from "react";
import s from "../devenir-partenaire/partenaire.module.css";

export default function AmbassadorForm() {
  const [f, setF] = useState({ first_name: "", last_name: "", phone: "", email: "", network: "TikTok", handle: "", followers: "", city: "", postal_code: "", idea: "", consent: false, website: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setState("sending");
    const r = await fetch("/api/ambassadeurs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (r?.ok && j?.ok) { setCode(j.code || ""); setState("done"); } else { setState("idle"); setErr(j?.error || "Envoi impossible, réessayez."); }
  }
  if (state === "done") {
    const link = `https://www.easydrive-auto.fr/reservation-devis?code=${code}`;
    return (
      <div className={s.done}>
        <b>Bienvenue dans l’équipe NeoDrive 🎉</b>
        {code ? <>
          <p>Votre code promo personnel : <strong style={{ fontSize: 24, letterSpacing: 1 }}>{code}</strong></p>
          <p>Votre lien à partager (le code s’applique tout seul) :<br /><a href={link}>{link.replace("https://www.", "")}</a></p>
          <p>Notez-les bien{f.email ? " : nous vous les envoyons aussi par e-mail" : ""}. Relisez les règles ci-dessus avant de publier, puis à vous de jouer !</p>
        </> : <p>Votre inscription est bien reçue. Nous vous recontactons très vite.</p>}
      </div>
    );
  }
  return (
    <form className={s.form} onSubmit={submit}>
      <label>Prénom *<input required value={f.first_name} onChange={e => set("first_name", e.target.value)} /></label>
      <label>Nom<input value={f.last_name} onChange={e => set("last_name", e.target.value)} /></label>
      <label>Téléphone *<input required type="tel" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="06 12 34 56 78" /></label>
      <label>E-mail (pour recevoir votre code)<input type="email" value={f.email} onChange={e => set("email", e.target.value)} /></label>
      <label>Réseau principal<select value={f.network} onChange={e => set("network", e.target.value)}><option>TikTok</option><option>Instagram</option><option>Facebook</option><option>YouTube</option><option>Snapchat</option><option>Pas de réseau (bouche-à-oreille)</option></select></label>
      <label>Nom du compte<input value={f.handle} onChange={e => set("handle", e.target.value)} placeholder="@moncompte" /></label>
      <label>Nombre d’abonnés<select value={f.followers} onChange={e => set("followers", e.target.value)}><option value="">Choisir…</option><option>Moins de 1 000</option><option>1 000 – 10 000</option><option>10 000 – 50 000</option><option>50 000 – 200 000</option><option>Plus de 200 000</option></select></label>
      <label>Ville<input value={f.city} onChange={e => set("city", e.target.value)} /></label>
      <label className={s.full}>Votre idée de contenu (facultatif)<textarea rows={3} value={f.idea} onChange={e => set("idea", e.target.value)} placeholder="Ex. : je présente la voiture à mes abonnés parents d’ados, je fais un test sur route…" /></label>
      <input className={s.hp} tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set("website", e.target.value)} aria-hidden="true" />
      <label className={s.check}><input type="checkbox" required checked={f.consent} onChange={e => set("consent", e.target.checked)} /> J’ai lu et j’accepte les règles du programme ambassadeur NeoDrive, notamment la mention « collaboration commerciale » sur chaque publication *</label>
      {err && <p className={s.err}>{err}</p>}
      <button className={s.primary} disabled={state === "sending"}>{state === "sending" ? "Envoi…" : "Recevoir mon code ambassadeur"}</button>
    </form>
  );
}
