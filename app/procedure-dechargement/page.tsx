/**
 * Procédure de déchargement des conteneurs NeoDrive, à envoyer aux prestataires (dépotage, cariste, transporteur).
 * Page publique non référencée : le lien suffit, aucune donnée client. Photos dans /public/depotage.
 */
const C = { bg: "#f6f4f0", ink: "#141414", mute: "#5f5a54", line: "#e5e0d8", brand: "#f05a28", red: "#b91c1c", redBg: "#fef2f2", green: "#15803d", greenBg: "#f0fdf4" };
const PDF = "/depotage/livret-dechargement-neodrive.pdf";
const PHONE = "06 89 78 17 10";

const TOOLS = [
  "Visseuse-dévisseuse avec embouts et douilles : les châssis sont vissés et boulonnés au plancher, aux parois et en haut du conteneur",
  "Marteau, pied de biche et gros tournevis, pour taper sur les vis abîmées et décoller les équerres",
  "Chariot élévateur avec rallonges de fourches (fourches longues)",
  "2 sangles à cliquet",
  "Cales en bois recouvertes de mousse épaisse, pour poser sur les fourches",
  "Rampe mobile posée au sol si le quai est trop étroit",
];

type Step = { title: string; text: string; photos: [string, string][] };
const STEPS: Step[] = [
  { title: "Photographier avant de toucher", text: "Photo du conteneur fermé et du scellé, puis de l'intérieur dès l'ouverture. C'est la preuve en cas de dégât pendant le transport.", photos: [["voiture-dans-conteneur-ouverture.jpg", "Intérieur à l'ouverture : voitures inclinées sur leurs châssis."]] },
  { title: "Choisir le bon accès", text: "Le châssis prend presque toute la largeur du conteneur. Sur un quai avec des butées de chaque côté, il ne passe pas et le cariste lève trop haut. Dans ce cas, rampe posée au sol : le chariot entre et sort le châssis à plat.", photos: [["butees-quai-1.jpg", "Butée de quai qui réduit le passage."], ["rampe-vue-generale.jpg", "Bonne solution : rampe mobile au sol."]] },
  { title: "Dévisser toutes les équerres", text: "Les châssis sont fixés par des équerres vissées au plancher, aux parois et en haut. Tout dévisser avant de tirer. Les petites vis se faussent souvent : marteau, gros tournevis et pied de biche.", photos: [["equerre-plancher.jpg", "Équerre vissée au plancher."], ["equerre-acier-fin.jpg", "Acier fin, vis abîmées : à décoller au pied de biche."]] },
  { title: "Sortir un châssis à la fois", text: "Fourches longues engagées sous tout le châssis, en le prenant par l'avant et l'arrière. Lever juste assez, sortir lentement et bien droit, une personne guide.", photos: [["fourches-chariot.jpg", "Fourches longues, bien engagées."], ["voiture-levee-trop-haut.jpg", "À éviter : châssis levé trop haut."]] },
  { title: "Tenir le châssis avec des sangles", text: "Une fois le châssis posé au sol, accrocher des sangles à l'avant pour le tenir et le mettre à l'horizontale.", photos: [["methode-1-voiture-sur-chassis.jpg", "Châssis au sol, voiture encore inclinée."], ["methode-2-sangles-chassis.jpg", "Sangles accrochées à l'avant du châssis."]] },
  { title: "Cales sur les fourches, aux points de l'usine", text: "Rallonges sur les fourches, puis une cale en bois recouverte de mousse sur chaque fourche. Les cales se placent uniquement aux deux points indiqués par l'usine, sur la poutre en acier de chaque côté, à l'extérieur des câbles.", photos: [["points-de-levage-usine.jpg", "Points d'appui indiqués par l'usine (en rouge)."], ["cale-bois-sous-voiture.jpg", "Cale posée sur la fourche, sous la poutre en acier."]] },
  { title: "Lever, libérer, reposer", text: "Lever lentement pour libérer la voiture du châssis, puis la reposer doucement sur ses 4 roues. Une personne guide les roues à la main pour qu'elles sortent sans frotter.", photos: [["methode-4-cales-et-levage.jpg", "La voiture est soulevée et libérée du châssis."], ["methode-7-roue-guidee.jpg", "La roue est guidée à la main."]] },
  { title: "Contrôle final", text: "Photo des 4 côtés et du toit de chaque voiture avec le numéro de série (VIN) visible. Tout dégât est signalé à NeoDrive le jour même. Clés, manuel, chargeur et cartons d'accessoires restent dans chaque voiture.", photos: [] },
];

const NEVER = [
  "Appuyer au milieu de la voiture : batterie, câble de frein et gaines de câbles passent dessous",
  "Poser une fourche ou du bois nu sous la voiture sans mousse",
  "Appuyer sur la carrosserie ou passer une sangle autour",
  "Sortir deux châssis à la fois ou tirer un châssis encore vissé",
  "Lever plus haut que nécessaire",
  "Se placer sous ou à côté d'une voiture levée",
];

const card: React.CSSProperties = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, marginTop: 14 };

function Fig({ src, cap }: { src: string; cap: string }) {
  return <figure style={{ margin: 0, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}`, background: "#fff" }}>
    <a href={`/depotage/${src}`} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/depotage/${src}`} alt={cap} loading="lazy" style={{ display: "block", width: "100%", height: 230, objectFit: "cover" }} />
    </a>
    <figcaption style={{ padding: "8px 10px", fontSize: 13.5, lineHeight: 1.35, color: C.mute }}>{cap}</figcaption>
  </figure>;
}

export default function ProcedureDechargement() {
  return <main style={{ background: C.bg, minHeight: "100vh", fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: C.ink }}>
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: C.brand, color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18 }}>N</span>
        <b style={{ fontSize: 16 }}>NeoDrive</b>
      </div>
      <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "22px 0 6px" }}>Procédure de déchargement des conteneurs</h1>
      <p style={{ color: C.mute, margin: 0, lineHeight: 1.5 }}>Conteneurs 40&apos; de 9 voitures sans permis posées inclinées sur des châssis en acier. À lire par le responsable de quai et le cariste avant chaque dépotage.</p>

      <div style={{ background: C.red, color: "#fff", borderRadius: 18, padding: 16, marginTop: 16, lineHeight: 1.5 }}>
        <b style={{ fontSize: 17 }}>Règle d&apos;or</b> : une seule voiture à la fois, lentement, jamais d&apos;appui sur la carrosserie ni au milieu de la voiture. Une réparation coûte de 500 à 1 500 €. Un doute : on arrête et on appelle Mansour au <a href="tel:+33689781710" style={{ color: "#fff", fontWeight: 900 }}>{PHONE}</a>.
      </div>

      <section style={card}>
        <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>Matériel à prévoir</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, lineHeight: 1.45 }}>{TOOLS.map(t => <li key={t}>{t}</li>)}</ul>
      </section>

      {STEPS.map((s, i) => <section key={s.title} style={card}>
        <h2 style={{ fontSize: 19, margin: "0 0 6px", display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ flex: "0 0 32px", height: 32, borderRadius: 999, background: C.ink, color: "#fff", display: "grid", placeItems: "center", fontSize: 15 }}>{i + 1}</span>{s.title}
        </h2>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{s.text}</p>
        {s.photos.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginTop: 12 }}>
          {s.photos.map(([src, cap]) => <Fig key={src} src={src} cap={cap} />)}
        </div> : null}
      </section>)}

      <section style={{ ...card, background: C.redBg, borderColor: "#fecaca" }}>
        <h2 style={{ fontSize: 20, margin: "0 0 10px", color: C.red }}>À ne jamais faire</h2>
        <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6, lineHeight: 1.45 }}>{NEVER.map(t => <li key={t}>{t}</li>)}</ul>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10, marginTop: 12 }}>
          <Fig src="degat-bas-de-caisse-1.jpg" cap="Dégât : bas de caisse frotté contre le châssis." />
          <Fig src="personne_dessous.jpg" cap="Interdit : personne sous une charge levée." />
        </div>
      </section>

      <section style={{ ...card, display: "grid", gap: 10 }}>
        <a href={PDF} target="_blank" rel="noreferrer" download style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: C.ink, color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none" }}>📄 Télécharger le livret complet (PDF)</a>
        <a href="tel:+33689781710" style={{ display: "block", textAlign: "center", padding: "14px 16px", borderRadius: 14, background: C.brand, color: "#fff", fontWeight: 800, fontSize: 16, textDecoration: "none" }}>📞 Appeler Mansour · {PHONE}</a>
        <p style={{ color: C.mute, fontSize: 13, margin: 0 }}>NeoDrive – MK HOLDING SAS</p>
      </section>
    </div>
  </main>;
}
