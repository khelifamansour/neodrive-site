[16:39, 4/19/2026] service commercial: "use client";

export default function Home() {
  return (
    <main style={container}>

      {/* HERO */}
      <section style={center}>
        <h1 style={title}>
          Voiture sans permis neuve dès 4 490 € TTC
        </h1>

        <p style={subtitle}>
          Électrique – simple – économique
        </p>

        <p style={alert}>
          Stock limité – livraison rapide partout en France
        </p>

        <img src="/voiture.jpg" style={image} />

        <div style={ctaBox}>
          <a href="https://wa.me/33628261446">
            <button style={btnGreen}>Voir le véhicule en vidéo</button>
          </a>

          <a href="/reservation">
            <button style={btnBlack}>Réserver</button>
          </a>
        </div>

        <p styl…
[16:40, 4/19/2026] service commercial: "use client";

export default function Home() {
  return (
    <main style={container}>

      {/* HERO */}
      <section style={center}>
        <h1 style={title}>
          Voiture sans permis neuve dès 4 490 € TTC
        </h1>

        <p style={subtitle}>
          Électrique – simple – économique
        </p>

        <p style={alert}>
          Stock limité – livraison rapide partout en France
        </p>

        <img src="/voiture.jpg" style={image} />

        <div style={ctaBox}>
          <a href="https://wa.me/33628261446">
            <button style={btnGreen}>Voir le véhicule en vidéo</button>
          </a>

          <a href="/reservation">
            <button style={btnBlack}>Réserver</button>
          </a>
        </div>

        <p style={safe}>
          Paiement uniquement à la livraison – aucun risque
        </p>
      </section>

      {/* TRUST */}
      <section style={section}>
        <div style={box}>
          <strong>Entreprise Toulousaine</strong><br />
          MK HOLDING – SIREN 908 645 393<br />
          31 rue Jean Nougaro – Muret<br />
          Véhicules conformes réglementation française
        </div>

        <div style={box}>✔ Véhicule neuf – jamais immatriculé</div>
        <div style={box}>✔ Batterie incluse – aucun frais caché</div>
        <div style={box}>✔ Paiement à la livraison</div>
        <div style={box}>✔ SAV + pièces disponibles en France</div>
      </section>

      {/* PRIX */}
      <section style={section}>
        <h2 style={h2}>Prix clair</h2>

        <div style={box}>
          ✔ Véhicule : à partir de 4 490 € TTC<br />
          ✔ Transport : 290 € à 690 € selon distance depuis Toulouse<br />
          ✔ Carte grise : 160 €<br />
          ✔ Aucun frais caché
        </div>
      </section>

      {/* PROCESS */}
      <section style={section}>
        <h2 style={h2}>Comment ça marche</h2>

        <div style={box}>
          1. Contact WhatsApp ou téléphone<br />
          2. Vidéo du véhicule + validation<br />
          3. Préparation du véhicule<br />
          4. Livraison à domicile ou retrait<br />
          5. Paiement à la réception<br />
          6. Aide immatriculation
        </div>
      </section>

      {/* GARANTIE */}
      <section style={section}>
        <h2 style={h2}>Garantie</h2>

        <div style={box}>
          ✔ Structure : 2 ans<br />
          ✔ Composants : 1 an<br />
          ✔ Batterie : 6 mois<br />
          ✔ Assistance technique en France
        </div>
      </section>

      {/* DIFFERENCE */}
      <section style={center}>
        <h2 style={h2}>Pourquoi nous choisir</h2>

        <p style={why}>
          ✔ Pas de leasing (contrairement à Ami)<br />
          ✔ Pas d’abonnement mensuel<br />
          ✔ Vous êtes propriétaire du véhicule<br />
          ✔ Prix direct import sans intermédiaire
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={center}>
        <a href="https://wa.me/33628261446">
          <button style={btnGreen}>Discuter sur WhatsApp</button>
        </a>

        <p style={safe}>
          Réponse rapide – vidéo disponible immédiatement
        </p>
      </section>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 900,
  margin: "0 auto",
  padding: 10,
  fontFamily: "Arial"
};

const center = {
  textAlign: "center",
  padding: "30px 10px"
};

const section = {
  padding: "20px 10px"
};

const title = {
  fontSize: 24,
  fontWeight: "700"
};

const subtitle = {
  color: "#555",
  marginTop: 10
};

const alert = {
  color: "red",
  fontWeight: "600",
  marginTop: 5
};

const image = {
  width: "100%",
  marginTop: 20,
  borderRadius: 10
};

const ctaBox = {
  marginTop: 20
};

const box = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10,
  lineHeight: "1.5"
};

const btnBlack = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 8
};

const btnGreen = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8
};

const h2 = {
  marginBottom: 10
};

const why = {
  color: "#555",
  marginTop: 10
};

const safe = {
  marginTop: 10,
  fontSize: 12,
  color: "#444"
};
