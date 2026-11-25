"use client";
import { useCallback, useEffect, useState } from "react";
import s from "./app.module.css";

/** Éléments communs de l'application NeoDrive (/app) : appel API, en-tête, connexion, installation. */
export type Role = "fondateur" | "transporteur" | "chauffeur" | "equipe";
export type Me = { id: number; role: Role; name: string; company: string };
export const ROLE_FR: Record<Role, string> = { fondateur: "Fondateur", transporteur: "Transporteur", chauffeur: "Chauffeur", equipe: "Équipe" };

export async function api<T = any>(action: string, body: Record<string, unknown> = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const r = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action, ...body }) });
  const j = await r.json().catch(() => ({ ok: false, error: "Connexion impossible : vérifiez le réseau." }));
  if (!j.ok) throw Object.assign(new Error(j.error || "Erreur"), { status: r.status, logout: !!j.logout });
  return j as T;
}

/** Utilisateur connecté : undefined = chargement, null = pas connecté. */
export function useMe() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const load = useCallback(async () => { try { const j = await api<{ user: Me | null }>("me"); setMe(j.user); } catch (e) { setErr((e as Error).message); setMe(null); } }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- chargement initial depuis l'API
  return { me, setMe, reload: load, err };
}

export function Header({ me, sub, back }: { me?: Me | null; sub?: string; back?: string }) {
  const logout = async () => { try { await api("logout"); } catch { /* déjà déconnecté */ } location.href = "/app"; };
  return <header className={s.top}>
    <a className={s.logo} href={back || "/app"} aria-label="Accueil NeoDrive">{back ? "‹" : "N"}</a>
    <div className={s.brand}><strong>NeoDrive</strong><small>{sub || (me ? `${me.name}${me.company && me.role !== "fondateur" ? " · " + me.company : ""} · ${ROLE_FR[me.role]}` : "L'application")}</small></div>
    {me && <button className={s.ghost} onClick={logout}>Déconnexion</button>}
  </header>;
}

export function Loading() { return <main className={s.page}><Header /><p className={s.muted}>Chargement…</p></main>; }

/** Connexion : téléphone ou e-mail → code à 6 chiffres. Accès fondateur par le code habituel. */
export function Login({ onDone }: { onDone: (u: Me) => void }) {
  const [step, setStep] = useState<"contact" | "code" | "founder">("contact");
  const [contact, setContact] = useState(""); const [code, setCode] = useState(""); const [pc, setPc] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [info, setInfo] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- dernier contact saisi (navigateur uniquement)
  useEffect(() => { try { setContact(localStorage.getItem("nd_app_contact") || ""); } catch { /* privé */ } }, []);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(""); try { await fn(); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  const ask = () => run(async () => {
    const j = await api<{ channel: "sms" | "email" }>("request_code", { contact });
    try { localStorage.setItem("nd_app_contact", contact); } catch { /* privé */ }
    setInfo(j.channel === "sms" ? "Code envoyé par SMS." : "Code envoyé par e-mail."); setCode(""); setStep("code");
  });
  const verify = () => run(async () => { const j = await api<{ user: Me }>("verify", { contact, code }); onDone(j.user); });
  const founder = () => run(async () => { const j = await api<{ user: Me }>("founder_login", { code: pc }); try { sessionStorage.setItem("nd_pc", pc.trim()); } catch { /* privé */ } onDone(j.user); });

  return <main className={s.page}>
    <Header />
    <InstallCard />
    <h1 className={s.h1}>Connexion</h1>
    {step === "contact" && <form className={s.card} onSubmit={e => { e.preventDefault(); ask(); }}>
      <p className={s.sub}>Entrez votre numéro de portable ou votre e-mail : vous recevez un code à 6 chiffres.</p>
      <label className={s.label} htmlFor="contact">Portable ou e-mail</label>
      <input id="contact" className={s.input} value={contact} onChange={e => setContact(e.target.value)} placeholder="06 12 34 56 78" autoComplete="tel" inputMode="email" required />
      {err && <div className={s.err}>{err}</div>}
      <button className={s.btn} disabled={busy || !contact.trim()}>{busy ? "Envoi…" : "Recevoir mon code"}</button>
    </form>}
    {step === "code" && <form className={s.card} onSubmit={e => { e.preventDefault(); verify(); }}>
      {info && <div className={s.ok}>{info}</div>}
      <label className={s.label} htmlFor="code">Code reçu</label>
      <input id="code" className={`${s.input} ${s.code}`} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" required autoFocus />
      {err && <div className={s.err}>{err}</div>}
      <button className={s.btn} disabled={busy || code.length !== 6}>{busy ? "Vérification…" : "Se connecter"}</button>
      <div className={s.row} style={{ justifyContent: "space-between", marginTop: 8 }}>
        <button type="button" className={s.ghost} onClick={() => { setStep("contact"); setErr(""); }}>‹ Changer de contact</button>
        <button type="button" className={s.ghost} onClick={ask} disabled={busy}>Renvoyer le code</button>
      </div>
    </form>}
    {step === "founder" && <form className={s.card} onSubmit={e => { e.preventDefault(); founder(); }}>
      <label className={s.label} htmlFor="pc">Code fondateur</label>
      <input id="pc" className={s.input} type="password" value={pc} onChange={e => setPc(e.target.value)} autoComplete="current-password" required autoFocus />
      {err && <div className={s.err}>{err}</div>}
      <button className={`${s.btn} ${s.btn2}`} disabled={busy || !pc}>{busy ? "Vérification…" : "Entrer"}</button>
      <button type="button" className={s.ghost} onClick={() => { setStep("contact"); setErr(""); }}>‹ Connexion par code SMS</button>
    </form>}
    {step !== "founder" && <p className={s.sep}><button className={s.ghost} onClick={() => { setStep("founder"); setErr(""); }}>Accès fondateur</button> · <a className={s.ghost} href="/equipe">Espace équipe</a></p>}
  </main>;
}

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** « Installer l'application » : bouton Android (beforeinstallprompt), mode d'emploi iPhone (Safari → Partager → Sur l'écran d'accueil). */
export function InstallCard() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false); const [hidden, setHidden] = useState(true); const [done, setDone] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    let dismissed = false; try { dismissed = Date.now() - Number(localStorage.getItem("nd_app_install_x") || 0) < 7 * 86400e3; } catch { /* privé */ }
    if (standalone || dismissed) return;
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- détection du navigateur, impossible côté serveur
    if (isIos) { setIos(true); setHidden(false); }
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIP); setHidden(false); };
    const onInstalled = () => { setDone(true); setEvt(null); };
    window.addEventListener("beforeinstallprompt", onBip); window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/app-sw.js", { scope: "/app" }).catch(() => null);
    return () => { window.removeEventListener("beforeinstallprompt", onBip); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const close = () => { setHidden(true); try { localStorage.setItem("nd_app_install_x", String(Date.now())); } catch { /* privé */ } };
  if (done) return <div className={s.ok}>✅ Application installée : retrouvez « NeoDrive » sur l&apos;écran d&apos;accueil.</div>;
  if (hidden || (!evt && !ios)) return null;
  return <div className={s.install} role="region" aria-label="Installer l'application">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/app-icon-192.png" alt="" />
    <div style={{ flex: 1 }}>
      <b>Installer l&apos;application</b>
      {evt ? <>
        <p>NeoDrive sur l&apos;écran d&apos;accueil, en plein écran, comme une vraie application.</p>
        <button className={`${s.btn} ${s.small}`} onClick={async () => { await evt.prompt(); const c = await evt.userChoice.catch(() => ({ outcome: "" })); if (c.outcome === "accepted") setDone(true); setEvt(null); }}>Installer l&apos;application</button>
      </> : <p>Sur iPhone, dans <b>Safari</b> : touchez <b>Partager</b> <span aria-hidden>⎋</span> (carré avec une flèche) puis <b>« Sur l&apos;écran d&apos;accueil »</b>, puis <b>Ajouter</b>.</p>}
    </div>
    <button style={{ background: "none", border: 0, color: "#a59c92", fontSize: 20, cursor: "pointer" }} onClick={close} aria-label="Fermer">✕</button>
  </div>;
}

/** Notifications : proposé seulement si le serveur a une clé VAPID (sinon rien ne s'affiche). */
export function PushButton() {
  const [key, setKey] = useState<string | null>(null); const [state, setState] = useState<"idle" | "on" | "err">("idle");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    api<{ publicKey: string | null }>("push_config").then(j => setKey(j.publicKey)).catch(() => null);
  }, []);
  if (!key || state === "on") return null;
  const on = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/app-sw.js", { scope: "/app" }); await navigator.serviceWorker.ready;
      const pad = "=".repeat((4 - (key.length % 4)) % 4); const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
      await api("push_subscribe", { subscription: sub.toJSON() }); setState("on");
    } catch { setState("err"); }
  };
  return <button className={`${s.btn} ${s.btnLight}`} style={{ marginTop: 12 }} onClick={on}>{state === "err" ? "Notifications refusées : réessayer" : "🔔 Activer les notifications"}</button>;
}
