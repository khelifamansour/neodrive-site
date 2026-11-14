"use client";
import { useEffect, useState } from "react";

/** Une tuile = un outil. `section` : section requise pour un membre ; "owner" : fondateur seulement ; "any" : tout membre avec au moins une section. */
type Tile = { href: string; icon: string; title: string; text: string; section: string };
const TILES: Tile[] = [
  { href: "/sav/admin", icon: "🛠️", title: "Service après-vente", text: "Les demandes des clients, les diagnostics et les réparations.", section: "sav" },
  { href: "/pieces/admin", icon: "📦", title: "Commandes de pièces", text: "Les pièces commandées par les clients et leur expédition.", section: "pieces" },
  { href: "/planificateur", icon: "🚚", title: "Tournées et livraisons", text: "Préparer les tournées, les clients à livrer et les dépôts.", section: "tournees" },
  { href: "/vehicules", icon: "🚗", title: "Suivi des voitures", text: "Chaque voiture, du conteneur jusqu’au client.", section: "vehicules" },
  { href: "/conteneurs", icon: "🚢", title: "Conteneurs", text: "Les arrivages, les documents d’import et les numéros de série.", section: "conteneurs" },
  { href: "/logistique", icon: "🏗️", title: "Logistique", text: "Les prestataires de dépotage, de stockage et de transport.", section: "logistique" },
  { href: "/contenu", icon: "🎬", title: "Contenu", text: "Photos, vidéos, catalogue et documents à télécharger.", section: "contenu" },
  { href: "/recrutement-admin", icon: "🤝", title: "Recrutement", text: "Les candidatures, les tests et les offres d’emploi.", section: "recrutement" },
  { href: "/equipe", icon: "📞", title: "Prospects", text: "Vos clients à rappeler, les appels et les messages WhatsApp.", section: "crm" },
  { href: "/stock", icon: "🔧", title: "Ancien stock", text: "Les voitures d’occasion à remettre en état et à vendre.", section: "stock" },
  { href: "/idees", icon: "💡", title: "Idées et développement", text: "Proposez une idée pour améliorer NeoDrive, suivez son avancement.", section: "any" },
  { href: "/academy", icon: "🎓", title: "NeoDrive Academy", text: "La formation de l’équipe (bientôt disponible).", section: "academy" },
  { href: "/equipe-admin", icon: "👥", title: "Équipe et accès", text: "Créer les accès, choisir les sections, couper un accès.", section: "owner" },
  { href: "/pilotage", icon: "📊", title: "Pilotage financier", text: "Chiffre d’affaires, marges et trésorerie.", section: "owner" },
];
type Me = { who: "owner" | "member"; name: string; role: string; roleLabel?: string; sections: string[]; expires_at?: string | null };

const C = { bg: "#f6f4f0", ink: "#141414", mute: "#666", line: "#e5e0d8", brand: "#f05a28" };
const btn = (bg = C.ink): React.CSSProperties => ({ padding: "12px 16px", borderRadius: 12, border: 0, background: bg, color: "#fff", fontWeight: 700, cursor: "pointer", font: "inherit", fontSize: 16 });
const isMemberCode = (c: string) => /^[A-Z0-9]{5}-?[A-Z0-9]{5}$/i.test(c.trim());

export default function Organisation() {
  const [me, setMe] = useState<Me | null>(null); const [ready, setReady] = useState(false);
  const [code, setCode] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  const whoami = async (pc: string) => {
    const r = await fetch("/api/organisation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "me", passcode: pc }) });
    const j = await r.json().catch(() => ({ ok: false }));
    return j.ok ? (j as Me) : null;
  };
  useEffect(() => {
    (async () => { let pc = ""; try { pc = sessionStorage.getItem("nd_pc") || ""; } catch { /* privé */ } setMe(await whoami(pc)); setReady(true); })();
  }, []);
  // Temps actif des membres (même compteur que l’espace prospects).
  useEffect(() => {
    if (me?.who !== "member") return;
    const ping = () => fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ping", visible: document.visibilityState === "visible" }) }).then(r => { if (r.status === 401) setMe(null); }).catch(() => null);
    ping(); const it = setInterval(ping, 60000); return () => clearInterval(it);
  }, [me?.who]);

  const memberLogin = async (c: string) => {
    const r = await fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", code: c }) });
    const j = await r.json().catch(() => ({ ok: false }));
    return { ok: !!j.ok, error: j.error as string | undefined, status: r.status };
  };
  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(""); setBusy(true);
    const c = code.trim();
    try {
      if (isMemberCode(c)) {
        const m = await memberLogin(c);
        if (m.ok) { setMe(await whoami("")); setCode(""); return; }
        if (m.status === 403) { setMsg(m.error || "Accès désactivé."); return; }
      }
      const o = await whoami(c);
      if (o?.who === "owner") { try { sessionStorage.setItem("nd_pc", c); } catch { /* privé */ } setMe(o); setCode(""); return; }
      if (!isMemberCode(c)) { const m = await memberLogin(c); if (m.ok) { setMe(await whoami("")); setCode(""); return; } if (m.status === 403) { setMsg(m.error || "Accès désactivé."); return; } }
      setMsg("Code incorrect. Vérifiez-le ou demandez un nouveau code à Mansour.");
    } finally { setBusy(false); }
  };
  const logout = async () => {
    if (me?.who === "member") await fetch("/api/equipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => null);
    else { try { sessionStorage.removeItem("nd_pc"); } catch { /* privé */ } }
    setMe(null); setMsg("Vous êtes déconnecté.");
  };

  const visible = (t: Tile) => {
    if (!me) return false; if (me.who === "owner") return true;
    if (t.section === "owner") return false;
    if (t.section === "any") return me.sections.length > 0;
    if (t.section === "crm") return me.sections.includes("crm") || me.role === "closer";
    return me.sections.includes(t.section);
  };
  const tiles = TILES.filter(visible);

  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: C.brand, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 20 }}>N</span>
        <b style={{ fontSize: 18 }}>NeoDrive · Organisation</b>
      </div>

      {!ready ? <p style={{ color: C.mute, marginTop: 30 }}>Chargement…</p> : !me ? <>
        <h1 style={{ fontSize: 28, margin: "28px 0 8px" }}>Bonjour 👋</h1>
        <p style={{ fontSize: 17, lineHeight: 1.55, maxWidth: 640 }}>Voici le système d’organisation de NeoDrive. Tout le travail de l’équipe se trouve ici : le service après-vente, les livraisons, les voitures, les conteneurs, le contenu, le recrutement… Entrez votre code personnel pour voir les outils qui vous sont ouverts.</p>
        <form onSubmit={login} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, maxWidth: 420, marginTop: 18 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Votre code d’accès</label>
          <input value={code} onChange={e => setCode(e.target.value)} type="password" autoComplete="off" autoFocus placeholder="Ex. : ABCDE-FGH23" style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d8d2c8", font: "inherit", fontSize: 17, boxSizing: "border-box", letterSpacing: 1 }} />
          <button disabled={busy || code.trim().length < 4} style={{ ...btn(C.brand), width: "100%", marginTop: 12 }}>{busy ? "Vérification…" : "Entrer"}</button>
          {msg ? <p style={{ color: msg.startsWith("Vous") ? "#15803d" : "#b91c1c", fontWeight: 600, marginBottom: 0 }}>{msg}</p> : null}
          <p style={{ color: C.mute, fontSize: 13, marginBottom: 0 }}>Le code est personnel : ne le partagez pas. Vous n’avez pas de code ? Demandez-le à Mansour.</p>
        </form>
      </> : <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", margin: "24px 0 6px" }}>
          <div>
            <h1 style={{ fontSize: 28, margin: 0 }}>Bonjour {me.who === "owner" ? "Mansour" : me.name.split(" ")[0]} 👋</h1>
            <p style={{ fontSize: 16, lineHeight: 1.55, margin: "8px 0 0", maxWidth: 640 }}>Voici le système d’organisation de NeoDrive. Choisissez un outil ci-dessous{me.who === "member" ? " : vous voyez seulement les sections ouvertes pour vous." : " : vous voyez tout."}</p>
            {me.who === "member" ? <p style={{ color: C.mute, fontSize: 13, margin: "6px 0 0" }}>{me.roleLabel}{me.expires_at ? ` · accès valable jusqu’au ${new Date(me.expires_at).toLocaleDateString("fr-FR")}` : ""}</p> : null}
          </div>
          <button onClick={logout} style={{ ...btn("#555"), fontSize: 14, padding: "9px 14px" }}>Se déconnecter</button>
        </div>
        {tiles.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginTop: 18 }}>
          {tiles.map(t => <a key={t.href} href={t.href} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, textDecoration: "none", color: C.ink, minHeight: 92, boxShadow: "0 1px 2px rgba(0,0,0,.03)" }}>
            <span style={{ fontSize: 34, lineHeight: 1 }} aria-hidden>{t.icon}</span>
            <span><b style={{ fontSize: 17, display: "block", marginBottom: 4 }}>{t.title}{t.section === "owner" ? <span style={{ fontSize: 11, fontWeight: 600, color: C.brand, marginLeft: 6 }}>FONDATEUR</span> : null}</b><span style={{ color: C.mute, fontSize: 14, lineHeight: 1.4 }}>{t.text}</span></span>
          </a>)}
        </div> : <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, marginTop: 18 }}>Aucune section n’est encore ouverte pour vous. Demandez à Mansour de cocher vos sections.</div>}
        <p style={{ color: C.mute, fontSize: 13, marginTop: 24 }}>Une question, un blocage ? Écrivez à Mansour sur WhatsApp. Pensez à vous déconnecter sur un ordinateur partagé.</p>
      </>}
    </div>
  </main>;
}
