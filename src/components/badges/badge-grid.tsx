import { allBadges, type AchievementStats } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export function BadgeGrid({ stats }: { stats: AchievementStats & { stepsDone?: number } }) {
  const badges = allBadges(stats);
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {badges.map((b) => (
        <div
          key={b.key}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-center",
            b.earned ? "border-success/40 bg-success/10" : "border-feather bg-card opacity-60"
          )}
        >
          <span className="text-2xl">{b.icon}</span>
          <span className="text-xs font-extrabold leading-tight text-ink">{b.title}</span>
          <span className={cn("text-[10px] font-bold", b.earned ? "text-success" : "text-subtle")}>{b.earned ? "Deblocat" : "Blocat"}</span>
        </div>
      ))}
    </div>
  );
}
