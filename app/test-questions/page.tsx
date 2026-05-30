"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
"https://tzlsdjzcxdjaatcpwqwn.supabase.co",
"sb_publishable_FxvXFqvTpjdu3vYbCQo9qQ_lTlNrAMd"
);

type Question = {
id: number;
category: string;
question: string;
answer_a: string;
answer_b: string;
answer_c: string;
answer_d: string;
correct_answer: string;
difficulty: number;
};

export default function TestQuestions() {

const [questions, setQuestions] = useState<Question[]>([]);
const [loading, setLoading] = useState(true);
const [errorMessage, setErrorMessage] = useState("");

useEffect(() => {

const loadQuestions = async () => {

  const { data, error } = await supabase
    .from("recruitment_questions")
    .select("*");

  console.log("SUPABASE DATA:", data);
  console.log("SUPABASE ERROR:", error);

  if (error) {
    setErrorMessage(error.message);
    setLoading(false);
    return;
  }

  setQuestions(data || []);
  setLoading(false);
};

loadQuestions();


}, []);

return (

<main
  style={{
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "30px",
    fontFamily: "Arial"
  }}
>

  <h1>Test Questions</h1>

  <p>
    Number of questions loaded: {questions.length}
  </p>

  {errorMessage && (
    <div
      style={{
        background: "#ffdddd",
        padding: "15px",
        marginBottom: "20px"
      }}
    >
      Error: {errorMessage}
    </div>
  )}

  {loading && (
    <p>Loading...</p>
  )}

  {!loading &&
    questions.map((q) => (

      <div
        key={q.id}
        style={{
          border: "1px solid #ddd",
          padding: "15px",
          marginBottom: "15px",
          borderRadius: "8px"
        }}
      >

        <h3>
          #{q.id} - {q.category}
        </h3>

        <p>
          <strong>{q.question}</strong>
        </p>

        <p>A) {q.answer_a}</p>
        <p>B) {q.answer_b}</p>
        <p>C) {q.answer_c}</p>
        <p>D) {q.answer_d}</p>

        <p>
          Correct answer: {q.correct_answer}
        </p>

        <p>
          Difficulty: {q.difficulty}
        </p>

      </div>

    ))
  }

</main>


);

}
