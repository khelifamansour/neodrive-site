import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

try {

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const candidate =
  await req.json();

const completion =
  await openai.chat.completions.create({

    model: "gpt-4.1",

    messages: [
      {
        role: "user",
        content:
          "Analyze this candidate: " +
          JSON.stringify(candidate)
      }
    ]

  });

return NextResponse.json({

  success: true,

  response:
    completion.choices[0].message.content

});


} catch (err: any) {


return NextResponse.json({

  success: false,

  error:
    err.message,

  details:
    JSON.stringify(err)

});


}

}
