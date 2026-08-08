"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { followUser, unfollowUser } from "@/lib/actions/friends";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetId,
  initialFollowing,
  isSelf,
}: {
  targetId: string;
  initialFollowing: boolean;
  isSelf: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (isSelf) return null;

  const toggle = async () => {
    setBusy(true);
    if (following) {
      await unfollowUser(targetId);
      setFollowing(false);
    } else {
      await followUser(targetId);
      setFollowing(true);
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all",
        following
          ? "border border-feather text-subtle hover:border-danger/40 hover:text-danger"
          : "bg-accent text-white hover:opacity-90"
      )}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {following ? "Dezabonează" : "Urmărește"}
    </button>
  );
}
