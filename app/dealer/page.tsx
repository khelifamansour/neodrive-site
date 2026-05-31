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

      <h2>
        Résumé du contrat de dépôt
      </h2>
<h2>
CONTRAT DE DÉPÔT, DISTRIBUTION ET SERVICE APRÈS-VENTE MICRODRIVE
</h2>

<p>
Entre :
</p>

<p>
MK HOLDING – MICRODRIVE<br/>
31 rue Jean Nougaro<br/>
31600 Muret<br/>
SIREN : 908 645 393
</p>

<p>
Et :
</p>

<p>
Société : {form.company_name}<br/>
SIREN : {form.siren}<br/>
Adresse : {form.address}<br/>
Représentée par : {form.manager_name}
</p>

<h3>ARTICLE 1 – OBJET</h3>

<p>
MICRODRIVE confie au Partenaire un véhicule destiné à être exposé, promu et commercialisé auprès de sa clientèle.
</p>

<h3>ARTICLE 2 – VÉHICULE DÉPOSÉ</h3>

<p>
Numéro de série : {form.vin}
</p>

<p>
Couleur : {form.color}
</p>

<p>
Kilométrage : {form.mileage}
</p>

<p>
Valeur contractuelle : 5 490 € TTC
</p>

<h3>ANNEXE DE RÉCEPTION</h3>

<p>
Numéro de série : {form.vin}
</p>

<p>
Couleur : {form.color}
</p>

<p>
Kilométrage : {form.mileage}
</p>

<p>
Nombre de clés : {form.keys_count}
</p>

<p>
Chargeur fourni : {form.charger_provided}
</p>

<p>
Observations :
</p>

<p>
{form.observations}
</p>

<br/><br/><br/>

<p>
Le Partenaire reconnaît avoir reçu le véhicule dans l'état décrit ci-dessus.
</p>

<br/><br/>

<p>
Signature MICRODRIVE
</p>

<br/><br/><br/>

<p>
Signature et cachet du Partenaire
</p>

<button
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
