import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Palette } from "@/components/themes/palette";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      username: true,
      themeSlug: true,
      profile: true,
      termsAcceptedAt: true,
      onboardingDone: true,
    },
  });
  if (!user) redirect("/login");
  if (user.onboardingDone) redirect("/dashboard");

  const themes = await prisma.theme.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { slug: true, name: true, light: true, dark: true },
  });

  return (
    <OnboardingWizard
      user={{
        name: user.name,
        image: user.image,
        username: user.username,
        themeSlug: user.themeSlug,
        profile: user.profile,
        termsAcceptedAt: user.termsAcceptedAt
          ? user.termsAcceptedAt.toISOString()
          : null,
      }}
      themes={themes.map((t) => ({
        slug: t.slug,
        name: t.name,
        light: t.light as Palette,
        dark: t.dark as Palette,
      }))}
    />
  );
}
