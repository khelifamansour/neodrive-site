"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "TON_URL",
  "TA_CLE"
);

export default function TestQuestions() {

  const [questions, setQuestions] = useState([]);

  useEffect(() => {

    const load = async () => {

      const { data, error } = await supabase
        .from("recruitment_questions")
        .select("*")
        .eq("category", "logic");

      console.log(data);

      setQuestions(data || []);

    };

    load();

  }, []);

  return (

    <div>

      <h1>Questions Logic</h1>

      {questions.map((q) => (

        <div key={q.id}>

          <p>{q.question}</p>

        </div>

      ))}

    </div>

  );

}
