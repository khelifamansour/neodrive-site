import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSeoCity, seoCities } from "../../../lib/seo-cities";

export function generateStaticParams() {
  return seoCities.map((city) => ({ ville: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ ville: string }> }): Promise<Metadata> {
  const { ville } = await params;
  const city = getSeoCity(ville);
  if (!city) return {};
  return {
    title: `Voiture sans permis ${city.city} (${city.departmentCode}) | NeoDrive`,
    description: `Voiture sans permis électrique à ${city.city} : NeoDrive dès 3 990 € TTC selon version, photos et vidéos réelles, livraison à ${city.city} et en ${city.department}.`,
    alternates: { canonical: `https://www.easydrive-auto.fr/voiture-sans-permis/${city.slug}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  const city = getSeoCity(ville);
  if (!city) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Vente et livraison de voiture sans permis à ${city.city}`,
    serviceType: "Vente et livraison de voiture sans permis électrique",
    provider: {
      "@type": "Organization",
      name: "NeoDrive",
      url: "https://www.easydrive-auto.fr",
      address: {
        "@type": "PostalAddress",
        streetAddress: "31 rue Jean Nougaro",
        postalCode: "31600",
        addressLocality: "Muret",
        addressCountry: "FR",
      },
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${city.city}, ${city.department}, ${city.region}`,
    },
    url: `https://www.easydrive-auto.fr/voiture-sans-permis/${city.slug}`,
  };

  const otherCities = seoCities.filter((c) => c.slug !== city.slug).slice(0, 5);

  return (
    <main style={{maxWidth:1050,margin:"0 auto",padding:"44px 20px 78px",fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#111"}}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}} />
      <a href="/voiture-sans-permis" style={{color:"#555",textDecoration:"none"}}>← Voiture sans permis en France</a>

      <section style={{padding:"30px 0 34px"}}>
        <span style={{fontWeight:900,color:"#ef5b2a",fontSize:13,letterSpacing:1}}>{city.department.toUpperCase()} · {city.departmentCode}</span>
        <h1 style={{fontSize:"clamp(38px,6vw,64px)",lineHeight:1,letterSpacing:-2,margin:"12px 0 18px"}}>Voiture sans permis à {city.city}</h1>
        <p style={{fontSize:19,color:"#555",maxWidth:850}}>{city.intro}</p>
        <div style={{display:"flex",gap:11,flexWrap:"wrap",marginTop:24}}>
          <a href="/produit" style={{background:"#111",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Voir la NeoDrive</a>
          <a href="https://wa.me/33628261446" style={{background:"#25d366",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Recevoir une vidéo personnalisée</a>
        </div>
      </section>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:46}}>
        <div style={{padding:20,borderRadius:18,border:"1px solid #e6e6e6"}}><strong style={{fontSize:22}}>Dès 3 990 € TTC</strong><p style={{color:"#666",marginBottom:0}}>Selon version choisie et délai disponible.</p></div>
        <div style={{padding:20,borderRadius:18,border:"1px solid #e6e6e6"}}><strong style={{fontSize:22}}>100 % électrique</strong><p style={{color:"#666",marginBottom:0}}>Deux places et recharge sur prise adaptée.</p></div>
        <div style={{padding:20,borderRadius:18,border:"1px solid #e6e6e6"}}><strong style={{fontSize:22}}>Livraison à {city.city}</strong><p style={{color:"#666",marginBottom:0}}>Rendez-vous organisé directement avec le client.</p></div>
      </section>

      <section style={{marginBottom:44}}>
        <h2 style={{fontSize:32,letterSpacing:-1}}>Comment acheter une NeoDrive à {city.city} ?</h2>
        <ol style={{paddingLeft:22,fontSize:17}}>
          <li><strong>Voir le véhicule réellement :</strong> photos, vidéos et présentation à distance avant de décider.</li>
          <li><strong>Choisir la version :</strong> nous expliquons les équipements, le prix, le délai et les conditions applicables.</li>
          <li><strong>Préparation :</strong> le véhicule est contrôlé et préparé avant la remise.</li>
          <li><strong>Livraison :</strong> {city.delivery}</li>
        </ol>
      </section>

      <section style={{padding:28,borderRadius:22,background:"#f5f5f5",marginBottom:44}}>
        <h2 style={{fontSize:30,marginTop:0}}>Une VSP pour quels usages autour de {city.city} ?</h2>
        <p>Une voiture sans permis reste destinée aux déplacements compatibles avec sa catégorie et ses limitations. Autour de {city.city}, elle peut notamment convenir à :</p>
        <ul>
          {city.useCases.map((use) => <li key={use}>{use}</li>)}
        </ul>
        <p style={{marginBottom:0}}><strong>Zones régulièrement demandées :</strong> {city.nearby.join(", ")} et plus largement {city.department}.</p>
      </section>

      <section style={{marginBottom:46}}>
        <h2 style={{fontSize:32,letterSpacing:-1}}>Comparer avant d'acheter</h2>
        <p style={{color:"#555"}}>Pour une recherche comme « voiture sans permis {city.city} », le plus utile est de comparer le coût total, l'état du véhicule, la batterie, le SAV, les pièces et la livraison — pas seulement la proximité d'une concession.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          {[
            ["Voiture sans permis d'occasion","/voiture-sans-permis-occasion"],
            ["Prix d'une voiture sans permis","/prix-voiture-sans-permis"],
            ["Citroën Ami ou NeoDrive","/citroen-ami-ou-neodrive"],
            ["Fiat Topolino ou NeoDrive","/fiat-topolino-ou-neodrive"],
          ].map(([label,url]) => <a key={url} href={url} style={{padding:16,border:"1px solid #ddd",borderRadius:14,textDecoration:"none",color:"#111",fontWeight:850}}>{label} →</a>)}
        </div>
      </section>

      <section style={{marginBottom:44}}>
        <h2 style={{fontSize:32,letterSpacing:-1}}>Questions fréquentes à {city.city}</h2>
        <h3>NeoDrive a-t-elle une concession à {city.city} ?</h3>
        <p>{city.slug === "toulouse" ? "NeoDrive est basée à Muret, près de Toulouse. Une présentation peut être organisée sur rendez-vous selon les disponibilités." : `Nous ne prétendons pas avoir une concession NeoDrive à ${city.city}. L'achat peut être préparé à distance et la voiture livrée à l'adresse convenue.`}</p>
        <h3>Peut-on voir la voiture avant la livraison ?</h3>
        <p>Oui. Nous pouvons envoyer des photos et vidéos réelles, organiser une présentation vidéo et répondre aux questions techniques avant la décision.</p>
        <h3>La livraison est-elle possible autour de {city.city} ?</h3>
        <p>Oui, la livraison est proposée en France et peut être organisée à {city.city}, dans les communes proches et plus largement en {city.department}, selon le planning et les conditions de livraison.</p>
      </section>

      <section style={{padding:28,borderRadius:22,background:"#111",color:"#fff"}}>
        <h2 style={{marginTop:0,fontSize:30}}>Vous êtes à {city.city} ?</h2>
        <p>Demandez les photos, une vidéo réelle du véhicule et les disponibilités actuelles avant de vous déplacer.</p>
        <a href="https://wa.me/33628261446" style={{display:"inline-block",background:"#25d366",color:"#fff",padding:"13px 17px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Contacter NeoDrive sur WhatsApp</a>
      </section>

      <nav style={{marginTop:38,borderTop:"1px solid #e5e5e5",paddingTop:24}}>
        <strong>Autres villes :</strong>{" "}
        {otherCities.map((c, index) => <span key={c.slug}>{index > 0 ? " · " : ""}<a href={`/voiture-sans-permis/${c.slug}`}>{c.city}</a></span>)}
      </nav>
    </main>
  );
}
