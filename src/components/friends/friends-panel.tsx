"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, UserPlus, Check, AtSign } from "lucide-react";
import Link from "next/link";
import {
  searchUsers,
  followUser,
  unfollowUser,
  type FriendUser,
} from "@/lib/actions/friends";
import { UserAvatar } from "@/components/friends/user-avatar";
import { cn } from "@/lib/utils";

export function FriendsPanel({
  initialFriends,
  myUsername,
}: {
  initialFriends: FriendUser[];
  myUsername: string | null;
}) {
  const [friends, setFriends] = useState<FriendUser[]>(initialFriends);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = await searchUsers(q);
      setResults(found);
      setSearching(false);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const following = friends.filter((f) => f.following);
  const followers = friends.filter((f) => f.followedBy && !f.following);

  const toggle = async (user: FriendUser) => {
    setBusyId(user.id);
    const syncResults = (following: boolean) =>
      setResults((prev) =>
        prev
          ? prev.map((r) =>
              r.id === user.id ? { ...r, following } : r
            )
          : prev
      );
    if (user.following) {
      await unfollowUser(user.id);
      setFriends((prev) =>
        prev.map((f) =>
          f.id === user.id ? { ...f, following: false } : f
        )
      );
      syncResults(false);
    } else {
      await followUser(user.id);
      setFriends((prev) => {
        const exists = prev.some((f) => f.id === user.id);
        if (exists)
          return prev.map((f) =>
            f.id === user.id ? { ...f, following: true } : f
          );
        return [...prev, { ...user, following: true }];
      });
      syncResults(true);
    }
    setBusyId(null);
  };

  const followBtn = (user: FriendUser) => (
    <button
      onClick={() => toggle(user)}
      disabled={busyId === user.id}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
        user.following
          ? "border border-feather text-subtle hover:border-danger/40 hover:text-danger"
          : "bg-accent text-white hover:opacity-90"
      )}
    >
      {busyId === user.id ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : user.following ? (
        "Dezabonează"
      ) : user.followedBy ? (
        "Urmărește înapoi"
      ) : (
        "Urmărește"
      )}
    </button>
  );

  const row = (user: FriendUser) => (
    <li
      key={user.id}
      className="flex items-center gap-3 rounded-2xl border border-feather bg-card px-4 py-3"
    >
      <UserAvatar name={user.name} image={user.image} />
      <div className="min-w-0 flex-1">
        <Link
          href={`/u/${user.username ?? user.id}`}
          className="block truncate font-bold text-ink transition-colors hover:text-accent"
        >
          {user.name}
        </Link>
        <p className="truncate text-xs text-subtle">
          {user.username ? (
            <span className="inline-flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              {user.username}
            </span>
          ) : (
            "—"
          )}
        </p>
      </div>
      {followBtn(user)}
    </li>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              myUsername
                ? `Caută un prieten după @username sau nume…`
                : "Alege-ți întâi un @username din Cont → Setări cont"
            }
            disabled={!myUsername}
            className="w-full rounded-2xl border border-feather bg-card py-3.5 pl-12 pr-4 text-sm font-medium text-ink placeholder:text-subtle focus:border-accent focus:outline-none"
          />
          {searching && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-subtle" />
          )}
        </div>

        {!myUsername && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-sm font-semibold text-warning">
            <AtSign className="h-4 w-4 shrink-0" />
            Fără @username nu poți fi găsit de prieteni. Mergi la
            <Link href="/cont" className="underline decoration-warning/60 underline-offset-2 hover:text-warning/80">
              Cont
            </Link>
            și alege-ți unul.
          </p>
        )}

        {results && (
          <div className="mt-4">
            <h3 className="mb-2 px-1 text-sm font-bold text-subtle">
              Rezultate pentru „{query}”
            </h3>
            {results.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-feather px-4 py-6 text-center text-sm text-subtle">
                Niciun utilizator găsit.
              </p>
            ) : (
              <ul className="space-y-2">{results.map((u) => row(u))}</ul>
            )}
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-extrabold uppercase tracking-wide text-subtle">
          <UserPlus className="h-4 w-4" /> Pe cine urmărești ({following.length})
        </h2>
        {following.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-feather px-4 py-8 text-center text-sm text-subtle">
            Nu urmărești încă pe nimeni. Caută colegi sau prieteni după
            @username.
          </p>
        ) : (
          <ul className="space-y-2">{following.map((u) => row(u))}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-sm font-extrabold uppercase tracking-wide text-subtle">
          <Check className="h-4 w-4" /> Te urmăresc ({followers.length})
        </h2>
        {followers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-feather px-4 py-8 text-center text-sm text-subtle">
            Nimeni nu te urmărește încă.
          </p>
        ) : (
          <ul className="space-y-2">{followers.map((u) => row(u))}</ul>
        )}
      </section>
    </div>
  );
}
