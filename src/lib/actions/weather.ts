"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import {
  isWeatherLocation,
  type WeatherLocation,
} from "@/lib/weather-location";

export type WeatherState = { error?: string; ok?: boolean };

export async function saveWeatherLocation(
  location: WeatherLocation
): Promise<WeatherState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Neautorizat" };

  if (!isWeatherLocation(location)) {
    return { error: "Locație invalidă." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
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