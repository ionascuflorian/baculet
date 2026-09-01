import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { registerRateLimit } from "@/lib/otp-rate-limit";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  termsAccepted: z.boolean(),
});

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  if (!(await registerRateLimit(clientIp(request)))) {
    return NextResponse.json(
      { error: "Prea multe încercări. Încearcă din nou în jumătate de oră." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    if ("termsAccepted" in body && !body.termsAccepted) {
      return NextResponse.json(
        { error: "Trebuie să accepți Termenii și Condițiile." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  if (!parsed.data.termsAccepted) {
    return NextResponse.json(
      { error: "Trebuie să accepți Termenii și Condițiile." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Există deja un cont cu acest email." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name.trim(),
        passwordHash,
        termsAcceptedAt: new Date(),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json(
        { error: "Există deja un cont cu acest email." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}
