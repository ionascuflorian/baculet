import { notFound } from "next/navigation";
import Link from "next/link";
import { Flame, AtSign, Trophy, CalendarDays, ShieldCheck, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getXpBreakdowns } from "@/lib/xp";
import { FollowButton } from "@/components/friends/follow-button";
import { UserAvatar } from "@/components/friends/user-avatar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { name: true, username: true },
  });
  return {
    title: user
      ? `${user.name} (@${user.username}) · Baculet`
      : "Utilizator · Baculet",
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      streakCount: true,
      role: true,
      createdAt: true,
      followers: { select: { id: true } },
      following: { select: { id: true } },
    },
  });
  if (!user) notFound();

  const [xp, myFollow] = await Promise.all([
    getXpBreakdowns(user.id),
    session?.user?.id
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: user.id,
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const isSelf = session?.user?.id === user.id;
  const isLoggedIn = Boolean(session?.user?.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="animate-slide-up flex flex-col items-center gap-4 rounded-3xl border border-feather bg-card p-8 text-center sm:flex-row sm:text-left">
        <UserAvatar name={user.name} image={user.image} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-extrabold text-ink">{user.name}</h1>
            {user.role === "ADMIN" && (
              <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                <ShieldCheck className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-sm text-subtle sm:justify-start">
            <AtSign className="h-3.5 w-3.5" />
            {user.username ?? "—"}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="flex items-center gap-1 rounded-xl bg-warning/15 px-2.5 py-1 text-sm font-extrabold text-warning">
              <Flame className="h-4 w-4" />
              {user.streakCount}
            </span>
            <span className="rounded-xl bg-accent/10 px-2.5 py-1 text-sm font-extrabold text-accent">
              {xp.allTime.total.toLocaleString("ro-RO")} XP total
            </span>
            <span className="rounded-xl bg-feather/60 px-2.5 py-1 text-sm font-extrabold text-subtle">
              {xp.week.total.toLocaleString("ro-RO")} XP săptămâna asta
            </span>
          </div>
        </div>
        {isLoggedIn &&
          (isSelf ? (
            <Link
              href="/cont"
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
            >
              <Settings className="h-4 w-4" /> Setări cont
            </Link>
          ) : (
            <FollowButton
              targetId={user.id}
              initialFollowing={Boolean(myFollow)}
              isSelf={isSelf}
            />
          ))}
      </section>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-feather bg-card p-4 text-center">
          <p className="text-2xl font-black text-ink">{user.followers.length}</p>
          <p className="text-xs font-semibold text-subtle">Urmăritori</p>
        </div>
        <div className="rounded-2xl border border-feather bg-card p-4 text-center">
          <p className="text-2xl font-black text-ink">{user.following.length}</p>
          <p className="text-xs font-semibold text-subtle">Urmărește</p>
        </div>
        <div className="rounded-2xl border border-feather bg-card p-4 text-center">
          <p className="flex items-center justify-center gap-1 text-2xl font-black text-ink">
            <CalendarDays className="h-5 w-5 text-subtle" />
          </p>
          <p className="text-xs font-semibold text-subtle">
            Pe Baculet din{" "}
            {new Date(user.createdAt).toLocaleDateString("ro-RO", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-feather bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-ink">
          <Trophy className="h-5 w-5 text-accent" /> Cum câștigă XP
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-xl bg-feather/50 px-4 py-2.5">
            <span className="text-subtle">Teste (cele mai bune scoruri)</span>
            <span className="font-bold text-ink">
              {xp.allTime.quizXp.toLocaleString("ro-RO")} XP
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-feather/50 px-4 py-2.5">
            <span className="text-subtle">Lecții completate</span>
            <span className="font-bold text-ink">
              {xp.allTime.lessonXp.toLocaleString("ro-RO")} XP
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-feather/50 px-4 py-2.5">
            <span className="text-subtle">Bonus streak</span>
            <span className="font-bold text-ink">
              {xp.allTime.streakXp.toLocaleString("ro-RO")} XP
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-accent/10 px-4 py-2.5 font-extrabold">
            <span className="text-accent">Total</span>
            <span className="text-accent">
              {xp.allTime.total.toLocaleString("ro-RO")} XP
            </span>
          </div>
        </div>
      </div>

      {!isLoggedIn && (
        <p className="text-center text-sm text-subtle">
          <a href="/login" className="font-semibold text-accent hover:underline">
            Autentifică-te
          </a>{" "}
          ca să-l urmărești.
        </p>
      )}
    </div>
  );
}
