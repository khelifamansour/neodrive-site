import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {

try {


const candidate =
  await req.json();

const prompt = `


You are an expert recruitment analyst.

Analyze the candidate below.

Return ONLY valid JSON.

DO NOT write explanations.
DO NOT write markdown.
DO NOT write headings.
DO NOT write any text before or after JSON.

Return exactly this structure:

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

Candidate:

${JSON.stringify(candidate, null, 2)}

`;


const completion =
  await openai.chat.completions.create({

    model: "gpt-4.1",

    messages: [
      {
        role: "user",
        content: prompt
      }
    ],

    temperature: 0.2,

    response_format: {
      type: "json_object"
    }

  });

const text =
  completion.choices[0].message.content || "{}";

const report =
  JSON.parse(text);

return NextResponse.json(report);


} catch (err: any) {


return NextResponse.json({

  success: false,

  error:
    err?.message || "Unknown error"

});


}

}
