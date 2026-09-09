"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/access";
import type { Prisma } from "@/generated/prisma/client";
import {
  isWeatherLocation,
  type WeatherLocation,
} from "@/lib/weather-location";

export type WeatherState = { error?: string; ok?: boolean };

export async function saveWeatherLocation(
  location: WeatherLocation
): Promise<WeatherState> {
  const user = await currentUser();
  if (!user) return { error: "Neautorizat" };

  if (!isWeatherLocation(location)) {
    return { error: "Locație invalidă." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        weatherLocation: {
          lat: location.lat,
          lon: location.lon,
          label: location.label,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { error: "Nu am putut salva locația." };
  }
}