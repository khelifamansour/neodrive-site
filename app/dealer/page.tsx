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
    "Dealer saved successfully"
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
    Dealer Registration
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
      Company
    </h2>

    <input
      name="company_name"
      placeholder="Company name"
      onChange={handleChange}
    />

    <input
      name="siren"
      placeholder="SIREN"
      onChange={handleChange}
    />

    <input
      name="manager_name"
      placeholder="Manager name"
      onChange={handleChange}
    />

    <input
      name="phone"
      placeholder="Phone"
      onChange={handleChange}
    />

    <input
      name="email"
      placeholder="Email"
      onChange={handleChange}
    />

    <input
      name="address"
      placeholder="Address"
      onChange={handleChange}
    />

    <h2>
      Vehicle
    </h2>

    <input
      name="vin"
      placeholder="VIN"
      onChange={handleChange}
    />

    <input
      name="color"
      placeholder="Color"
      onChange={handleChange}
    />

    <input
      name="mileage"
      placeholder="Mileage"
      onChange={handleChange}
    />

    <input
      name="keys_count"
      placeholder="Number of keys"
      onChange={handleChange}
    />

    <select
      name="charger_provided"
      onChange={handleChange}
    >

      <option value="">
        Charger provided?
      </option>

      <option value="Yes">
        Yes
      </option>

      <option value="No">
        No
      </option>

    </select>

    <textarea
      name="observations"
      placeholder="Vehicle condition and observations"
      rows={8}
      onChange={handleChange}
    />

    <div
      style={{
        marginTop: 30,
        padding: 20,
        border: "1px solid #ddd"
      }}
    >

      <h2>
        Deposit Contract Summary
      </h2>

      <p>
        Company:
        {" "}
        {form.company_name}
      </p>

      <p>
        SIREN:
        {" "}
        {form.siren}
      </p>

      <p>
        VIN:
        {" "}
        {form.vin}
      </p>

      <p>
        Color:
        {" "}
        {form.color}
      </p>

      <p>
        Mileage:
        {" "}
        {form.mileage}
      </p>

      <p>
        Vehicle remains the exclusive
        property of MICRODRIVE.
      </p>

      <p>
        Contract value:
        5 490 € TTC
      </p>

    </div>

    <button
      type="submit"
      style={{
        padding: 15,
        fontSize: 18
      }}
    >

      {loading
        ? "Saving..."
        : "Save Dealer"}

    </button>

  </form>

</main>


);

}
