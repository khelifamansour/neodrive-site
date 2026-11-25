"use client";
import { useEffect } from "react";
import s from "./app.module.css";
import { Header, InstallCard, Loading, Login, PushButton, useMe, type Me } from "./ui";

/** Accueil de l'application NeoDrive : grandes tuiles vers les outils (fondateur, équipe) ; transporteurs et chauffeurs vont droit à leurs missions. */
type Tile = { href: string; icon: string; title: string; hint: string; wide?: boolean };
const FOUNDER_TILES: Tile[] = [
  { href: "/app/transporteur", icon: "🚚", title: "Missions transporteur", hint: "À venir, en cours, terminées", wide: true },
  { href: "/stock-facturation/tickets", icon: "🧾", title: "Tickets compta", hint: "Photos de tickets et factures" },
  { href: "/planificateur", icon: "🗺️", title: "Planificateur", hint: "Tournées et missions" },
  { href: "/reservations-admin", icon: "📋", title: "Réservations", hint: "Clients et livraisons" },
  { href: "/carte-grise-admin", icon: "🪪", title: "Cartes grises", hint: "Dossiers ANTS" },
  { href: "/studio/bibliotheque", icon: "🎞️", title: "Bibliothèque vidéo", hint: "Envoyer les vidéos du téléphone" },
  { href: "/studio/fabrique", icon: "🏭", title: "Fabrique", hint: "Vidéos à publier" },
  { href: "/studio/video", icon: "🎬", title: "Studio vidéo", hint: "Montage et sous-titres" },
  { href: "/tableau-de-bord", icon: "📊", title: "Tableau de bord", hint: "Ventes et paiements" },
  { href: "/recrutement-admin", icon: "🧑‍💼", title: "Recrutement", hint: "Candidatures" },
  { href: "/app/admin", icon: "👥", title: "Comptes de l'app", hint: "Transporteurs, chauffeurs" },
];
const TEAM_TILES: Tile[] = [
  { href: "/equipe", icon: "🧑‍🤝‍🧑", title: "Espace équipe", hint: "Mes fiches, mes rappels", wide: true },
  { href: "/app/transporteur", icon: "🚚", title: "Missions transporteur", hint: "Suivi des livraisons" },
  { href: "/planificateur", icon: "🗺️", title: "Planificateur", hint: "Selon vos accès" },
];

function Tiles({ tiles }: { tiles: Tile[] }) {
  return <nav className={s.tiles} aria-label="Outils">
    {tiles.map(t => <a key={t.href} href={t.href} className={`${s.tile} ${t.wide ? s.tileWide : ""}`}>
      <div className={s.tileIcon} aria-hidden>{t.icon}</div>
      <div style={{ display: "flex", flexDirection: "column" }}><strong>{t.title}</strong><span>{t.hint}</span></div>
    </a>)}
  </nav>;
}

export default function AppHome() {
  const { me, setMe } = useMe();
  const carrier = me && (me.role === "transporteur" || me.role === "chauffeur");
  useEffect(() => { if (carrier) location.replace("/app/transporteur"); }, [carrier]);
  if (me === undefined || carrier) return <Loading />;
  if (me === null) return <Login onDone={(u: Me) => setMe(u)} />;
  const hello = new Date().getHours() < 18 ? "Bonjour" : "Bonsoir";
  return <main className={s.page}>
    <Header me={me} />
    <InstallCard />
    <h1 className={s.h1}>{hello} {me.name.split(" ")[0]}</h1>
    <p className={s.sub}>{me.role === "fondateur" ? "Tous les outils NeoDrive, en un geste." : "Vos outils NeoDrive."}</p>
    <Tiles tiles={me.role === "fondateur" ? FOUNDER_TILES : TEAM_TILES} />
    <PushButton />
  </main>;
}
