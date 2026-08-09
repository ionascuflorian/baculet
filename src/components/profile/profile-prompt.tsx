"use client";

import { useState } from "react";
import { ProfileOnboarding } from "@/components/profile/profile-onboarding";

export function ProfilePrompt({ profileSet }: { profileSet: boolean }) {
  const [open, setOpen] = useState(!profileSet);
  return (
    <ProfileOnboarding
      open={open}
      dismissible
      onClose={() => setOpen(false)}
    />
  );
}
