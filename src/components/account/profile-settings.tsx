"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileOnboarding } from "@/components/profile/profile-onboarding";
import { PROFILE_META } from "@/lib/profile";

export function ProfileSettings({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false);
  const meta = PROFILE_META.find((p) => p.id === current) ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <p className="font-extrabold text-ink">
              {meta ? meta.label : "Nu ai ales un profil"}
            </p>
            <p className="text-sm text-subtle">
              {meta
                ? meta.specializations
                : "Alege-ți profilul ca să vezi materiile relevante."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {meta ? "Schimbă profilul" : "Alege profilul"}
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
