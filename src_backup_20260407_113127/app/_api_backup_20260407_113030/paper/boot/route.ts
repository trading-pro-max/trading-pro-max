import "@/lib/paper/loop";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(
    JSON.stringify({ status: "PAPER LOOP ACTIVE" }),
    { headers: { "Content-Type": "application/json" } }
  );
}
