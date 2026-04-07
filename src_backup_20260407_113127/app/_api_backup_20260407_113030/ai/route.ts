import { NextResponse } from "next/server";
import { openai } from "@/lib/ai";

export async function POST(req: Request) {
  const body = await req.json();

  const prompt = `
You are a professional trading AI.
Analyze this data and return:
- signal (BUY/SELL/HOLD)
- confidence (0-100)
- reason

Data:
${JSON.stringify(body)}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return NextResponse.json({
    result: completion.choices[0].message.content,
  });
}
