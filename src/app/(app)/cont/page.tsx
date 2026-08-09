import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, ShieldCheck, UserRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AccountSettings } from "@/components/account/account-settings";
import { hasPassword } from "@/lib/user";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      image: true,
      streakCount: true,
      role: true,
      createdAt: true,
      passwordHash: true,
      themeSlug: true,
      profile: true,
    },
  });

  if (!user) redirect("/login");

  const themes = await prisma.theme.findMany({
    where: { enabled: true },
    orderBy: { order: "asc" },
    select: { slug: true, name: true, light: true, dark: true },
  });

  const { tab } = await searchParams;
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="animate-slide-up flex items-center gap-4">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-accent text-3xl font-extrabold text-white text-shadow-btn">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink">{user.name}</h1>
          <p className="truncate text-sm text-subtle">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded-xl bg-warning/15 px-2.5 py-1 text-sm font-extrabold text-warning">
              <Flame className="h-4 w-4 text-warning" />
              {user.streakCount}
            </span>
            {user.role === "ADMIN" && (
              <span className="flex items-center gap-1 rounded-xl bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                <ShieldCheck className="h-3.5 w-3.5" /> Admin
              </span>
            )}
          </div>
          {user.username && (
            <Link
              href={`/u/${user.username}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              <UserRound className="h-4 w-4" /> Vezi profilul tău public
            </Link>
          )}
        </div>
      </section>

      <AccountSettings
        initialTab={tab}
        profile={{ name: user.name, image: user.image ?? "" }}
        email={user.email}
        needsCurrentPassword={hasPassword(user.passwordHash)}
        studyProfile={user.profile}
        username={user.username}
        themes={themes.map((t) => ({
          slug: t.slug,
          name: t.name,
          light: t.light as Record<string, string>,
          dark: t.dark as Record<string, string>,
        }))}
        currentTheme={user.themeSlug}
      />
    </div>
  );
}