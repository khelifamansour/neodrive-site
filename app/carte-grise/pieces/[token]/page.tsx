import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dataClient } from "../../../../lib/datastore";
import { CARTE_GRISE_CLIENT_TEXT, CARTE_GRISE_FILE_LABEL, pendingKeys } from "../../../../lib/carte-grise";
import type { CarteGriseDossier } from "../../../../lib/carte-grise-server";
import Upload, { type Item } from "./Upload";
import s from "./pieces.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documents carte grise - NeoDrive", robots: { index: false, follow: false } };

/** Page client : liste des documents qui manquent pour la carte grise, et dépôt en photo ou PDF depuis le téléphone. */
export default async function PiecesCarteGrise({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) notFound();
  const sb = dataClient();
  if (!sb) return <main className={s.page}><h1>Service momentanément indisponible</h1><p>Réessayez dans quelques minutes.</p></main>;
  const { data } = await sb.from("carte_grise_dossiers").select("id,prenom,status,doc_check,missing_request").eq("missing_token", token).maybeSingle();
  const d = data as Pick<CarteGriseDossier, "id" | "prenom" | "status" | "doc_check" | "missing_request"> | null;
  if (!d || d.status === "annulé") notFound();
  const items: Item[] = pendingKeys(d.missing_request, d.doc_check).map(k => {
    const p = d.doc_check?.pieces?.[k];
    return { key: k, label: CARTE_GRISE_FILE_LABEL[k] || k, text: CARTE_GRISE_CLIENT_TEXT[k] || "", reason: p && p.status === "à refaire" ? p.reason : "" };
  });
  return <main className={s.page}>
    <span className={s.kicker}>CARTE GRISE NEODRIVE</span>
    <h1>Bonjour{d.prenom ? ` ${d.prenom}` : ""},</h1>
    {items.length ? <>
      <p className={s.sub}>Pour finaliser votre carte grise, il nous manque {items.length > 1 ? "les documents suivants" : "le document suivant"}. Prenez-{items.length > 1 ? "les" : "le"} en photo (bien à plat, en entier, sans reflet) ou envoyez un PDF.</p>
      {d.missing_request?.note ? <p className={s.note}>{d.missing_request.note}</p> : null}
      <Upload token={token} items={items} />
    </> : <section className={s.done}><b>✅ Tout est bon, merci !</b><p>Nous avons bien reçu vos documents. Nous nous occupons de la suite de votre carte grise.</p></section>}
    <p className={s.help}>Une question ? Appelez-nous au 06 89 78 17 10.</p>
  </main>;
}
