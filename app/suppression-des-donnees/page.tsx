export const metadata = {
  title: "Suppression des données | NeoDrive",
  description: "Instructions pour demander la suppression de vos données personnelles NeoDrive.",
};

export default function DataDeletionPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
      <h1>Suppression des données</h1>
      <p>Dernière mise à jour : 22 août 2026</p>

      <p>
        Vous pouvez demander la suppression des données personnelles associées à vos échanges avec NeoDrive,
        y compris les données issues de WhatsApp, Facebook ou Instagram lorsque celles-ci ont été enregistrées
        dans nos systèmes.
      </p>

      <h2>Comment faire une demande</h2>
      <p>
        Envoyez votre demande via la page Contact du site NeoDrive en indiquant clairement que vous souhaitez
        la suppression de vos données. Afin d’éviter la suppression de données appartenant à une autre personne,
        nous pouvons vous demander de confirmer certaines informations permettant de vous identifier.
      </p>

      <h2>Données concernées</h2>
      <p>
        Selon votre situation, la demande peut concerner vos coordonnées, l’historique des échanges commerciaux,
        les messages enregistrés dans notre CRM, les informations relatives à votre demande de véhicule et les
        données liées à nos intégrations Meta.
      </p>

      <h2>Délai de traitement</h2>
      <p>
        Nous traitons les demandes dans les meilleurs délais et conformément aux délais prévus par la réglementation
        applicable. Certaines données peuvent être conservées lorsque la loi nous y oblige ou lorsqu’elles sont
        nécessaires à la défense de droits en justice, à la comptabilité, à la prévention de la fraude ou à d’autres
        obligations légales.
      </p>

      <h2>Arrêt des communications WhatsApp</h2>
      <p>
        Si votre demande concerne uniquement l’arrêt des messages commerciaux, vous pouvez également répondre STOP
        à un message WhatsApp lorsque cette option est proposée. Cela n’entraîne pas nécessairement la suppression
        immédiate de toutes les données déjà conservées ; pour une suppression complète, utilisez la procédure ci-dessus.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur cette procédure, utilisez la page Contact du site NeoDrive.
      </p>
    </main>
  );
}
