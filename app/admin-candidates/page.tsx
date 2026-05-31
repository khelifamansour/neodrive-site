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

  const report =
  await response.json();

await supabase
  .from("candidate_ai_reports")
  .insert([{

    candidate_id: c.id,

    overall_score:
      report.overall_score,

    communication_score:
      report.communication_score,

    logic_score:
      report.logic_score,

    leadership_score:
      report.leadership_score,

    learning_score:
      report.learning_score,

    customer_score:
      report.customer_score,

    potential_score:
      report.potential_score,

    strengths:
      report.strengths,

    weaknesses:
      report.weaknesses,

    recommendation:
      report.recommendation,

    full_report:
      report.full_report

  }]);

alert("AI Report Generated");

  }}
>
  Generate AI Report
</button>


    </div>

  ))}

</main>


);

}
