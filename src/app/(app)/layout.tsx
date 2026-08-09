import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      username: true,
      streakCount: true,
      timezone: true,
      image: true,
      lastActiveAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        username: user.username,
        image: user.image,
      }}
      streakCount={user.streakCount}
      lastActiveAt={user.lastActiveAt ? user.lastActiveAt.toISOString() : null}
    >
      {children}
    </AppShell>
  );
}
