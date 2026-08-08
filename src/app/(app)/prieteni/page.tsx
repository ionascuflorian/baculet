import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFriends } from "@/lib/actions/friends";
import { FriendsPanel } from "@/components/friends/friends-panel";

export const metadata = { title: "Prieteni · Baculet" };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  if (!me) redirect("/login");

  const friends = await getFriends(session.user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="animate-slide-up flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <Users className="h-7 w-7 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Prieteni</h1>
          <p className="text-sm text-subtle">
            Caută colegi după @username și urmărește-le progresul. Tu ești
            {me.username ? (
              <span className="font-semibold text-accent"> @{me.username}</span>
            ) : (
              " fără @username încă"
            )}
            .
          </p>
        </div>
      </section>

      <FriendsPanel initialFriends={friends} myUsername={me.username} />
    </div>
  );
}
