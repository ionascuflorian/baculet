import Link from "next/link";
import { Trophy } from "lucide-react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { getFriendIds } from "@/lib/actions/friends";
import { getLeaderboard, getXpBreakdowns } from "@/lib/xp";
import { UserAvatar } from "@/components/friends/user-avatar";

const medalColor: Record<number, string> = {
  1: "text-[#F59E0B]",
  2: "text-[#94A3B8]",
  3: "text-[#B45309]",
};

export async function LeaderboardWidget({ userId }: { userId: string }) {
  const [friendIds, xp] = await Promise.all([
    getFriendIds(userId),
    getXpBreakdowns(userId),
  ]);
  const rows =
    friendIds.length > 0
      ? await getLeaderboard({ weekStart: null, friendIds, limit: 3 })
      : [];

  return (
    <WidgetShell
      title="Clasament"
      icon={<Trophy className="h-4 w-4 text-accent" />}
      action={
        <Link
          href="/clasament"
          className="rounded-full px-3 py-1.5 text-xs font-bold text-accent hover:text-accent-dark"
        >
          Vezi tot
        </Link>
      }
    >
      {rows.length === 0 ? (
        <div className="py-2">
          <p className="text-sm font-semibold text-ink">Niciun prieten încă</p>
          <p className="mt-1 text-xs text-subtle">
            Urmărește colegi ca să-i vezi în clasament. Tu ai deja{" "}
            <span className="font-bold text-accent">
              {xp.allTime.total.toLocaleString("ro-RO")} XP
            </span>
            .
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="flex items-center gap-2.5 rounded-xl px-2 py-1.5"
            >
              <span
                className={`w-5 text-center text-sm font-black ${medalColor[i + 1] ?? "text-subtle"}`}
              >
                {i + 1}
              </span>
              <UserAvatar name={row.name} image={row.image} size="sm" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${row.username ?? row.id}`}
                  className="block truncate text-sm font-bold text-ink hover:text-accent"
                >
                  {row.name}
                </Link>
              </div>
              <span className="shrink-0 text-sm font-bold text-accent">
                {row.xp.toLocaleString("ro-RO")} XP
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between rounded-xl bg-accent/10 px-3 py-2">
            <span className="text-sm font-bold text-ink">Tu</span>
            <span className="text-sm font-extrabold text-accent">
              {xp.allTime.total.toLocaleString("ro-RO")} XP
            </span>
          </li>
        </ul>
      )}
    </WidgetShell>
  );
}
