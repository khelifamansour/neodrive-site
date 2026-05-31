"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
"https://tzlsdjzcxdjaatcpwqwn.supabase.co",
"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

export default function DealerPage() {

const [loading, setLoading] = useState(false);
const [kbisFile, setKbisFile] = useState<File | null>(null);
const [signedContract, setSignedContract] = useState<File | null>(null);

const [form, setForm] = useState({


company_name: "",
siren: "",
manager_name: "",
phone: "",
email: "",
address: "",

vin: "",
color: "",
mileage: "",

keys_count: "",
charger_provided: "",

observations: ""


});

const handleChange = (
e: React.ChangeEvent<
HTMLInputElement |
HTMLTextAreaElement |
HTMLSelectElement
>
) => {


setForm({
  ...form,
  [e.target.name]:
    e.target.value
});


};

const handleSubmit = async (
e: React.FormEvent
) => {


e.preventDefault();

try {

  setLoading(true);

  const { data, error } =
await supabase
.from("dealers")
.insert([form])
.select()
.single();

if (error) {

alert(error.message);
return;

}

const dealerId =
data.id;
if (kbisFile) {

await supabase.storage
.from("dealer-files")
.upload(


  `kbis/${dealerId}-${kbisFile.name}`,

  kbisFile

);


}

if (signedContract) {

await supabase.storage
.from("dealer-files")
.upload(


  `contracts/${dealerId}-${signedContract.name}`,

  signedContract

);


}


  if (error) {

    alert(error.message);
    return;

  }

  alert(
    "Concessionnaire enregistré avec succès"
  );

} catch (err) {

  alert(
    JSON.stringify(err)
  );

} finally {

  setLoading(false);

}


};

return (


<main
  style={{
    maxWidth: 900,
    margin: "0 auto",
    padding: 30,
    fontFamily: "Arial"
  }}
>

  <h1>
    Portail Concessionnaire Microdrive
  </h1>

  <form
    onSubmit={handleSubmit}
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 12
    }}
  >

    <h2>
      Informations du concessionnaire
    </h2>

    <input
      name="company_name"
      placeholder="Nom de la société"
      onChange={handleChange}
    />
    <h2>
Documents
</h2>

<label>
KBIS
</label>

<input
type="file"
onChange={(e) =>
setKbisFile(
e.target.files?.[0] || null
)
}
/>

<label>
Contrat signé
</label>

<input
type="file"
onChange={(e) =>
setSignedContract(
e.target.files?.[0] || null
)
}
/>


    <input
      name="siren"
      placeholder="Numéro SIREN"
      onChange={handleChange}
    />

    <input
      name="manager_name"
      placeholder="Nom du responsable"
      onChange={handleChange}
    />

    <input
      name="phone"
      placeholder="Téléphone"
      onChange={handleChange}
    />

    <input
      name="email"
      placeholder="Adresse e-mail"
      onChange={handleChange}
    />

    <input
      name="address"
      placeholder="Adresse"
      onChange={handleChange}
    />

    <h2>
      Véhicule confié
    </h2>

    <input
      name="vin"
      placeholder="Numéro de série (VIN)"
      onChange={handleChange}
    />

    <input
      name="color"
      placeholder="Couleur"
      onChange={handleChange}
    />

    <input
      name="mileage"
      placeholder="Kilométrage"
      onChange={handleChange}
    />

    <input
      name="keys_count"
      placeholder="Nombre de clés"
      onChange={handleChange}
    />

    <select
      name="charger_provided"
      onChange={handleChange}
    >

      <option value="">
        Chargeur fourni ?
      </option>

      <option value="Oui">
        Oui
      </option>

      <option value="Non">
        Non
      </option>

    </select>

    <textarea
      name="observations"
      placeholder="Observations sur l'état du véhicule"
      rows={8}
      onChange={handleChange}
    />

    <div
      style={{
        marginTop: 30,
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#f8f8f8"
      }}
    >

    <div
  style={{
    marginTop: 30,
    padding: 20,
    border: "1px solid #ddd",
    borderRadius: 8,
    background: "#fff",
    whiteSpace: "pre-line",
    lineHeight: "1.8"
  }}
>

{`
CONTRAT DE DÉPÔT, DISTRIBUTION ET SERVICE APRÈS-VENTE MICRODRIVE

Entre :

MK HOLDING – MICRODRIVE
31 rue Jean Nougaro
31600 Muret
SIREN : 908 645 393

Ci-après dénommée « MICRODRIVE »

Et :

Société : ${form.company_name}

SIREN : ${form.siren}

Adresse : ${form.address}

Représentée par : ${form.manager_name}

Ci-après dénommée « le Partenaire »

ARTICLE 1 – OBJET

MICRODRIVE confie au Partenaire un véhicule destiné à être exposé, promu et commercialisé auprès de sa clientèle.

Le véhicule demeure à tout moment la propriété exclusive de MICRODRIVE.

ARTICLE 2 – VÉHICULE DÉPOSÉ

Numéro de série : ${form.vin}

Couleur : ${form.color}

Date de remise : ${new Date().toLocaleDateString("fr-FR")}

Valeur contractuelle du véhicule : 5 490 € TTC

ARTICLE 3 – RÉSERVE DE PROPRIÉTÉ

Le véhicule demeure la propriété exclusive de MICRODRIVE jusqu'au paiement intégral de son prix.

ARTICLE 4 – RÉCEPTION DU VÉHICULE

Le Partenaire reconnaît avoir réceptionné le véhicule dans un état conforme sauf réserves écrites formulées dans un délai maximal de 48 heures.

ARTICLE 5 – STOCKAGE ET ENTRETIEN

Le Partenaire s'engage à :

- conserver le véhicule dans un lieu sécurisé
- protéger le véhicule contre les intempéries
- maintenir la batterie chargée
- informer immédiatement MICRODRIVE de toute anomalie

ARTICLE 6 – ASSURANCE

Le Partenaire s'engage à assurer le véhicule contre le vol, l'incendie et les dégradations.

ARTICLE 7 – PERTE, VOL OU DÉGRADATION

Toute disparition ou dégradation engage la responsabilité du Partenaire.

ARTICLE 8 – INTERDICTION DE RÉTENTION

Le Partenaire ne pourra retenir le véhicule ou ses documents.

ARTICLE 9 – COMMANDES ET VENTES

MICRODRIVE demeure vendeur du véhicule auprès du client final.

ARTICLE 10 – COMMISSION

Commission actuelle : 500 € TTC par véhicule vendu.

ARTICLE 11 – SERVICE APRÈS-VENTE

Toute intervention doit être validée par MICRODRIVE.

ARTICLE 12 – RESTITUTION

MICRODRIVE peut demander à tout moment la restitution du véhicule.

ARTICLE 13 – DURÉE

Le présent contrat est conclu pour une durée indéterminée.

ARTICLE 14 – JURIDICTION

Tribunaux compétents : Toulouse.

ANNEXE DE RÉCEPTION

Numéro de série : ${form.vin}

Couleur : ${form.color}

Kilométrage : ${form.mileage}

Nombre de clés : ${form.keys_count}

Chargeur fourni : ${form.charger_provided}

Observations :

${form.observations}

Le Partenaire reconnaît avoir reçu le véhicule dans l'état décrit ci-dessus.

Fait à ______________________

Le _________________________

Signature MICRODRIVE


Signature et cachet du Partenaire
`}

</div>

<button
type="button"
type="button"
onClick={() => {
  window.print();
}}
style={{
padding: 15,
fontSize: 18,
background: "#444",
color: "#fff",
border: "none",
borderRadius: 8,
cursor: "pointer"
}}

>

Télécharger le contrat PDF </button>

    <button
      type="submit"
      style={{
        padding: 15,
        fontSize: 18,
        background: "#000",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        cursor: "pointer"
      }}
    >

      {loading
        ? "Enregistrement..."
        : "Enregistrer le concessionnaire"}

    </button>

  </form>

</main>


);

}
