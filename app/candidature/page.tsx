"use client";
import { useEffect, useState } from "react";
import s from "../devenir-partenaire/partenaire.module.css";
import { COMMON, POSTES, FRENCH_TEST, LOGIC_TEST, WRITING_PROMPT, RIDDLES, BAC_SUBJECTS, isPoste, type Mcq, type PosteKey, type Question } from "../../lib/hiring";

export default function CandidaturePage() {
  const [poste, setPoste] = useState<PosteKey | "">("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [pastes, setPastes] = useState(0);
  const [riddleStart, setRiddleStart] = useState(0); const [riddleSec, setRiddleSec] = useState(0); const [riddleDone, setRiddleDone] = useState(false);
  useEffect(() => { if (!riddleStart || riddleDone) return; const t = setInterval(() => setRiddleSec(Math.round((Date.now() - riddleStart) / 1000)), 1000); return () => clearInterval(t); }, [riddleStart, riddleDone]);
  useEffect(() => { if (poste && !startedAt) setStartedAt(Date.now()); }, [poste, startedAt]);
  const noPaste = (e: React.ClipboardEvent) => { e.preventDefault(); setPastes(n => n + 1); };
  useEffect(() => { try { const p = new URLSearchParams(window.location.search).get("poste"); if (isPoste(p)) setPoste(p); } catch { } }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setState("sending");
    const fd = new FormData(e.currentTarget);
    // Les serveurs refusent les envois de plus de 4,5 Mo : un CV trop lourd (photo de téléphone) bloquait tout le formulaire.
    // Dans ce cas on envoie le formulaire sans le fichier : nous avons déjà le CV reçu via Emploitic.
    const cvFile = fd.get("cv"); let cvDropped = false;
    if (cvFile && typeof cvFile !== "string" && cvFile.size > 3.5 * 1024 * 1024) { fd.delete("cv"); cvDropped = true; }
    let r: Response | null = null;
    for (let i = 0; i < 2 && !r; i++) r = await fetch("/api/candidatures", { method: "POST", body: fd }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (r?.ok && j?.ok) { setState("done"); window.scrollTo({ top: 0 }); if (cvDropped) setErr("Votre CV était trop lourd : nous utiliserons celui reçu via Emploitic."); }
    else { setState("idle"); setErr(j?.error || (!r ? "Connexion interrompue : vérifiez votre réseau (Wi-Fi si possible) puis appuyez de nouveau sur Envoyer. Vos réponses sont conservées." : r.status === 413 ? "Fichier trop lourd : retirez le CV ou envoyez un PDF de moins de 3 Mo, puis réessayez." : `Envoi impossible (erreur ${r.status}), réessayez dans un instant. Vos réponses sont conservées.`)); }
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
      <p className={s.lead}>Nous avons bien reçu votre candidature sur Emploitic, merci. NeoDrive est une marque française de voitures sans permis électriques neuves, livrées partout en France.</p>
      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 16, padding: "14px 16px", margin: "12px 0", fontSize: 15, lineHeight: 1.5 }}><b>Notre sélection est exigeante : nous recherchons des profils brillants.</b><ol style={{ margin: "8px 0 0", paddingLeft: 20 }}><li>Ce formulaire et ses tests (30-40 min)</li><li>Pour les meilleurs : un test d'excellence chronométré (24 questions, 40 secondes chacune)</li><li>Un entretien téléphonique avec le fondateur</li><li>Une semaine d'essai rémunérée</li><li>La NeoDrive Academy : formation intensive et certifications, avec une rémunération qui évolue avec votre niveau</li></ol></div>
      <div style={{ maxWidth: 760, margin: "18px auto 0", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 16, padding: "14px 18px", textAlign: "left", color: "#fff", lineHeight: 1.6 }}>
        <b>Conditions de la mission :</b><br />
        • Statut : <b>prestataire freelance</b> (vous facturez NeoDrive chaque mois), ce n'est pas un contrat salarié.<br />
        • Lieu : <b>en présentiel à Alger</b>.<br />
        • Jours : <b>du lundi au samedi</b>, aux horaires français. Selon les besoins de l'entreprise, le planning peut varier et inclure ponctuellement le <b>dimanche</b>.<br />
        • Rémunération : fixe + primes, à définir en entretien.
      </div>
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
      <div style={{ background: "#b91c1c", color: "#fff", borderRadius: 16, padding: "18px 20px", margin: "0 0 18px", fontSize: 22, fontWeight: 950, lineHeight: 1.3, textAlign: "center" }}>⚠️ À FAIRE SEUL(E), SANS AUCUNE AIDE : NI PERSONNE, NI CHATGPT, NI AUCUN OUTIL D’INTELLIGENCE ARTIFICIELLE.<div style={{ fontSize: 15, fontWeight: 600, marginTop: 6 }}>Le copier-coller est bloqué, le temps est chronométré et les réponses sont vérifiées. Toute réponse rédigée par une IA entraîne l’élimination.</div></div>
      <form className={s.form} onSubmit={submit}>
        <input type="hidden" name="poste" value={poste} />
        <label>Nom et prénom *<input name="full_name" required /></label>
        <label>Téléphone / WhatsApp *<input name="phone" type="tel" required placeholder="+213 …" /></label>
        <label>E-mail<input name="email" type="email" /></label>
        <label>Ville<input name="city" placeholder="Alger" /></label>
        <label>Diplôme le plus élevé<input name="education" placeholder="Licence commerce, BTS transit…" /></label>
        <label>Années d'expérience sur ce type de poste<input name="experience_years" inputMode="numeric" /></label>
        <label className={s.full}>CV (facultatif, PDF de préférence, 3 Mo max)<input type="file" name="cv" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" /></label>
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Conditions de la mission</p>
        {COMMON.map(field)}
        <label>Baccalauréat : filière *<input name="bac_stream" required placeholder="Sciences expérimentales, Gestion…" /></label>
        <label>Année du bac *<input name="bac_year" required inputMode="numeric" placeholder="2018" /></label>
        <label>Moyenne générale au bac (sur 20) *<input name="bac_average" required inputMode="decimal" placeholder="12,45" /></label>
        {BAC_SUBJECTS.map(([id, l]) => <label key={id}>Note au bac en {l} (sur 20) *<input name={id} required inputMode="decimal" /></label>)}
        <label>Matière principale de votre filière *<input name="bac_main_subject" required placeholder="Sciences naturelles, Gestion…" /></label>
        <label>Note dans cette matière (sur 20) *<input name="bac_main_grade" required inputMode="decimal" /></label>
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Votre dernière expérience professionnelle</p>
        <label>Dernier employeur (entreprise) *<input name="emp_company" required /></label>
        <label>Poste occupé *<input name="emp_role" required /></label>
        <label>Dates (de … à …) *<input name="emp_dates" required placeholder="03/2023 – 09/2026" /></label>
        <label>Comment s'est passé votre départ ? *<select name="emp_departure" required defaultValue=""><option value="" disabled>Choisir…</option><option>En bons termes</option><option>Neutre</option><option>Désaccord / conflit</option><option>Je suis toujours en poste</option></select></label>
        <label className={s.full}>Pourquoi avez-vous quitté (ou voulez-vous quitter) cet employeur ? *<textarea name="emp_reason" rows={3} required onPaste={noPaste} /></label>
        <label>Personne de référence chez cet employeur (nom et fonction)<input name="ref_name" placeholder="Mme X, responsable commerciale" /></label>
        <label>Téléphone de la référence<input name="ref_phone" type="tel" /></label>
        <label className={s.check}><input type="checkbox" name="ref_consent" value="oui" /> J'accepte que NeoDrive contacte cette référence.</label>
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Test de français (10 questions)</p>
        {FRENCH_TEST.map(mcq)}
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Test de logique (8 questions, sans calculatrice)</p>
        {LOGIC_TEST.map(mcq)}
        <p className={s.full} style={{ margin: "10px 0 0", fontWeight: 900 }}>Énigmes chronométrées</p>
        <div className={s.full} style={{ border: "2px solid #f97316", borderRadius: 14, padding: 14, background: "#fff7ed" }}>
          {!riddleStart ? <button type="button" className={s.primary} onClick={() => setRiddleStart(Date.now())}>Démarrer les énigmes (chronomètre)</button> : <>
            <p style={{ margin: "0 0 8px", fontWeight: 900 }}>⏱ {Math.floor(riddleSec / 60)} min {String(riddleSec % 60).padStart(2, "0")} s{riddleDone ? " — terminé" : ""}</p>
            {RIDDLES.map(r => <label key={r.id} style={{ marginBottom: 10 }}>{r.q} *<input name={r.id} required inputMode="numeric" onPaste={noPaste} readOnly={riddleDone} /></label>)}
            {!riddleDone ? <button type="button" className={s.secondary} onClick={() => setRiddleDone(true)}>J'ai terminé les énigmes</button> : null}
          </>}
          <input type="hidden" name="riddle_sec" value={riddleSec} />
        </div>
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
