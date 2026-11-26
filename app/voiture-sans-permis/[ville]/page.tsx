import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSeoCity, seoCities } from "../../../lib/seo-cities";
import { pageMeta, graph, organizationLd, productLd, breadcrumbLd, faqLd, ldJson, SITE } from "../../../lib/seo-meta";
import { CONFORT_PRICE, CONFORT_STOCK, NOEL_ACTIVE, NOEL_NOTE, eur, totals, localFaq, departmentByCode, departmentPath, ZONE_LABEL, inDep, atCity } from "../../../lib/seo-local";
import { REGISTRATION_PRICE } from "../../../lib/neodrive-pricing";
import SocialLinks from "../../_components/SocialLinks";

export function generateStaticParams() {
  return seoCities.map((city) => ({ ville: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ ville: string }> }): Promise<Metadata> {
  const { ville } = await params;
  const city = getSeoCity(ville);
  if (!city) return {};
  const dep = departmentByCode(city.departmentCode);
  const delivery = dep ? ` Livraison ${eur(dep.delivery)} ${inDep(city.department)}.` : "";
  return pageMeta(
    `/voiture-sans-permis/${city.slug}`,
    `Voiture sans permis ${city.city} : ${eur(CONFORT_PRICE)}, ${CONFORT_STOCK}`,
    `Voiture sans permis électrique neuve ${atCity(city.city)} (${city.departmentCode}) : NeoDrive Confort ${eur(CONFORT_PRICE)} TTC en stock, livrée chez vous en 2 à 3 semaines.${delivery} 0 € d'acompte, paiement à la livraison.`,
  );
}

const card: React.CSSProperties = { padding: 20, borderRadius: 18, border: "1px solid #e6e6e6" };
const h2: React.CSSProperties = { fontSize: 32, letterSpacing: -1 };

export default async function CityPage({ params }: { params: Promise<{ ville: string }> }) {
  const { ville } = await params;
  const city = getSeoCity(ville);
  if (!city) notFound();
  const dep = departmentByCode(city.departmentCode);
  const delivery = dep?.delivery ?? 790;
  const rows = totals(delivery);
  const faq = localFaq(`${atCity(city.city)}`, delivery);
  const path = `/voiture-sans-permis/${city.slug}`;

  const service = {
    "@type": "Service",
    name: `Vente et livraison de voiture sans permis ${atCity(city.city)}`,
    serviceType: "Vente et livraison de voiture sans permis électrique",
    provider: { "@id": `${SITE}/#organization` },
    areaServed: { "@type": "City", name: city.city, containedInPlace: { "@type": "AdministrativeArea", name: `${city.department}, ${city.region}` } },
    offers: { "@type": "Offer", name: `Livraison ${atCity(city.city)}`, price: String(delivery), priceCurrency: "EUR" },
    url: `${SITE}${path}`,
  };
  const ld = graph(
    organizationLd, productLd, service,
    breadcrumbLd([["Accueil", "/"], ["Voiture sans permis", "/voiture-sans-permis"], ...(dep ? [[`${dep.name} (${dep.code})`, departmentPath(dep)] as [string, string]] : []), [`Voiture sans permis ${city.city}`, path]]),
    faqLd(faq),
  );

  const sameDep = seoCities.filter((c) => c.slug !== city.slug && c.departmentCode === city.departmentCode);
  const sameRegion = seoCities.filter((c) => c.slug !== city.slug && c.region === city.region && c.departmentCode !== city.departmentCode).slice(0, 8);

  return (
    <main style={{maxWidth:1050,margin:"0 auto",padding:"44px 20px 78px",fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#111"}}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:ldJson(ld)}} />
      <nav aria-label="Fil d'Ariane" style={{fontSize:14,color:"#555"}}>
        <Link href="/voiture-sans-permis" style={{color:"#555"}}>Voiture sans permis en France</Link>
        {dep ? <> › <a href={departmentPath(dep)} style={{color:"#555"}}>{dep.name}</a></> : null} › {city.city}
      </nav>

      <section style={{padding:"30px 0 34px"}}>
        <span style={{fontWeight:900,color:"#ef5b2a",fontSize:13,letterSpacing:1}}>{city.department.toUpperCase()} · {city.departmentCode}</span>
        <h1 style={{fontSize:"clamp(38px,6vw,64px)",lineHeight:1,letterSpacing:-2,margin:"12px 0 18px"}}>Voiture sans permis {atCity(city.city)}</h1>
        <p style={{fontSize:19,color:"#555",maxWidth:850}}>{city.intro}</p>
        <p style={{fontSize:18,maxWidth:850,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:14,padding:"12px 16px"}}>
          <strong>{NOEL_ACTIVE ? "Avant Noël : " : ""}NeoDrive Confort {eur(CONFORT_PRICE)} TTC, en stock.</strong> {NOEL_NOTE}
        </p>
        <div style={{display:"flex",gap:11,flexWrap:"wrap",marginTop:24}}>
          <a href="/reservation" style={{background:"#ef5b2a",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Réserver sans acompte</a>
          <a href="/produit" style={{background:"#111",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Voir la NeoDrive Confort</a>
          <a href="https://wa.me/33676192234" style={{background:"#25d366",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Recevoir une vidéo réelle</a>
        </div>
      </section>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14,marginBottom:46}}>
        <div style={card}><strong style={{fontSize:22}}>{eur(CONFORT_PRICE)} TTC</strong><p style={{color:"#666",marginBottom:0}}>NeoDrive Confort neuve, en stock, garantie 2 ans.</p></div>
        <div style={card}><strong style={{fontSize:22}}>Livraison {eur(delivery)}</strong><p style={{color:"#666",marginBottom:0}}>Tarif fixe pour {city.city} et tout le département {city.departmentCode}.</p></div>
        <div style={card}><strong style={{fontSize:22}}>0 € d&apos;acompte</strong><p style={{color:"#666",marginBottom:0}}>Paiement à la livraison, après avoir vu la voiture.</p></div>
        <div style={card}><strong style={{fontSize:22}}>2 à 3 semaines</strong><p style={{color:"#666",marginBottom:0}}>Délai de livraison de la Confort en stock.</p></div>
      </section>

      <section style={{marginBottom:44}}>
        <h2 style={h2}>Prix d&apos;une voiture sans permis livrée {atCity(city.city)}</h2>
        <p style={{color:"#555"}}>{city.city} est en {dep ? ZONE_LABEL[dep.zone] : "zone de livraison standard"} de notre barème : la livraison à domicile coûte {eur(delivery)}. La carte grise peut être faite par nos soins pour {eur(REGISTRATION_PRICE)}.</p>
        <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%",minWidth:560,fontSize:15}}>
          <thead><tr>{["Version", "Prix", `Livrée ${atCity(city.city)}`, "Avec carte grise", "Disponibilité"].map(h => <th key={h} style={{textAlign:"left",padding:"10px 8px",background:"#111",color:"#fff"}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.key} style={{background:r.key === "confort" ? "#fff7ed" : "#fff"}}>
            <td style={{padding:"9px 8px",borderBottom:"1px solid #eee",fontWeight:r.key === "confort" ? 800 : 400}}>{r.label}</td>
            <td style={{padding:"9px 8px",borderBottom:"1px solid #eee"}}>{eur(r.price)}</td>
            <td style={{padding:"9px 8px",borderBottom:"1px solid #eee"}}>{eur(r.delivered)}</td>
            <td style={{padding:"9px 8px",borderBottom:"1px solid #eee"}}>{eur(r.withRegistration)}</td>
            <td style={{padding:"9px 8px",borderBottom:"1px solid #eee"}}>{r.availability}</td>
          </tr>)}</tbody>
        </table></div>
        <p style={{fontSize:13,color:"#666"}}>Prix TTC. Le total exact est recalculé avec votre code postal sur la page de réservation.</p>
      </section>

      <section style={{marginBottom:44}}>
        <h2 style={h2}>Comment acheter une NeoDrive {atCity(city.city)} ?</h2>
        <ol style={{paddingLeft:22,fontSize:17}}>
          <li><strong>Voir le véhicule réellement :</strong> photos, vidéos et présentation à distance avant de décider.</li>
          <li><strong>Réserver sans acompte :</strong> en ligne, en quelques minutes, avec le prix livré {atCity(city.city)} affiché.</li>
          <li><strong>Préparation :</strong> le véhicule est contrôlé et préparé avant le départ.</li>
          <li><strong>Livraison :</strong> {city.delivery} Vous payez à la remise, après inspection avec le livreur.</li>
        </ol>
      </section>

      <section style={{padding:28,borderRadius:22,background:"#f5f5f5",marginBottom:44}}>
        <h2 style={{fontSize:30,marginTop:0}}>Une voiture sans permis pour quels usages autour de {city.city} ?</h2>
        <p>Une voiture sans permis (45 km/h, 2 places, dès 14 ans avec le permis AM) reste destinée aux déplacements compatibles avec sa catégorie. Avec une autonomie indicative de 50 à 70 km et une recharge sur prise 220 V, elle peut notamment convenir à :</p>
        <ul>
          {city.useCases.map((use) => <li key={use}>{use}</li>)}
        </ul>
        <p style={{marginBottom:0}}><strong>Livraison au même tarif à :</strong> {city.nearby.join(", ")} et partout {inDep(city.department)}.</p>
      </section>

      <section style={{marginBottom:46}}>
        <h2 style={h2}>Comparer avant d&apos;acheter</h2>
        <p style={{color:"#555"}}>Pour une recherche comme « voiture sans permis {city.city} », comparez le coût total livré, l&apos;état du véhicule, la garantie, le SAV, les pièces et le délai — pas seulement la proximité d&apos;une concession.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          {[
            ["Voiture sans permis la moins chère (2026)","/voiture-sans-permis-la-moins-chere"],
            ["Voiture sans permis neuve en stock","/offres/voiture-sans-permis-neuve-en-stock"],
            ["Offrir une voiture sans permis à Noël","/blog/voiture-sans-permis-cadeau-noel"],
            ["Prix total livré, carte grise comprise","/blog/prix-voiture-sans-permis-neuve-livree"],
            ["Citroën Ami ou NeoDrive","/citroen-ami-ou-neodrive"],
            ["Voiture sans permis d'occasion","/voiture-sans-permis-occasion"],
          ].map(([label,url]) => <a key={url} href={url} style={{padding:16,border:"1px solid #ddd",borderRadius:14,textDecoration:"none",color:"#111",fontWeight:850}}>{label} →</a>)}
        </div>
      </section>

      <section style={{marginBottom:44}}>
        <h2 style={h2}>Questions fréquentes {atCity(city.city)}</h2>
        {faq.map(([q, a]) => <div key={q}><h3>{q}</h3><p>{a}</p></div>)}
      </section>

      <section style={{padding:28,borderRadius:22,background:"#111",color:"#fff"}}>
        <h2 style={{marginTop:0,fontSize:30}}>Vous êtes {atCity(city.city)} ?</h2>
        <p>Réservez la Confort sans acompte ou demandez d&apos;abord les photos et une vidéo réelle du véhicule. Plus de 40 clients ont déjà été livrés partout en France.</p>
        <div style={{display:"flex",gap:11,flexWrap:"wrap"}}>
          <a href="/reservation" style={{display:"inline-block",background:"#ef5b2a",color:"#fff",padding:"13px 17px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Réserver sans acompte</a>
          <a href="https://wa.me/33676192234" style={{display:"inline-block",background:"#25d366",color:"#fff",padding:"13px 17px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Contacter NeoDrive sur WhatsApp</a>
        </div>
      </section>

      <div style={{padding:"34px 0 6px"}}><SocialLinks/></div>

      <nav style={{marginTop:38,borderTop:"1px solid #e5e5e5",paddingTop:24,display:"grid",gap:10}}>
        {dep ? <div><strong>Département :</strong> <a href={departmentPath(dep)}>Voiture sans permis {dep.name} ({dep.code})</a></div> : null}
        {sameDep.length ? <div><strong>Aussi {inDep(city.department)} :</strong>{" "}{sameDep.map((c, i) => <span key={c.slug}>{i > 0 ? " · " : ""}<a href={`/voiture-sans-permis/${c.slug}`}>{c.city}</a></span>)}</div> : null}
        {sameRegion.length ? <div><strong>Autres villes en {city.region} :</strong>{" "}{sameRegion.map((c, i) => <span key={c.slug}>{i > 0 ? " · " : ""}<a href={`/voiture-sans-permis/${c.slug}`}>{c.city}</a></span>)}</div> : null}
      </nav>
    </main>
  );
}
