import type { Metadata } from "next";
import { seoCities } from "../../lib/seo-cities";

export const metadata: Metadata = {
  title: "Voiture sans permis en France | Prix, villes et livraison NeoDrive",
  description: "Trouvez une voiture sans permis électrique NeoDrive et découvrez nos pages locales : Toulouse, Paris, Lyon, Marseille, Bordeaux, Lille, Nantes, Strasbourg, Montpellier, Nice et plus.",
  alternates: { canonical: "https://www.easydrive-auto.fr/voiture-sans-permis" },
};

export default function VoitureSansPermisHub() {
  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"46px 20px 76px",fontFamily:"Arial,sans-serif",lineHeight:1.6,color:"#111"}}>
      <section style={{padding:"34px 0 38px"}}>
        <span style={{fontWeight:900,color:"#ef5b2a",letterSpacing:1,fontSize:13}}>VOITURE SANS PERMIS · FRANCE</span>
        <h1 style={{fontSize:"clamp(38px,6vw,66px)",lineHeight:1,letterSpacing:-2,margin:"12px 0 18px"}}>Une voiture sans permis électrique, livrée près de chez vous</h1>
        <p style={{fontSize:19,color:"#555",maxWidth:820}}>NeoDrive est une marque toulousaine de voiture sans permis électrique. Nos véhicules peuvent être présentés à distance avec de vraies photos et vidéos puis livrés partout en France selon les disponibilités et le planning logistique.</p>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:24}}>
          <a href="/produit" style={{padding:"14px 18px",borderRadius:12,background:"#111",color:"#fff",textDecoration:"none",fontWeight:900}}>Voir la NeoDrive</a>
          <a href="https://wa.me/33628261446" style={{padding:"14px 18px",borderRadius:12,background:"#25d366",color:"#fff",textDecoration:"none",fontWeight:900}}>Recevoir photos et disponibilité</a>
        </div>
      </section>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,margin:"24px 0 50px"}}>
        <div style={{padding:20,border:"1px solid #e7e7e7",borderRadius:18}}><strong style={{fontSize:24}}>Dès 3 990 € TTC</strong><p style={{marginBottom:0,color:"#666"}}>Prix d'entrée de gamme selon version et délai.</p></div>
        <div style={{padding:20,border:"1px solid #e7e7e7",borderRadius:18}}><strong style={{fontSize:24}}>100 % électrique</strong><p style={{marginBottom:0,color:"#666"}}>Recharge sur une prise domestique adaptée à l'usage prévu.</p></div>
        <div style={{padding:20,border:"1px solid #e7e7e7",borderRadius:18}}><strong style={{fontSize:24}}>Livraison France</strong><p style={{marginBottom:0,color:"#666"}}>Organisation du rendez-vous directement avec le client.</p></div>
      </section>

      <section>
        <h2 style={{fontSize:32,letterSpacing:-1}}>Voiture sans permis par ville</h2>
        <p style={{color:"#666",maxWidth:820}}>Ces pages ne prétendent pas qu'une concession NeoDrive existe dans chaque ville. Elles expliquent concrètement comment acheter, voir et recevoir une NeoDrive depuis votre région.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14,marginTop:22}}>
          {seoCities.map(city => (
            <a key={city.slug} href={`/voiture-sans-permis/${city.slug}`} style={{display:"block",padding:20,borderRadius:18,border:"1px solid #e5e5e5",textDecoration:"none",color:"#111",background:"#fafafa"}}>
              <strong style={{fontSize:19}}>Voiture sans permis {city.city}</strong>
              <div style={{color:"#777",marginTop:5}}>{city.department} ({city.departmentCode}) · {city.region}</div>
            </a>
          ))}
        </div>
      </section>

      <section style={{marginTop:54,padding:28,borderRadius:22,background:"#111",color:"#fff"}}>
        <h2 style={{fontSize:30,marginTop:0}}>Les recherches les plus importantes avant l'achat</h2>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {[
            ["Voiture sans permis électrique","/voiture-sans-permis-electrique"],
            ["Voiture sans permis pas chère","/prix-voiture-sans-permis"],
            ["Voiture sans permis d'occasion","/voiture-sans-permis-occasion"],
            ["Citroën Ami ou NeoDrive","/citroen-ami-ou-neodrive"],
            ["Fiat Topolino ou NeoDrive","/fiat-topolino-ou-neodrive"],
            ["Permis AM","/guide-voiture-sans-permis"],
            ["Vidéos réelles","/videos"],
          ].map(([label,url]) => <a key={url} href={url} style={{color:"#fff",border:"1px solid #444",padding:"10px 13px",borderRadius:999,textDecoration:"none",fontWeight:800}}>{label}</a>)}
        </div>
      </section>
    </main>
  );
}
