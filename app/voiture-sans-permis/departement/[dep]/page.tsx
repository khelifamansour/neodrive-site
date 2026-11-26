import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta, graph, organizationLd, productLd, breadcrumbLd, faqLd, ldJson, SITE } from "../../../../lib/seo-meta";
import { CONFORT_PRICE, CONFORT_STOCK, NOEL_ACTIVE, NOEL_NOTE, eur, totals, localFaq, seoDepartments, getSeoDepartment, departmentPath, ZONE_LABEL, inDep } from "../../../../lib/seo-local";
import { REGISTRATION_PRICE } from "../../../../lib/neodrive-pricing";

export const dynamicParams = false;

export function generateStaticParams() {
  return seoDepartments.map((d) => ({ dep: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ dep: string }> }): Promise<Metadata> {
  const { dep } = await params;
  const d = getSeoDepartment(dep);
  if (!d) return {};
  return pageMeta(
    departmentPath(d),
    `Voiture sans permis ${d.name} (${d.code}) : ${eur(CONFORT_PRICE)}, ${CONFORT_STOCK}`,
    `Voiture sans permis électrique neuve livrée ${inDep(d.name)} (${d.code}) : Confort ${eur(CONFORT_PRICE)} TTC en stock, livraison ${eur(d.delivery)} soit ${eur(CONFORT_PRICE + d.delivery)} livrée. 0 € d'acompte, paiement à la livraison, garantie 2 ans.`,
  );
}

const td: React.CSSProperties = { padding: "9px 8px", borderBottom: "1px solid #eee" };

export default async function DepartmentPage({ params }: { params: Promise<{ dep: string }> }) {
  const { dep } = await params;
  const d = getSeoDepartment(dep);
  if (!d) notFound();
  const rows = totals(d.delivery);
  const inPlace = inDep(d.name);
  const faq = localFaq(inPlace, d.delivery);
  const sameZone = seoDepartments.filter((x) => x.zone === d.zone && x.code !== d.code);
  const ld = graph(
    organizationLd, productLd,
    { "@type": "Service", name: `Livraison de voiture sans permis ${inPlace}`, provider: { "@id": `${SITE}/#organization` }, areaServed: { "@type": "AdministrativeArea", name: `${d.name} (${d.code})` }, offers: { "@type": "Offer", name: `Livraison ${inPlace}`, price: String(d.delivery), priceCurrency: "EUR" }, url: `${SITE}${departmentPath(d)}` },
    breadcrumbLd([["Accueil", "/"], ["Voiture sans permis", "/voiture-sans-permis"], [`${d.name} (${d.code})`, departmentPath(d)]]),
    faqLd(faq),
  );

  return (
    <main style={{maxWidth:1050,margin:"0 auto",padding:"44px 20px 78px",fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#111"}}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:ldJson(ld)}} />
      <nav aria-label="Fil d'Ariane" style={{fontSize:14,color:"#555"}}><Link href="/voiture-sans-permis" style={{color:"#555"}}>Voiture sans permis en France</Link> › {d.name}</nav>

      <section style={{padding:"30px 0 30px"}}>
        <span style={{fontWeight:900,color:"#ef5b2a",fontSize:13,letterSpacing:1}}>DÉPARTEMENT {d.code} · LIVRAISON {eur(d.delivery)}</span>
        <h1 style={{fontSize:"clamp(36px,6vw,60px)",lineHeight:1.02,letterSpacing:-2,margin:"12px 0 18px"}}>Voiture sans permis {inPlace} ({d.code})</h1>
        <p style={{fontSize:19,color:"#555",maxWidth:860}}>NeoDrive livre ses voitures sans permis électriques neuves partout {inPlace}, directement à votre adresse. Pas de concession ni d&apos;intermédiaire : vous voyez la voiture en photos et vidéos réelles, vous réservez sans acompte et vous payez à la livraison.</p>
        <p style={{fontSize:18,maxWidth:860,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:14,padding:"12px 16px"}}><strong>{NOEL_ACTIVE ? "Avant Noël : " : ""}Confort {eur(CONFORT_PRICE)} TTC en stock.</strong> {NOEL_NOTE}</p>
        <div style={{display:"flex",gap:11,flexWrap:"wrap",marginTop:20}}>
          <a href="/reservation" style={{background:"#ef5b2a",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Réserver sans acompte</a>
          <a href="/produit" style={{background:"#111",color:"#fff",padding:"14px 18px",borderRadius:12,textDecoration:"none",fontWeight:900}}>Voir la NeoDrive Confort</a>
        </div>
      </section>

      <section style={{marginBottom:40}}>
        <h2 style={{fontSize:30,letterSpacing:-1}}>Prix livré {inPlace}</h2>
        <p style={{color:"#555"}}>Le département {d.code} est en {ZONE_LABEL[d.zone]} : livraison à domicile {eur(d.delivery)}, quelle que soit la commune. Carte grise en option : {eur(REGISTRATION_PRICE)}.</p>
        <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%",minWidth:560,fontSize:15}}>
          <thead><tr>{["Version", "Prix", "Livrée", "Avec carte grise", "Disponibilité"].map(h => <th key={h} style={{textAlign:"left",padding:"10px 8px",background:"#111",color:"#fff"}}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(r => <tr key={r.key} style={{background:r.key === "confort" ? "#fff7ed" : "#fff"}}>
            <td style={{...td,fontWeight:r.key === "confort" ? 800 : 400}}>{r.label}</td><td style={td}>{eur(r.price)}</td><td style={td}>{eur(r.delivered)}</td><td style={td}>{eur(r.withRegistration)}</td><td style={td}>{r.availability}</td>
          </tr>)}</tbody>
        </table></div>
        <p style={{fontSize:13,color:"#666"}}>Prix TTC. Le total exact s&apos;affiche avec votre code postal sur la page de réservation.</p>
      </section>

      {d.cities.length ? <section style={{marginBottom:40}}>
        <h2 style={{fontSize:30,letterSpacing:-1}}>Villes {inPlace}</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          {d.cities.map(c => <a key={c.slug} href={`/voiture-sans-permis/${c.slug}`} style={{padding:16,border:"1px solid #ddd",borderRadius:14,textDecoration:"none",color:"#111"}}><strong>Voiture sans permis {c.city}</strong><div style={{color:"#777",fontSize:14}}>Aussi : {c.nearby.slice(0, 3).join(", ")}</div></a>)}
        </div>
      </section> : null}

      <section style={{padding:28,borderRadius:22,background:"#f5f5f5",marginBottom:40}}>
        <h2 style={{fontSize:28,marginTop:0}}>Ce que vous recevez</h2>
        <ul style={{marginBottom:0}}>
          <li>Une voiture sans permis électrique neuve, 2 places, limitée à 45 km/h (quadricycle léger L6e), conduite dès 14 ans avec le permis AM.</li>
          <li>Autonomie indicative de 50 à 70 km selon l&apos;usage ; recharge sur une prise domestique 220 V, sans borne.</li>
          <li>Garantie 2 ans, SAV et pièces suivis depuis la France.</li>
          <li>Livraison à domicile {inPlace}, inspection du véhicule avec vous et paiement à la remise.</li>
        </ul>
      </section>

      <section style={{marginBottom:40}}>
        <h2 style={{fontSize:30,letterSpacing:-1}}>Questions fréquentes {inPlace}</h2>
        {faq.map(([q, a]) => <div key={q}><h3>{q}</h3><p>{a}</p></div>)}
      </section>

      <nav style={{borderTop:"1px solid #e5e5e5",paddingTop:24}}>
        <strong>Même tarif de livraison ({eur(d.delivery)}) :</strong>{" "}
        {sameZone.map((x, i) => <span key={x.code}>{i > 0 ? " · " : ""}<a href={departmentPath(x)}>{x.name}</a></span>)}
        <p><Link href="/voiture-sans-permis">Toutes les villes et départements</Link> · <Link href="/blog/voiture-sans-permis-cadeau-noel">Offrir une voiture sans permis à Noël</Link> · <a href="/voiture-sans-permis-la-moins-chere">Comparatif des prix 2026</a></p>
      </nav>
    </main>
  );
}
