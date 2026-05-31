import { NextResponse } from "next/server";

export async function POST(req: Request) {

const candidate = await req.json();

const report = {


overall_score: 80,

communication_score: 8,

logic_score: 8,

leadership_score: 7,

learning_score: 9,

customer_score: 8,

potential_score: 9,

strengths:
  "Strong analytical profile.",

weaknesses:
  "Limited professional experience.",

recommendation:
  "Interview recommended.",

full_report:
  "Candidate demonstrates good potential and learning ability."


};

return NextResponse.json(report);

}
