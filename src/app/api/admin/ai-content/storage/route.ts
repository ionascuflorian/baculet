import { currentUser, hasPermission } from "@/lib/access";
import { r2Configured } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";

// Probe pentru client: stocare cloud R2 configurată? → upload direct la R2
// (presigned PUT, fără limita de 4.5 MB a Vercel). Altfel → upload server-side
// cu stocare locală (dev).
export async function GET() {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }
  const r2 = r2Configured();
  return Response.json({ storage: r2 ? "r2" : "local", r2, blob: r2 });
}