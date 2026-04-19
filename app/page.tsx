"use client";

export default function Home() {
  return (
    <main style={{
      width: "100%",
      maxWidth: 900,
      margin: "0 auto",
      padding: "10px",
      fontFamily: "Arial"
    }}>

      {/* HERO */}
      <section style={{ padding: "30px 10px" }}>
        <div style={{ textAlign: "center" }}>

          <h1 style={{ fontSize: "24px", fontWeight: "700" }}>
            Voiture sans permis neuve à partir de 4 490 € TTC
          </h1>

          <p style={{ color: "#555", marginTop: 10 }}>
            NeoDrive SWITCH – électrique, simple et économique
          </p>

          <p style={{ color: "red", fontWeight: "600", marginTop: 5 }}>
            Stock limité – livraison rapide partout en France
          </p>

          <img
            src="/voiture.jpg"
            alt="NeoDrive SWITCH"
            style={{ width: "100%", marginTop: 20, borderRadius: 10 }}
          />

          {/* BUTTONS */}
          <div style={{ marginTop: 20 }}>

            <a href="/reservation">
              <button style={btnBlack}>
                Réserver ce véhicule
              </button>
            </a>

            <a href="https://wa.me/33628261446" target="_blank">
              <button style={btnGreen}>
                Contacter sur WhatsApp
              </button>
            </a>

            <a href="/sav">
              <button style={btnGrey}>
                Voir le SAV
              </button>
            </a>

          </div>

        </div>
      </section>

      {/* COMPANY TRUST */}
      <section style={{ padding: "20px 10px" }}>
        <div style={box}>
          <strong>Entreprise française</strong><br/>
          MK HOLDING – SIREN 908 645 393<br/>
          31 rue Jean Nougaro, 31600 Muret<br/>
          Vente de véhicules conforme réglementation française
        </div>
      </section>

      {/* TRUST */}
      <section style={{ padding: "20px 10px" }}>
        <div>
          <div style={box}>✔ Véhicule neuf – jamais immatriculé</div>
          <div style={box}>✔ Batterie incluse – aucun frais caché</div>
          <div style={box}>✔ SAV disponible partout en France</div>
          <div style={box}>✔ Pièces disponibles immédiatement</div>
        </div>
      </section>

      {/* WARRANTY */}
      <section style={{ padding: "20px 10px" }}>
        <h2>Garantie</h2>
        <div style={box}>
          ✔ Structure du véhicule (châssis, carrosserie) : 2 ans<br/>
          ✔ Composants (moteur, électronique) : 1 an<br/>
          ✔ Batterie : 6 mois<br/>
          ✔ Assistance technique en France
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "20px 10px" }}>
        <h2>Prix et frais</h2>
        <div style={box}>
          Prix du véhicule : à partir de 4 490 € TTC<br/>
          Livraison : entre 290 € et 590 € selon région<br/>
          Carte grise : environ 50 € à 150 € selon département<br/>
          Aucun frais caché
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "20px 10px" }}>
        <h2>Comment ça marche</h2>
        <div style={box}>
          1. Réservation en ligne ou par téléphone<br/>
          2. Envoi du devis et du contrat de vente<br/>
          3. Paiement de l’acompte<br/>
          4. Préparation du véhicule<br/>
          5. Livraison à domicile ou retrait<br/>
          6. Accompagnement pour immatriculation
        </div>
      </section>

      {/* WHY */}
      <section style={{ padding: "20px 10px", textAlign: "center" }}>
        <h2>Pourquoi choisir NeoDrive</h2>
        <p style={{ color: "#555", marginTop: 10 }}>
          ✔ Prix direct import – sans intermédiaire<br/>
          ✔ Aucun leasing ni abonnement<br/>
          ✔ Véhicule simple et fiable<br/>
          ✔ Support technique en France
        </p>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: "30px 10px", textAlign: "center" }}>
        <a href="/reservation">
          <button style={btnBlack}>
            Réserver maintenant
          </button>
        </a>
      </section>

    </main>
  );
}

/* STYLES */

const box = {
  background: "#f7f7f7",
  padding: 12,
  borderRadius: 8,
  marginBottom: 10
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

const btnGrey = {
  marginTop: 10,
  padding: 12,
  width: "100%",
  background: "#ddd",
  color: "#000",
  border: "none",
  borderRadius: 8
};
