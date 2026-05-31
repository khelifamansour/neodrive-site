import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {

const candidate =
await req.json();

const prompt = `

Analyze this candidate for recruitment.

Candidate:

${JSON.stringify(candidate, null, 2)}

Return ONLY valid JSON.

{
"overall_score": 0,
"communication_score": 0,
"logic_score": 0,
"leadership_score": 0,
"learning_score": 0,
"customer_score": 0,
"potential_score": 0,
"strengths": "",
"weaknesses": "",
"recommendation": "",
"full_report": ""
}

`;

const completion =
await openai.chat.completions.create({


  model: "gpt-4.1",

  messages: [
    {
      role: "user",
      content: prompt
    }
  ]

});


const text =
completion.choices[0].message.content;

return NextResponse.json(
JSON.parse(text || "{}")
);

}
