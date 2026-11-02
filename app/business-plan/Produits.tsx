"use client";
import {Fragment,useMemo,useState} from "react";
import s from "../planificateur/planif.module.css";
import c from "../sourcing/sourcing.module.css";
import {GOODS,GOODS_VERDICT,type Good} from "../../lib/goods-data";

const eur=(n:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Math.round(n||0));
export type MixState=Record<string,number>;

/** Produits hors véhicules : classement, calendrier de commande et composition d’un conteneur. */
export default function Produits({mix,onMix}:{mix:MixState;onMix:(m:MixState)=>void}){
 const [fam,setFam]=useState<Good["family"]|"all">("all");const [open,setOpen]=useState("");const [free,setFree]=useState(12);
 const rows=useMemo(()=>[...GOODS].sort((a,b)=>b.score-a.score||((b.marginUnit||0)/(b.volM3||1))-((a.marginUnit||0)/(a.volM3||1))),[]);
 const shown=rows.filter(g=>fam==="all"||g.family===fam);
 const vol=GOODS.reduce((a,g)=>a+(mix[g.id]||0)*(g.volM3||0),0),margin=GOODS.reduce((a,g)=>a+(mix[g.id]||0)*(g.marginUnit||0),0);
 if(!GOODS.length)return <section className={s.card}><h2>🛍️ Autres produits</h2><p className={s.muted}>Recherche en cours…</p></section>;
 return <section className={s.card}>
  <h2>🛍️ Autres produits à glisser dans les conteneurs</h2>
  {GOODS_VERDICT?<p className={s.tip} style={{whiteSpace:"pre-line"}}>{GOODS_VERDICT}</p>:null}
  <h3>📦 Composer un conteneur (espace libre ≈ {free} m³)</h3>
  <div className={s.biz}>
   <div><small>Espace libre</small><b><input type="number" value={free} onChange={e=>setFree(Number(e.target.value)||0)} style={{width:60,padding:4}}/> m³</b></div>
   <div className={vol>free?s.neg:""}><small>Volume chargé</small><b>{vol.toFixed(1)} m³</b></div>
   <div className={s.pos}><small>Marge en plus / conteneur</small><b>{eur(margin)}</b></div>
   <div><small>Par an (≈ 24 conteneurs)</small><b>{eur(margin*24)}</b></div>
  </div>
  <div className={c.filters}><button className={fam==="all"?c.on:""} onClick={()=>setFam("all")}>Tout</button>{(["Particuliers","Pros","Saison / obligation"] as const).map(f=><button key={f} className={fam===f?c.on:""} onClick={()=>setFam(f)}>{f}</button>)}</div>
  <div className={s.tableWrap}><table className={s.dtable} style={{minWidth:980}}><thead><tr><th>Quantité / conteneur</th><th>Produit</th><th>Marché France</th><th>Prix France / Chine</th><th>Volume</th><th>Marge / unité</th><th>Marge / m³</th><th>Quand commander</th><th>Note</th></tr></thead><tbody>
   {shown.map(g=><Fragment key={g.id}><tr>
    <td><input type="number" min={0} value={mix[g.id]||0} onChange={e=>onMix({...mix,[g.id]:Math.max(0,Number(e.target.value)||0)})} style={{width:64,padding:4}}/></td>
    <td style={{whiteSpace:"normal",minWidth:170,cursor:"pointer"}} onClick={()=>setOpen(open===g.id?"":g.id)}><b>{g.name}</b><small>{g.family} · {g.fitsInCar?"tient dans une voiture":"autour des voitures"} · {open===g.id?"▲":"▼ détails"}</small></td>
    <td style={{whiteSpace:"normal",minWidth:150}}>{g.marketFr}</td>
    <td style={{whiteSpace:"normal",minWidth:150}}>{g.priceFr}<small>usine : {g.fob}</small></td>
    <td>{g.volM3!=null?`${g.volM3} m³`:"?"}</td>
    <td><b>{g.marginUnit!=null?eur(g.marginUnit):"?"}</b></td>
    <td>{g.marginUnit!=null&&g.volM3?eur(g.marginUnit/g.volM3):"?"}</td>
    <td style={{whiteSpace:"normal"}}>{g.orderBy}<small>vente : {g.window}</small></td>
    <td><b style={{color:g.score>=4?"#067647":g.score===3?"#b54708":"#7a8594"}}>{"★".repeat(g.score)}{"☆".repeat(5-g.score)}</b></td>
   </tr>{open===g.id?<tr><td colSpan={9} style={{whiteSpace:"normal",textAlign:"left",background:"#fcfcfd"}}><ul className={c.ul}>
    <li><b>Pourquoi un vendeur local gagne</b> : {g.localAdvantage}</li><li><b>Concurrence</b> : {g.competition}</li><li><b>Conformité</b> : {g.compliance}</li><li><b>Antidumping</b> : {g.antidumping}</li><li><b>Verdict</b> : {g.verdict}</li>
    {g.sources.length?<li><small>📎 {g.sources.join(" · ")}</small></li>:null}
   </ul></td></tr>:null}</Fragment>)}
  </tbody></table></div>
  <p className={s.muted}>Règles : tout doit être déclaré (liste de colisage, douane), ton nom d’importateur sur le produit (règlement sécurité GPSR), éco-organisme pour l’électronique (DEEE) et les meubles (éco-mobilier). Prix chinois = annonces, pas des devis.</p>
 </section>;
}
