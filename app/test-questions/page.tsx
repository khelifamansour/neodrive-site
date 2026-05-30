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
const [answers, setAnswers] = useState<Record<number, string>>({});
const [score, setScore] = useState<number | null>(null);


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

 const shuffled = (data || [])
  .sort(() => Math.random() - 0.5)
  .slice(0, 10);

setQuestions(shuffled);
  setLoading(false);
};

loadQuestions();


}, []);

  const calculateScore = () => {

let total = 0;

questions.forEach((q) => {


if (answers[q.id] === q.correct_answer) {
  total++;
}


});

setScore(total);

};

return (

<button
onClick={calculateScore}
style={{
padding: "15px",
fontSize: "18px",
marginTop: "20px"
}}

>

Submit Exam </button>

{score !== null && (

  <h2>
    Score: {score} / {questions.length}
  </h2>
)}

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

    <label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="A"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  A) {q.answer_a}
</label>

<br />

<label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="B"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  B) {q.answer_b}
</label>

<br />

<label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="C"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  C) {q.answer_c}
</label>

<br />

<label>
  <input
    type="radio"
    name={`question-${q.id}`}
    value="D"
    onChange={(e) =>
      setAnswers({
        ...answers,
        [q.id]: e.target.value
      })
    }
  />
  D) {q.answer_d}
</label>


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
