
export default function Reservation() {
  return (
    <main style={{ maxWidth: 600, margin: "auto", padding: 20, fontFamily: "Arial" }}>

      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center" }}>
        Réserver votre véhicule
      </h1>

      <p style={{ textAlign: "center", color: "#555", marginTop: 10 }}>
        Remplissez vos informations et nous vous contacterons rapidement.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();

          const form = e.target as HTMLFormElement;
          const name = (form.elements.namedItem("name") as HTMLInputElement).value;
          const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
          const city = (form.elements.namedItem("city") as HTMLInputElement).value;

          const message =
            `Bonjour, je souhaite réserver un véhicule.\n\nNom: ${name}\nTéléphone: ${phone}\nVille: ${city}`;

          window.open(
            `https://wa.me/33628261446?text=${encodeURIComponent(message)}`,
            "_blank"
          );
        }}
        style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input name="name" placeholder="Nom complet" required style={input} />
        <input name="phone" placeholder="Téléphone" required style={input} />
        <input name="city" placeholder="Ville" required style={input} />

        <button type="submit" style={button}>
          Réserver maintenant
        </button>
      </form>

      <div style={{ marginTop: 30, background: "#f7f7f7", padding: 15, borderRadius: 8 }}>
        <p>✔ 1. Vous remplissez vos informations</p>
        <p>✔ 2. Nous confirmons la disponibilité</p>
        <p>✔ 3. Réservation avec acompte</p>
        <p>✔ 4. Envoi des documents</p>
        <p>✔ 5. Livraison</p>
      </div>

    </main>
  );
}

const input = {
  padding: 12,
  borderRadius: 6,
  border: "1px solid #ccc"
};

const button = {
  padding: 15,
  background: "#25D366",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer"
};
