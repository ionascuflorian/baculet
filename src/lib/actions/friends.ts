"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

export interface FriendUser {
  id: string;
  name: string;
  username: string | null;
  image: string | null;
  streakCount: number;
  following: boolean; // îl urmăresc eu
  followedBy: boolean; // mă urmărește el
}

export async function searchUsers(query: string): Promise<FriendUser[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  // Acceptăm și "@username" — pragul "@" se elimină înainte de căutare.
  const q = query.trim().replace(/^@+/, "");
  if (q.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        {
          OR: [
            { username: { contains: q.toLowerCase(), mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      streakCount: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  });

  if (users.length === 0) return [];

  const ids = users.map((u) => u.id);
  const [following, followedBy] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: session.user.id, followingId: { in: ids } },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: { in: ids }, followingId: session.user.id },
      select: { followerId: true },
    }),
  ]);
  const followingSet = new Set(following.map((f) => f.followingId));
  const followedBySet = new Set(followedBy.map((f) => f.followerId));

  return users.map((u) => ({
    ...u,
    following: followingSet.has(u.id),
    followedBy: followedBySet.has(u.id),
  }));
}

export async function followUser(targetId: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id || session.user.id === targetId) return { ok: false };

  try {
    await prisma.follow.create({
      data: { followerId: session.user.id, followingId: targetId },
    });
    // Notificare instant către cel urmărit (fire-and-forget, respectă
    // preferințele lui din setări).
    notifyFollow(session.user.id, targetId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function notifyFollow(followerId: string, targetId: string) {
  try {
    const [follower, target] = await Promise.all([
      prisma.user.findUnique({
        where: { id: followerId },
        select: { name: true, username: true },
      }),
      prisma.user.findUnique({
        where: { id: targetId },
        select: { followNotifs: true, emailNotifs: true, streakNotifs: true, reminderHour: true, email: true, name: true },
      }),
    ]);
    if (!follower || !target || !target.followNotifs) return;
    await notifyUser(targetId, "follow", {
      title: "Ai un urmăritor nou!",
      body: `${follower.name} a început să te urmărească.`,
      url: "/prieteni",
    });
  } catch (err) {
    console.error("notifyFollow failed:", err);
  }
}

export async function unfollowUser(targetId: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false };

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetId },
  });
  return { ok: true };
}

export async function getFriends(_userId: string): Promise<FriendUser[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  // Doar propriii prieteni — nu permite enumerarea prietenilor altor utilizatori.
  const me = session.user.id;
  const [following, followedBy] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: me },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: me },
      select: { followerId: true },
    }),
  ]);
  const ids = [
    ...new Set([
      ...following.map((f) => f.followingId),
      ...followedBy.map((f) => f.followerId),
    ]),
  ];
  if (ids.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      streakCount: true,
    },
    orderBy: { name: "asc" },
  });
  const followingSet = new Set(following.map((f) => f.followingId));
  const followedBySet = new Set(followedBy.map((f) => f.followerId));
  return users.map((u) => ({
    ...u,
    following: followingSet.has(u.id),
    followedBy: followedBySet.has(u.id),
  }));
}

export async function getFriendIds(_userId: string): Promise<string[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  // Doar propriii prieteni.
  const me = session.user.id;
  const [following, followedBy] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: me },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: me },
      select: { followerId: true },
    }),
  ]);
  return [
    ...new Set([
      ...following.map((f) => f.followingId),
      ...followedBy.map((f) => f.followerId),
    ]),
  ];
}
