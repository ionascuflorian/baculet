import { redirect } from "next/navigation";
import { currentUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { getEnabledThemes } from "@/lib/themes";
import type { Palette } from "@/components/themes/palette";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const sessionUser = await currentUser();
  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      image: true,
      username: true,
      themeSlug: true,
      profile: true,
      onboardingDone: true,
      termsAcceptedAt: true,
    },
  });
  if (!user) redirect("/login");
  if (user.onboardingDone) redirect("/dashboard");

  const themes = await getEnabledThemes();

  return (
    <OnboardingWizard
      user={{
        name: user.name,
        image: user.image,
        username: user.username,
        themeSlug: user.themeSlug,
        profile: user.profile,
        termsAcceptedAt: user.termsAcceptedAt,
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
