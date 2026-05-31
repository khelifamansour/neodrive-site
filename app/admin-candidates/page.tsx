"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
"https://tzlsdjzcxdjaatcpwqwn.supabase.co",
"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

export default function AdminCandidates() {

const [candidates, setCandidates] = useState([]);

useEffect(() => {


loadCandidates();


}, []);

async function loadCandidates() {


const { data } = await supabase
  .from("candidates")
  .select("*")
  .order("id", { ascending: false });

setCandidates(data || []);


}

return (


<main style={{ padding: 30 }}>

  <h1>Candidates</h1>

  {candidates.map((c) => (

    <div
      key={c.id}
      style={{
        border: "1px solid #ddd",
        padding: 15,
        marginBottom: 15
      }}
    >

      <h3>{c.fullName}</h3>

      <p>{c.email}</p>

      <p>Score: {c.score}</p>

<button
onClick={async () => {


try {

  alert("STEP 1");

  const response =
    await fetch(
      "/api/generate-report",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(c)
      }
    );

  alert("STEP 2");

  const text =
    await response.text();

  alert(text);

} catch (err) {

  alert(
    JSON.stringify(err)
  );

}


}}

>

Generate AI Report 

</button>


    </div>

  ))}

</main>


);

}
