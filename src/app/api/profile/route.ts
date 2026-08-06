import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PROFILE_IDS } from "@/lib/profile";

const profileSchema = z.object({
  profile: z.enum(PROFILE_IDS),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Profil invalid." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { profile: parsed.data.profile },
  });

  return NextResponse.json({ profile: parsed.data.profile });
}
