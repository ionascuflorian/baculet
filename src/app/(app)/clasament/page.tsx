import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFriendIds } from "@/lib/actions/friends";
import { getLeaderboard, getUserRank, startOfWeekUtc } from "@/lib/xp";
import {
  Leaderboard,
  type Board,
} from "@/components/leaderboard/leaderboard";

export const metadata = { title: "Clasament · Baculet" };
export const revalidate = 120;

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true },
  });
  if (!me) redirect("/login");

  const weekStart = startOfWeekUtc();
  const friendIds = await getFriendIds(session.user.id);

  const [weekGlobalRows, allGlobalRows, weekFriendRows, allFriendRows, weekRank, allRank] =
    await Promise.all([
      getLeaderboard({ weekStart, limit: 100 }),
      getLeaderboard({ weekStart: null, limit: 100 }),
      getLeaderboard({ weekStart, friendIds, limit: 100 }),
      getLeaderboard({ weekStart: null, friendIds, limit: 100 }),
      getUserRank({ userId: session.user.id, weekStart }),
      getUserRank({ userId: session.user.id, weekStart: null }),
    ]);

  const toBoard = (
    rows: typeof weekGlobalRows,
    myRank: number | null
  ): Board => ({ rows, myRank });

  const boards = {
    weekGlobal: toBoard(weekGlobalRows, weekRank),
    allGlobal: toBoard(allGlobalRows, allRank),
    weekFriends: toBoard(
      weekFriendRows,
      weekFriendRows.findIndex((r) => r.id === session.user.id) + 1 || null
    ),
    allFriends: toBoard(
      allFriendRows,
      allFriendRows.findIndex((r) => r.id === session.user.id) + 1 || null
    ),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="animate-slide-up flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
          <Trophy className="h-7 w-7 text-accent" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-ink">Clasament</h1>
          <p className="text-sm text-subtle">
            Câștigi XP rezolvând teste și completând lecții. Compară-te cu
            colegii!
          </p>
        </div>
        <Link
          href="/prieteni"
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-feather bg-card px-3.5 py-2 text-xs font-bold text-subtle transition-colors hover:text-accent sm:flex"
        >
          <Users className="h-4 w-4" /> Prieteni
        </Link>
      </section>

      <Leaderboard boards={boards} myUserId={session.user.id} />
    </div>
  );
}
