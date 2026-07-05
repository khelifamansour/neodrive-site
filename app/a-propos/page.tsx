"use client"
export const metadata = {
  title: "À propos de NeoDrive | Voiture sans permis électrique",
  description:
    "Découvrez NeoDrive, marque toulousaine spécialisée depuis plus de 6 ans dans la voiture sans permis électrique neuve. SAV France, pièces détachées, financement et livraison partout en France.",
};

export default function APropos() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16">

      <h1 className="text-5xl font-bold mb-8">
        À propos de NeoDrive
      </h1>

      <p className="text-xl leading-9 mb-12">
        NeoDrive est une marque toulousaine spécialisée dans la voiture sans
        permis électrique depuis plus de 6 ans. Notre objectif est simple :
        proposer une voiture sans permis neuve, bien équipée, fiable et
        accessible à tous.
      </p>

      <section className="mb-16">

        <h2 className="text-3xl font-bold mb-6">
          Notre expérience
        </h2>

        <p className="leading-8 text-lg">
          Depuis plus de 6 années, nous travaillons exclusivement dans le
          domaine des voitures sans permis. Cette expérience nous permet de
          sélectionner des véhicules simples, robustes et faciles à entretenir.
          Nous connaissons parfaitement les besoins des particuliers ainsi que
          les contraintes liées au service après-vente.
        </p>

      </section>

      <section className="mb-16">

        <h2 className="text-3xl font-bold mb-6">
          Un véritable service après-vente
        </h2>

        <p className="leading-8 text-lg">
          Contrairement à certaines marques qui disposent de peu de pièces ou
          dont les réparations sont coûteuses, NeoDrive met l'accent sur un
          service après-vente efficace.
        </p>

        <ul className="list-disc pl-8 mt-6 space-y-3 text-lg">

          <li>Pièces détachées disponibles.</li>

          <li>Assistance technique.</li>

          <li>Réparation simplifiée.</li>

          <li>Conception pensée pour être facilement entretenue.</li>

          <li>Accompagnement avant et après l'achat.</li>

        </ul>

      </section>

      <section className="mb-16">

        <h2 className="text-3xl font-bold mb-6">
          Pourquoi choisir NeoDrive ?
        </h2>

        <p className="leading-8 text-lg">
          De nombreux acheteurs hésitent aujourd'hui entre une voiture sans
          permis d'occasion, une Citroën Ami, une Fiat Topolino ou une voiture
          électrique neuve NeoDrive.
        </p>

        <p className="leading-8 text-lg mt-6">

          Notre philosophie est différente.

        </p>

        <ul className="list-disc pl-8 mt-6 space-y-3 text-lg">

          <li>Voiture neuve.</li>

          <li>Structure entièrement en acier.</li>

          <li>Grand coffre.</li>

          <li>Plus d'équipements de série.</li>

          <li>Caméra de recul.</li>

          <li>Bluetooth.</li>

          <li>Chauffage et ventilation.</li>

          <li>Alarme antivol.</li>

          <li>Aide au démarrage en côte.</li>

          <li>Excellent rapport qualité/prix.</li>

        </ul>

      </section>

      <section className="mb-16">

        <h2 className="text-3xl font-bold mb-6">
          Une alternative à la voiture sans permis d'occasion
        </h2>

        <p className="leading-8 text-lg">

          Beaucoup de personnes recherchent une voiture sans permis d'occasion
          afin de réduire leur budget. Chez NeoDrive, nous avons fait un autre
          choix : proposer une voiture sans permis électrique neuve à un prix
          particulièrement compétitif afin de permettre à chacun d'accéder à un
          véhicule récent bénéficiant d'une garantie constructeur.

        </p>

      </section>

      <section className="mb-16">

        <h2 className="text-3xl font-bold mb-6">

          Notre engagement

        </h2>

        <p className="leading-8 text-lg">

          Nous souhaitons rendre la mobilité accessible au plus grand nombre en
          proposant des véhicules simples, fiables, économiques et bien
          équipés. Notre équipe accompagne chaque client avant, pendant et après
          son achat.

        </p>

      </section>

    </main>
  );
}
