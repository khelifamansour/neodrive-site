"use client";
import { useState } from "react";
import s from "./livraison.module.css";

const RIB: [string, string][] = [["Bénéficiaire", "MK HOLDING"], ["IBAN", "FR76 2823 3000 0142 1307 1051 008"], ["BIC", "REVOFRP2"]];

const WHATSAPP = "https://wa.me/33628261446?text=" + encodeURIComponent("Bonjour, j’ai une question sur la livraison de ma NeoDrive.");

const DRIVE = [
  ["Vérifiez le disjoncteur", "Sur le côté du véhicule, le disjoncteur doit être enclenché (en position ON). S’il est baissé, relevez-le."],
  ["Mettez le contact", "Tournez la clé : le tableau de bord s’allume."],
  ["Appuyez sur la pédale de frein", "C’est la sécurité de démarrage. L’écran affiche alors « READY »."],
  ["Choisissez la marche", "Tournez le sélecteur : D pour avancer, R pour reculer, N pour le point mort."],
  ["Desserrez le frein à main", "Avant de partir, pensez à bien relâcher le frein à main."],
  ["Accélérez doucement", "Utilisez uniquement le pied droit, pour l’accélérateur comme pour le frein. Bonne route !"],
];

export default function PreparerLivraison() {
  const [copied, setCopied] = useState("");
  const copy = async (k: string, v: string) => { try { await navigator.clipboard.writeText(v.replace(/ /g, k === "IBAN" ? "" : " ")); setCopied(k); setTimeout(() => setCopied(""), 1500); } catch { /* ignore */ } };
  return (
    <main className={s.page}>
      {/* HERO */}
      <section className={s.hero}>
        <div className={s.heroCopy}>
          <span className={s.kicker}><i /> Votre NeoDrive arrive bientôt</span>
          <h1>Préparons ensemble <span>votre livraison.</span></h1>
          <p>Quelques étapes simples pour que le grand jour se passe parfaitement : le paiement, la prise en main et la carte grise. Lisez cette page avant l’arrivée du transporteur, ça prend 5 minutes.</p>
          <div className={s.heroChecks}><span>✓ Livraison devant chez vous</span><span>✓ Paiement le jour de la livraison</span><span>✓ Une équipe joignable</span></div>
        </div>
        <figure className={s.heroImg}><img src="/livraison-guide/camion.webp" alt="NeoDrive déchargée du camion de livraison" /></figure>
      </section>

      <ol className={s.timeline}>
        <li><b>1</b><span>Le transporteur vous appelle</span></li>
        <li><b>2</b><span>Vous préparez le paiement</span></li>
        <li><b>3</b><span>Vous recevez votre NeoDrive</span></li>
        <li><b>4</b><span>Vous faites la carte grise</span></li>
      </ol>

      {/* ÉTAPE 1 */}
      <section className={s.card}>
        <header className={s.head}><span className={s.num}>1</span><div><h2>Le transporteur vous contacte</h2><p>Quelques jours avant la livraison.</p></div></header>
        <div className={s.split}>
          <div>
            <p className={s.text}>Quelques jours avant la livraison, le transporteur vous appelle pour vous donner <b>une date et un créneau approximatifs</b>. Gardez votre téléphone à portée de main et répondez aux numéros inconnus ces jours-là.</p>
            <ul className={s.list}><li>Prévoyez un endroit facile d’accès pour décharger le véhicule.</li><li>Soyez présent (ou une personne de confiance) au moment de la livraison.</li></ul>
          </div>
          <img className={s.photo} src="/livraison-guide/livraison.webp" alt="Livraison d’une NeoDrive devant chez un client" />
        </div>
      </section>

      {/* ÉTAPE 2 — PAIEMENT */}
      <section className={`${s.card} ${s.important}`}>
        <header className={s.head}><span className={s.num}>2</span><div><h2>Préparez votre paiement</h2><p>Dès que vous connaissez la date de livraison.</p></div></header>
        <div className={s.alert}>
          <strong>⚠️ Très important</strong>
          <p>Le règlement se fait <b>par virement instantané le jour de la livraison</b>. Pour éviter que votre banque ne bloque le paiement (beaucoup de banques déclenchent une sécurité sur les virements importants), faites ces 3 choses <b>avant</b> le jour J :</p>
        </div>
        <div className={s.payGrid}>
          <article><span>A</span><h3>Enregistrez notre RIB</h3><p>Ajoutez NeoDrive comme bénéficiaire dans votre application bancaire. L’ajout d’un bénéficiaire peut prendre jusqu’à 24 à 72 h selon les banques : faites-le dès maintenant.</p>
            <div className={s.rib}>
              {RIB.map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b><button type="button" onClick={() => copy(label, value)}>{copied === label ? "✓ Copié" : "Copier"}</button></div>)}
            </div>
            <small>🔒 Ce sont nos seules coordonnées bancaires. Nous ne vous enverrons jamais un autre RIB par SMS ou e-mail : en cas de doute, appelez-nous avant de payer.</small></article>
          <article><span>B</span><h3>Augmentez votre plafond de virement instantané</h3><p>Montez-le <b>au moins au prix total de votre véhicule</b>, idéalement un peu au-dessus, pour être tranquille.</p></article>
          <article><span>C</span><h3>Prévenez votre banquier</h3><p>Dites-lui que vous allez régler l’achat d’un véhicule à la livraison. Vérifiez avec lui <b>les dates de validité</b> de l’augmentation de plafond : elle est souvent temporaire (quelques jours seulement).</p></article>
        </div>
        <p className={s.ok}>✅ Ainsi, le jour de la livraison, le paiement passe en quelques secondes et vous repartez avec votre NeoDrive.</p>
      </section>

      {/* ÉTAPE 3 — PRISE EN MAIN */}
      <section className={s.card}>
        <header className={s.head}><span className={s.num}>3</span><div><h2>Votre NeoDrive est là : la prise en main</h2><p>Le livreur vous remet le véhicule, les clés et ses documents.</p></div></header>
        <figure className={s.video}>
          <img src="/livraison-guide/tableau.webp" alt="Tableau de bord de la NeoDrive" />
          <span className={s.play}>▶</span>
          <figcaption>Vidéo « Comment utiliser votre NeoDrive » · bientôt disponible</figcaption>
        </figure>
        <ol className={s.drive}>
          {DRIVE.map(([t, d], i) => <li key={t}><b>{i + 1}</b><div><strong>{t}</strong><p>{d}</p></div></li>)}
        </ol>
      </section>

      {/* BATTERIE */}
      <section className={s.card}>
        <header className={s.head}><span className={s.num}>🔋</span><div><h2>Lire la batterie à l’écran</h2><p>Quelques repères simples.</p></div></header>
        <div className={s.split}>
          <div>
            <ul className={s.list}>
              <li>L’écran affiche le niveau de la batterie avec <b>des barres</b> et une tension en volts.</li>
              <li>Batterie pleine : environ <b>66 V</b>.</li>
              <li>La mesure est fiable <b>en roulant</b> (en dynamique), pas à l’arrêt : il est normal que la valeur varie légèrement.</li>
              <li>Recharge sur une <b>prise 220 V</b> classique. Pour le temps de charge, reportez-vous au <a href="/manuel-utilisateur-neodrive.pdf" target="_blank" rel="noreferrer">manuel d’utilisation</a>.</li>
            </ul>
          </div>
          <img className={s.photo} src="/livraison-guide/sieges.webp" alt="Intérieur de la NeoDrive" />
        </div>
      </section>

      {/* ÉTAPE 4 — CARTE GRISE */}
      <section className={s.card}>
        <header className={s.head}><span className={s.num}>4</span><div><h2>La carte grise</h2><p>Juste après la livraison.</p></div></header>
        <p className={s.text}>Le livreur vous remet le <b>certificat de conformité (COC)</b> du véhicule. Rendez-vous ensuite dans la section <b>Carte grise / contrat</b> de notre site pour faire votre demande. Préparez :</p>
        <div className={s.docs}><span>🪪 Carte d’identité</span><span>🏠 Justificatif de domicile (moins de 6 mois)</span><span>📄 Certificat de conformité (COC)</span><span>🎓 Permis AM ou BSR si vous en avez un</span></div>
        <a className={s.btnDark} href="/reservation">Faire ma demande de carte grise</a>
      </section>

      {/* AIDE */}
      <section className={s.help}>
        <h2>Une question ? On est là.</h2>
        <p>Avant, pendant ou après la livraison, écrivez-nous : on vous répond rapidement.</p>
        <div className={s.actions}>
          <a className={s.btnWa} href={WHATSAPP} target="_blank" rel="noreferrer">💬 Nous écrire sur WhatsApp</a>
          <a className={s.btnGhost} href="/manuel-utilisateur-neodrive.pdf" target="_blank" rel="noreferrer">📘 Manuel d’utilisation</a>
          <a className={s.btnGhost} href="/sav">🛠️ Assistance</a>
        </div>
      </section>
    </main>
  );
}
