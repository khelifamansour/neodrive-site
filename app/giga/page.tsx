"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import c from "./giga.module.css";
import { Login, STATUS, Unauthorized, fmtDate, gigaApi, storedCode } from "./client";

type Row = { id: string; created_at: string; period: string | null; status: string; error: string | null; cost_tokens: number | null; resume: string[]; meta: { web_search?: boolean } | null };

export default function GigaList() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [rows, setRows] = useState<Row[]>([]); const [who, setWho] = useState("");
  const [pc, setPc] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");

  const load = useCallback(async (code = storedCode()) => {
    try { const j = await gigaApi<{ reports: Row[]; who: string }>({ action: "list" }, code); setRows(j.reports); setWho(j.who); setPc(code); setState("ready"); }
    catch (e) { if (e instanceof Unauthorized) { setState("login"); throw e; } setMsg((e as Error).message); setState("ready"); }
  }, []);
  useEffect(() => { load().catch(() => null); }, [load]);
  const running = rows.some(r => r.status === "running");
  useEffect(() => { if (!running) return; const t = setInterval(() => load(pc).catch(() => null), 10000); return () => clearInterval(t); }, [running, pc, load]);

  const run = async () => {
    if (!confirm("Lancer une nouvelle analyse maintenant ? Elle prend 2 à 4 minutes et coûte environ 0,30 € d’IA. Vous recevrez l’e-mail à la fin.")) return;
    setBusy(true); setMsg("");
    try { await gigaApi({ action: "run" }, pc); setMsg("✅ Analyse lancée. Cette page se met à jour toute seule."); await load(pc); }
    catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  };

  if (state === "loading") return <main className={c.page}><p className={c.muted} style={{ padding: 30 }}>Chargement…</p></main>;
  if (state === "login") return <Login onOk={code => load(code)} />;

  return <main className={c.page}><div className={c.wrap}>
    <div className={c.top}><Link href="/organisation" className={c.back}>← Organisation</Link></div>
    <p className={c.kicker}>NeoDrive · Intelligence</p>
    <h1 className={c.h1}>🧠 Giga Analyse</h1>
    <p className={c.muted}>Toutes les 2 semaines (le 1er et le 15 du mois), l’IA lit vos chiffres (prospects, Hana, SAV, pièces, stock, rentabilité) et l’actualité du marché, puis vous envoie un rapport : opportunités, menaces, produits à tester et chemins de croissance.</p>
    {who === "owner" ? <div style={{ marginTop: 16 }}>
      <button className={`${c.btn} ${c.btnBrand}`} onClick={run} disabled={busy || running}>{running ? <><span className={c.spin} /> Analyse en cours…</> : busy ? "…" : "⚡ Lancer une analyse maintenant"}</button>
    </div> : null}
    {msg ? <p className={c.msg}>{msg}</p> : null}

    <div className={c.list}>
      {rows.length === 0 ? <div className={`${c.card} ${c.empty}`}>Aucun rapport pour l’instant. {who === "owner" ? "Lancez la première analyse avec le bouton ci-dessus." : "Le premier arrivera le 1er ou le 15 du mois."}</div> : null}
      {rows.map(r => <Link key={r.id} href={`/giga/${r.id}`} className={`${c.card} ${c.row}`}>
        <div className={c.rowMain}>
          <p className={c.rowTitle}>{r.period || "Analyse"}</p>
          <p className={c.small}>{fmtDate(r.created_at)}{r.meta && r.meta.web_search === false ? " · sans recherche web" : ""}</p>
          {r.resume?.length ? r.resume.map((l, i) => <p key={i} className={c.rowText}>{l}</p>) : r.status === "error" || r.status === "interrupted" ? <p className={c.rowText} style={{ color: "#b42318" }}>{r.error || "L’analyse s’est arrêtée avant la fin."}</p> : null}
        </div>
        <span className={`${c.badge} ${c["b_" + r.status] || ""}`}>{r.status === "running" ? <span className={c.spin} style={{ width: 10, height: 10, borderWidth: 2, marginRight: 6, verticalAlign: -1 }} /> : null}{STATUS[r.status] || r.status}</span>
      </Link>)}
    </div>
  </div></main>;
}
