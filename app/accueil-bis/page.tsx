import type { Metadata } from "next";
import AccueilBisClient from "./AccueilBisClient";

export const metadata: Metadata = {
  title: "NeoDrive — Accueil Bis",
  description: "Nouvelle page d’accueil NeoDrive : voiture sans permis électrique, livraison en France, vidéos et véhicules réels.",
  robots: { index: false, follow: false },
};

export default function AccueilBisPage() {
  return <AccueilBisClient />;
}
