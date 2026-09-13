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
  drivingHoursOneWay: number;
  deliveryPrice: number;
  totalVehiclePrice: number;
  roundTripDistance: number;
  totalMissionHours: number;
  nights: number;
  meals: number;
  costs: {
    fuel: number;
    driver: number;
    tolls: number;
    maintenance: number;
    meals: number;
    hotel: number;
    insurance: number;
  };
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

const ASSUMPTIONS = {
  fuelPrice: 2,
  consumption: 10.5,
  driverHourlyCost: 22,
  maintenancePerKm: 0.1,
  tollPerKm: 0.06,
  mealPrice: 20,
  hotelPrice: 75,
  insurancePerMission: 25,
  preparationAndHandoverHours: 2.5,
};

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
    // Fallback ci-dessous si le service d'itineraire est indisponible.
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
      const totalMissionHours =
        roundTripDrivingHours +
        pauseHours +
        ASSUMPTIONS.preparationAndHandoverHours;

      const nights = totalMissionHours > 22 ? 2 : totalMissionHours > 12 ? 1 : 0;
      const meals = totalMissionHours < 6 ? 0 : totalMissionHours < 13 ? 1 : totalMissionHours < 22 ? 2 : 3;

      const fuel =
        (roundTripDistance * ASSUMPTIONS.consumption * ASSUMPTIONS.fuelPrice) / 100;
      const driver = totalMissionHours * ASSUMPTIONS.driverHourlyCost;
      const tolls = route.distanceKm < 120 ? 0 : roundTripDistance * ASSUMPTIONS.tollPerKm;
      const maintenance = roundTripDistance * ASSUMPTIONS.maintenancePerKm;
      const mealCost = meals * ASSUMPTIONS.mealPrice;
      const hotel = nights * ASSUMPTIONS.hotelPrice;
      const insurance = ASSUMPTIONS.insurancePerMission;

      setSimulation({
        city: route.city,
        department: route.department,
        distanceOneWay: route.distanceKm,
        drivingHoursOneWay: route.durationHours,
        deliveryPrice,
        totalVehiclePrice: selectedModel.price + PREPARATION_PRICE + deliveryPrice,
        roundTripDistance,
        totalMissionHours,
        nights,
        meals,
        costs: {
          fuel,
          driver,
          tolls,
          maintenance,
          meals: mealCost,
          hotel,
          insurance,
        },
      });
    } catch (caughtError) {
      setSimulation(null);
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const operationalCost = simulation
    ? Object.values(simulation.costs).reduce((sum, value) => sum + value, 0)
    : 0;

  return (
    <main className="simulatorPage">
      <section className="hero">
        <div className="heroCopy">
          <span className="eyebrow">SIMULATEUR DE LIVRAISON NEODRIVE</span>
          <h1>Comprenez le coût réel d’une livraison individualisée.</h1>
          <p className="lead">
            Chez NeoDrive, votre véhicule n’est pas simplement expédié. Une personne de l’entreprise
            le prend en charge, l’achemine jusqu’à votre domicile, organise le paiement prévu à la
            remise, vous laisse l’inspecter et vous explique son fonctionnement avant de repartir.
          </p>
          <div className="heroBadges">
            <span>Livraison à domicile</span>
            <span>Remise personnalisée</span>
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
                <p>
                  {selectedModel.name} livrée à {simulation.city} ({simulation.department})
                </p>
              </div>
              <div className="serviceTag">Livraison individualisée</div>
            </div>
            <div className="summaryGrid">
              <article>
                <span>Véhicule</span>
                <strong>{money(selectedModel.price)}</strong>
              </article>
              <article>
                <span>Préparation / mise en route</span>
                <strong>{money(PREPARATION_PRICE)}</strong>
              </article>
              <article>
                <span>Livraison à domicile</span>
                <strong>{money(simulation.deliveryPrice)}</strong>
              </article>
            </div>
            <p className="smallNote">Hors frais de carte grise éventuels.</p>
          </section>

          <section className="section explanation">
            <div className="sectionHeading">
              <span className="eyebrow">CE QUE COMPREND LA LIVRAISON</span>
              <h2>Ce n’est pas un dépôt de colis.</h2>
              <p>
                Une livraison NeoDrive mobilise une personne, un véhicule tracteur et une remorque
                pour une mission aller-retour complète.
              </p>
            </div>
            <div className="benefits">
              <article><b>01</b><h3>Préparation & chargement</h3><p>Vérification du véhicule, préparation au départ, chargement et arrimage.</p></article>
              <article><b>02</b><h3>Transport jusqu’à votre porte</h3><p>Le véhicule est acheminé directement à l’adresse convenue avec vous.</p></article>
              <article><b>03</b><h3>Inspection & paiement</h3><p>Vous pouvez inspecter le véhicule et finaliser le paiement selon les modalités de votre commande.</p></article>
              <article><b>04</b><h3>Prise en main</h3><p>Recharge, commandes, autonomie, frein de stationnement et bonnes pratiques vous sont expliqués.</p></article>
            </div>
          </section>

          <section className="mission section">
            <div className="missionTop">
              <div>
                <span className="eyebrow">VOTRE MISSION DE LIVRAISON</span>
                <h2>{Math.round(simulation.roundTripDistance).toLocaleString("fr-FR")} km aller-retour</h2>
                <p>Départ de {ORIGIN.label} · destination estimée : {simulation.city}</p>
              </div>
              <div className="operationalCost">
                <span>Coût opérationnel estimé</span>
                <strong>≈ {money(operationalCost)}</strong>
              </div>
            </div>

            <div className="metrics">
              <article><span>Distance aller</span><strong>{Math.round(simulation.distanceOneWay).toLocaleString("fr-FR")} km</strong></article>
              <article><span>Temps total mobilisé</span><strong>≈ {Math.round(simulation.totalMissionHours)} h</strong></article>
              <article><span>Repas estimés</span><strong>{simulation.meals}</strong></article>
              <article><span>Hébergement estimé</span><strong>{simulation.nights ? `${simulation.nights} nuit${simulation.nights > 1 ? "s" : ""}` : "Aucun"}</strong></article>
            </div>

            <div className="breakdown">
              {[
                ["Carburant", simulation.costs.fuel, `${ASSUMPTIONS.consumption} L/100 km · base carburant ${money(ASSUMPTIONS.fuelPrice)}/L`],
                ["Temps du conducteur", simulation.costs.driver, `Conduite, pauses, préparation, chargement, remise et retour`],
                ["Péages estimés", simulation.costs.tolls, "Estimation selon la distance autoroutière de la mission"],
                ["Maintenance & matériel de transport", simulation.costs.maintenance, "Entretien du véhicule tracteur, remorque et pneumatiques"],
                ["Repas en déplacement", simulation.costs.meals, `${simulation.meals} repas estimé${simulation.meals > 1 ? "s" : ""}`],
                ["Hébergement", simulation.costs.hotel, simulation.nights ? `${simulation.nights} nuit${simulation.nights > 1 ? "s" : ""} estimée${simulation.nights > 1 ? "s" : ""}` : "Aucun hôtel retenu pour cette distance"],
                ["Assurance transport", simulation.costs.insurance, "Quote-part indicative de la couverture de transport"],
              ].map(([label, amount, detail]) => (
                <div className="costRow" key={String(label)}>
                  <div><b>{label}</b><span>{detail}</span></div>
                  <strong>{money(Number(amount))}</strong>
                </div>
              ))}
            </div>

            <div className="notice">
              <b>Pourquoi afficher ce calcul ?</b>
              <p>
                Le prix d’une livraison longue distance ne correspond pas uniquement au carburant.
                Il inclut surtout le temps d’une personne mobilisée, le trajet retour, les péages,
                la maintenance du matériel de transport, l’assurance et, lorsque la distance l’exige,
                les frais de déplacement. Le tarif NeoDrive affiché reste le tarif de livraison applicable ;
                le détail ci-dessus sert à illustrer les moyens réellement mobilisés.
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="emptyState section">
          <div>
            <span className="eyebrow">ESSAYEZ LE SIMULATEUR</span>
            <h2>Entrez votre code postal pour obtenir votre estimation.</h2>
            <p>La distance routière est calculée depuis Muret à partir de la commune correspondant au code postal.</p>
          </div>
        </section>
      )}

      <section className="method section">
        <span className="eyebrow">BASE DE CALCUL DU PROTOTYPE</span>
        <h2>Des hypothèses visibles et ajustables avant mise en ligne définitive.</h2>
        <div className="methodGrid">
          <span>Carburant : 2 €/L</span>
          <span>Consommation : 10,5 L/100 km</span>
          <span>Conducteur : 22 €/h coût complet</span>
          <span>Maintenance : 0,10 €/km</span>
          <span>Péages : estimation 0,06 €/km</span>
          <span>Repas : 20 €</span>
          <span>Hôtel : 75 €/nuit</span>
          <span>Assurance transport : 25 €/mission</span>
        </div>
        <p className="smallNote">
          Prototype de travail : ces hypothèses doivent être remplacées par les coûts réels NeoDrive avant publication commerciale définitive.
        </p>
      </section>

      <style jsx>{`
        .simulatorPage{background:#fff;color:#101114;min-height:100vh}.hero{background:linear-gradient(145deg,#0d0e11,#181a20);color:#fff;padding:78px 24px 96px}.heroCopy{max-width:1120px;margin:auto}.eyebrow{font-size:12px;font-weight:950;letter-spacing:1.7px;color:#ff5a32}.hero h1{max-width:900px;font-size:clamp(44px,6vw,74px);line-height:.98;letter-spacing:-3.5px;margin:16px 0 24px}.lead{max-width:850px;color:#c4c8cf;font-size:19px;line-height:1.72}.heroBadges{display:flex;flex-wrap:wrap;gap:9px;margin-top:30px}.heroBadges span,.serviceTag{border:1px solid #ffffff24;background:#ffffff0d;border-radius:999px;padding:10px 14px;font-size:13px;font-weight:800}.calculatorWrap{max-width:1120px;margin:-38px auto 0;padding:0 24px;position:relative}.calculator{background:#fff;border:1px solid #e6e8ec;border-radius:24px;padding:22px;box-shadow:0 22px 60px #00000018;display:grid;grid-template-columns:1fr 1fr auto;gap:14px;align-items:end}.field{display:grid;gap:7px}.field label{font-size:13px;font-weight:900}.field select,.field input{height:52px;border:1px solid #d8dbe1;border-radius:13px;padding:0 14px;font-size:16px;background:#fff;color:#111;outline:none}.field select:focus,.field input:focus{border-color:#111;box-shadow:0 0 0 3px #1111110d}.calculator button{height:52px;border:0;border-radius:13px;background:#111;color:#fff;font-weight:950;padding:0 22px;font-size:15px;cursor:pointer}.calculator button:disabled{opacity:.6;cursor:wait}.error{grid-column:1/-1;margin:0;color:#b42318;font-weight:750;font-size:13px}.section{max-width:1120px;margin:auto;padding:72px 24px}.summary{padding-top:56px}.summaryHeader,.missionTop{display:flex;justify-content:space-between;align-items:flex-start;gap:28px}.summaryHeader h2,.missionTop h2,.sectionHeading h2,.emptyState h2,.method h2{font-size:clamp(34px,4.2vw,54px);line-height:1.04;letter-spacing:-2.2px;margin:10px 0 10px}.summaryHeader p,.missionTop p,.sectionHeading p,.emptyState p,.method>p{color:#686e77;line-height:1.65}.serviceTag{border-color:#dfe2e7;background:#f5f6f8;color:#333}.summaryGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}.summaryGrid article,.metrics article{border:1px solid #e4e6ea;border-radius:18px;padding:20px}.summaryGrid span,.metrics span,.operationalCost span{display:block;color:#747983;font-size:12px;font-weight:800;margin-bottom:6px}.summaryGrid strong{font-size:26px;letter-spacing:-1px}.smallNote{font-size:12px!important;color:#858a92!important;margin-top:12px!important}.explanation{border-top:1px solid #eceef1}.sectionHeading{max-width:760px}.benefits{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:34px}.benefits article{background:#f6f7f9;border-radius:21px;padding:24px}.benefits b{font-size:12px;color:#ff5a32}.benefits h3{font-size:18px;margin:18px 0 9px}.benefits p{font-size:14px;color:#666d76;line-height:1.6;margin:0}.mission{border-top:1px solid #eceef1}.operationalCost{text-align:right;background:#111;color:#fff;border-radius:20px;padding:20px 24px;min-width:240px}.operationalCost span{color:#bfc3c9}.operationalCost strong{font-size:28px;letter-spacing:-1px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:28px 0}.metrics strong{font-size:20px}.breakdown{border:1px solid #e4e6ea;border-radius:22px;padding:4px 22px}.costRow{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:17px 0;border-bottom:1px solid #eceef1}.costRow:last-child{border-bottom:0}.costRow div{display:grid;gap:4px}.costRow span{font-size:13px;color:#747983;line-height:1.45}.costRow strong{font-size:17px}.notice{margin-top:18px;background:#f6f7f9;border-radius:18px;padding:20px}.notice p{color:#616770;line-height:1.65;font-size:14px;margin:7px 0 0}.emptyState{padding-top:64px}.emptyState>div{background:#f6f7f9;border-radius:26px;padding:38px}.method{border-top:1px solid #eceef1}.methodGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:28px}.methodGrid span{background:#f6f7f9;border-radius:14px;padding:15px;font-size:13px;font-weight:800;color:#3d4249}@media(max-width:900px){.calculator{grid-template-columns:1fr 1fr}.calculator button{grid-column:1/-1}.benefits,.methodGrid{grid-template-columns:1fr 1fr}.metrics{grid-template-columns:1fr 1fr}}@media(max-width:640px){.hero{padding:54px 20px 78px}.hero h1{letter-spacing:-2.4px}.lead{font-size:17px}.calculatorWrap{padding:0 14px}.calculator{grid-template-columns:1fr;padding:16px}.calculator button{grid-column:auto}.section{padding:55px 18px}.summaryHeader,.missionTop{display:grid}.summaryGrid,.benefits,.metrics,.methodGrid{grid-template-columns:1fr}.operationalCost{text-align:left;min-width:0}.costRow{grid-template-columns:1fr}.costRow strong{text-align:left}.emptyState>div{padding:25px}}
      `}</style>
    </main>
  );
}
