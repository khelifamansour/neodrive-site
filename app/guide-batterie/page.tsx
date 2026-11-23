import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide batterie NeoDrive | Recharge et entretien des batteries plomb",
  description: "Consignes NeoDrive pour recharger, utiliser et stocker les batteries plomb de votre voiture sans permis électrique, et préserver leur durée de vie.",
  alternates: { canonical: "https://www.easydrive-auto.fr/guide-batterie" },
};

type Item = { t: string; k?: "ok" | "no" | "warn" };
const S: { icon: string; title: string; intro?: string; items?: Item[]; ol?: string[]; after?: string }[] = [
  { icon: "🔋", title: "Lecture du niveau de batterie", items: [
    { k: "ok", t: "Après recharge, une tension de 65 V ou plus, généralement 65–66 V sur le compteur, est un repère de batterie chargée sur ce modèle. Vérifiez également le voyant de fin de charge du chargeur." },
    { k: "ok", t: "Le pourcentage de charge restant s’estime proportionnellement aux barres du cadran : plus les barres sont remplies, plus le niveau de batterie est élevé. Il s’agit d’une estimation." },
    { k: "warn", t: "L’observation des barres se fait en dynamique, en roulant à allure régulière. À l’arrêt, le cadran reste vert et ne permet pas d’évaluer correctement le niveau restant." } ] },
  { icon: "🔌", title: "Quand recharger ?", items: [
    { k: "ok", t: "Rechargez au plus tard lorsque la batterie descend vers 20–30 %, et de préférence après utilisation." },
    { k: "no", t: "Évitez de rouler jusqu’à la décharge complète. Les décharges profondes répétées peuvent fortement endommager les batteries." } ] },
  { icon: "⏱️", title: "Temps de charge indicatifs", items: [
    { t: "Printemps / automne : 6–8 heures." }, { t: "Été : 6–7 heures." }, { t: "Hiver : 8–10 heures." },
    { t: "Ces durées varient selon le niveau de batterie initial, la température et le chargeur. Le voyant et la notice du chargeur indiquent la fin de charge." },
    { k: "ok", t: "Une fois le voyant du chargeur passé au vert, débranchez selon la notice. Si celle-ci autorise un maintien en charge, limitez-le à environ 1 heure maximum, puis débranchez." },
    { k: "no", t: "Évitez de dépasser 12 heures de charge en continu. Si le cycle n’est pas terminé, contactez le SAV avant de prolonger la charge. La notice du chargeur prévaut." },
    { k: "warn", t: "Utilisez uniquement le chargeur fourni avec le véhicule." } ] },
  { icon: "🔌", title: "Procédure de charge", intro: "Le contact doit être coupé. Le coupe-circuit doit être en fonctionnement, en position rouge.", ol: [
    "Branchez d’abord le chargeur côté véhicule.", "Branchez ensuite le chargeur à la prise secteur.", "Une fois la charge terminée, débranchez d’abord la prise secteur.", "Débranchez ensuite le chargeur côté véhicule." ] },
  { icon: "🌡️", title: "Bonnes conditions de recharge", items: [
    { k: "ok", t: "Après utilisation, prévoyez environ 30 minutes de refroidissement avant de recharger." },
    { k: "ok", t: "Rechargez dans un endroit sec et ventilé." },
    { k: "no", t: "Évitez la pluie, le plein soleil, l’humidité et les espaces fermés très chauds." } ] },
  { icon: "🚗", title: "Utilisation du véhicule", items: [
    { k: "ok", t: "Adoptez une conduite souple et évitez les accélérations brutales." },
    { k: "ok", t: "Respectez la charge maximale du véhicule et évitez les surcharges importantes." },
    { k: "ok", t: "Après de nombreux petits trajets, effectuez une recharge complète." },
    { k: "warn", t: "Une exposition prolongée à l’eau ou à l’humidité peut endommager le système électrique." } ] },
  { icon: "🔎", title: "Contrôles réguliers", intro: "Vérifiez régulièrement :", items: [
    { t: "La propreté des batteries." }, { t: "Les connexions." }, { t: "Les câbles." }, { t: "L’absence d’oxydation." }, { t: "L’absence de gonflement ou de fuite." } ] },
  { icon: "📦", title: "Stockage : plus de 7 jours sans utilisation", items: [
    { k: "ok", t: "Avant le stockage, rechargez complètement les batteries, puis coupez le coupe-circuit principal." },
    { k: "ok", t: "Stockez le véhicule dans un endroit sec et ventilé, à l’abri des fortes chaleurs et de l’humidité." },
    { k: "ok", t: "Prévoyez une recharge environ une fois par mois, selon l’état de charge et les indications de la notice. Pour chaque recharge, remettez le coupe-circuit en fonctionnement et suivez la procédure ci-dessus." },
    { k: "no", t: "Ne laissez pas les batteries stockées déchargées : elles peuvent se sulfater et devenir inutilisables." } ] },
  { icon: "🚨", title: "En cas d’anomalie", intro: "En cas d’odeur inhabituelle, de chauffe anormale, de gonflement ou de fuite, arrêtez immédiatement l’utilisation et la recharge, puis contactez le SAV." },
  { icon: "📋", title: "Garantie batterie", intro: "Selon les conditions du contrat, les dommages directement imputables aux situations suivantes peuvent être exclus de la garantie commerciale batterie :", items: [
    { t: "Décharge profonde." }, { t: "Mauvaise utilisation." }, { t: "Surcharge." }, { t: "Chargeur inadapté." }, { t: "Modifications non autorisées." }, { t: "Exposition prolongée à l’eau." }, { t: "Absence d’entretien." }, { t: "Stockage des batteries déchargées." } ],
    after: "Ces consignes ne limitent pas vos garanties légales." },
];
const mark = { ok: "✅", no: "❌", warn: "⚠️" } as const;

export default function GuideBatterie() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 72px", fontFamily: "system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif", color: "#141414", lineHeight: 1.55 }}>
      <p style={{ margin: 0, color: "#f05a28", fontWeight: 800, letterSpacing: 1, fontSize: 13 }}>SERVICE APRÈS-VENTE NEODRIVE</p>
      <h1 style={{ fontSize: 32, lineHeight: 1.15, margin: "6px 0 10px" }}>Guide batterie : recharge, utilisation et stockage</h1>
      <p style={{ background: "#fff1ea", border: "1px solid #f8c9b4", borderRadius: 14, padding: "12px 14px", margin: "0 0 18px" }}><b>Très important :</b> ces consignes préservent les performances et prolongent la durée de vie des batteries plomb de votre NeoDrive. Lisez-les avant votre première recharge.</p>
      <p style={{ margin: "0 0 22px" }}><a href="/guide-batterie-neodrive.pdf" download style={{ display: "inline-block", background: "#141414", color: "#fff", padding: "12px 18px", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>📄 Télécharger le guide en PDF</a></p>
      {S.map(sec => (
        <section key={sec.title} style={{ background: "#fff", border: "1px solid #ece7df", borderRadius: 16, padding: "14px 16px", margin: "0 0 12px" }}>
          <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>{sec.icon} {sec.title}</h2>
          {sec.intro ? <p style={{ margin: "0 0 8px" }}>{sec.intro}</p> : null}
          {sec.items ? <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>{sec.items.map(i => <li key={i.t}>{i.k ? mark[i.k] + " " : "• "}{i.t}</li>)}</ul> : null}
          {sec.ol ? <ol style={{ margin: "0 0 0 20px", padding: 0, display: "grid", gap: 4 }}>{sec.ol.map(i => <li key={i}>{i}</li>)}</ol> : null}
          {sec.after ? <p style={{ margin: "8px 0 0", color: "#555" }}>{sec.after}</p> : null}
        </section>
      ))}
      <p style={{ marginTop: 18 }}>En cas de doute ou de question, contactez le SAV <b>avant</b> qu’un problème apparaisse : <a href="/sav" style={{ color: "#f05a28", fontWeight: 700 }}>ouvrir une demande SAV</a> ou WhatsApp au <a href="https://wa.me/33676192234" style={{ color: "#f05a28", fontWeight: 700 }}>06 76 19 22 34</a>.</p>
      <p style={{ color: "#666", fontSize: 14 }}>Ces consignes complètent les notices du véhicule et du chargeur. Leurs instructions spécifiques prévalent.</p>
    </main>
  );
}
