export const PROFILE_IDS = ["REAL", "HUMAN", "TECH"] as const;
export type ProfileId = (typeof PROFILE_IDS)[number];

export const PROFILE_LABELS: Record<string, string> = {
  REAL: "Real",
  HUMAN: "Uman",
  TECH: "Tehnologic",
};

export const PROFILE_META: {
  id: ProfileId;
  label: string;
  specializations: string;
  description: string;
}[] = [
  {
    id: "REAL",
    label: "Real",
    specializations: "Mate-Info · Științe ale Naturii",
    description:
      "Matematica, fizica și materiile exacte ies în prim-plan.",
  },
  {
    id: "HUMAN",
    label: "Uman",
    specializations: "Filologie · Științe Sociale",
    description:
      "Limba română, istoria și geografia ies în prim-plan.",
  },
  {
    id: "TECH",
    label: "Tehnologic",
    specializations: "Profil tehnic",
    description:
      "Matematica, fizica și istoria, echilibrat pentru profilul tău.",
  },
];

export function isProfileId(value: unknown): value is ProfileId {
  return (
    typeof value === "string" &&
    (PROFILE_IDS as readonly string[]).includes(value)
  );
}

export function profileMeta(profile: ProfileId | null | undefined) {
  return PROFILE_META.find((p) => p.id === profile) ?? null;
}
