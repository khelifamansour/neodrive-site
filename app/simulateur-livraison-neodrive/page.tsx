"use client";

import { FormEvent, useMemo, useState } from "react";

type Model = {
  id: string;
  name: string;
  price: number;
};

type Simulation = {
  city: string;
  department: string;
  distanceOneWay: number;
  deliveryPrice: number;
  totalVehiclePrice: number;
  roundTripDistance: number;
  totalMissionHours: number;
};

const MODELS: Model[] = [
  { id: "confort", name: "NeoDrive Confort", price: 4990 },
  { id: "essentielle", name: "NeoDrive Essentielle", price: 3990 },
  { id: "lithium", name: "NeoDrive Lithium", price: 5990 },
];

const ZONE_1 = new Set(["31", "81", "82", "32", "09"]);
const ZONE_2 = new Set(["11", "12", "46", "47", "33", "65", "66", "34", "30", "40", "24", "19", "87", "15"]);
const ZONE_3 = new Set(["75", "92", "93", "94", "95", "77", "78", "91", "13", "69", "63", "16", "17", "86"]);

const ORIGIN = { lat: 43.4607, lon: 1.3256, label: "Muret (31)" };
const PREPARATION_PRICE = 150;
const PREPARATION_AND_HANDOVER_HOURS = 2.5;
const TOULOUSE_PICKUP_PRICE = 249;
const REGIONAL_PICKUP_PRICE = 450;

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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
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

  if (!commune?.centre?.coordinates?.length) {
    throw new Error("Code postal introuvable ou non pris en charge.");
  }

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
    // Estimation de secours ci-dessous si le service d'itinéraire est indisponible.
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

export default function SimulateurLivraisonNeoDrive() {
  const [postalCode, setPostalCode] = useState("67000");
  const [modelId, setModelId] = useState("confort");
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedModel = useMemo(
    () => MODELS.find((model) => model.id === modelId) ?? MODELS[0],
    [modelId]
  );

  async function simulate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPostalCode = postalCode.replace(/\D/g, "").slice(0, 5);
    setPostalCode(cleanPostalCode);
    setError("");

    if (cleanPostalCode.length !== 5) {
      setError("Veuillez saisir un code postal français à 5 chiffres.");
      return;
    }

    setLoading(true);

    try {
      const route = await getRouteForPostalCode(cleanPostalCode);
      const department = departmentFromPostalCode(cleanPostalCode);
      const deliveryPrice = deliveryPriceFor(department);
      const roundTripDistance = route.distanceKm * 2;
      const roundTripDrivingHours = route.durationHours * 2;
      const pauseHours = Math.floor(roundTripDrivingHours / 4.5) * 0.5;
      const totalMissionHours = roundTripDrivingHours + pauseHours + PREPARATION_AND_HANDOVER_HOURS;

      setSimulation({
        city: route.city,
        department: route.department,
        distanceOneWay: route.distanceKm,
        deliveryPrice,
        totalVehiclePrice: selectedModel.price + PREPARATION_PRICE + deliveryPrice,
        roundTripDistance,
        totalMissionHours,
      });
    } catch (caughtError) {
      setSimulation(null);
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const isMinimumFare = simulation ? simulation.distanceOneWay < 120 : false;
  const missionDurationLabel = simulation
    ? simulation.totalMissionHours <= 8
      ? "Demi-journée à journée mobilisée"
      : simulation.totalMissionHours <= 16
        ? "Environ 1 journée de mission"
        : "Mission longue distance"
    : "";

  return (
    <main className="simulatorPage">
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">SIMULATEUR DE LIVRAISON NEODRIVE</span>
          <h1>Estimez votre NeoDrive livrée directement à votre domicile.</h1>
          <p className="lead">
            Chez NeoDrive, la livraison est un service individualisé. Une personne prend en charge
            votre véhicule, l’achemine jusqu’à votre domicile, organise sa remise, vous permet de
            l’inspecter et vous accompagne dans sa prise en main avant de repartir.
          </p>
          <div className="heroBadges">
            <span>Livraison à domicile</span>
            <span>Transport individualisé</span>
            <span>Remise accompagnée</span>
            <span>Paiement à la livraison selon commande</span>
          </div>
        </div>
      </section>

      <section className="calculatorWrap">
        <form className="calculator" onSubmit={simulate}>
          <div className="field">
            <label htmlFor="model">1. Choisissez votre NeoDrive</label>
            <select id="model" value={modelId} onChange={(event) => setModelId(event.target.value)}>
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} — {money(model.price)} TTC
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="postalCode">2. Votre code postal</label>
            <input
              id="postalCode"
              inputMode="numeric"
              maxLength={5}
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="Ex. 67000"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Calcul en cours…" : "Calculer ma livraison"}
          </button>

          {error ? <p className="error">{error}</p> : null}
        </form>
      </section>

      {simulation ? (
        <>
          <section className="summary section">
            <div className="summaryHeader">
              <div>
                <span className="eyebrow">VOTRE BUDGET GLOBAL</span>
                <h2>{money(simulation.totalVehiclePrice)} TTC</h2>
                <p>{selectedModel.name} livrée à {simulation.city} ({simulation.department})</p>
              </div>
              <div className="serviceTag">Livraison individualisée</div>
            </div>

            <div className="summaryGrid">
              <article><span>Véhicule</span><strong>{money(selectedModel.price)}</strong></article>
              <article><span>Préparation / mise en route</span><strong>{money(PREPARATION_PRICE)}</strong></article>
              <article className="deliveryCard"><span>Forfait livraison à domicile</span><strong>{money(simulation.deliveryPrice)}</strong></article>
            </div>
            <p className="smallNote">Hors frais de carte grise éventuels.</p>
          </section>

          <section className="mission section">
            <div className="missionTop">
              <div>
                <span className="eyebrow">VOTRE MISSION DE LIVRAISON</span>
                <h2>{Math.round(simulation.roundTripDistance).toLocaleString("fr-FR")} km aller-retour</h2>
                <p>Départ de {ORIGIN.label} · destination estimée : {simulation.city}</p>
              </div>
              <div className="deliveryPriceBox">
                <span>Votre forfait livraison</span>
                <strong>{money(simulation.deliveryPrice)}</strong>
                <small>Tarif forfaitaire selon votre zone de livraison</small>
              </div>
            </div>

            <div className="metrics">
              <article><span>Distance jusqu’à vous</span><strong>{Math.round(simulation.distanceOneWay).toLocaleString("fr-FR")} km</strong></article>
              <article><span>Mission complète</span><strong>{Math.round(simulation.roundTripDistance).toLocaleString("fr-FR")} km</strong></article>
              <article><span>Temps total mobilisé</span><strong>≈ {Math.max(3, Math.round(simulation.totalMissionHours))} h</strong></article>
              <article><span>Organisation</span><strong>{missionDurationLabel}</strong></article>
            </div>

            {isMinimumFare ? (
              <div className="minimumFareNote">
                <b>Pourquoi un forfait minimum, même à proximité ?</b>
                <p>
                  Le prix d’une livraison individualisée ne correspond pas à un simple tarif au kilomètre.
                  Même pour une courte distance, NeoDrive doit réserver un créneau dédié et mobiliser une personne,
                  un véhicule tracteur et une remorque. Le service comprend également la préparation du véhicule,
                  son chargement et son arrimage, le déplacement, le déchargement, la remise au client, l’inspection,
                  les explications de prise en main puis le retour de l’équipe. C’est pourquoi un forfait minimum de
                  livraison s’applique aux destinations proches.
                </p>
              </div>
            ) : (
              <div className="distanceNote">
                <b>Un tarif forfaitaire pour une mission complète</b>
                <p>
                  Le tarif affiché couvre l’organisation d’une livraison individualisée aller-retour et ne correspond
                  pas à une simple facturation des kilomètres. Plus la destination est éloignée, plus la mission mobilise
                  de temps, de moyens de transport et d’organisation pour remettre votre véhicule directement à domicile.
                </p>
              </div>
            )}
          </section>

          <section className="section explanation">
            <div className="sectionHeading">
              <span className="eyebrow">CE QUE COMPREND VOTRE LIVRAISON</span>
              <h2>Une remise accompagnée, pas un simple dépôt.</h2>
              <p>
                Votre forfait couvre l’ensemble de la mission nécessaire pour vous remettre votre NeoDrive dans de bonnes
                conditions, directement à l’adresse convenue.
              </p>
            </div>

            <div className="benefits">
              <article><b>01</b><h3>Préparation du véhicule</h3><p>Contrôles avant départ et préparation de votre NeoDrive pour sa remise.</p></article>
              <article><b>02</b><h3>Chargement & arrimage</h3><p>Chargement sur le matériel de transport et sécurisation avant le trajet.</p></article>
              <article><b>03</b><h3>Transport à domicile</h3><p>Acheminement individualisé jusqu’à l’adresse convenue avec vous.</p></article>
              <article><b>04</b><h3>Déchargement & inspection</h3><p>Le véhicule est déchargé et vous pouvez l’inspecter lors de sa remise.</p></article>
              <article><b>05</b><h3>Paiement à la livraison</h3><p>Selon les modalités de votre commande, le règlement est finalisé lors de la remise du véhicule.</p></article>
              <article><b>06</b><h3>Prise en main</h3><p>Commandes, recharge, autonomie, frein de stationnement et bonnes pratiques vous sont expliqués.</p></article>
              <article><b>07</b><h3>Temps dédié au client</h3><p>Notre intervenant reste le temps nécessaire pour répondre aux principales questions avant de repartir.</p></article>
              <article><b>08</b><h3>Mission aller-retour</h3><p>La livraison comprend aussi le retour de la personne et du matériel de transport après votre remise.</p></article>
            </div>
          </section>

          <section className="section reassurance">
            <div className="reassuranceBox">
              <span className="eyebrow">POURQUOI UN FORFAIT ?</span>
              <h2>Vous payez un service de livraison complet, pas uniquement des kilomètres.</h2>
              <p>
                Les tarifs NeoDrive sont organisés par zones afin de rester simples et prévisibles. Le montant affiché
                correspond au service complet de livraison individualisée : réservation du créneau, mobilisation de
                l’équipe et du matériel, préparation, transport, remise et accompagnement du client. Il ne s’agit pas
                d’une refacturation au centime des dépenses internes de NeoDrive.
              </p>
            </div>
          </section>

          <section className="section pickup">
            <div className="sectionHeading">
              <span className="eyebrow">ET SI JE VEUX VENIR CHERCHER MON VÉHICULE ?</span>
              <h2>Nos entrepôts logistiques ne sont pas ouverts au public.</h2>
              <p>
                Nos sites de stockage sont conçus pour la réception, la préparation et le mouvement des véhicules.
                Ils accueillent des camions, remorques et opérations de manutention et ne sont donc pas aménagés comme
                des concessions pour recevoir des clients en toute sécurité. La remise au client est donc organisée sur
                un point adapté et uniquement sur rendez-vous.
              </p>
            </div>

            <div className="pickupGrid threeCols">
              <article className="pickupNo">
                <span>Entrepôt logistique</span>
                <strong>Pas de retrait direct</strong>
                <p>
                  Pour des raisons d’organisation et de sécurité, nous ne proposons pas d’enlèvement directement dans
                  nos entrepôts de stockage.
                </p>
              </article>

              <article className="pickupYes">
                <span>Région toulousaine</span>
                <strong>Point de remise Toulouse / Muret</strong>
                <div className="pickupPrice">{money(TOULOUSE_PICKUP_PRICE)}</div>
                <p>
                  Votre véhicule est transféré depuis notre zone logistique vers un point adapté à l’accueil du public.
                  Le forfait comprend le transfert local, la préparation de la remise, le rendez-vous, l’inspection du
                  véhicule et les explications de prise en main.
                </p>
              </article>

              <article className="pickupRegional">
                <span>Autre région</span>
                <strong>Point de remise régional</strong>
                <div className="pickupPrice regionalPrice">{money(REGIONAL_PICKUP_PRICE)}</div>
                <p>
                  Ce montant correspond notamment au transfert logistique du véhicule depuis Toulouse vers le hub ou le
                  point de remise de la région. Ce transfert mobilise du transport, du matériel et du temps humain. Une
                  personne doit ensuite organiser la mise à disposition, préparer le véhicule et assurer sa remise avec vous.
                </p>
              </article>
            </div>

            <div className="pickupConditions">
              <b>Ce n’est pas un simple “frais de retrait”.</b>
              <p>
                En dehors de la région toulousaine, le forfait de {money(REGIONAL_PICKUP_PRICE)} correspond à la logistique
                nécessaire pour acheminer le véhicule depuis Toulouse jusqu’à la région concernée, puis organiser sa remise
                sur un point adapté au public. Le véhicule peut déjà être présent dans un hub au moment de votre rendez-vous :
                le transfert régional et son organisation ont néanmoins été nécessaires pour le mettre à disposition dans cette région.
              </p>
              <p>
                Si vous préférez ne pas vous déplacer jusqu’au point régional, la livraison à domicile reste disponible au
                tarif calculé plus haut. Avant l’achat, une présentation en visio ou une démonstration locale sur rendez-vous
                peut également être proposée selon les disponibilités.
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="emptyState section">
          <div>
            <span className="eyebrow">ESSAYEZ LE SIMULATEUR</span>
            <h2>Entrez votre code postal pour connaître votre tarif de livraison.</h2>
            <p>
              Le simulateur estime la distance routière depuis Muret et affiche le forfait de livraison correspondant
              à votre zone.
            </p>
          </div>
        </section>
      )}

      <style jsx>{`
        .simulatorPage{background:#fff;color:#101114;min-height:100vh}.hero{background:linear-gradient(145deg,#0d0e11,#181a20);color:#fff;padding:78px 24px 96px}.heroCopy{max-width:1120px;margin:auto}.eyebrow{font-size:12px;font-weight:950;letter-spacing:1.7px;color:#ff5a32}.hero h1{max-width:930px;font-size:clamp(42px,6vw,72px);line-height:.99;letter-spacing:-3.2px;margin:16px 0 24px}.lead{max-width:860px;color:#c4c8cf;font-size:19px;line-height:1.72}.heroBadges{display:flex;flex-wrap:wrap;gap:9px;margin-top:30px}.heroBadges span,.serviceTag{border:1px solid #ffffff24;background:#ffffff0d;border-radius:999px;padding:10px 14px;font-size:13px;font-weight:800}.calculatorWrap{max-width:1120px;margin:-38px auto 0;padding:0 24px;position:relative}.calculator{background:#fff;border:1px solid #e6e8ec;border-radius:24px;padding:22px;box-shadow:0 22px 60px #00000018;display:grid;grid-template-columns:1fr 1fr auto;gap:14px;align-items:end}.field{display:grid;gap:7px}.field label{font-size:13px;font-weight:900}.field select,.field input{height:52px;border:1px solid #d8dbe1;border-radius:13px;padding:0 14px;font-size:16px;background:#fff;color:#111;outline:none}.field select:focus,.field input:focus{border-color:#111;box-shadow:0 0 0 3px #1111110d}.calculator button{height:52px;border:0;border-radius:13px;background:#111;color:#fff;font-weight:950;padding:0 22px;font-size:15px;cursor:pointer}.calculator button:disabled{opacity:.6;cursor:wait}.error{grid-column:1/-1;margin:0;color:#b42318;font-weight:750;font-size:13px}.section{max-width:1120px;margin:auto;padding:72px 24px}.summary{padding-top:56px}.summaryHeader,.missionTop{display:flex;justify-content:space-between;align-items:flex-start;gap:28px}.summaryHeader h2,.missionTop h2,.sectionHeading h2,.reassuranceBox h2,.emptyState h2{font-size:clamp(34px,4.2vw,54px);line-height:1.04;letter-spacing:-2.2px;margin:10px 0 10px}.summaryHeader p,.missionTop p,.sectionHeading p,.reassuranceBox p,.emptyState p{color:#686e77;line-height:1.65}.serviceTag{border-color:#dfe2e7;background:#f5f6f8;color:#333}.summaryGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}.summaryGrid article,.metrics article{border:1px solid #e4e6ea;border-radius:18px;padding:20px}.summaryGrid span,.metrics span,.deliveryPriceBox span{display:block;color:#747983;font-size:12px;font-weight:800;margin-bottom:6px}.summaryGrid strong{font-size:26px;letter-spacing:-1px}.deliveryCard{background:#f7f7f8}.smallNote{font-size:12px!important;color:#858a92!important;margin-top:12px!important}.mission{border-top:1px solid #eceef1}.deliveryPriceBox{text-align:right;background:#111;color:#fff;border-radius:20px;padding:20px 24px;min-width:250px}.deliveryPriceBox span{color:#bfc3c9}.deliveryPriceBox strong{display:block;font-size:32px;letter-spacing:-1px}.deliveryPriceBox small{display:block;color:#bfc3c9;font-size:11px;margin-top:5px;line-height:1.4}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:28px 0}.metrics strong{font-size:20px;line-height:1.25}.minimumFareNote,.distanceNote{border-radius:20px;padding:22px}.minimumFareNote{border:1px solid #ffd8cc;background:#fff6f2}.distanceNote{border:1px solid #e1e4e8;background:#f7f8f9}.minimumFareNote b,.distanceNote b{display:block;font-size:17px}.minimumFareNote b{color:#c63d1d}.minimumFareNote p,.distanceNote p{color:#5f6268;line-height:1.7;font-size:14px;margin:8px 0 0}.explanation,.pickup{border-top:1px solid #eceef1}.sectionHeading{max-width:790px}.benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:34px}.benefits article{background:#f6f7f9;border-radius:21px;padding:24px}.benefits b{font-size:12px;color:#ff5a32}.benefits h3{font-size:18px;margin:18px 0 9px}.benefits p{font-size:14px;color:#666d76;line-height:1.6;margin:0}.reassurance{border-top:1px solid #eceef1}.reassuranceBox{background:#111;color:#fff;border-radius:28px;padding:38px}.reassuranceBox p{color:#c8cbd0;max-width:850px}.pickupGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:30px}.pickupGrid.threeCols{grid-template-columns:repeat(3,1fr)}.pickupGrid article{border-radius:22px;padding:26px;border:1px solid #e3e5e8}.pickupGrid span{display:block;font-size:12px;font-weight:900;color:#737983;margin-bottom:8px}.pickupGrid strong{display:block;font-size:24px;letter-spacing:-.8px}.pickupGrid p,.pickupConditions p{color:#646a73;font-size:14px;line-height:1.7}.pickupNo{background:#f7f7f8}.pickupYes{background:#fff7f3;border-color:#ffd8cc!important}.pickupRegional{background:#f6f7f9}.pickupPrice{font-size:30px;font-weight:950;margin:14px 0 4px;color:#c63d1d}.regionalPrice{color:#111}.pickupConditions{margin-top:14px;border:1px solid #e2e5e9;border-radius:20px;padding:22px}.pickupConditions b{font-size:17px}.pickupConditions p{margin:8px 0 0}.emptyState{padding-top:64px}.emptyState>div{background:#f6f7f9;border-radius:26px;padding:38px}@media(max-width:900px){.calculator{grid-template-columns:1fr 1fr}.calculator button{grid-column:1/-1}.benefits{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:1fr 1fr}.pickupGrid.threeCols{grid-template-columns:1fr 1fr}.pickupGrid.threeCols article:last-child{grid-column:1/-1}}@media(max-width:640px){.hero{padding:54px 20px 78px}.hero h1{letter-spacing:-2.4px}.lead{font-size:17px}.calculatorWrap{padding:0 14px}.calculator{grid-template-columns:1fr;padding:16px}.calculator button{grid-column:auto}.section{padding:55px 18px}.summaryHeader,.missionTop{display:grid}.summaryGrid,.benefits,.metrics,.pickupGrid,.pickupGrid.threeCols{grid-template-columns:1fr}.pickupGrid.threeCols article:last-child{grid-column:auto}.deliveryPriceBox{text-align:left;min-width:0}.reassuranceBox{padding:26px}.emptyState>div{padding:25px}}
      `}</style>
    </main>
  );
}
