"use client";
import {useEffect,useRef} from "react";
import type {Stop} from "../../lib/planif";
import {splitTrips} from "../../lib/planif";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { L?: any } }
let loading: Promise<any> | null = null;
function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; js.onload = () => res(window.L); js.onerror = rej; document.head.appendChild(js);
  });
  return loading;
}

/** Carte de la tournée : chaque voyage (chargement → livraisons → hub suivant) a sa couleur. */
export default function TourMap({stops,path}:{stops:Stop[];path?:[number,number][]}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let map:any=null,dead=false;
  loadLeaflet().then(L=>{
   if(dead||!ref.current)return;
   map=L.map(ref.current,{scrollWheelZoom:false,attributionControl:true});
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(map);
   if(path?.length)L.polyline(path,{color:"#94a3b8",weight:3,opacity:.55}).addTo(map);
   const trips=splitTrips(stops);
   for(const t of trips){
    const pts=[t.hub,...t.clients,...(t.next?[t.next]:[])].map(p=>[p.lat,p.lng]);
    // livraisons en trait plein, trajet à vide (vers le hub suivant) en pointillés
    L.polyline(pts.slice(0,t.clients.length+1),{color:t.color,weight:5,opacity:.95}).addTo(map);
    if(t.next)L.polyline(pts.slice(t.clients.length),{color:t.color,weight:3,opacity:.8,dashArray:"8 8"}).addTo(map);
   }
   let n=0;const seen=new Set<string>();
   stops.forEach((s,i)=>{
    if(s.kind==="client"){n++;const t=trips.find(x=>x.clients.includes(s));
     L.marker([s.lat,s.lng],{icon:L.divIcon({className:"",html:`<div style="background:${t?.color||"#111"};color:#fff;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;font:900 13px system-ui;box-shadow:0 2px 6px rgba(0,0,0,.35)">${n}</div>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map).bindPopup(`<b>${n}. ${s.name}</b><br>${s.label}${s.phone?`<br>📞 ${s.phone}`:""}`);
    }else if(!seen.has(s.id)){seen.add(s.id);
     const visits=stops.filter(x=>x.kind==="depot"&&x.id===s.id&&x.loaded).length;
     L.marker([s.lat,s.lng],{zIndexOffset:1000,icon:L.divIcon({className:"",html:`<div style="background:#16202e;color:#fff;border:2px solid #fff;border-radius:10px;padding:4px 8px;font:800 12px system-ui;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.35)">📦 ${s.name.split(" (")[0]}${visits?` ×${visits}`:""}</div>`,iconSize:[0,0],iconAnchor:[20,14]})}).addTo(map).bindPopup(`<b>Hub ${s.name}</b><br>${visits} chargement${visits>1?"s":""}`);
    }
    void i;
   });
   map.fitBounds(L.latLngBounds(stops.map(s=>[s.lat,s.lng])),{padding:[30,30]});
  }).catch(()=>{if(ref.current)ref.current.innerHTML="<p style='padding:20px;color:#7a8594'>Carte indisponible (connexion).</p>";});
  return()=>{dead=true;if(map)map.remove();};
 },[stops,path]);
 return <div ref={ref} style={{height:380,borderRadius:16,overflow:"hidden",border:"1px solid #e5e7eb",background:"#eef2f5"}}/>;
}
