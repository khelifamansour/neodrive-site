"use client";
import { useEffect, useState } from "react";
import s from "../devenir-partenaire/partenaire.module.css";
import { COMMON, POSTES, FRENCH_TEST, LOGIC_TEST, WRITING_PROMPT, isPoste, type Mcq, type PosteKey, type Question } from "../../lib/hiring";

export default function CandidaturePage() {
  const [poste, setPoste] = useState<PosteKey | "">("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [pastes, setPastes] = useState(0);
  useEffect(() => { if (poste && !startedAt) setStartedAt(Date.now()); }, [poste, startedAt]);
  const noPaste = (e: React.ClipboardEvent) => { e.preventDefault(); setPastes(n => n + 1); };
  useEffect(() => { try { const p = new URLSearchParams(window.location.search).get("poste"); if (isPoste(p)) setPoste(p); } catch { } }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setState("sending");
    const r = await fetch("/api/candidatures", { method: "POST", body: new FormData(e.currentTarget) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (r?.ok && j?.ok) { setState("done"); window.scrollTo({ top: 0 }); } else { setState("idle"); setErr(j?.error || "Envoi impossible, réessayez."); }
  }
  const field = (q: Question) => <label key={q.id} className={q.type === "long" ? s.full : undefined}>{q.label}{q.required ? " *" : ""}
    {q.type === "choice" ? <select name={q.id} required={q.required} defaultValue=""><option value="" disabled>Choisir…</option>{q.options!.map(o => <option key={o}>{o}</option>)}</select>
      : q.type === "long" ? <textarea name={q.id} rows={4} required={q.required} onPaste={noPaste} /> : <input name={q.id} required={q.required} />}</label>;

  const mcq = (m: Mcq, i: number) => <fieldset key={m.id} className={s.full} style={{ border: "1px solid #e7e5e4", borderRadius: 12, padding: "10px 14px", background: "#fff" }}>
    <legend style={{ fontWeight: 800, fontSize: 14 }}>{i + 1}. {m.q}</legend>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px" }}>{m.options.map(o => <label key={o} style={{ flexDirection: "row", alignItems: "center", gap: 6, fontWeight: 500 }}><input type="radio" name={m.id} value={o} required style={{ width: "auto" }} /> {o}</label>)}</div>
  </fieldset>;
  if (state === "done") return <main className={s.page}><section className={s.formSection} style={{ paddingTop: 50 }}><div className={s.done}><b>Merci, votre candidature est bien reçue ✅</b><p>Nous étudions chaque dossier avec attention. Les candidats retenus sont contactés sous 7 jours pour un entretien et une mise en situation.</p></div></section></main>;
  return <main className={s.page}>
    <section className={s.whyTop}>
      <span className={s.eyebrow}>NEODRIVE RECRUTE · FREELANCE · ALGER</span>
      <h1>Rejoignez <em>NeoDrive</em></h1>
      <p className={s.lead}>Marque française de voitures sans permis électriques neuves, livrées partout en France. Missions en freelance, en présentiel à Alger, du lundi au samedi aux horaires français.</p>
    </section>
    <section className={s.formSection} style={{ paddingTop: 30 }}>
      <div className={s.heading}><span className={s.eyebrow}>1. CHOISISSEZ LE POSTE</span></div>
      <div className={s.grid} style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        {(Object.keys(POSTES) as PosteKey[]).map(k => <article key={k} className={poste === k ? s.featured : undefined} style={{ cursor: "pointer" }} onClick={() => setPoste(k)}>
          <span className={s.tag}>{poste === k ? "SÉLECTIONNÉ" : "POSTE"}</span><h3 style={{ fontSize: 22 }}>{POSTES[k].title}</h3><p>{POSTES[k].summary}</p></article>)}
      </div>
    </section>
    {poste ? <section className={s.formSection} id="formulaire">
      <div className={s.heading}><span className={s.eyebrow}>2. VOTRE CANDIDATURE</span><h2>{POSTES[poste].short}</h2><p>Comptez 30 à 40 minutes, en une seule fois. Le copier-coller est désactivé et le temps est mesuré : répondez avec vos propres mots, sans aide extérieure ni outil d’IA.</p></div>
      <form className={s.form} onSubmit={submit}>
        <input type="hidden" name="poste" value={poste} />
        <label>Nom et prénom *<input name="full_name" required /></label>
        <label>Téléphone / WhatsApp *<input name="phone" type="tel" required placeholder="+213 …" /></label>
        <label>E-mail<input name="email" type="email" /></label>
        <label>Ville<input name="city" placeholder="Alger" /></label>
        <label>Diplôme le plus élevé<input name="education" placeholder="Licence commerce, BTS transit…" /></label>
        <label>Années d'expérience sur ce type de poste<input name="experience_years" inputMode="numeric" /></label>
        <label className={s.full}>CV (PDF de préférence, 8 Mo max)<input type="file" name="cv" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></label>
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Conditions de la mission</p>
        {COMMON.map(field)}
        <label>Baccalauréat : filière *<input name="bac_stream" required placeholder="Sciences expérimentales, Gestion…" /></label>
        <label>Année du bac *<input name="bac_year" required inputMode="numeric" placeholder="2018" /></label>
        <label>Moyenne au bac (sur 20) *<input name="bac_average" required inputMode="decimal" placeholder="12,45" /></label>
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Test de français (10 questions)</p>
        {FRENCH_TEST.map(mcq)}
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Test de logique (8 questions, sans calculatrice)</p>
        {LOGIC_TEST.map(mcq)}
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Rédaction</p>
        <label className={s.full}>{WRITING_PROMPT} *<textarea name="writing" rows={8} required minLength={150} onPaste={noPaste} /></label>
        <input type="hidden" name="started_at" value={startedAt} /><input type="hidden" name="paste_count" value={pastes} />
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Questions et mises en situation</p>
        {POSTES[poste].questions.map(field)}
        <input className={s.hp} name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label className={s.check}><input type="checkbox" required /> J'accepte que NeoDrive (MK HOLDING) conserve ma candidature 2 ans maximum et l'analyse, y compris avec un outil d'intelligence artificielle, pour ce recrutement. *</label>
        {err ? <p className={s.err}>{err}</p> : null}
        <button className={s.primary} disabled={state === "sending"}>{state === "sending" ? "Envoi et analyse…" : "Envoyer ma candidature"}</button>
      </form>
    </section> : null}
  </main>;
}
