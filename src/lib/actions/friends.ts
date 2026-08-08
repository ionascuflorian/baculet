"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const q = query.trim();
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
    return { ok: true };
  } catch {
    return { ok: false };
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

export async function getFriends(userId: string): Promise<FriendUser[]> {
  // Reuniune: pe cine urmăresc + cine mă urmărește (fără dubluri).
  const me = userId;
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

export async function getFriendIds(userId: string): Promise<string[]> {
  const [following, followedBy] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: userId },
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
