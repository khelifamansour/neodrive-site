"use client";

import { FormEvent, useMemo, useState } from "react";

type Model = { id: string; name: string; price: number };
type Simulation = {
  city: string;
  department: string;
  distanceOneWay: number;
  roundTripDistance: number;
  totalMissionHours: number;
  deliveryPrice: number;
};

const MODELS: Model[] = [
  { id: "confort", name: "NeoDrive Confort", price: 4990 },
  { id: "essentielle", name: "NeoDrive Essentielle", price: 3990 },
  { id: "lithium", name: "NeoDrive Lithium", price: 5990 },
];

const PREPARATION_PRICE = 150;
const ORIGIN = { lat: 43.4607, lon: 1.3256, label: "Muret (31)" };
const ZONE_1 = new Set(["31", "81", "82", "32", "09"]);
const ZONE_2 = new Set(["11", "12", "46", "47", "33", "65", "66", "34", "30", "40", "24", "19", "87", "15"]);
const ZONE_3 = new Set(["75", "92", "93", "94", "95", "77", "78", "91", "13", "69", "63", "16", "17", "86"]);

const ZONES = [
  { title: "Zone 1", price: 450, text: "Haute-Garonne, Tarn, Tarn-et-Garonne, Gers, Ariège" },
  { title: "Zone 2", price: 590, text: "Sud-Ouest et départements proches : Aude, Aveyron, Lot, Lot-et-Garonne, Gironde, Hautes-Pyrénées, Pyrénées-Orientales, Hérault, Gard, Landes, Dordogne, Corrèze, Haute-Vienne, Cantal" },
  { title: "Zone 3", price: 690, text: "Île-de-France et plusieurs grandes zones : Paris, petite et grande couronne, Bouches-du-Rhône, Rhône, Puy-de-Dôme, Charente, Charente-Maritime, Vienne" },
  { title: "Zone 4", price: 790, text: "Bretagne, Pays de la Loire, Alsace, Nord, Normandie, Grand Est et autres départements éloignés" },
];

function money(value: number) {
  return `${Math.round(value).toLocaleString("fr-FR")} €`;
}

function deliveryPriceFor(department: string) {
  if (ZONE_1.has(department)) return 450;
  if (ZONE_2.has(department)) return 590;
  if (ZONE_3.has(department)) return 690;
  return 790;
}

function departmentFromPostalCode(postalCode: string) {
  if (postalCode.startsWith("20")) return "20";
  return postalCode.slice(0, 2);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

async function getRouteForPostalCode(postalCode: string) {
  const communeResponse = await fetch(
    `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(postalCode)}&fields=nom,centre,codeDepartement&format=json&geometry=centre`,
    { cache: "no-store" }
  );
  if (!communeResponse.ok) throw new Error("Impossible de trouver ce code postal.");
  const communes = await communeResponse.json();
  const commune = Array.isArray(communes) ? communes[0] : null;
  if (!commune?.centre?.coordinates?.length) throw new Error("Code postal introuvable ou non pris en charge.");

  const [lon, lat] = commune.centre.coordinates as [number, number];
  let distanceKm: number | null = null;
  let durationHours: number | null = null;

  try {
    const routeResponse = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${ORIGIN.lon},${ORIGIN.lat};${lon},${lat}?overview=false&steps=false`,
      { cache: "no-store" }
    );
    if (routeResponse.ok) {
      const routeData = await routeResponse.json();
      const route = routeData?.routes?.[0];
      if (route?.distance && route?.duration) {
        distanceKm = route.distance / 1000;
        durationHours = route.duration / 3600;
      }
    }
  } catch {
    // Estimation de secours ci-dessous.
  }

  if (!distanceKm || !durationHours) {
    const directDistance = haversineKm(ORIGIN.lat, ORIGIN.lon, lat, lon);
    distanceKm = directDistance * 1.22;
    durationHours = distanceKm / 78;
  }

  return {
    city: commune.nom as string,
    department: (commune.codeDepartement as string) || departmentFromPostalCode(postalCode),
    distanceKm,
    durationHours,
  };
}

export default function LivraisonFusionPage() {
  const [postalCode, setPostalCode] = useState("");
  const [modelId, setModelId] = useState("confort");
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = useMemo(() => MODELS.find((m) => m.id === modelId) ?? MODELS[0], [modelId]);

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = postalCode.replace(/\D/g, "").slice(0, 5);
    setPostalCode(clean);
    setError("");
    if (clean.length !== 5) {
      setError("Veuillez saisir un code postal français à 5 chiffres.");
      return;
    }

    setLoading(true);
    try {
      const route = await getRouteForPostalCode(clean);
      const department = departmentFromPostalCode(clean);
      const deliveryPrice = deliveryPriceFor(department);
      const roundTripDistance = route.distanceKm * 2;
      const drivingHours = route.durationHours * 2;
      const pauseHours = Math.floor(drivingHours / 4.5) * 0.5;
      const totalMissionHours = Math.max(3, drivingHours + pauseHours + 2.5);
      setSimulation({
        city: route.city,
        department: route.department,
        distanceOneWay: route.distanceKm,
        roundTripDistance,
        totalMissionHours,
        deliveryPrice,
      });
    } catch (caught) {
      setSimulation(null);
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const total = simulation ? selectedModel.price + PREPARATION_PRICE + simulation.deliveryPrice : null;
  const shortTrip = simulation ? simulation.distanceOneWay < 120 : false;

  return (
    <main className="fusionPage">
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">LIVRAISON NEODRIVE · FRANCE ENTIÈRE</span>
          <h1>Votre NeoDrive livrée simplement, jusqu’à chez vous.</h1>
          <p className="lead">
            Nous organisons la livraison de votre véhicule de A à Z. Vous connaissez votre tarif avant la réservation,
            le rendez-vous est organisé avec vous et la remise comprend l’inspection ainsi que la prise en main du véhicule.
          </p>
          <div className="heroChecks">
            <span>✓ Paiement à la livraison selon votre commande</span>
            <span>✓ Inspection du véhicule lors de la remise</span>
            <span>✓ Explications et prise en main sur place</span>
          </div>
          <div className="heroActions">
            <a className="primary" href="#simulateur">Calculer mon tarif</a>
            <a className="secondary" href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20un%20tarif%20de%20livraison%20NeoDrive">Nous contacter</a>
          </div>
        </div>

        <div className="heroVisual">
          <img src="/livraison-neodrive.webp" alt="Livraison réelle d'une NeoDrive" />
          <div className="photoBadge">
            <b>Livraison réelle</b>
            <span>Votre NeoDrive est prise en charge avec un transport adapté.</span>
          </div>
        </div>
      </section>

      <section className="simpleSteps">
        <article><b>01</b><span><strong>Vous choisissez</strong>Votre modèle et votre adresse.</span></article>
        <article><b>02</b><span><strong>Nous organisons</strong>Transport et rendez-vous sont planifiés.</span></article>
        <article><b>03</b><span><strong>Vous recevez</strong>Inspection, paiement et prise en main.</span></article>
      </section>

      <section className="section prices">
        <div className="heading">
          <span className="eyebrow">FORFAITS DE LIVRAISON</span>
          <h2>Des tarifs simples selon votre zone.</h2>
          <p>Le tarif exact est confirmé avant la réservation. Vous savez ainsi à l’avance combien vous coûtera la livraison de votre NeoDrive.</p>
        </div>
        <div className="zones">
          {ZONES.map((zone) => (
            <article key={zone.title}>
              <div className="zoneTop"><span>{zone.title}</span><strong>{money(zone.price)}</strong></div>
              <p>{zone.text}</p>
            </article>
          ))}
        </div>
        <p className="fine">Hors frais de carte grise éventuels. Le tarif est confirmé avant validation de la commande.</p>
      </section>

      <section id="simulateur" className="simSection">
        <div className="simIntro">
          <span className="eyebrow">VOTRE TARIF EN QUELQUES SECONDES</span>
          <h2>Calculez votre NeoDrive livrée.</h2>
          <p>Entrez simplement votre code postal. Le simulateur vous montre votre forfait et l’ampleur de la mission, sans détail inutile de nos coûts internes.</p>
        </div>

        <form className="calculator" onSubmit={simulate}>
          <label>
            <span>Votre NeoDrive</span>
            <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
              {MODELS.map((model) => <option key={model.id} value={model.id}>{model.name} — {money(model.price)} TTC</option>)}
            </select>
          </label>
          <label>
            <span>Votre code postal</span>
            <input inputMode="numeric" maxLength={5} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="Ex. 67000" />
          </label>
          <button type="submit" disabled={loading}>{loading ? "Calcul en cours…" : "Calculer ma livraison"}</button>
          {error ? <p className="error">{error}</p> : null}
        </form>

        {simulation ? (
          <div className="result">
            <div className="resultTop">
              <div>
                <span className="eyebrow">VOTRE BUDGET GLOBAL</span>
                <h3>{money(total ?? 0)} TTC</h3>
                <p>{selectedModel.name} livrée à {simulation.city} ({simulation.department})</p>
              </div>
              <div className="resultPrice">
                <span>Forfait livraison</span>
                <strong>{money(simulation.deliveryPrice)}</strong>
              </div>
            </div>

            <div className="priceBreakdown">
              <article><span>Véhicule</span><strong>{money(selectedModel.price)}</strong></article>
              <article><span>Préparation / mise en route</span><strong>{money(PREPARATION_PRICE)}</strong></article>
              <article><span>Livraison à domicile</span><strong>{money(simulation.deliveryPrice)}</strong></article>
            </div>

            <div className="missionLine">
              <article><span>Distance jusqu’à vous</span><strong>{Math.round(simulation.distanceOneWay).toLocaleString("fr-FR")} km</strong></article>
              <article><span>Mission aller-retour</span><strong>{Math.round(simulation.roundTripDistance).toLocaleString("fr-FR")} km</strong></article>
              <article><span>Temps mobilisé estimé</span><strong>≈ {Math.round(simulation.totalMissionHours)} h</strong></article>
            </div>

            <div className={shortTrip ? "contextNote short" : "contextNote"}>
              <b>{shortTrip ? "Pourquoi un forfait minimum, même à proximité ?" : "Un forfait pour une mission complète"}</b>
              <p>
                {shortTrip
                  ? "Même pour une courte distance, une livraison nécessite un créneau dédié, un conducteur, un véhicule tracteur et une remorque, ainsi que la préparation, le chargement, le déchargement, la remise, l’inspection et la prise en main. Le tarif ne correspond donc pas à un simple prix au kilomètre."
                  : "Votre forfait couvre une mission organisée de bout en bout : préparation, transport, rendez-vous, remise du véhicule, inspection, prise en main et retour du conducteur et du matériel."}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="section included">
        <div className="heading">
          <span className="eyebrow">CE QUE VOUS ACHETEZ VRAIMENT</span>
          <h2>Une remise accompagnée, pas un simple dépôt.</h2>
          <p>La livraison est pensée pour que vous receviez votre véhicule dans de bonnes conditions et que vous sachiez l’utiliser avant le départ de notre intervenant.</p>
        </div>
        <div className="benefits">
          <article><span>01</span><h3>Préparation & chargement</h3><p>Vérification, préparation au départ, chargement et arrimage.</p></article>
          <article><span>02</span><h3>Transport jusqu’à votre porte</h3><p>Votre véhicule est acheminé à l’adresse convenue avec vous.</p></article>
          <article><span>03</span><h3>Inspection avec vous</h3><p>Vous pouvez regarder le véhicule et vérifier sa remise sur place.</p></article>
          <article><span>04</span><h3>Prise en main</h3><p>Recharge, commandes, autonomie et bonnes pratiques vous sont expliquées.</p></article>
        </div>
      </section>

      <section className="section discreetPickup">
        <details>
          <summary>Vous préférez récupérer votre véhicule sur un point de remise ?</summary>
          <div className="pickupContent">
            <p className="pickupIntro">
              Nos entrepôts sont des sites logistiques et ne sont pas ouverts directement au public. Lorsque cela est possible,
              nous pouvons cependant organiser une remise sur un point adapté, uniquement sur rendez-vous et selon disponibilité.
            </p>
            <div className="pickupGrid">
              <article className="local">
                <span>Région toulousaine</span>
                <h3>Point de remise proche de Muret</h3>
                <strong>249 €</strong>
                <p>Transfert local, préparation de la remise, rendez-vous, inspection et explications de prise en main.</p>
              </article>
              <article>
                <span>Autre région · selon disponibilité</span>
                <h3>Point de remise régional</h3>
                <strong>450 €</strong>
                <p>Ce forfait correspond notamment au transfert logistique du véhicule depuis Toulouse vers la région concernée, puis à l’organisation de sa remise sur rendez-vous.</p>
              </article>
            </div>
            <p className="pickupFine">Un point régional n’est proposé que lorsqu’une solution de remise est disponible dans la zone concernée.</p>
          </div>
        </details>
      </section>

      <section className="faq section">
        <div className="heading"><span className="eyebrow">QUESTIONS FRÉQUENTES</span><h2>Les réponses simples.</h2></div>
        <div className="faqList">
          <details><summary>Puis-je venir directement à l’entrepôt ?</summary><p>Non. Nos entrepôts sont des sites logistiques avec circulation de véhicules, remorques et opérations de manutention ; ils ne sont pas conçus pour recevoir le public. Une remise sur un point adapté peut être proposée selon la région.</p></details>
          <details><summary>Pourquoi le tarif ne dépend-il pas uniquement des kilomètres ?</summary><p>Parce que chaque livraison mobilise une personne, du matériel de transport et un créneau dédié, avec préparation, chargement, transport, déchargement, inspection et prise en main.</p></details>
          <details><summary>Puis-je voir le véhicule avant l’achat ?</summary><p>Oui. Selon les disponibilités, nous pouvons organiser une présentation en visio, envoyer des photos et vidéos, ou proposer une démonstration locale sur rendez-vous.</p></details>
          <details><summary>Quand est-ce que je paie ?</summary><p>Selon les modalités prévues sur votre commande, le paiement peut être finalisé au moment de la remise du véhicule.</p></details>
        </div>
      </section>

      <section className="cta">
        <div><span>VOTRE NEODRIVE, SANS SURPRISE</span><h2>Connaissez votre tarif avant de réserver.</h2><p>Calculez votre livraison ou contactez-nous directement pour confirmer votre destination.</p></div>
        <div className="ctaButtons"><a href="#simulateur">Calculer mon tarif</a><a href="https://wa.me/33628261446?text=Bonjour%2C%20je%20souhaite%20confirmer%20mon%20tarif%20de%20livraison%20NeoDrive">WhatsApp</a></div>
      </section>

      <style jsx>{`
        .fusionPage{background:#fff;color:#0b0b0c}.eyebrow{font-size:12px;font-weight:950;letter-spacing:1.7px;color:#f4512a}.hero{max-width:1200px;margin:auto;padding:64px 24px 54px;display:grid;grid-template-columns:.95fr 1.05fr;gap:54px;align-items:center}.hero h1{font-size:clamp(46px,5.6vw,72px);line-height:.98;letter-spacing:-3.3px;margin:16px 0 22px}.lead,.heading p,.simIntro p{font-size:18px;line-height:1.7;color:#686d75}.heroChecks{display:grid;gap:9px;margin-top:24px;color:#3d4249;font-weight:750;font-size:14px}.heroActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.heroActions a{padding:16px 21px;border-radius:13px;text-decoration:none;font-weight:900}.primary{background:#0b0b0c;color:#fff}.secondary{border:1px solid #dedfe3;color:#111}.heroVisual{position:relative;border-radius:30px;overflow:hidden;box-shadow:0 25px 65px #0000001b}.heroVisual img{display:block;width:100%;height:470px;object-fit:cover}.photoBadge{position:absolute;left:18px;right:18px;bottom:18px;background:#fffffff0;backdrop-filter:blur(12px);padding:15px 17px;border-radius:17px;display:flex;flex-direction:column;gap:4px}.photoBadge span{color:#666b73;font-size:13px}.simpleSteps{max-width:1152px;margin:auto;padding:0 24px 54px;display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #eceef1}.simpleSteps article{display:flex;gap:15px;padding:18px 22px;border-right:1px solid #eceef1}.simpleSteps article:last-child{border-right:0}.simpleSteps b{color:#f4512a;font-size:13px}.simpleSteps span{display:grid;gap:4px;color:#71767e;font-size:13px}.simpleSteps strong{font-size:16px;color:#111}.section{max-width:1180px;margin:auto;padding:78px 24px}.heading{max-width:760px}.heading h2,.simIntro h2,.cta h2{font-size:clamp(36px,4.5vw,56px);line-height:1.04;letter-spacing:-2.4px;margin:12px 0 17px}.zones{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:36px}.zones article{border:1px solid #e5e7eb;border-radius:24px;padding:26px}.zoneTop{display:flex;justify-content:space-between;align-items:center;gap:18px}.zoneTop span{font-weight:900;color:#50565e}.zoneTop strong{font-size:31px;letter-spacing:-1px}.zones p{color:#6b7078;line-height:1.62}.fine,.pickupFine{font-size:13px;line-height:1.55;color:#777d84;margin-top:18px}.simSection{background:#0d0d0f;color:#fff;padding:82px max(24px,calc((100vw - 1132px)/2))}.simIntro{max-width:760px}.simIntro p{color:#b6bac2}.calculator{margin-top:34px;background:#fff;color:#111;border-radius:25px;padding:24px;display:grid;grid-template-columns:1fr 1fr auto;gap:14px;align-items:end}.calculator label{display:grid;gap:8px;font-weight:850;font-size:14px}.calculator select,.calculator input{height:52px;border:1px solid #d9dce1;border-radius:13px;padding:0 15px;font-size:16px;background:#fff;color:#111}.calculator button{height:52px;border:0;border-radius:13px;background:#ff4b24;color:#fff;font-weight:950;padding:0 22px;font-size:15px}.calculator button:disabled{opacity:.6}.error{grid-column:1/-1;color:#b42318;margin:0}.result{margin-top:18px;background:#fff;color:#111;border-radius:25px;padding:28px}.resultTop{display:flex;justify-content:space-between;gap:30px;align-items:start}.resultTop h3{font-size:clamp(38px,5vw,58px);letter-spacing:-2.5px;margin:7px 0 5px}.resultTop p{color:#6b7078}.resultPrice{background:#111;color:#fff;padding:18px 22px;border-radius:18px;min-width:220px}.resultPrice span{display:block;color:#bfc3ca;font-size:13px}.resultPrice strong{display:block;font-size:34px;margin-top:5px}.priceBreakdown,.missionLine{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-top:18px}.priceBreakdown article,.missionLine article{border:1px solid #e5e7eb;border-radius:17px;padding:17px}.priceBreakdown span,.missionLine span{display:block;color:#737881;font-size:13px}.priceBreakdown strong,.missionLine strong{display:block;font-size:21px;margin-top:6px}.contextNote{margin-top:18px;background:#f3f4f6;border-radius:18px;padding:21px}.contextNote.short{background:#fff3ee;border:1px solid #ffd7c9}.contextNote b{font-size:18px}.contextNote p{color:#626870;line-height:1.65;margin-bottom:0}.benefits{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:34px}.benefits article{background:#f5f6f7;border-radius:23px;padding:25px}.benefits span{font-size:12px;color:#f4512a;font-weight:950}.benefits h3{font-size:21px;margin:17px 0 9px}.benefits p{color:#6a7078;line-height:1.55;margin:0}.discreetPickup{padding-top:20px}.discreetPickup details{border:1px solid #e2e4e8;border-radius:24px;overflow:hidden}.discreetPickup summary{cursor:pointer;padding:24px 27px;font-size:20px;font-weight:900;list-style:none}.discreetPickup summary::-webkit-details-marker{display:none}.discreetPickup summary:after{content:"+";float:right;font-size:24px}.discreetPickup details[open] summary:after{content:"−"}.pickupContent{padding:0 27px 27px}.pickupIntro{color:#676d75;line-height:1.65;max-width:850px}.pickupGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:13px;margin-top:18px}.pickupGrid article{background:#f5f6f7;border-radius:20px;padding:23px}.pickupGrid article.local{background:#fff3ee}.pickupGrid span{font-size:12px;color:#737881;font-weight:900}.pickupGrid h3{font-size:22px;margin:9px 0}.pickupGrid strong{font-size:34px}.pickupGrid p{color:#696f77;line-height:1.58}.faq{padding-top:54px}.faqList{display:grid;gap:10px;margin-top:30px}.faqList details{border:1px solid #e4e6ea;border-radius:17px;padding:0 20px}.faqList summary{cursor:pointer;padding:19px 0;font-weight:900}.faqList p{color:#666c74;line-height:1.62;margin-top:0;padding-bottom:18px}.cta{max-width:1132px;margin:20px auto 88px;background:linear-gradient(135deg,#ff6a2b,#ff3152);color:#fff;border-radius:31px;padding:48px;display:flex;justify-content:space-between;align-items:center;gap:36px}.cta span{font-size:12px;font-weight:950;letter-spacing:1.6px;color:#ffffffc2}.cta h2{margin-bottom:10px}.cta p{line-height:1.6}.ctaButtons{display:flex;gap:10px;flex-wrap:wrap}.ctaButtons a{background:#fff;color:#111;text-decoration:none;font-weight:950;padding:15px 19px;border-radius:13px}.ctaButtons a:last-child{background:#111;color:#fff}
        @media(max-width:850px){.hero{grid-template-columns:1fr;padding-top:43px;gap:30px}.hero h1{letter-spacing:-2.4px}.heroVisual img{height:335px}.simpleSteps,.zones,.benefits,.pickupGrid,.priceBreakdown,.missionLine{grid-template-columns:1fr}.simpleSteps{padding:0 20px 42px}.simpleSteps article{border-right:0;border-bottom:1px solid #eceef1;padding:17px 2px}.simpleSteps article:last-child{border-bottom:0}.section{padding:60px 20px}.calculator{grid-template-columns:1fr;padding:19px}.result{padding:20px}.resultTop{display:grid}.resultPrice{min-width:0}.simSection{padding:62px 20px}.cta{margin:15px 15px 65px;padding:30px;display:grid}.ctaButtons{display:grid}.ctaButtons a{text-align:center}}
      `}</style>
    </main>
  );
}
