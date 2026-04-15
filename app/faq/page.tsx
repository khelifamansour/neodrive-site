export default function FAQ() {
  return (
    <main style={{
      fontFamily: "system-ui, Arial",
      background: "#fafafa",
      minHeight: "100vh",
      padding: "80px 20px"
    }}>

      <h1 style={{
        textAlign: "center",
        fontSize: "40px",
        marginBottom: "40px"
      }}>
        Questions fréquentes
      </h1>

      <div style={{
        maxWidth: "900px",
        margin: "auto",
        display: "grid",
        gap: "25px"
      }}>

        <Faq
          q="Pourquoi le prix est-il aussi bas ?"
          a="Le prix est bas car nous vendons directement depuis l’usine, sans intermédiaires ni réseau de concessionnaires coûteux. Nous avons également fait le choix d’un design simple, fiable et sans options inutiles. Cela permet de réduire fortement les coûts tout en conservant un véhicule robuste et adapté à un usage quotidien."
        />

        <Faq
          q="Est-ce que le véhicule est fiable ?"
          a="Oui. Justement, sa simplicité est un avantage. Moins de complexité signifie moins de pannes. Le véhicule est conçu pour être robuste et utilisé quotidiennement sans surprises. Avec une utilisation normale, le taux de panne est faible."
        />

        <Faq
          q="Les pièces détachées sont-elles disponibles ?"
          a="Oui, toutes les pièces sont disponibles en France. Le service après-vente est une priorité pour nous. En cas de besoin, nous pouvons expédier rapidement les pièces et accompagner votre garage local dans la réparation."
        />

        <Faq
          q="Que se passe-t-il en cas de panne ?"
          a="Nous vous mettons en relation avec un garage proche de chez vous. Nous fournissons les pièces nécessaires et nous accompagnons le professionnel si besoin. Vous n’êtes jamais seul, nous restons disponibles pour vous assister."
        />

        <Faq
          q="Quel est le prix de la livraison ?"
          a="Le prix dépend de votre localisation. Nous livrons partout en France et nous pouvons vous donner un tarif précis rapidement. Dans certains cas, vous pouvez aussi venir récupérer le véhicule ou envoyer votre transporteur."
        />

        <Faq
          q="Où êtes-vous basés ?"
          a="Nous sommes basés à Toulouse. Vous pouvez venir voir le véhicule sur place, ou demander une présentation en visio WhatsApp. Nous livrons ensuite partout en France."
        />

        <Faq
          q="Quel est le délai de livraison ?"
          a="Le délai dépend du stock. Si le véhicule est disponible immédiatement, la livraison peut être rapide. Sinon, nous vous donnons un délai précis selon les arrivages."
        />

        <Faq
          q="Peut-on payer en plusieurs fois ?"
          a="Oui, mais nous ne faisons pas de financement interne. La majorité de nos clients passent par leur banque ou par Groupama. Il suffit de contacter votre agence locale pour monter un dossier de crédit."
        />

        <Faq
          q="Pourquoi ne pas choisir le leasing ?"
          a="Le leasing paraît attractif, mais sur 3 ans vous dépensez souvent 6 000 à 8 000 € sans rien posséder à la fin. Avec notre solution, vous êtes propriétaire du véhicule, sans frais cachés, et vous pouvez le revendre."
        />

        <Faq
          q="Faut-il un permis ?"
          a="Non, aucun permis classique n’est nécessaire. Si vous êtes né après 1988, il faut simplement le permis AM, accessible facilement en auto-école."
        />

        <Faq
          q="Peut-on rouler sur autoroute ?"
          a="Non. Comme tous les véhicules sans permis, la vitesse est limitée à 45 km/h. Il est donc destiné aux trajets urbains et périurbains."
        />

        <Faq
          q="Le véhicule a-t-il la climatisation ?"
          a="Non. Nous avons volontairement choisi de ne pas intégrer de climatisation. Elle consomme beaucoup d’énergie, réduit l’autonomie et augmente les risques de panne. Le véhicule dispose d’une ventilation et d’un toit ouvrant, ce qui est souvent plus efficace et plus fiable."
        />

        <Faq
          q="Où est fabriqué le véhicule ?"
          a="Le véhicule est conçu selon des standards compatibles avec les normes européennes (freinage, sécurité, vitrage). L’assemblage est optimisé pour réduire les coûts, mais chaque véhicule est vérifié pour garantir sa qualité."
        />

        <Faq
          q="Puis-je voir le véhicule avant achat ?"
          a="Oui, à Toulouse. Nous pouvons également vous faire une présentation complète en visio WhatsApp pour vous montrer tous les détails du véhicule."
        />

        <Faq
          q="Comment être sûr de recevoir le véhicule ?"
          a="Vous pouvez venir sur place, envoyer un transporteur ou opter pour une livraison avec paiement à réception. Tout est transparent et sécurisé."
        />

        <Faq
          q="Que se passe-t-il après la garantie ?"
          a="Même après la garantie, nous restons disponibles pour vous aider. Vous pouvez commander des pièces et bénéficier de notre support technique."
        />

      </div>

    </main>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div style={{
      background: "#ffffff",
      padding: "25px",
      borderRadius: "14px",
      boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
    }}>
      <strong style={{ fontSize: "16px" }}>{q}</strong>
      <p style={{ marginTop: "12px", color: "#555", lineHeight: "1.6" }}>
        {a}
      </p>
    </div>
  );
}