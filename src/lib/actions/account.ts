"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOtpEmail, showInAppCode } from "@/lib/mail";
import { hasPassword } from "@/lib/user";
import { RESERVED_USERNAMES } from "@/lib/username";
import { generateOtpCode } from "@/lib/utils";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Neautorizat");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("Contul nu a fost găsit");
  return user;
}

export type ProfileState = { error?: string; ok?: boolean; pendingEmail?: string; devCode?: string };

const profileSchema = z.object({
  name: z.string().min(2).max(80),
  image: z.string().max(1_500_000).optional().default(""),
});

const MAX_IMAGE_BYTES = 80_000;

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  try {
    const user = await requireUser();
    const parsed = profileSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      image: String(formData.get("image") ?? ""),
    });
    if (!parsed.success) {
      return { error: "Numele trebuie să aibă minim 2 caractere." };
    }

    const rawImage = parsed.data.image;
    let image: string | null | undefined;
    if (rawImage.startsWith("data:image")) {
      if (rawImage.length > MAX_IMAGE_BYTES) {
        return {
          error: "Imaginea salvată este prea mare. Încearcă din nou cu o poză mai mică.",
        };
      }
      image = rawImage;
    } else if (rawImage === "") {
      // Nimic nou încărcat — se șterge poza.
      image = null;
    }
    // Altfel (URL extern, ex. avatar Google) — se păstrează poza existentă.

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name.trim(),
        ...(image !== undefined ? { image } : {}),
      },
    });

    revalidatePath("/cont");
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (err) {
    console.error("updateProfile failed:", err);
    return { error: "A apărut o problemă la salvarea pozei. Încearcă din nou." };
  }
}

const USERNAME_PATTERN = /^[a-z0-9]([a-z0-9._-]{1,18}[a-z0-9])?$/;

export async function updateUsername(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  try {
    const user = await requireUser();
    const raw = String(formData.get("username") ?? "").toLowerCase().trim();

    if (!USERNAME_PATTERN.test(raw) || raw.length < 2) {
      return {
        error:
          "Numele de utilizator trebuie să aibă 2–20 de caractere: litere mici, cifre, punct, liniuță sau underscore.",
      };
    }
    if (RESERVED_USERNAMES.has(raw)) {
      return { error: "Acest nume de utilizator este rezervat." };
    }

    const taken = await prisma.user.findFirst({
      where: { username: raw, id: { not: user.id } },
      select: { id: true },
    });
    if (taken) {
      return { error: "Acest nume de utilizator este deja folosit." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { username: raw },
    });

    revalidatePath("/cont");
    revalidatePath("/u", "layout");
    revalidatePath("/onboarding");
    return { ok: true };
  } catch (err) {
    console.error("updateUsername failed:", err);
    return { error: "A apărut o problemă. Încearcă din nou." };
  }
}

export async function changeEmail(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const newEmail = String(formData.get("email") ?? "").toLowerCase().trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { error: "Adresa de email nu este validă." };
  }
  if (newEmail === user.email) return { ok: true };

  const existing = await prisma.user.findUnique({ where: { email: newEmail } });
  if (existing && existing.id !== user.id) {
    return { error: "Există deja un cont cu acest email." };
  }

  // Trimitere cod de verificare pe noua adresă — emailul NU e schimbat încă.
  const code = generateOtpCode();
  await prisma.verificationToken.deleteMany({ where: { email: newEmail } });
  await prisma.verificationToken.create({
    data: {
      email: newEmail,
      token: code,
      expires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: newEmail,
      pendingEmailCode: new Date(),
      pendingEmailExpires: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await sendOtpEmail(newEmail, code);

  revalidatePath("/cont");
  return {
    ok: true,
    pendingEmail: newEmail,
    devCode: showInAppCode() ? code : undefined,
  };
}

export async function verifyEmailChange(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const pendingEmail = user.pendingEmail;

  if (!/^\d{6}$/.test(code)) {
    return { error: "Codul trebuie să aibă 6 cifre." };
  }
  if (!pendingEmail) {
    return { error: "Nu există un email în așteptare." };
  }
  if (
    !user.pendingEmailExpires ||
    user.pendingEmailExpires.getTime() < Date.now()
  ) {
    return { error: "Codul a expirat. Solicită din nou o schimbare de email." };
  }

  // Verificarea codului: refolosim verificationToken pentru codul OTP trimis
  // la noua adresă (atomic consume pentru a evita reuse).
  const deleted = await prisma.verificationToken.deleteMany({
    where: { email: pendingEmail, token: code, expires: { gt: new Date() } },
  });
  if (deleted.count === 0) {
    return { error: "Cod incorect." };
  }

  // Mai verificăm o dată că adresa e încă liberă (anti race).
  const taken = await prisma.user.findUnique({
    where: { email: pendingEmail },
    select: { id: true },
  });
  if (taken && taken.id !== user.id) {
    return { error: "Există deja un cont cu acest email." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: pendingEmail,
      pendingEmail: null,
      pendingEmailCode: null,
      pendingEmailExpires: null,
      emailVerified: new Date(),
    },
  });

  revalidatePath("/cont");
  return { ok: true };
}

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(100),
  confirm: z.string(),
});

export async function changePassword(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Parola nouă trebuie să aibă minim 8 caractere." };
  }
  if (parsed.data.newPassword !== parsed.data.confirm) {
    return { error: "Parolele noi nu coincid." };
  }

  if (hasPassword(user.passwordHash)) {
    const valid = await bcrypt.compare(
      parsed.data.currentPassword ?? "",
      user.passwordHash
    );
    if (!valid) return { error: "Parola actuală este incorectă." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { ok: true };
}

export async function deleteAccount(formData: FormData) {
  const user = await requireUser();
  const confirmEmail = String(formData.get("confirmEmail") ?? "").toLowerCase();
  if (confirmEmail !== user.email) {
    throw new Error("Email-ul de confirmare nu coincide.");
  }

  await prisma.user.delete({ where: { id: user.id } });
  redirect("/");
}
