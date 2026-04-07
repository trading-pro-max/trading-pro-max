import "@/lib/control/ai-loop";
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(JSON.stringify({ status: "AI LOOP STARTED" }), {
    headers: { "Content-Type": "application/json" },
  });
}
