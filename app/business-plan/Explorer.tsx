"use client";
import {Fragment,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import {ALGERIA,CHAMPIONS,EXPLORE,EXPLORE_VERDICT,SIGNALS,patternScore,potential,type Cand} from "../../lib/explore-data";

const k=(n:number)=>`${Math.round(n/1000).toLocaleString("fr-FR")} k€`;
const REG:Record<Cand["regulated"],string>={none:"✅ libre",soft:"🟡 compétence à avoir",hard:"⛔ métier fermé"};

/** Explorer : chercher de nouveaux marchés selon les critères du fondateur. */
export default function Explorer(){
 const [minUnits,setMinUnits]=useState(20000);const [onlyRepeat,setOnlyRepeat]=useState(true);const [noHard,setNoHard]=useState(true);
 const [share,setShare]=useState(0.5);const [open,setOpen]=useState("");const [fam,setFam]=useState("all");
 const fams=[...new Set(EXPLORE.map(x=>x.family))];
 const rows=useMemo(()=>EXPLORE.map(x=>({x,ps:patternScore(x),pot:potential(x,share/100)})).sort((a,b)=>b.ps-a.ps),[share]);
 const ok=(x:Cand)=>(x.unitsFr??0)>=minUnits&&(!onlyRepeat||x.repeatable)&&(!noHard||x.regulated!=="hard");
 const shown=rows.filter(r=>fam==="all"||r.x.family===fam);
 const pass=shown.filter(r=>ok(r.x)),fail=shown.filter(r=>!ok(r.x));
 const Row=({x,ps,pot,dim}:{x:Cand;ps:number;pot:number;dim?:boolean})=><Fragment><tr style={dim?{opacity:.55}:{}} onClick={()=>setOpen(open===x.id?"":x.id)}>
  <td style={{whiteSpace:"normal",minWidth:200,cursor:"pointer"}}><b>{x.name}</b><small>{x.family} · {x.country} · {open===x.id?"▲":"▼ détails"}</small></td>
  <td>{x.unitsEst?"🧮":"📊"} <b>{x.unitsFr?x.unitsFr.toLocaleString("fr-FR"):"?"}</b><small>neufs / an</small></td>
  <td style={{whiteSpace:"normal",minWidth:140}}>{x.priceFr}<small>usine : {x.fob}</small></td>
  <td>{x.gap?`×${x.gap.toFixed(1)}`:"?"}</td>
  <td style={{whiteSpace:"normal",minWidth:150}}>{x.mutation}</td>
  <td>{x.saturation}/5</td>
  <td>{REG[x.regulated]}</td>
  <td>{x.repeatable?"✅":"❌"}</td>
  <td>{"★".repeat(x.fit)}{"☆".repeat(5-x.fit)}</td>
  <td><b>{pot>0?k(pot):"?"}</b><small>/ an à {share} %</small></td>
  <td><b style={{color:ps>=70?"#067647":ps>=55?"#b54708":"#7a8594"}}>{ps}</b></td>
 </tr>{open===x.id?<tr><td colSpan={11} style={{whiteSpace:"normal",textAlign:"left",background:"#fcfcfd"}}><ul className={c.ul}>
  <li><b>Marché</b> : {x.unitsSrc}</li><li><b>Qui vend aujourd’hui</b> : {x.incumbents}</li><li><b>Chinois / importateurs déjà présents</b> : {x.chinaPen}</li>
  <li><b>Barrière</b> : {x.barrier}</li><li><b>Logistique</b> : {x.logistics}</li><li><b>Marge estimée</b> : {x.marginUnit?`${x.marginUnit.toLocaleString("fr-FR")} € HT / unité (estimation)`:"à chiffrer"}</li>
  <li><b>Risques</b> : {x.risks}</li><li><b>Verdict</b> : {x.verdict}</li>
  {x.sources.length?<li><small>📎 {x.sources.join(" · ")}</small></li>:null}
 </ul></td></tr>:null}</Fragment>;
 const head=<thead><tr><th>Marché</th><th>Taille France</th><th>Prix France / usine</th><th>Écart</th><th>Ce qui change</th><th>Saturation</th><th>Métier</th><th>Répétable</th><th>Pour toi</th><th>Potentiel</th><th>Schéma VSP</th></tr></thead>;

 return <section className={s.card}>
  <h2>🔭 Explorer : trouver le prochain « voiture sans permis »</h2>
  <p className={s.tip}>Ton schéma gagnant : <b>un vieux marché</b> tenu par des marques européennes chères, protégé par une technologie (le moteur diesel) — puis <b>une mutation</b> (l’électrique) qui permet aux usines chinoises de faire la même chose 2–3× moins cher. La note <b>« schéma VSP »</b> mesure à quel point chaque marché ressemble à ça : taille, écart de prix, mutation en cours, peu d’importateurs, barrière technique (pas un métier fermé), répétable, adapté à toi.</p>
  {EXPLORE_VERDICT?<details open><summary style={{cursor:"pointer",fontWeight:900}}>🏆 Le résultat en bref</summary><p className={s.tip} style={{whiteSpace:"pre-line"}}>{EXPLORE_VERDICT}</p></details>:null}
  <div className={c.edit}>
   <label><span>Ventes neuves minimum / an</span><input type="number" step={5000} value={minUnits} onChange={e=>setMinUnits(Number(e.target.value)||0)}/></label>
   <label><span>Part de marché visée (%)</span><input type="number" step={0.1} value={share} onChange={e=>setShare(Number(e.target.value)||0)}/></label>
   <label><span>Filtres</span><span style={{display:"flex",gap:10,fontWeight:600}}><label><input type="checkbox" checked={onlyRepeat} onChange={e=>setOnlyRepeat(e.target.checked)} style={{width:"auto"}}/> répétable</label><label><input type="checkbox" checked={noHard} onChange={e=>setNoHard(e.target.checked)} style={{width:"auto"}}/> pas de métier fermé</label></span></label>
  </div>
  <div className={c.filters}><button className={fam==="all"?c.on:""} onClick={()=>setFam("all")}>Tout</button>{fams.map(f=><button key={f} className={fam===f?c.on:""} onClick={()=>setFam(f)}>{f}</button>)}</div>
  <h3>✅ Passent tes critères ({pass.length})</h3>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:1100}}>{head}<tbody>{pass.map(r=><Row key={r.x.id} {...r}/>)}</tbody></table></div>
  <details><summary style={{cursor:"pointer",fontWeight:800}}>❌ Ne passent pas ({fail.length}) — trop petits, pas répétables ou métier fermé</summary>
   <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:1100}}>{head}<tbody>{fail.map(r=><Row key={r.x.id} {...r} dim/>)}</tbody></table></div>
  </details>
  <h3>🏆 Les « Goupil » : qui gagne beaucoup sur une niche, et la faille chinoise</h3>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:900}}><thead><tr><th>Entreprise</th><th>Chiffre d’affaires</th><th>Volumes</th><th>Alternative chinoise</th><th>Antidumping</th><th>Pour toi</th></tr></thead><tbody>
   {[...CHAMPIONS].sort((a,b)=>b.opp-a.opp).map(x=><tr key={x.name}><td style={{whiteSpace:"normal",minWidth:160}}><b>{x.name}</b><small>{x.country} · {x.segment}</small></td><td style={{whiteSpace:"normal"}}>{x.ca}</td><td style={{whiteSpace:"normal"}}>{x.units}</td><td style={{whiteSpace:"normal",minWidth:150}}>{x.chinese}</td><td style={{whiteSpace:"normal"}}>{x.ad}</td><td style={{whiteSpace:"normal",minWidth:200}}><b>{"★".repeat(x.opp)}{"☆".repeat(5-x.opp)}</b><small>{x.why} — {x.src}</small></td></tr>)}
  </tbody></table></div>
  <h3>📡 Ce que la Chine exporte le plus vers l’Europe (2025–2026)</h3>
  <div className={c.bars}>{SIGNALS.map(x=><div key={x.cat} className={c.w} style={{gridTemplateColumns:"1fr auto"}}><div><b>{x.cat}</b><small>{x.evidence}</small></div><b>{x.growth}</b></div>)}</div>
  {EXPLORE_VERDICT?<><h3>🧠 Ce que j’en retiens</h3><p className={s.tip} style={{whiteSpace:"pre-line"}}>{EXPLORE_VERDICT}</p></>:null}

  {ALGERIA.opps.length?<><h3>🇩🇿 Algérie</h3>
   <p className={s.tip} style={{whiteSpace:"pre-line"}}>{ALGERIA.verdict}</p>
   <div className={c.list}>{ALGERIA.opps.map(o=><div key={o.id} className={c.sup}><div className={c.supTop}><div><b>{o.name}</b><small>Pour toi : {"★".repeat(o.fit)}{"☆".repeat(5-o.fit)} · mise {o.investment}</small></div></div><p className={s.muted} style={{color:"#16202e"}}>{o.what}</p><small className={s.muted}>Marché : {o.marketSize} · Barrière : {o.barrier} · Risques : {o.risks}</small>{o.sources.length?<small className={s.muted}>📎 {o.sources.join(" · ")}</small>:null}</div>)}</div>
   <details><summary style={{cursor:"pointer",fontWeight:800}}>📜 Les règles en Algérie ({ALGERIA.rules.length})</summary><ul className={c.ul}>{ALGERIA.rules.map(r=><li key={r.topic}><b>{r.topic}</b> : {r.detail} <small>({r.source})</small></li>)}</ul></details>
  </>:null}
 </section>;
}
