"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
"https://tzlsdjzcxdjaatcpwqwn.supabase.co",
"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

export default function DealerPage() {

const [loading, setLoading] = useState(false);

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

  const { error } =
    await supabase
      .from("dealers")
      .insert([form]);

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

      <p>
        Société : {form.company_name}
      </p>

      <p>
        SIREN : {form.siren}
      </p>

      <p>
        Responsable : {form.manager_name}
      </p>

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
        Valeur contractuelle du véhicule :
        5 490 € TTC
      </p>

      <p>
        Le véhicule demeure la propriété
        exclusive de MICRODRIVE.
      </p>

      <p>
        Le concessionnaire reconnaît avoir
        réceptionné le véhicule dans l'état
        indiqué ci-dessus.
      </p>

    </div>

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
