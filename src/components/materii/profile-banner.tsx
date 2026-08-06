"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileOnboarding } from "@/components/profile/profile-onboarding";

export function ProfileBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="animate-slide-up surface flex items-center gap-4 rounded-3xl border p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <GraduationCap className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">
            Personalizează-ți materiile
          </p>
          <p className="text-sm text-subtle">
            Alege-ți profilul de studiu ca să vedem doar materiile care contează
            pentru tine.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          Alege profilul
        </Button>
      </div>
      <ProfileOnboarding
        open={open}
        dismissible
        onClose={() => setOpen(false)}
      />
    </>
  );
}
