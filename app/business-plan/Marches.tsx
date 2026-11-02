"use client";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import {BRANDS_2025,KEY_FACTS,REGULATION,SEGMENTS,VSP_FR} from "../../lib/market-data";

/** Ventes de VSP neuves en France, année par année. */
function Bars(){
 const W=640,H=190,mx=Math.max(...VSP_FR.map(v=>v.units)),bw=(W-40)/VSP_FR.length;
 return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}} role="img" aria-label="Ventes de voitures sans permis neuves en France">
  {VSP_FR.map((v,i)=>{const h=(v.units/mx)*(H-50),x=20+i*bw;return <g key={v.year}>
   <rect x={x+6} y={H-24-h} width={bw-12} height={h} rx={6} fill={v.year===2025?"#b42318":v.year===2024?"#ff7a00":"#16202e"} opacity={v.est?0.45:1}/>
   <text x={x+bw/2} y={H-28-h} fontSize={11} textAnchor="middle" fontWeight={800} fill="#16202e">{Math.round(v.units/1000)}k</text>
   <text x={x+bw/2} y={H-8} fontSize={11} textAnchor="middle" fill="#7a8594">{v.year}</text></g>;})}
 </svg>;
}
/** Carte des marchés : croissance (horizontal) × adapté à NeoDrive (vertical). */
function Map(){
 const W=640,H=260,x=(g:number)=>40+(Math.max(-0.15,Math.min(0.3,g))+0.15)/0.45*(W-80),y=(f:number)=>H-30-(f-0.5)/5*(H-50);
 return <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}} role="img" aria-label="Croissance et adéquation des marchés">
  <rect x={x(0.05)} y={10} width={W-40-x(0.05)} height={y(3)-10} fill="#ecfdf3"/>
  <line x1={x(0)} x2={x(0)} y1={10} y2={H-30} stroke="#d4d7db" strokeDasharray="4 4"/>
  <text x={W-44} y={24} fontSize={11} textAnchor="end" fill="#067647" fontWeight={800}>croissance + bien pour toi</text>
  {SEGMENTS.map(sg=><g key={sg.id}><circle cx={x(sg.growthNum)} cy={y(sg.fit)} r={9} fill="#ff7a00" opacity={0.85}/><text x={x(sg.growthNum)+12} y={y(sg.fit)+4} fontSize={11} fill="#16202e" fontWeight={700}>{sg.name.replace(/^\S+\s/,"").split(" (")[0]}</text></g>)}
  <text x={W/2} y={H-6} fontSize={11} textAnchor="middle" fill="#7a8594">← marché qui baisse · croissance par an · marché qui monte →</text>
  <text x={10} y={20} fontSize={11} fill="#7a8594">adapté à NeoDrive ↑</text>
 </svg>;
}

export default function Marches(){
 return <section className={s.card}>
  <h2>🌍 Marchés : taille et dynamique</h2>
  <h3>🚗 Voitures sans permis neuves en France</h3>
  <Bars/>
  <p className={s.tip}>De ≈ 13 000/an avant 2020 à <b>31 638 en 2024</b> (effet Citroën Ami), puis <b>24 977 en 2025 (−21 %)</b> : fin du bonus de 900 € et Euro 5+. Mais le <b>diesel s’effondre</b> (≈ 25 % du marché) et l’<b>électrique monte</b> (≈ 75 %). Barres claires = estimations.</p>
  <div className={c.list}>{KEY_FACTS.map(f=><div key={f.t} className={c.w} style={{gridTemplateColumns:"1fr"}}><div><b>{f.t} : {f.v}</b><small>{f.src}</small></div></div>)}</div>

  <h3>🏷️ Qui vend en 2025</h3>
  <div className={c.bars}>{BRANDS_2025.map(b=><div key={b.brand} className={c.bar}><span>{b.brand}</span><i><span style={{width:`${b.share/30*100}%`}}/></i><b>{Math.round(b.share)}%</b></div>)}</div>
  <p className={s.muted}>{BRANDS_2025.map(b=>`${b.brand} : ${b.units.toLocaleString("fr-FR")} · ${b.price}`).join(" — ")}. Stellantis (Ami + Topolino) = 57 %, vendu surtout en location. Les marques historiques s’effondrent : leurs clients cherchent moins cher.</p>

  <h3>⚖️ Réglementation : risques et chances</h3>
  <div className={c.list}>{REGULATION.map(r=><div key={r.topic} className={c.sup} style={{borderColor:r.kind==="risque"?"#fecdca":"#abefc6"}}><b>{r.kind==="risque"?"⚠️":"✅"} {r.topic}</b><small className={s.muted}>{r.when}</small><p className={s.muted} style={{color:"#16202e"}}>{r.impact}</p><small className={s.muted}>Source : {r.src}</small></div>)}</div>

  <h3>🗺️ Les autres marchés</h3>
  <Map/>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:760}}><thead><tr><th>Marché</th><th>Taille</th><th>Croissance</th><th>Clients</th><th>Barrières</th><th>Pour toi</th></tr></thead><tbody>
   {SEGMENTS.map(sg=><tr key={sg.id}><td style={{whiteSpace:"normal",minWidth:150}}><b>{sg.name}</b><small>{sg.players}</small></td><td style={{whiteSpace:"normal",minWidth:180}}>{sg.fr}<small>{sg.eu}</small></td><td style={{whiteSpace:"normal"}}>{sg.growth}</td><td style={{whiteSpace:"normal",minWidth:160}}>{sg.addressable}</td><td style={{whiteSpace:"normal"}}>{sg.barriers}</td><td style={{whiteSpace:"normal",minWidth:180}}><b>{"★".repeat(sg.fit)}{"☆".repeat(5-sg.fit)}</b><small>{sg.dynamics}</small></td></tr>)}
  </tbody></table></div>
  <p className={s.muted}>Sources par ligne : {SEGMENTS.map(sg=>`${sg.name.replace(/^\S+\s/,"")} — ${sg.sources}`).join(" · ")}. Les études de cabinets (taille en $) sont peu fiables et souvent contradictoires.</p>
 </section>;
}
