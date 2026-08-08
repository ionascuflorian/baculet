"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import type { BoardRow } from "@/lib/xp";
import { UserAvatar } from "@/components/friends/user-avatar";
import { cn } from "@/lib/utils";

export interface Board {
  rows: BoardRow[];
  myRank: number | null;
}

type Period = "week" | "all";
type Scope = "global" | "friends";

const medalStyle: Record<number, string> = {
  1: "bg-[#F59E0B]/15 text-[#F59E0B]",
  2: "bg-[#94A3B8]/15 text-[#94A3B8]",
  3: "bg-[#B45309]/15 text-[#B45309]",
};

export function Leaderboard({
  boards,
  myUserId,
}: {
  boards: {
    weekGlobal: Board;
    allGlobal: Board;
    weekFriends: Board;
    allFriends: Board;
  };
  myUserId: string;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const [scope, setScope] = useState<Scope>("global");
  const board =
    scope === "global"
      ? period === "week"
        ? boards.weekGlobal
        : boards.allGlobal
      : period === "week"
        ? boards.weekFriends
        : boards.allFriends;

  const inList = board.rows.some((r) => r.id === myUserId);
  const rankOf = (id: string) =>
    board.rows.findIndex((r) => r.id === id) + 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-feather bg-card p-1">
          {(
            [
              ["week", "Săptămâna asta"],
              ["all", "Tot timpul"],
            ] as [Period, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriod(id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition-all",
                period === id
                  ? "bg-accent text-white"
                  : "text-subtle hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-feather bg-card p-1">
          {(
            [
              ["global", "Global"],
              ["friends", "Prieteni"],
            ] as [Scope, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setScope(id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition-all",
                scope === id
                  ? "bg-accent text-white"
                  : "text-subtle hover:text-ink"
              )}
            >
              {id === "friends" && <Users className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {scope === "friends" && board.rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-feather px-6 py-10 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-subtle" />
          <p className="font-bold text-ink">Niciun prieten încă</p>
          <p className="mt-1 text-sm text-subtle">
            Urmărește colegi din pagina{" "}
            <Link href="/prieteni" className="font-semibold text-accent hover:underline">
              Prieteni
            </Link>{" "}
            ca să le vezi XP-ul aici.
          </p>
        </div>
      )}

      {scope === "global" && board.rows.length === 0 && (
        <div className="rounded-3xl border border-dashed border-feather px-6 py-10 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-subtle" />
          <p className="font-bold text-ink">Clasamentul e gol</p>
          <p className="mt-1 text-sm text-subtle">
            Rezolvă un test sau completează o lecție ca să câștigi primele XP.
          </p>
        </div>
      )}

      {board.rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 0, 2].map((offset) => {
              const row = board.rows[offset];
              if (!row) return null;
              const place = offset + 1;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "relative flex items-center gap-3 rounded-3xl border p-4",
                    place === 1
                      ? "border-[#F59E0B]/40 bg-[#F59E0B]/5"
                      : "border-feather bg-card"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-black",
                      medalStyle[place]
                    )}
                  >
                    {place}
                  </span>
                  <UserAvatar name={row.name} image={row.image} />
                  <div className="min-w-0">
                    <Link
                      href={`/u/${row.username ?? row.id}`}
                      className="block truncate font-bold text-ink hover:text-accent"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-subtle">
                      @{row.username ?? "—"} · {row.xp.toLocaleString("ro-RO")} XP
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <ul className="space-y-1.5">
            {board.rows.slice(3).map((row) => {
              const mine = row.id === myUserId;
              return (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                    mine
                      ? "border border-accent/40 bg-accent/10"
                      : "border border-feather bg-card"
                  )}
                >
                  <span className="w-8 text-center text-sm font-black text-subtle">
                    {rankOf(row.id)}
                  </span>
                  <UserAvatar name={row.name} image={row.image} size="sm" />
                  <Link
                    href={`/u/${row.username ?? row.id}`}
                    className="min-w-0 flex-1 truncate font-semibold text-ink hover:text-accent"
                  >
                    {row.name}
                    {mine && (
                      <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold text-white">
                        TU
                      </span>
                    )}
                  </Link>
                  <span className="shrink-0 text-sm font-bold text-accent">
                    {row.xp.toLocaleString("ro-RO")} XP
                  </span>
                </li>
              );
            })}
          </ul>

          {!inList && board.myRank !== null && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3">
              <span className="text-sm font-black text-accent">
                #{board.myRank}
              </span>
              <p className="text-sm text-subtle">
                Locul tău în clasamentul{" "}
                {scope === "global" ? "global" : "de prieteni"}. Rezolvă un test
                sau completează o lecție ca să urci.
              </p>
            </div>
          )}
        </>
      )}

      <p className="text-center text-xs text-subtle/70">
        XP = cele mai bune scoruri la teste × 10 + lecții completate × 25
        {period === "all" && " + bonus streak × 5"}
        {period === "week" && " (doar din săptămâna asta)"}
      </p>
    </div>
  );
}
