"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPassword } from "@/lib/user";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Neautorizat");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) throw new Error("Contul nu a fost găsit");
  return user;
}

export type ProfileState = { error?: string; ok?: boolean };

const profileSchema = z.object({
  name: z.string().min(2).max(80),
  image: z.string().max(1_500_000).optional().default(""),
});

const MAX_IMAGE_BYTES = 400_000;

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
    let image: string | null = null;
    if (rawImage && rawImage.startsWith("data:image")) {
      if (rawImage.length > MAX_IMAGE_BYTES) {
        return {
          error: "Imaginea salvată este prea mare. Încearcă din nou cu o poză mai mică.",
        };
      }
      image = rawImage;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name.trim(), image },
    });

    revalidatePath("/cont");
    return { ok: true };
  } catch (err) {
    console.error("updateProfile failed:", err);
    return { error: "A apărut o problemă la salvarea pozei. Încearcă din nou." };
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
  if (existing) {
    return { error: "Există deja un cont cu acest email." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email: newEmail },
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
