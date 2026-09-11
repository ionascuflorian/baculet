import { currentUser, hasPermission } from "@/lib/access";

export const dynamic = "force-dynamic";

// Probe pentru client: Blob configurat? → upload direct la Blob (fără limita
// de 4.5 MB a Vercel). Altfel → upload server-side cu stocare locală (dev).
export async function GET() {
  const user = await currentUser();
  if (!user || !hasPermission(user, "MANAGE_AI_CONTENT")) {
    return new Response(JSON.stringify({ error: "Neautorizat" }), { status: 401 });
  }
  return Response.json({ blob: Boolean(process.env.BLOB_READ_WRITE_TOKEN) });
}