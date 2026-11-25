"use client";
import { useCallback, useEffect, useState } from "react";
import s from "../app.module.css";
import { api, Header, InstallCard, Loading, Login, PushButton, useMe } from "../ui";

/** Espace transporteur : ses missions (à venir, en cours, terminées), sans aucun montant. Ouvrir une mission = page chauffeur existante. */
type Stage = "a_venir" | "en_cours" | "terminee";
type Mission = { id: string; date: string; departTime: string; carrier: string; driverName: string | null; driverUserId: number | null; hub: { name: string; address: string }; stage: Stage; link: string | null; clients: { id: string; name: string; city: string; slot: string; status: string }[]; done: number; total: number };
type Driver = { id: number; name: string; company: string };
const TABS: { id: Stage; label: string }[] = [{ id: "en_cours", label: "En cours" }, { id: "a_venir", label: "À venir" }, { id: "terminee", label: "Terminées" }];
const dayFr = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export default function CarrierSpace() {
  const { me, setMe } = useMe();
  const [missions, setMissions] = useState<Mission[] | null>(null); const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tab, setTab] = useState<Stage | null>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try { const j = await api<{ missions: Mission[]; drivers: Driver[] }>("missions"); setMissions(j.missions); setDrivers(j.drivers || []); setErr(""); }
    catch (e) { if ((e as { logout?: boolean }).logout) setMe(null); else setErr((e as Error).message); }
  }, [setMe]);
  useEffect(() => { if (me) load(); }, [me, load]); // eslint-disable-line react-hooks/set-state-in-effect -- chargement depuis l'API
  useEffect(() => { const it = setInterval(() => { if (me && document.visibilityState === "visible") load(); }, 30000); return () => clearInterval(it); }, [me, load]);

  if (me === undefined) return <Loading />;
  if (me === null) return <Login onDone={setMe} />;
  const manage = me.role === "fondateur" || me.role === "transporteur";
  const list = missions || [];
  const count = (st: Stage) => list.filter(m => m.stage === st).length;
  const cur = tab || (count("en_cours") ? "en_cours" : count("a_venir") ? "a_venir" : "terminee");
  const shown = list.filter(m => m.stage === cur).sort((a, z) => cur === "terminee" ? z.date.localeCompare(a.date) : a.date.localeCompare(z.date));
  const assign = async (m: Mission, driverId: string) => {
    setBusy(m.id); setErr("");
    try { await api("assign", { tourId: m.id, driverId: driverId ? Number(driverId) : null }); await load(); } catch (e) { setErr((e as Error).message); }
    setBusy("");
  };

  return <main className={s.page}>
    <Header me={me} back={me.role === "fondateur" || me.role === "equipe" ? "/app" : undefined} />
    <InstallCard />
    <h1 className={s.h1}>{me.role === "chauffeur" ? "Mes missions" : "Missions"}</h1>
    <p className={s.sub}>{me.role === "chauffeur" ? "Les livraisons qui vous sont confiées." : me.role === "transporteur" ? `Les missions NeoDrive confiées à ${me.company}.` : "Toutes les missions transporteur."}</p>
    {me.role === "transporteur" && <a className={`${s.btn} ${s.btnLight}`} style={{ marginBottom: 12 }} href="/app/admin">👥 Mes chauffeurs</a>}
    <div className={s.tabs} role="tablist">
      {TABS.map(t => <button key={t.id} role="tab" aria-selected={cur === t.id} className={`${s.tab} ${cur === t.id ? s.tabOn : ""}`} onClick={() => setTab(t.id)}>{t.label}{missions ? ` (${count(t.id)})` : ""}</button>)}
    </div>
    {err && <div className={s.err}>{err}</div>}
    {!missions && !err && <p className={s.muted}>Chargement des missions…</p>}
    {missions && !shown.length && <div className={s.card}><p className={s.muted} style={{ margin: 0 }}>Aucune mission {cur === "en_cours" ? "en cours" : cur === "a_venir" ? "à venir" : "terminée"}.</p></div>}
    {shown.map(m => <article key={m.id} className={`${s.card} ${s.mission}`} data-mission={m.id}>
      <div className={s.mHead}>
        <span className={s.mDate}>{dayFr(m.date)}</span>
        <span className={`${s.badge} ${m.stage === "en_cours" ? s.bLive : m.stage === "terminee" ? s.bDone : ""}`}>{m.done}/{m.total} livrée{m.total > 1 ? "s" : ""}</span>
      </div>
      <p className={s.mLine}>📦 Chargement <b>{m.hub.name}</b> à {m.departTime.replace(":", " h ")}{m.hub.address && <><br /><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.hub.address)}`} target="_blank" rel="noreferrer" style={{ color: "#1e3a8a" }}>{m.hub.address}</a></>}</p>
      {me.role !== "chauffeur" && <p className={s.mLine}>🚚 {m.carrier}{m.driverName ? ` · chauffeur : ${m.driverName}` : " · chauffeur à choisir"}</p>}
      <ul className={s.clients}>
        {m.clients.map((c, i) => <li key={c.id}><span><b>{i + 1}. {c.name}</b>{c.city ? ` · ${c.city}` : ""}{c.slot ? <><br /><span className={s.muted}>{c.slot}</span></> : null}</span><span className={s.st}>{c.status}</span></li>)}
      </ul>
      {manage && m.stage !== "terminee" && <>
        <label className={s.label} htmlFor={`d-${m.id}`}>Chauffeur</label>
        <select id={`d-${m.id}`} className={s.select} value={m.driverUserId || ""} disabled={busy === m.id} onChange={e => assign(m, e.target.value)}>
          <option value="">{m.driverName && !m.driverUserId ? `${m.driverName} (sans compte)` : "— Choisir le chauffeur —"}</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}{me.role === "fondateur" && d.company ? ` · ${d.company}` : ""}</option>)}
        </select>
      </>}
      {m.link ? <a className={s.btn} href={m.link}>{m.stage === "terminee" ? "Voir la mission" : "Ouvrir la mission"}</a> : <p className={s.muted}>Lien de mission indisponible.</p>}
    </article>)}
    <PushButton />
  </main>;
}
