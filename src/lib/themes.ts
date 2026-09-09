import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { THEMES_TAG } from "@/lib/revalidate";

export { THEME_COOKIE, THEME_READY_EVENT, THEME_READY_FLAG } from "@/lib/theme-constants";

/** Lista temelor active, pentru CSS global și pentru picker-e de temă. */
export const getEnabledThemes = unstable_cache(
  async () =>
    prisma.theme.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    }),
  ["enabled-themes"],
  { revalidate: 3600, tags: [THEMES_TAG] }
);