"use client";
import {useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import {DOSSIERS,cashCurve,numbers,planFor,score,verdictOf,type Dossier} from "../../lib/dossiers";
import {FILL_AVOID,FILL_PLAN,FREE_SPACE,WORKSHOP,WORKSHOP_FIRST} from "../../lib/fill-plan";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
const k=(n:number)=>`${n<0?"−":""}${Math.abs(Math.round(n/1000)).toLocaleString("fr-FR")} k€`;
const MOIS=["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];

/** Frise : les étapes de l'histoire, mois par mois. */
function Story({d}:{d:Dossier}){
 const m0=d.firstOrder.month-1;
 const steps:[number,string,string][]=[[-1,"📨","Devis, échantillon, certificats"],[0,"✍️","Commande + acompte 30 %"],[2,"💳","Solde + fret"],[4,"🚢","Arrivée au hub, démo, annonces"],[5,"💶","Premières ventes"],[7,"🔁","Bilan : recommander ou arrêter"]];
 const W=640,x=(i:number)=>30+(i+1)*(W-60)/8;
 return <svg viewBox={`0 0 ${W} 120`} style={{width:"100%",height:"auto"}} role="img" aria-label="Étapes">
  <line x1={20} x2={W-20} y1={50} y2={50} stroke="#d4d7db" strokeWidth={3}/>
  {steps.map(([o,ic,t],i)=><g key={i}><circle cx={x(o)} cy={50} r={14} fill={i===4?"#067647":"#16202e"}/><text x={x(o)} y={55} fontSize={13} textAnchor="middle">{ic}</text>
   <text x={x(o)} y={24} fontSize={11} textAnchor="middle" fontWeight={800} fill="#16202e">{MOIS[(m0+o+12)%12]}</text>
   <text x={x(o)} y={84} fontSize={10} textAnchor="middle" fill="#435063">{t.length>22?t.slice(0,22)+"…":t}</text></g>)}
  {d.seasonMonths?<text x={W/2} y={110} fontSize={11} textAnchor="middle" fill="#b54708" fontWeight={700}>Saison de vente : {d.seasonMonths.map(m=>MOIS[m-1]).join(", ")}</text>:null}
 </svg>;
}
/** Courbe de trésorerie de la 1re commande. */
function Cash({d}:{d:Dossier}){
 const {curve,payback}=cashCurve(d,14);const W=640,H=150,lo=Math.min(...curve,0),hi=Math.max(...curve,1);
 const x=(i:number)=>30+i*(W-40)/(curve.length-1),y=(v:number)=>H-20-(v-lo)/(hi-lo||1)*(H-35);
 return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}} role="img" aria-label="Trésorerie">
  <line x1={30} x2={W-10} y1={y(0)} y2={y(0)} stroke="#7a8594" strokeDasharray="4 4"/>
  <polyline points={curve.map((v,i)=>`${x(i)},${y(v)}`).join(" ")} fill="none" stroke="#ff7a00" strokeWidth={3}/>
  {curve.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r={3} fill={v<0?"#b42318":"#067647"}/>)}
  <text x={32} y={y(lo)+14} fontSize={10} fill="#b42318">{k(lo)} au plus bas</text>
  <text x={W-12} y={y(hi)-6} fontSize={10} fill="#067647" textAnchor="end">{k(curve[curve.length-1])} après 14 mois</text>
  {payback!==null?<text x={x(payback)} y={H-4} fontSize={10} textAnchor="middle" fill="#067647" fontWeight={800}>remboursé mois {payback}</text>:null}
 </svg>;
}

export default function Decision(){
 const [budget,setBudget]=useState(30000);const [open,setOpen]=useState("");
 const rows=useMemo(()=>DOSSIERS.map(d=>({d,n:numbers(d),sc:score(d)})).sort((a,b)=>b.sc-a.sc),[]);
 const plan=useMemo(()=>planFor(budget,DOSSIERS),[budget]);
 const planProfit=plan.pick.reduce((a,x)=>a+numbers(x.d).yearProfit,0);
 return <section className={s.card}>
  <h2>🧭 Ma décision</h2>
  <div className={c.edit}><label><span>Budget que tu peux mettre maintenant</span><input type="number" step={5000} value={budget} onChange={e=>setBudget(Number(e.target.value)||0)}/></label></div>
  <div className={s.dash}>
   <b style={{fontSize:18}}>Avec {eur(budget)}, voici ce que je ferais :</b>
   <ol style={{margin:0,paddingLeft:20,display:"grid",gap:6}}>{plan.pick.map(({d,budget:b})=><li key={d.id}><b>{d.name}</b> — commander <b>{d.firstOrder.qty}</b> en <b>{MOIS[d.firstOrder.month-1]}</b> ({eur(b)}). {d.firstOrder.why}</li>)}</ol>
   <span>Reste {eur(plan.left)} de sécurité · si les tests marchent : ≈ <b>{k(planProfit)} de marge par an</b> à la part de marché visée.</span>
   <small className={s.muted}>Règle : on prend les dossiers les mieux notés (argent, écart de prix, solidité des données) tant que la 1re commande rentre dans le budget. Rien n’est commandé avant devis + certificats.</small>
  </div>

  <h3>📦 Remplir le conteneur : le 2e business dans les cartons</h3>
  <p className={s.tip}>Conteneur 40&apos; HC ≈ {FREE_SPACE.containerM3} m³ − 9 VSP ≈ {FREE_SPACE.carsM3} m³ → ≈ {FREE_SPACE.aroundM3} m³ autour et sous les voitures + {FREE_SPACE.insideCarsM3} m³ dans les habitacles, et ≈ {FREE_SPACE.freeTonnes} t de charge libre. Tout doit être déclaré (liste de colisage, douane).</p>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:1000}}><thead><tr><th>Lot</th><th>Quantité</th><th>m³</th><th>Achat rendu</th><th>Vente HT</th><th>Marge</th><th>Prix France / Chine</th><th>Ventes / mois</th></tr></thead><tbody>
   {FILL_PLAN.map(l=><tr key={l.id}><td style={{whiteSpace:"normal",minWidth:220}}><b>{l.verdict} {l.name}</b><small>{l.suppliers.map(x=>x.url?<a key={x.name} href={x.url} target="_blank" rel="noreferrer">{x.name} </a>:<span key={x.name}>{x.name} </span>)}</small></td>
    <td>{l.qty}</td><td>{l.m3}</td><td>{eur(l.cost)}</td><td>{eur(l.sales)}</td><td><b>{eur(l.margin)}</b><small>×{(l.sales/l.cost).toFixed(1)}</small></td>
    <td style={{whiteSpace:"normal",minWidth:200}}>{l.priceFr}<small>usine : {l.fob}</small></td><td style={{whiteSpace:"normal"}}>{l.perMonth}<small>{l.sell}</small></td></tr>)}
   <tr><td><b>Total</b></td><td/><td><b>{FILL_PLAN.reduce((a,l)=>a+l.m3,0).toFixed(1)}</b></td><td><b>{eur(FILL_PLAN.reduce((a,l)=>a+l.cost,0))}</b></td><td><b>{eur(FILL_PLAN.reduce((a,l)=>a+l.sales,0))}</b></td><td><b>{eur(FILL_PLAN.reduce((a,l)=>a+l.margin,0))}</b></td><td colSpan={2}>écoulé en 6–9 mois (estimation)</td></tr>
  </tbody></table></div>
  <details><summary style={{cursor:"pointer",fontWeight:800}}>📄 Documents à exiger · ❌ ce qu’on écarte</summary><ul className={c.ul}>{FILL_PLAN.map(l=><li key={l.id}><b>{l.name}</b> : {l.docs}</li>)}{FILL_AVOID.map(x=><li key={x}>{x}</li>)}</ul></details>

  <h3>🔧 Gamme « Atelier &amp; Chantier » (modèle PRP-Machines vu sur Leboncoin)</h3>
  <p className={s.tip}>PRP-Machines : 1–2 salariés, un dépôt, des machines chinoises sous sa marque, vendues sur Leboncoin dans toute la France. Le même modèle, avec tes conteneurs, ton dépôt et ta remorque.</p>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:1000}}><thead><tr><th>#</th><th>Produit</th><th>Usine</th><th>Arrivé</th><th>Prix France</th><th>Ventes / mois</th><th>Marge / u</th><th>Marge / mois</th><th>m³</th></tr></thead><tbody>
   {WORKSHOP.map(w=><tr key={w.rank}><td>{w.rank}</td><td style={{whiteSpace:"normal",minWidth:200}}><b>{w.verdict} {w.name}</b>{w.note?<small>{w.note}</small>:null}</td><td style={{whiteSpace:"normal"}}>{w.fob}</td><td>{eur(w.landed)}</td><td style={{whiteSpace:"normal",minWidth:170}}>{w.priceFr}</td><td>{w.perMonth}</td><td>{eur(w.marginUnit)}</td><td><b>{eur(w.perMonth*w.marginUnit)}</b></td><td>{w.m3}</td></tr>)}
  </tbody></table></div>
  <div className={s.dash}><b>1er conteneur atelier (estimation) : {eur(WORKSHOP_FIRST.landedEur)} rendus → ≈ {eur(WORKSHOP_FIRST.marginEur)} de marge, ≈ {eur(WORKSHOP_FIRST.perMonthEur)} / mois</b>
   <ul className={c.ul}>{WORKSHOP_FIRST.lines.map(l=><li key={l.name}>{l.qty} × {l.name} — {l.m3} m³ — {l.fobUsd.toLocaleString("fr-FR")} $ FOB</li>)}</ul><small className={s.muted}>{WORKSHOP_FIRST.note}</small></div>

  <h3>🏆 Le classement</h3>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:1000}}><thead><tr><th>#</th><th>Produit</th><th>Marché France / an</th><th>Part visée</th><th>Ventes / an</th><th>Achat → vente</th><th>Marge / unité</th><th>Marge / an</th><th>Chance</th><th>1re commande</th><th>Décision</th></tr></thead><tbody>
   {rows.map(({d,n,sc},i)=>{const [v,col]=verdictOf(sc);return <tr key={d.id} onClick={()=>setOpen(open===d.id?"":d.id)} style={{cursor:"pointer"}}>
    <td><b>{i+1}</b></td><td style={{whiteSpace:"normal",minWidth:190}}><b>{d.name}</b><small>{open===d.id?"▲ fermer":"▼ ouvrir le dossier"}</small></td>
    <td>{d.market.est?"🧮":"📊"} {d.market.units.toLocaleString("fr-FR")}</td><td>{d.sharePct} %</td><td>{Math.round(n.yearUnits)}</td>
    <td>{eur(n.landed)} → {eur(d.sellTtc)}<small>×{n.ratio.toFixed(1)}</small></td><td><b>{eur(n.margin)}</b></td><td><b>{k(n.yearProfit)}</b></td><td>{Math.round(d.pOk*100)} %</td>
    <td>{d.firstOrder.qty} u. · {k(n.budget)}<small>{MOIS[d.firstOrder.month-1]}</small></td><td style={{color:col,fontWeight:900}}>{v}<small>note {sc}</small></td></tr>;})}
  </tbody></table></div>

  {rows.filter(r=>r.d.id===open).map(({d,n,sc})=>{const cc=cashCurve(d,14);return <div key={d.id} className={c.sup} style={{borderColor:"#ff7a00"}}>
   <div className={c.supTop}><div><b style={{fontSize:19}}>{d.name}</b><small>{verdictOf(sc)[0]} · solidité des données {"●".repeat(d.confidence)}{"○".repeat(5-d.confidence)}</small></div></div>
   <div className={s.biz}>
    <div><small>Marché France / an</small><b>{d.market.units.toLocaleString("fr-FR")}</b><span style={{fontSize:12}}>{d.market.label}</span></div>
    <div><small>Part visée (an 2)</small><b>{d.sharePct} % → {Math.round(n.yearUnits)}/an</b><span style={{fontSize:12}}>≈ {n.perMonth.toFixed(1)} par mois</span></div>
    <div><small>Prix d’achat usine</small><b>{d.fobUsd.toLocaleString("fr-FR")} $</b><span style={{fontSize:12}}>arrivé chez toi {eur(n.landed)}</span></div>
    <div><small>Prix de vente</small><b>{eur(d.sellTtc)} TTC</b><span style={{fontSize:12}}>{eur(n.ht)} HT</span></div>
    <div className={s.pos}><small>Marge par unité</small><b>{eur(n.margin)}</b><span style={{fontSize:12}}>après livraison, pub, SAV</span></div>
    <div className={s.pos}><small>Marge par an</small><b>{k(n.yearProfit)}</b></div>
    <div><small>1re commande</small><b>{d.firstOrder.qty} unités · {eur(n.budget)}</b><span style={{fontSize:12}}>en {MOIS[d.firstOrder.month-1]}</span></div>
    <div><small>Chance que ça passe</small><b>{Math.round(d.pOk*100)} %</b><span style={{fontSize:12}}>conformité, homologation, douane</span></div>
    <div><small>Remboursé</small><b>{cc.payback!==null?`mois ${cc.payback}`:"> 14 mois"}</b></div>
   </div>
   <h3 style={{fontSize:15}}>📖 L’histoire</h3><Story d={d}/>
   <h3 style={{fontSize:15}}>🏦 Ta trésorerie sur cette commande</h3><Cash d={d}/>
   <h3 style={{fontSize:15}}>🏭 Fournisseurs</h3>
   <div className={c.list}>{d.suppliers.map(x=><div key={x.name} className={c.w} style={{gridTemplateColumns:"1fr"}}><div><b>{x.name}</b> — {x.city}<small>{x.model} · {x.fob} · MOQ {x.moq} · {x.certs}{x.contact?` · ${x.contact}`:""}</small><small><a href={x.url} target="_blank" rel="noreferrer">{x.url}</a></small></div></div>)}</div>
   <h3 style={{fontSize:15}}>🏢 Qui gagne déjà de l’argent</h3>
   <ul className={c.ul}>{d.leaders.map(l=><li key={l.name}><b>{l.name}</b> : {l.ca}</li>)}</ul>
   <h3 style={{fontSize:15}}>✅ Pourquoi · ⚠️ Risques</h3>
   <ul className={c.ul}>{d.why.map(x=><li key={x}>✅ {x}</li>)}{d.risks.map(x=><li key={x}>⚠️ {x}</li>)}</ul>
   <p className={s.tip}><b>Première action :</b> {d.next}</p>
   <small className={s.muted}>Marché : {d.market.src}. Achat = prix usine × {"(1 + douane)"} + fret + transferts. Vente = prix de vente HT − frais par vente ({eur(d.extraUnit)}).</small>
  </div>;})}
 </section>;
}
