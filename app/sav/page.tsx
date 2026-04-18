"use client";

export default function SAV() {
  return (
    <main style={container}>

      {/* HEADER */}
      <h1 style={title}>Service après-vente en France</h1>

      <p style={subtitle}>
        Microdrive n’est pas seulement un vendeur de véhicules sans permis.  
        Nous avons construit un écosystème complet : pièces détachées, support technique et réseau de garages.
      </p>

      {/* TRUST BLOCK */}
      <div style={box}>
        ✔ SAV disponible partout en France<br/>
        ✔ Pièces détachées en stock<br/>
        ✔ Assistance rapide via WhatsApp<br/>
        ✔ Réseau de garages partenaires
      </div>

      {/* PROCESS */}
      <section style={section}>
        <h2>Comment fonctionne notre SAV ?</h2>

        <div style={box}>
          1. Vous nous contactez (WhatsApp)<br/>
          2. Nous identifions le problème<br/>
          3. Nous trouvons un garage proche de chez vous<br/>
          4. Nous envoyons les pièces nécessaires<br/>
          5. Nous organisons le rendez-vous<br/>
          6. Le garage effectue la réparation
        </div>

        <p style={text}>
          Pendant la période de garantie, nous prenons en charge les pièces et l’intervention selon les conditions.
        </p>

        <p style={text}>
          Après la garantie, vous pouvez toujours compter sur nous pour les pièces et le support technique.
        </p>
      </section>

      {/* PRODUCT ADVANTAGES */}
      <section style={section}>
        <h2>Pourquoi nos véhicules sont fiables</h2>

        <div style={box}>
          ✔ Véhicule simple (moins d’électronique = moins de pannes)<br/>
          ✔ Vitres manuelles (pas de moteurs fragiles)<br/>
          ✔ Structure 100% acier (plus robuste que plastique)<br/>
          ✔ Carrosserie résistante<br/>
          ✔ Conception pensée pour durer
        </div>
      </section>

      {/* DOCUMENTATION */}
      <section style={section}>
        <h2>Documentation technique</h2>

        <p style={text}>
          Nous mettons à disposition des documents complets pour les garages et les utilisateurs.
        </p>

        <div style={box}>
          ✔ Manuel technique complet du véhicule<br/>
          ✔ Guide SAV et diagnostic avec liste des pièces<br/>
        </div>

        <div style={{ marginTop: 15 }}>
          <a href="/Manuel-technique.pdf" target="_blank">
            <button style={btn}>
              Télécharger le manuel technique
            </button>
          </a>

          <a href="/Guide-SAV-et-diagnostic-rapide.pdf" target="_blank">
            <button style={btnSecondary}>
              Télécharger le guide SAV et diagnostic
            </button>
          </a>
        </div>
      </section>

      {/* CONTACT */}
      <section style={section}>
        <h2>Besoin d’aide ?</h2>

        <p style={text}>
          Notre équipe est disponible pour vous accompagner rapidement.
        </p>

        <a href="https://wa.me/33628261446" target="_blank">
          <button style={whatsappBtn}>
            Contacter le SAV sur WhatsApp
          </button>
        </a>
      </section>

    </main>
  );
}

/* STYLES */

const container = {
  maxWidth: 800,
  margin: "0 auto",
  padding: 20,
  fontFamily: "Arial, sans-serif"
};

const title = {
  fontSize: 28,
  fontWeight: "bold",
  marginBottom: 10
};

const subtitle = {
  color: "#555",
  marginBottom: 20
};

const section = {
  marginTop: 40
};

const text = {
  color: "#555",
  marginTop: 10
};

const box = {
  marginTop: 10,
  background: "#f7f7f7",
  padding: 15,
  borderRadius: 8
};

const btn = {
  marginTop: 10,
  padding: 12,
  width: "100%",
  background: "#000",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
};

const btnSecondary = {
  marginTop: 10,
  padding: 12,
  width: "100%",
  background: "#ddd",
  color: "#000",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
};

const whatsappBtn = {
  marginTop: 10,
  padding: 15,
  width: "100%",
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer"
};
