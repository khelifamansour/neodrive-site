"use client";
import { useState } from "react";
import s from "./partenaire.module.css";

export default function PartnerForm() {
  const [f, setF] = useState({ company: "", contact_name: "", phone: "", email: "", city: "", postal_code: "", activity: "", formula: "exposant", has_showroom: false, message: "", consent: false, website: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setState("sending");
    const r = await fetch("/api/partenaires", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (r?.ok && j?.ok) setState("done"); else { setState("idle"); setErr(j?.error || "Envoi impossible, réessayez."); }
  }
  if (state === "done") return <div className={s.done}><b>Merci, votre candidature est bien reçue ✅</b><p>Nous vous rappelons sous 48 h avec les conditions détaillées. En attendant, feuilletez le <a href="/catalogue">catalogue</a>.</p></div>;
  return (
    <form className={s.form} onSubmit={submit}>
      <label>Société *<input required value={f.company} onChange={e => set("company", e.target.value)} placeholder="Garage Dupont" /></label>
      <label>Votre nom *<input required value={f.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="Prénom Nom" /></label>
      <label>Téléphone *<input required type="tel" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="06 12 34 56 78" /></label>
      <label>E-mail<input type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="contact@garage.fr" /></label>
      <label>Ville<input value={f.city} onChange={e => set("city", e.target.value)} /></label>
      <label>Code postal<input value={f.postal_code} onChange={e => set("postal_code", e.target.value)} inputMode="numeric" /></label>
      <label>Activité<select value={f.activity} onChange={e => set("activity", e.target.value)}><option value="">Choisir…</option><option>Garage / atelier</option><option>Concession automobile</option><option>Voitures sans permis</option><option>Motos / scooters</option><option>Centre auto / pneus</option><option>Autre commerce</option></select></label>
      <label>Formule qui vous intéresse<select value={f.formula} onChange={e => set("formula", e.target.value)}><option value="exposant">Exposant-vendeur</option><option value="revendeur">Revendeur</option><option value="les deux">Je ne sais pas encore</option></select></label>
      <label className={s.full}>Votre projet<textarea rows={4} value={f.message} onChange={e => set("message", e.target.value)} placeholder="Surface d’exposition, nombre de voitures envisagé, questions…" /></label>
      <input className={s.hp} tabIndex={-1} autoComplete="off" value={f.website} onChange={e => set("website", e.target.value)} aria-hidden="true" />
      <label className={s.check}><input type="checkbox" checked={f.has_showroom} onChange={e => set("has_showroom", e.target.checked)} /> J’ai un espace d’exposition visible du public</label>
      <label className={s.check}><input type="checkbox" required checked={f.consent} onChange={e => set("consent", e.target.checked)} /> J’accepte d’être recontacté par NeoDrive au sujet de ce partenariat *</label>
      {err && <p className={s.err}>{err}</p>}
      <button className={s.primary} disabled={state === "sending"}>{state === "sending" ? "Envoi…" : "Envoyer ma candidature"}</button>
    </form>
  );
}
